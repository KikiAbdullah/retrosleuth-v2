/**
 * ============================================================
 *  CASEHUB.JS — Hub Pemilihan Kasus
 *  Menampilkan daftar kasus dari index.json.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { caseLoader } from "../engine/CaseLoader.js";

export class CaseHub {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.cases = [];
    this.selectedCase = null;
    this.windowId = "casehub";

    // Bind event
    EventBus.on("index:loaded", (data) => {
      this.cases = caseLoader.getCaseList();
      if (this.wm.isOpen(this.windowId)) {
        this.renderContent();
      }
    });

    // Jika index sudah dimuat sebelumnya
    if (caseLoader.globalIndex) {
      this.cases = caseLoader.getCaseList();
    }
  }

  /**
   * Membuka jendela CaseHub.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    // Daftarkan window
    const winEl = this.wm.register(this.windowId, {
      title: "📁 Case Files",
      width: 640,
      height: 480,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.renderContent();

    // Subscribe ke unload untuk cleanup
    EventBus.once("case:unloaded", () => {
      this.cases = caseLoader.getCaseList();
      if (this.wm.isOpen(this.windowId)) {
        this.renderContent();
      }
    });
  }

  /**
   * Merender konten di dalam window.
   */
  renderContent() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;

    const body = winEl.querySelector(".window-body");
    if (!body) return;

    // Cek apakah ada kasus
    if (!this.cases || this.cases.length === 0) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">📂 No cases available</p>
          <p style="font-size: 14px; color: #999; margin-top: 8px;">
            Make sure <strong>cases/</strong> folder has <strong>index.json</strong>
            and at least one case.
          </p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 12px; font-family: var(--font-mono, monospace);">
        <h2 style="color: #000080; margin-bottom: 16px; font-size: 20px;">
          📂 Case List (${this.cases.length})
        </h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

    for (const caseItem of this.cases) {
      const difficultyColor = this._getDifficultyColor(caseItem.difficulty);
      const isActive = this.selectedCase?.id === caseItem.id;

      html += `
        <div class="casehub-card ${isActive ? "selected" : ""}" 
             data-case-folder="${caseItem.folder}"
             style="
               border: 2px solid ${isActive ? "#000080" : "#ccc"};
               padding: 16px;
               cursor: pointer;
               background: ${isActive ? "#f0f0ff" : "#fff"};
               border-radius: 0;
               transition: all 0.15s;
               display: flex;
               justify-content: space-between;
               align-items: center;
               box-shadow: ${isActive ? "inset 0 0 0 1px #000080" : "none"};
             "
             onmouseover="this.style.borderColor='#000080'"
             onmouseout="this.style.borderColor='${
               isActive ? "#000080" : "#ccc"
             }'"
        >
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 18px; font-weight: bold;">${
                caseItem.title
              }</span>
              <span style="font-size: 13px; color: #666;">(${
                caseItem.year
              })</span>
              <span style="
                font-size: 12px;
                padding: 2px 8px;
                background: ${difficultyColor};
                color: #fff;
                font-weight: bold;
              ">${caseItem.difficulty || "N/A"}</span>
              <span style="font-size: 12px; color: #888;">
                ⏱️ ${caseItem.estimated_playtime_minutes || "?"} min
              </span>
            </div>
             <p style="margin-top: 6px; font-size: 14px; color: #444;">
               ${caseItem.description_short || "No description."}
             </p>
          </div>
          <div style="margin-left: 12px;">
            <button class="btn-load-case" data-case-folder="${caseItem.folder}" 
                    style="
                      padding: 8px 20px;
                      background: #000080;
                      color: #fff;
                      border: none;
                      font-family: var(--font-mono, monospace);
                      font-size: 14px;
                      cursor: pointer;
                      box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
                    "
                    onmouseover="this.style.background='#0000a0'"
                    onmouseout="this.style.background='#000080'"
            >
              🔍 Selidiki
            </button>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        ${
          this.selectedCase
            ? `
          <div style="margin-top: 16px; padding: 12px; background: #f0f0ff; border-left: 4px solid #000080;">
            <strong>Kasus dipilih:</strong> ${this.selectedCase.title}
            <button id="btn-load-selected" style="
              margin-left: 12px;
              padding: 4px 16px;
              background: #000080;
              color: #fff;
              border: none;
              font-family: var(--font-mono, monospace);
              cursor: pointer;
            ">Muat Kasus</button>
          </div>
        `
            : ""
        }
      </div>
    `;

    body.innerHTML = html;

    // --- Event Listeners ---
    // Klik pada card → pilih kasus
    body.querySelectorAll(".casehub-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // Jika klik tombol, jangan pilih card
        if (e.target.closest(".btn-load-case")) return;
        const folder = card.dataset.caseFolder;
        this._selectCase(folder);
      });
    });

    // Tombol "Selidiki" → load kasus
    body.querySelectorAll(".btn-load-case").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const folder = btn.dataset.caseFolder;
        this._selectCase(folder);
        this._loadSelectedCase();
      });
    });

    // Tombol "Muat Kasus" (di bawah)
    const loadBtn = body.querySelector("#btn-load-selected");
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        this._loadSelectedCase();
      });
    }
  }

  /**
   * Memilih kasus (tanpa memuat).
   * @param {string} folder
   */
  _selectCase(folder) {
    this.selectedCase = this.cases.find((c) => c.folder === folder) || null;
    this.renderContent();
  }

  /**
   * Memuat kasus yang sedang dipilih.
   */
  async _loadSelectedCase() {
    if (!this.selectedCase) return;

    try {
      // Tampilkan loading state
      const winEl = document.getElementById(`window_${this.windowId}`);
      if (winEl) {
        const body = winEl.querySelector(".window-body");
        body.innerHTML = `
          <div style="padding: 40px; text-align: center; font-family: var(--font-mono, monospace);">
            <p style="font-size: 18px;">⏳ Memuat kasus...</p>
            <p style="font-size: 14px; color: #666; margin-top: 8px;">${this.selectedCase.title}</p>
          </div>
        `;
      }

      await caseLoader.loadFullCase(this.selectedCase.folder);
      // Tutup CaseHub setelah load berhasil
      this.wm.close(this.windowId);
    } catch (error) {
      console.error("[CaseHub] Gagal memuat kasus:", error);
      this.renderContent();
      // Tampilkan error di window
      const winEl = document.getElementById(`window_${this.windowId}`);
      if (winEl) {
        const body = winEl.querySelector(".window-body");
        body.innerHTML = `
          <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
            <p style="font-size: 18px; color: #ff4444;">❌ Gagal memuat kasus</p>
            <p style="font-size: 14px; color: #666; margin-top: 8px;">${error.message}</p>
            <button onclick="this.closest('.window-body').dispatchEvent(new Event('render'))" 
                    style="margin-top: 16px; padding: 8px 20px; background: #000080; color: #fff; border: none; font-family: var(--font-mono, monospace); cursor: pointer;">
              🔄 Coba Lagi
            </button>
          </div>
        `;
        // Event listener untuk reload
        body.addEventListener("render", () => this.renderContent(), {
          once: true,
        });
      }
    }
  }

  /**
   * Mendapatkan warna untuk difficulty.
   * @param {string} difficulty
   * @returns {string}
   */
  _getDifficultyColor(difficulty) {
    const colors = {
      AMATEUR_SLEUTH: "#4CAF50",
      DETECTIVE: "#FF9800",
      EXPERT: "#f44336",
    };
    return colors[difficulty] || "#888";
  }
}
