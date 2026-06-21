/**
 * ============================================================
 *  REALTIME MANAGER.JS — Event Real-Time Kasus
 *  Memicu bukti baru berdasarkan waktu sejak kasus dimulai.
 *  Format event di case.json:
 *    { id, trigger: { type, minutes, description }, action, payload }
 *  Action: unlock_evidence | notification | send_message_from_character |
 *           update_objective | deadline_reached
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "./CaseLoader.js";
import { evidenceEngine } from "./EvidenceEngine.js";
import { Effects } from "../utils/Effects.js";
export class RealTimeManager {
  constructor(notificationSystem) {
    this.events = [];
    this.timerId = null;
    this.isRunning = false;
    this.executedEvents = new Set();
    this._notificationSystem = notificationSystem || null;

    /**
     * Interval tick dalam ms.
     * Produksi: 60000 (1 menit)
     * Testing: 30000 (30 detik) — jadi 1 menit game = 30 detik nyata
     */
    this.TICK_INTERVAL = 30000;
  }

  /**
   * Menginisialisasi dengan data real_time_events dari case.json
   */
  init() {
    const events = caseLoader.activeCase?.real_time_events || [];
    this.events = events;

    // Load executed state dari save
    const savedEvents = GameState.getState().executedEvents || [];
    savedEvents.forEach(id => this.executedEvents.add(id));

    console.log(`[RealTimeManager] ${this.events.length} event terdaftar.`);
  }

  /**
   * Memulai timer
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Cek segera (untuk event dengan minutes: 0)
    this._tick();

    // Interval timer
    this.timerId = setInterval(() => this._tick(), this.TICK_INTERVAL);

    console.log(`[RealTimeManager] Timer dimulai (tick setiap ${this.TICK_INTERVAL / 1000}s).`);
  }

  /**
   * Menghentikan timer
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
    console.log("[RealTimeManager] Timer dihentikan.");
  }

  /**
   * Tick — cek semua event
   * 30 detik nyata = 1 menit game time
   */
  _tick() {
    if (GameState.caseStatus !== "active") return;

    // Hitung elapsed game-menit: setiap 30 detik nyata = 1 menit game
    const elapsedRealMs = Date.now() - GameState.startedAt;
    const elapsedGameMinutes = Math.floor(elapsedRealMs / this.TICK_INTERVAL);

    for (const event of this.events) {
      if (this.executedEvents.has(event.id)) continue;

      const triggerMinutes = event.trigger?.minutes;
      if (triggerMinutes !== undefined && elapsedGameMinutes >= triggerMinutes) {
        this._executeEvent(event, elapsedGameMinutes);
      }
    }
  }

  /**
   * Mengeksekusi event satu kali
   */
  _executeEvent(event, elapsedGameMinutes) {
    const action = event.action;
    const payload = event.payload || {};

    console.log(`[RealTimeManager] ⚡ Event '${event.id}' terpicu (game menit ${elapsedGameMinutes}). Action: ${action}`);

    // Tandai sudah dieksekusi
    this.executedEvents.add(event.id);
    GameState.markEventExecuted(event.id);

    // Emit event global
    EventBus.emit("real-time-event:trigger", {
      eventId: event.id,
      action,
      elapsedGameMinutes,
      payload
    });

    switch (action) {
      case "unlock_evidence":
        if (payload.evidence_id) {
          evidenceEngine.unlockEvidence(payload.evidence_id);
          if (payload.message) {
            this._showNotification(payload.message);
          }
          if (payload.play_sound) {
            this._playSound(payload.play_sound);
          }
          // Efek visual bukti ditemukan
          Effects.evidenceFound();
        }
        break;

      case "notification":
        if (payload.message) {
          this._showNotification(payload.message);
        }
        if (payload.play_sound) {
          this._playSound(payload.play_sound);
        }
        // Efek warning jika message mengandung kata kunci deadline
        if (payload.message && (payload.message.includes("PERINGATAN") || payload.message.includes("deadline"))) {
          Effects.warning();
        }
        break;

      case "send_message_from_character":
        if (payload.character_id && payload.message) {
          // Auto-buka InterrogationRoom jika diminta
          if (payload.auto_open_chat) {
            // Delay sedikit agar notifikasi muncul dulu
            setTimeout(() => {
              EventBus.emit("interrogation:start", { characterId: payload.character_id });
            }, 1500);
          }
          this._showNotification(`💬 Pesan dari ${payload.character_id}`);
        }
        break;

      case "update_objective":
        EventBus.emit("real-time:objective-update", {
          objective_id: payload.objective_id,
          new_text: payload.new_text,
          unlock_crime_scene: payload.unlock_crime_scene
        });
        break;

      case "deadline_reached":
        this._showNotification(payload.message || "⏰ WAKTU HABIS!");
        GameState.finishCase("failed");
        EventBus.emit("case:failed", { reason: "deadline" });
        this.stop();
        break;
    }
  }

  /**
   * Menampilkan notifikasi via NotificationSystem
   */
  _showNotification(message) {
    if (this._notificationSystem) {
      this._notificationSystem.add(message, `rte-${Date.now()}`);
    } else {
      // Fallback: gunakan container sederhana
      let container = document.getElementById("realtime-notify");
      if (!container) {
        container = document.createElement("div");
        container.id = "realtime-notify";
        container.className = "notify-container";
        document.body.appendChild(container);
      }
      container.textContent = message;
      container.style.display = "block";
      if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
      this._notifyTimeout = setTimeout(() => {
        container.style.display = "none";
      }, 5000);
    }
    console.log(`[RealTimeManager] 🔔 Notifikasi: ${message}`);
  }

  /**
   * Play sound via AudioManager jika tersedia
   */
  _playSound(soundName) {
    if (window.__RETROSLEUTH?.audioManager) {
      try {
        window.__RETROSLEUTH.audioManager.play(soundName);
      } catch (e) {
        // ignore sound errors
      }
    }
  }

  /**
   * Paksa eksekusi event (untuk testing via console)
   * Usage: window.__RETROSLEUTH.realTimeManager.forceExecute('rte_001')
   */
  forceExecute(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (event && !this.executedEvents.has(eventId)) {
      const elapsedGameMinutes = Math.floor(
        (Date.now() - GameState.startedAt) / this.TICK_INTERVAL
      );
      this._executeEvent(event, elapsedGameMinutes);
    } else {
      console.warn(`[RealTimeManager] Event '${eventId}' tidak ditemukan atau sudah dieksekusi.`);
    }
  }

  /**
   * Daftar event yang belum dieksekusi (untuk debugging)
   */
  getPendingEvents() {
    return this.events.filter(e => !this.executedEvents.has(e.id));
  }

  /**
   * Info elapsed time
   */
  getTimeInfo() {
    const elapsedRealMs = Date.now() - GameState.startedAt;
    const elapsedGameMinutes = Math.floor(elapsedRealMs / this.TICK_INTERVAL);

    const deadlineEvent = this.events.find(e => e.action === "deadline_reached");
    const deadlineMinutes = deadlineEvent?.trigger?.minutes || 120;

    return {
      elapsedRealMs,
      elapsedGameMinutes,
      deadlineMinutes,
      remainingGameMinutes: Math.max(0, deadlineMinutes - elapsedGameMinutes)
    };
  }

  /**
   * Reset state (saat case di-unload)
   */
  reset() {
    this.stop();
    this.events = [];
    this.executedEvents = new Set();
    if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
    const container = document.getElementById("realtime-notify");
    if (container) container.style.display = "none";
  }
}

// Instance singleton
export let realTimeManager = null;

export function initRealTimeManager(notificationSystem) {
  realTimeManager = new RealTimeManager(notificationSystem);
  return realTimeManager;
}