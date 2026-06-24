/**
 * ============================================================
 *  NOTIFICATIONSYSTEM.JS — Icon Notifikasi & Panel List
 *  Icon di taskbar kanan, klik untuk buka/tutup panel list.
 *  Badge counter untuk notifikasi belum dibaca.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";

export class NotificationSystem {
  constructor() {
    /** @type {Array<{id, message, timestamp, read}>} */
    this.notifications = [];
    this.maxNotifications = 50;
    this.panelOpen = false;
    /** @type {Set<string>} Evidence IDs that were already notified via RTE */
    this._notifiedEvidence = new Set();

    this._render();
    this._bindEvents();
  }

  /**
   * Render icon + panel ke taskbar
   */
  _render() {
    const tray = document.querySelector(".taskbar-tray");
    if (!tray) return;

    // --- Icon Bell + Badge ---
    const iconContainer = document.createElement("div");
    iconContainer.className = "notify-icon-container";
    iconContainer.id = "notify-icon";
    iconContainer.innerHTML = `
      <span class="notify-bell">🔔</span>
      <span class="notify-badge" id="notify-badge">0</span>
    `;
    iconContainer.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    // Sisipkan sebelum jam
    tray.insertBefore(iconContainer, tray.firstChild);

    // --- Panel List ---
    const panel = document.createElement("div");
    panel.className = "notify-panel";
    panel.id = "notify-panel";
    panel.innerHTML = `
      <div class="notify-panel-header">
        <span class="notify-panel-title">📋 NOTIFIKASI</span>
        <button class="notify-clear-btn" id="notify-clear">Hapus Semua</button>
      </div>
      <div class="notify-panel-list" id="notify-list">
        <div class="notify-empty">Belum ada notifikasi</div>
      </div>
    `;

    document.body.appendChild(panel);

    // Event: clear all
    panel.querySelector("#notify-clear")?.addEventListener("click", () => {
      this.clearAll();
    });

    // Klik di luar panel → tutup
    document.addEventListener("click", (e) => {
      if (this.panelOpen && !panel.contains(e.target) && !iconContainer.contains(e.target)) {
        this.closePanel();
      }
    });
  }

  /**
   * Bind events
   */
  _bindEvents() {
     // Terima notifikasi dari RealTimeManager
     EventBus.on("real-time-event:trigger", ({ eventId, action, elapsedGameMinutes, payload }) => {
       // For unlock_evidence, the RTE message already contains the full notification text
       if (action === "unlock_evidence") {
         const message = payload?.message || `Event: ${eventId}`;
         this.add(message, eventId);
         // Mark this evidence as already notified
         if (payload?.evidence_id) {
           this._notifiedEvidence.add(payload.evidence_id);
         }
       } else if (action === "notification") {
         const message = payload?.message || `Event: ${eventId}`;
         this.add(message, eventId);
       } else if (action === "send_message_from_character") {
         // Show the actual message content (e.g., "Rahmat: 'Saya tidak tahan lagi...'")
         const message = payload?.message || `Event: ${eventId}`;
         this.add(message, eventId);
       } else if (action === "deadline_reached") {
         const message = payload?.message || `⏰ WAKTU HABIS!`;
         this.add(message, eventId);
       }
     });

     // Juga terima dari EvidenceEngine (hanya untuk unlock yang BUKAN dari RTE)
     // Misalnya: initial_evidence, crime_scene clicks, dll
     EventBus.on("evidence:unlocked", ({ evidenceId }) => {
       // Skip if this evidence was already notified via RTE
       if (this._notifiedEvidence.has(evidenceId)) {
         return;
       }
       // Get evidence title from engine
       const eviMeta = evidenceEngine.getEvidenceMeta(evidenceId);
       const eviTitle = eviMeta?.title || evidenceId;
       const eviIcon = eviMeta?.icon || "📄";
       this.add(`${eviIcon} Bukti baru ditemukan: ${eviTitle}`, `evidence-${evidenceId}`);
     });
  }

  /**
   * Tambah notifikasi baru
   * @param {string} message
   * @param {string} id - Optional unique ID (untuk dedup)
   */
  add(message, id) {
    // Dedup berdasarkan ID
    if (id && this.notifications.some(n => n.id === id)) return;

    const notification = {
      id: id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(notification);

    // Batasi jumlah
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this._updateBadge();
    this._renderList();

    // Auto-buka panel jika belum dibuka
    if (!this.panelOpen) {
      this._flashIcon();
    }
  }

  /**
   * Toggle panel buka/tutup
   */
  togglePanel() {
    this.panelOpen = !this.panelOpen;
    const panel = document.getElementById("notify-panel");
    const icon = document.getElementById("notify-icon");
    if (panel) {
      panel.style.display = this.panelOpen ? "flex" : "none";
    }
    if (icon) {
      if (this.panelOpen) {
        icon.classList.add("active");
      } else {
        icon.classList.remove("active");
      }
    }
    if (this.panelOpen) {
      this._markAllRead();
    }
  }

  /**
   * Tutup panel
   */
  closePanel() {
    this.panelOpen = false;
    const panel = document.getElementById("notify-panel");
    const icon = document.getElementById("notify-icon");
    if (panel) panel.style.display = "none";
    if (icon) icon.classList.remove("active");
  }

  /**
   * Tandai semua sebagai sudah dibaca
   */
  _markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this._updateBadge();
    this._renderList();
  }

  /**
   * Hapus semua notifikasi
   */
  clearAll() {
    this.notifications = [];
    this._updateBadge();
    this._renderList();
  }

  /**
   * Update badge counter
   */
  _updateBadge() {
    const unread = this.notifications.filter(n => !n.read).length;
    const badge = document.getElementById("notify-badge");
    if (badge) {
      badge.textContent = unread > 99 ? "99+" : String(unread);
      badge.style.display = unread > 0 ? "block" : "none";
    }
  }

  /**
   * Render list notifikasi di panel
   */
  _renderList() {
    const list = document.getElementById("notify-list");
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<div class="notify-empty">Belum ada notifikasi</div>`;
      return;
    }

    list.innerHTML = "";
    for (const notif of this.notifications) {
      const item = document.createElement("div");
      item.className = `notify-item ${notif.read ? "read" : "unread"}`;
      const time = new Date(notif.timestamp);
      const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`;
      item.innerHTML = `
        <div class="notify-item-message">${notif.message}</div>
        <div class="notify-item-time">${timeStr}</div>
      `;
      list.appendChild(item);
    }
  }

  /**
   * Flash icon untuk menarik perhatian
   */
  _flashIcon() {
    const icon = document.getElementById("notify-icon");
    if (!icon) return;
    icon.classList.add("notify-flash");
    setTimeout(() => icon.classList.remove("notify-flash"), 2000);
  }
}

// Singleton
export let notificationSystem = null;

export function initNotificationSystem() {
  notificationSystem = new NotificationSystem();
  return notificationSystem;
}