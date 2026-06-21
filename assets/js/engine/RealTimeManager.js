/**
 * ============================================================
 *  REALTIME MANAGER.JS — Event Real-Time Kasus
 *  Memicu bukti baru berdasarkan waktu sejak kasus dimulai.
 *  Deadline dihitung dari startedAt di GameState.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "./CaseLoader.js";
import { evidenceEngine } from "./EvidenceEngine.js";

export class RealTimeManager {
  constructor() {
    /** @type {Array<Object>} */
    this.events = [];
    /** @type {number|null} */
    this.timerId = null;
    this.isRunning = false;
    this.executedEvents = new Set();
  }

  /**
   * Menginisialisasi dengan data real_time_events dari case.json
   * @param {string} caseFolder
   */
  async init(caseFolder) {
    const events = caseLoader.activeCase?.real_time_events || [];
    this.events = events;
    
    console.log(`[RealTimeManager] ${this.events.length} event terdaftar.`);
    
    // Load executed state dari save (jika ada)
    const caseId = GameState.currentCaseId;
    if (caseId) {
      const savedEvents = GameState.getState().executedEvents || [];
      savedEvents.forEach(id => this.executedEvents.add(id));
    }
  }

  /**
   * Memulai timer (dipanggil setelah case:loaded)
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.timerId = setInterval(() => this._tick(), 60000); // Cek tiap menit
    
    // Cek segera untuk event yang sudah melewati deadline
    this._tick();
    
    console.log("[RealTimeManager] Timer dimulai.");
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
   * Tick setiap menit - cek apakah ada event yang harus dipicu
   */
  _tick() {
    if (GameState.caseStatus !== "active") return;
    
    const elapsedMs = Date.now() - GameState.startedAt;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    
    for (const event of this.events) {
      // Skip jika sudah dieksekusi
      if (this.executedEvents.has(event.id)) continue;
      
      // Cek trigger menit
      if (event.trigger?.minutes !== undefined && elapsedMinutes >= event.trigger.minutes) {
        this._executeEvent(event, elapsedMinutes);
      }
      // Cek relative_time (alternatif format)
      else if (event.trigger?.type === "relative" && event.trigger.minutes !== undefined) {
        if (elapsedMinutes >= event.trigger.minutes) {
          this._executeEvent(event, elapsedMinutes);
        }
      }
    }
  }

  /**
   * Mengeksekusi event satu kali
   * @param {Object} event
   * @param {number} elapsedMinutes
   */
  _executeEvent(event, elapsedMinutes) {
    const action = event.action;
    
    console.log(`[RealTimeManager] Event '${event.id}' terpicu (menit ${elapsedMinutes}).`);
    
    // Tandai sudah dieksekusi
    this.executedEvents.add(event.id);
    GameState.markEventExecuted(event.id);
    
    // Emit event untuk subscriber lain
    EventBus.emit("real-time-event:trigger", {
      eventId: event.id,
      action: action,
      elapsedMinutes,
      payload: event
    });
    
    switch (action) {
      case "unlock_evidence":
        if (event.evidence_id) {
          evidenceEngine.unlockEvidence(event.evidence_id);
          this._showNotification(`📄 Bukti baru ditemukan: ${event.evidence_id}`);
        }
        break;
        
      case "send_message":
        // Buka InterrogationRoom dengan pesan otomatis
        EventBus.emit("real-time:message", {
          characterId: event.character_id,
          message: event.message
        });
        break;
        
      case "notification":
        this._showNotification(event.message || "Notifikasi baru");
        break;
        
      case "deadline_reached":
        GameState.finishCase("failed");
        EventBus.emit("case:failed", { reason: "deadline" });
        this.stop();
        break;
    }
  }

/**
   * Menampilkan notifikasi sederhana
   * @param {string} message
   */
  _showNotification(message) {
    const container = document.getElementById("realtime-notify");
    if (!container) return;
    
    container.textContent = message;
    container.style.display = "block";
    
    // Sembunyikan setelah 5 detik
    setTimeout(() => {
      container.style.display = "none";
    }, 5000);
  }

  /**
   * Override: Paksa eksekusi event (untuk testing)
   * @param {string} eventId
   */
  forceExecute(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (event && !this.executedEvents.has(eventId)) {
      const elapsedMinutes = Math.floor((Date.now() - GameState.startedAt) / 60000);
      this._executeEvent(event, elapsedMinutes);
    }
  }

  /**
   * Mendapatkan status remaining time sampai deadline
   */
  getRemainingMinutes() {
    if (!GameState.startedAt || !caseLoader.activeCase?.real_time_events) return null;
    
    const deadlineEvent = caseLoader.activeCase.real_time_events.find(
      e => e.action === "deadline_reached"
    );
    
    if (!deadlineEvent?.trigger?.minutes) return null;
    
    const elapsedMinutes = Math.floor((Date.now() - GameState.startedAt) / 60000);
    return deadlineEvent.trigger.minutes - elapsedMinutes;
  }

  /**
   * Mereset state (saat case:unloaded)
   */
  reset() {
    this.stop();
    this.events = [];
    this.executedEvents = new Set();
  }
}

// Instance singleton
export let realTimeManager = null;

export function initRealTimeManager() {
  realTimeManager = new RealTimeManager();
  return realTimeManager;
}