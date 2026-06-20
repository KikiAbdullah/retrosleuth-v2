/**
 * ============================================================
 *  DESKTOPMANAGER.JS — Mengelola ikon di desktop
 * ============================================================
 */

export class DesktopManager {
  /**
   * @param {WindowManager} windowManager - Instance WindowManager.
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.icons = [
      { id: "casehub", icon: "📁", label: "Case Files", windowId: "casehub" },
      { id: "evidence", icon: "🔍", label: "Evidence", windowId: "evidence" },
      {
        id: "interrogation",
        icon: "🗣️",
        label: "Interrogation",
        windowId: "interrogation",
      },
      { id: "timeline", icon: "⏱️", label: "Timeline", windowId: "timeline" },
      { id: "notes", icon: "📝", label: "Notes", windowId: "notes" },
      {
        id: "accusation",
        icon: "⚖️",
        label: "Accusation",
        windowId: "accusation",
      },
      { id: "settings", icon: "⚙️", label: "Settings", windowId: "settings" },
    ];

    this.render();
  }

  render() {
    const desktop = document.getElementById("desktop");
    if (!desktop) return;

    // Hapus container ikon lama jika ada
    const oldContainer = document.getElementById("desktop-icons");
    if (oldContainer) oldContainer.remove();

    // Hapus wallpaper lama jika ada
    const oldWallpaper = document.getElementById("desktop-wallpaper");
    if (oldWallpaper) oldWallpaper.remove();

    // --- Wallpaper Logo ---
    const wallpaper = document.createElement("div");
    wallpaper.id = "desktop-wallpaper";
    wallpaper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 360px;
      height: 360px;
      background-image: url('assets/images/logo.png');
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      opacity: 0.06;
      pointer-events: none;
      z-index: 0;
    `;
    desktop.appendChild(wallpaper);

    const container = document.createElement("div");
    container.id = "desktop-icons";

    this.icons.forEach((icon) => {
      const el = document.createElement("div");
      el.className = "desktop-icon";
      el.dataset.windowId = icon.windowId;

      // === Tentukan emoji dan teks label ===
      let iconEmoji = "";
      let labelText = "";

      if (icon.icon) {
        // Format terpisah (seperti di constructor)
        iconEmoji = icon.icon;
        labelText = icon.label || "";
      } else if (icon.label) {
        // Format gabungan "📁 Case Files" (dari main.js)
        const spaceIndex = icon.label.indexOf(" ");
        if (spaceIndex > 0) {
          iconEmoji = icon.label.substring(0, spaceIndex);
          labelText = icon.label.substring(spaceIndex + 1).trim();
        } else {
          iconEmoji = icon.label; // fallback: seluruh teks jadi ikon
          labelText = "";
        }
      } else {
        iconEmoji = "📄";
        labelText = "Unknown";
      }

      // === Bangun elemen dengan dua span terpisah ===
      el.innerHTML = `
        <span class="icon-emoji">${iconEmoji}</span>
        <span class="icon-label">${labelText}</span>
      `;

      // Double Click → Buka Window
      el.addEventListener("dblclick", () => {
        this._openWindow(icon.windowId, labelText || icon.label);
      });

      // Single Click → Toggle selected
      el.addEventListener("click", () => {
        document
          .querySelectorAll(".desktop-icon")
          .forEach((ic) => ic.classList.remove("selected"));
        el.classList.add("selected");
      });

      container.appendChild(el);
    });

    desktop.prepend(container);
  }

  /**
   * Internal: Membuka window berdasarkan ID.
   * Jika window belum terdaftar, buat dengan konten placeholder.
   */
  _openWindow(id, title) {
    // Jika sudah terbuka, bawa ke depan
    if (this.wm.isOpen(id)) {
      this.wm.bringToFront(id);
      return;
    }

    // Jika window sudah terdaftar tapi tertutup, buka
    if (this.wm.exists(id)) {
      this.wm.open(id);
      return;
    }

    // Buat window baru
    const winEl = this.wm.register(id, {
      title: title,
      width: 520,
      height: 360,
      resizable: true,
      maximizable: true,
    });

    // Isi konten placeholder
    const body = winEl.querySelector(".window-body");
    body.innerHTML = `
      <div style="padding: 16px; font-family: var(--font-mono, monospace);">
        <h2 style="color: #000080; margin-bottom: 12px;">📂 ${title}</h2>
        <p style="color: #333; font-size: 15px; margin-bottom: 8px;">
          Ini adalah placeholder untuk <strong>${title}</strong>.
        </p>
        <p style="color: #666; font-size: 14px;">
          Konten sebenarnya akan hadir di <strong>Fase 2</strong> (Case Engine).
        </p>
        <div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-left: 4px solid #000080; font-size: 14px;">
          💡 Tip: Tutup window ini dengan tombol <strong>✕</strong> di pojok kanan atas.
        </div>
      </div>
    `;

    this.wm.open(id);
  }
}
