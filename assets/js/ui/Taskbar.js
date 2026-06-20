/**
 * ============================================================
 *  TASKBAR.JS — Taskbar Bawah, Tombol Window, dan Jam
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";

export class Taskbar {
  /**
   * @param {WindowManager} windowManager - Instance WindowManager.
   */
  constructor(windowManager) {
    this.wm = windowManager;
    /** @type {Map<string, HTMLElement>} */
    this.buttons = new Map();

    this.render();
    this.startClock();
    this.bindEvents();
  }

  // ============================================================
  //  RENDER & CLOCK
  // ============================================================

  render() {
    const taskbar = document.getElementById("taskbar");
    // Hapus isi lama (biar bersih)
    taskbar.innerHTML = "";

    // Kiri: Tombol START
    const left = document.createElement("div");
    left.className = "taskbar-left";
    left.innerHTML = `<button class="taskbar-start-btn">START</button>`;
    taskbar.appendChild(left);

    // Tengah: Container tombol window
    const windows = document.createElement("div");
    windows.className = "taskbar-windows";
    windows.id = "taskbar-windows";
    taskbar.appendChild(windows);

    // Kanan: Tray + Jam
    const tray = document.createElement("div");
    tray.className = "taskbar-tray";
    tray.innerHTML = `<span class="taskbar-clock" id="taskbar-clock">00:00:00</span>`;
    taskbar.appendChild(tray);
  }

  startClock() {
    const update = () => {
      const clock = document.getElementById("taskbar-clock");
      if (clock) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        clock.textContent = `${hours}:${minutes}:${seconds}`;
      }
    };
    update();
    setInterval(update, 1000);
  }

  // ============================================================
  //  EVENT BINDING (Reaksi terhadap WindowManager)
  // ============================================================

  bindEvents() {
    // Window dibuka → tambah tombol
    EventBus.on("window:opened", ({ windowId }) => {
      const meta = this.wm.windows.get(windowId);
      if (!meta) return;
      // Jika tombol sudah ada, jangan buat duplikat
      if (this.buttons.has(windowId)) {
        // Update status aktif
        this.setActive(windowId);
        return;
      }
      this.addButton(windowId, meta.options.title);
    });

    // Window ditutup → hapus tombol
    EventBus.on("window:closed", ({ windowId }) => {
      this.removeButton(windowId);
    });

    // Window fokus → aktifkan tombol
    EventBus.on("window:focused", ({ windowId }) => {
      this.setActive(windowId);
    });

    // Window diminimalkan → nonaktifkan tombol
    EventBus.on("window:minimized", ({ windowId }) => {
      const btn = this.buttons.get(windowId);
      if (btn) btn.classList.remove("active");
    });

    // Window direstore dari minimize (via maximize/restore) → aktifkan tombol
    EventBus.on("window:restored", ({ windowId }) => {
      this.setActive(windowId);
    });
    EventBus.on("window:maximized", ({ windowId }) => {
      this.setActive(windowId);
    });
  }

  // ============================================================
  //  MANIPULASI TOMBOL
  // ============================================================

  addButton(windowId, title) {
    const container = document.getElementById("taskbar-windows");
    if (!container) return;
    if (this.buttons.has(windowId)) return;

    const btn = document.createElement("button");
    btn.className = "taskbar-button";
    btn.textContent = title.length > 20 ? title.slice(0, 18) + "…" : title;
    btn.dataset.windowId = windowId;
    btn.title = title; // Tooltip full title

    btn.addEventListener("click", () => {
      const meta = this.wm.windows.get(windowId);
      if (!meta) return;

      // Logika toggle: jika aktif → minimize, jika minimized → restore, jika inactive → fokus
      if (meta.state === "active" || meta.state === "maximized") {
        this.wm.minimize(windowId);
      } else if (meta.state === "minimized") {
        this.wm.open(windowId);
        this.wm.bringToFront(windowId);
      } else {
        this.wm.bringToFront(windowId);
      }
    });

    container.appendChild(btn);
    this.buttons.set(windowId, btn);

    // Set aktif jika window sedang fokus
    if (this.wm.activeWindowId === windowId) {
      btn.classList.add("active");
    }
  }

  removeButton(windowId) {
    const btn = this.buttons.get(windowId);
    if (btn) {
      btn.remove();
      this.buttons.delete(windowId);
    }
  }

  setActive(windowId) {
    // Nonaktifkan semua tombol
    this.buttons.forEach((btn) => {
      btn.classList.remove("active");
    });
    // Aktifkan yang dipilih
    const activeBtn = this.buttons.get(windowId);
    if (activeBtn) {
      activeBtn.classList.add("active");
    }
  }
}
