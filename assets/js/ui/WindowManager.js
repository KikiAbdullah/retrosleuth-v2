/**
 * ============================================================
 *  WINDOWMANAGER.JS — Mengelola semua jendela retro
 *  Fitur: Register, Open, Close, Minimize, Maximize, Drag, Z-index.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";

export class WindowManager {
  constructor() {
    /** @type {Map<string, {element: HTMLElement, state: string, options: object, savedRect: object|null}>} */
    this.windows = new Map();
    this.zIndexCounter = 100;
    this.activeWindowId = null;
    this.dragState = null;

    this._bindGlobalEvents();
  }

  // ============================================================
  //  API PUBLIK
  // ============================================================

  /**
   * Mendaftarkan window baru (membuat DOM, tapi belum ditampilkan).
   * @param {string} id - ID unik window.
   * @param {object} options - { title, width, height, resizable, maximizable }.
   * @returns {HTMLElement} Elemen .window-body untuk diisi konten.
   */
  register(id, options = {}) {
    if (this.windows.has(id)) {
      console.warn(`[WindowManager] Window "${id}" sudah terdaftar.`);
      return this.windows.get(id).element;
    }

    const {
      title = "Untitled",
      width = 400,
      height = 300,
      resizable = true,
      maximizable = true,
    } = options;

    // --- Buat elemen DOM ---
    const el = document.createElement("div");
    el.className = "retro-window";
    el.id = `window_${id}`;
    el.style.width = width + "px";
    el.style.height = height + "px";
    el.style.display = "none";
    el.style.top = 60 + Math.random() * 40 + "px";
    el.style.left = 60 + Math.random() * 40 + "px";

    // --- Titlebar & Controls ---
    el.innerHTML = `
      <div class="window-header">
        <span class="window-title">${title}</span>
        <div class="window-controls">
          <button class="btn-minimize" data-action="minimize" title="Minimize">─</button>
          ${
            maximizable
              ? `<button class="btn-maximize" data-action="maximize" title="Maximize">☐</button>`
              : ""
          }
          <button class="btn-close" data-action="close" title="Close">✕</button>
        </div>
      </div>
      <div class="window-body">
        <!-- Konten akan dimasukkan dari luar -->
        <p style="color: #666; font-style: italic;">[Konten kosong]</p>
      </div>
      ${resizable ? '<div class="window-resize-handle"></div>' : ""}
    `;

    document.getElementById("desktop").appendChild(el);

    // --- Simpan metadata ---
    this.windows.set(id, {
      element: el,
      state: "closed", // 'closed' | 'open' | 'active' | 'inactive' | 'minimized' | 'maximized'
      options: { ...options, title, width, height, resizable, maximizable },
      savedRect: null, // Untuk restore setelah maximize/minimize
    });

    // --- Event Listener bawaan ---
    const controls = el.querySelector(".window-controls");
    controls.querySelector(".btn-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.close(id);
    });
    controls.querySelector(".btn-minimize")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.minimize(id);
    });
    const btnMax = controls.querySelector(".btn-maximize");
    if (btnMax) {
      btnMax.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMaximize(id);
      });
    }

    // --- Drag Handler (di header) ---
    const header = el.querySelector(".window-header");
    header.addEventListener("mousedown", (e) => {
      // Abaikan jika klik di tombol kontrol
      if (e.target.closest(".window-controls")) return;
      // Bawa ke depan dulu sebelum drag
      this.bringToFront(id);
      this._startDrag(e, id);
    });

    // --- Klik di body untuk bring to front ---
    el.addEventListener("mousedown", (e) => {
      // Jika klik di header, sudah ditangani di atas. Tapi untuk body/isi, bawa ke depan.
      if (!e.target.closest(".window-header")) {
        this.bringToFront(id);
      }
    });

    // --- Resize handle (sederhana) ---
    if (resizable) {
      const handle = el.querySelector(".window-resize-handle");
      if (handle) {
        handle.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          this._startResize(e, id);
        });
      }
    }

    return el;
  }

  /**
   * Membuka window (menampilkan dan membawa ke depan).
   * @param {string} id
   */
  open(id) {
    const entry = this.windows.get(id);
    if (!entry) {
      console.warn(`[WindowManager] Window "${id}" tidak ditemukan.`);
      return;
    }
    if (entry.state === "open" || entry.state === "active") {
      this.bringToFront(id);
      return;
    }

    entry.element.style.display = "flex";
    entry.state = "open";
    this.bringToFront(id);
    EventBus.emit("window:opened", { windowId: id });
  }

  /**
   * Menutup window (menyembunyikan).
   * @param {string} id
   */
  close(id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    if (entry.state === "closed") return;

    entry.element.style.display = "none";
    entry.state = "closed";

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      // Fokus ke window lain yang terbuka
      for (const [winId, winEntry] of this.windows) {
        if (winEntry.state === "open" || winEntry.state === "active") {
          this.bringToFront(winId);
          break;
        }
      }
    }
    EventBus.emit("window:closed", { windowId: id });
  }

  /**
   * Minimize window (sembunyikan ke taskbar).
   * @param {string} id
   */
  minimize(id) {
    const entry = this.windows.get(id);
    if (!entry || entry.state === "closed" || entry.state === "minimized")
      return;

    // Simpan posisi saat ini agar restore bisa di posisi sama
    entry.savedRect = {
      top: entry.element.style.top,
      left: entry.element.style.left,
      width: entry.element.style.width,
      height: entry.element.style.height,
    };

    entry.element.style.display = "none";
    entry.state = "minimized";

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      for (const [winId, winEntry] of this.windows) {
        if (winEntry.state === "open" || winEntry.state === "active") {
          this.bringToFront(winId);
          break;
        }
      }
    }
    EventBus.emit("window:minimized", { windowId: id });
  }

  /**
   * Toggle Maximize / Restore.
   * @param {string} id
   */
  toggleMaximize(id) {
    const entry = this.windows.get(id);
    if (!entry || entry.state === "closed") return;

    if (entry.state === "maximized") {
      this._restore(id);
    } else {
      this._maximize(id);
    }
  }

  /**
   * Membawa window ke depan (z-index tertinggi) dan set status aktif.
   * @param {string} id
   */
  bringToFront(id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    if (entry.state === "closed") return;

    // Jika sedang minimized, kita tidak otomatis restore di sini (biar taskbar yang handle)
    if (entry.state === "minimized") {
      // Tapi kalau dipanggil dari taskbar, kita restore.
      // Kita fleksibel: jika dipanggil, kita buka saja.
      entry.element.style.display = "flex";
      entry.state = "open";
    }

    // Nonaktifkan semua window
    for (const [winId, winEntry] of this.windows) {
      if (winEntry.state === "closed" || winEntry.state === "minimized")
        continue;
      winEntry.element.classList.remove("active");
      winEntry.element.classList.add("inactive");
      if (winEntry.state === "active") winEntry.state = "inactive";
    }

    // Aktifkan window target
    this.zIndexCounter++;
    entry.element.style.zIndex = this.zIndexCounter;
    entry.element.classList.remove("inactive");
    entry.element.classList.add("active");
    entry.state = "active";

    this.activeWindowId = id;
    EventBus.emit("window:focused", { windowId: id });
  }

  /**
   * Cek apakah window sedang terbuka (termasuk minimized? tidak, 'open'/'active'/'maximized').
   */
  isOpen(id) {
    const entry = this.windows.get(id);
    if (!entry) return false;
    return ["open", "active", "maximized"].includes(entry.state);
  }

  /**
   * Cek apakah window ada dan tidak closed.
   */
  exists(id) {
    return this.windows.has(id);
  }

  // ============================================================
  //  INTERNAL: DRAG & RESIZE
  // ============================================================

  _startDrag(e, id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    const el = entry.element;

    const rect = el.getBoundingClientRect();
    this.dragState = {
      id: id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    document.addEventListener("mousemove", this._onDrag);
    document.addEventListener("mouseup", this._stopDrag);

    // Jangan biarkan teks ter-seleksi saat drag
    document.body.style.userSelect = "none";
    el.style.cursor = "grabbing";
    EventBus.emit("window:dragStart", { windowId: id });
  }

  _onDrag = (e) => {
    if (!this.dragState) return;
    const entry = this.windows.get(this.dragState.id);
    if (!entry) return;
    const el = entry.element;

    let left = e.clientX - this.dragState.offsetX;
    let top = e.clientY - this.dragState.offsetY;

    // Boundary agar tidak keluar layar (minimal 10px dari tepi)
    const maxX = window.innerWidth - 50;
    const maxY =
      window.innerHeight -
      60 -
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--taskbar-height"
        ) || 36
      );
    left = Math.max(10, Math.min(left, maxX));
    top = Math.max(10, Math.min(top, maxY));

    el.style.left = left + "px";
    el.style.top = top + "px";
  };

  _stopDrag = () => {
    if (this.dragState) {
      EventBus.emit("window:dragEnd", { windowId: this.dragState.id });
    }
    this.dragState = null;
    document.removeEventListener("mousemove", this._onDrag);
    document.removeEventListener("mouseup", this._stopDrag);
    document.body.style.userSelect = "";
    // Reset cursor di semua window
    for (const [_, entry] of this.windows) {
      entry.element.style.cursor = "";
    }
  };

  _startResize(e, id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    const el = entry.element;

    const rect = el.getBoundingClientRect();
    this.dragState = {
      id: id,
      isResize: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    document.addEventListener("mousemove", this._onResize);
    document.addEventListener("mouseup", this._stopResize);
    e.preventDefault();
  }

  _onResize = (e) => {
    if (!this.dragState || !this.dragState.isResize) return;
    const entry = this.windows.get(this.dragState.id);
    if (!entry) return;
    const el = entry.element;

    let newWidth =
      this.dragState.startWidth + (e.clientX - this.dragState.startX);
    let newHeight =
      this.dragState.startHeight + (e.clientY - this.dragState.startY);

    newWidth = Math.max(entry.options.minWidth || 200, newWidth);
    newHeight = Math.max(entry.options.minHeight || 120, newHeight);

    el.style.width = newWidth + "px";
    el.style.height = newHeight + "px";
  };

  _stopResize = () => {
    if (this.dragState?.isResize) {
      EventBus.emit("window:resizeEnd", { windowId: this.dragState.id });
    }
    this.dragState = null;
    document.removeEventListener("mousemove", this._onResize);
    document.removeEventListener("mouseup", this._stopResize);
  };

  // ============================================================
  //  INTERNAL: MAXIMIZE / RESTORE
  // ============================================================

  _maximize(id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    const el = entry.element;

    // Simpan posisi/ukuran saat ini
    entry.savedRect = {
      top: el.style.top,
      left: el.style.left,
      width: el.style.width,
      height: el.style.height,
    };

    const taskbarHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--taskbar-height"
      ) || 36
    );
    el.style.top = "0px";
    el.style.left = "0px";
    el.style.width = "100%";
    el.style.height = `calc(100% - ${taskbarHeight}px)`;
    el.style.borderRadius = "0";
    el.style.maxWidth = "100%";
    el.style.maxHeight = "100%";

    entry.state = "maximized";
    EventBus.emit("window:maximized", { windowId: id });
  }

  _restore(id) {
    const entry = this.windows.get(id);
    if (!entry || !entry.savedRect) return;
    const el = entry.element;

    const rect = entry.savedRect;
    el.style.top = rect.top || "60px";
    el.style.left = rect.left || "60px";
    el.style.width = rect.width || "400px";
    el.style.height = rect.height || "300px";
    el.style.borderRadius = "";
    el.style.maxWidth = "";
    el.style.maxHeight = "";

    entry.state = "open";
    // Bawa ke depan tapi tidak override status maximize
    this.bringToFront(id);
    EventBus.emit("window:restored", { windowId: id });
  }

  // ============================================================
  //  GLOBAL EVENTS (Keyboard, dll)
  // ============================================================

  _bindGlobalEvents() {
    // Klik di luar window untuk menurunkan fokus? Tidak, karena Windows 1.0
    // hanya fokus saat klik di window itu sendiri. Kita handle di event mousedown window.
  }
}
