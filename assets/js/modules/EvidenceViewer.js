/**
 * ============================================================
 *  EVIDENCEVIEWER.JS — Viewer Bukti
 *  Menampilkan grid bukti yang sudah ditemukan.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";
import { Markdown } from "../utils/Markdown.js";
import { caseLoader } from "../engine/CaseLoader.js";

export class EvidenceViewer {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "evidence";
    this.detailWindowId = "evidence_detail";
    this.isOpen = false;

    // Update saat bukti baru ditemukan
    EventBus.on("evidence:unlocked", () => {
      if (this.wm.isOpen(this.windowId)) {
        this.renderContent();
      }
    });

    // Event untuk membuka viewer dari luar
    EventBus.on("evidence:view", () => {
      this.open();
    });
  }

  /**
   * Membuka Evidence Viewer.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "🔍 Evidence File Manager",
      width: 580,
      height: 420,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.renderContent();
    this.isOpen = true;
  }

  /**
   * Merender konten viewer.
   */
  renderContent() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;

    const body = winEl.querySelector(".window-body");
    if (!body) return;

    const discovered = evidenceEngine.getDiscoveredEvidence();
    const allEvidence = evidenceEngine.getAllEvidence();

    // Cek apakah ada kasus aktif
    if (!caseLoader.activeCase) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">📂 Tidak ada kasus aktif</p>
          <p style="font-size: 14px; color: #999;">Pilih kasus dari Case Files terlebih dahulu.</p>
        </div>
      `;
      return;
    }

    // Cek apakah ada bukti
    if (allEvidence.length === 0) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">📄 Tidak ada bukti</p>
          <p style="font-size: 14px; color: #999;">Kasus ini belum memiliki bukti yang terdaftar.</p>
        </div>
      `;
      return;
    }

    // Statistik
    const total = allEvidence.length;
    const found = discovered.length;

    let html = `
      <div style="padding: 12px; font-family: var(--font-mono, monospace);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <h2 style="color: #000080; font-size: 18px; margin: 0;">📄 Bukti</h2>
          <span style="font-size: 14px; color: #666;">
            Ditemukan: <strong style="color: #000080;">${found}</strong> / ${total}
          </span>
        </div>

        <!-- Folder Tabs -->
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 2px solid #ccc; padding-bottom: 8px;">
          <button class="evi-tab active" data-folder="all" style="
            padding: 4px 12px;
            background: #000080;
            color: #fff;
            border: none;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
            font-size: 13px;
          ">Semua</button>
    `;

    const folders = evidenceEngine.getFolders();
    for (const folder of folders) {
      html += `
        <button class="evi-tab" data-folder="${folder}" style="
          padding: 4px 12px;
          background: #ddd;
          color: #000;
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 13px;
        ">${folder}</button>
      `;
    }

    html += `
        </div>

        <!-- Grid Bukti -->
        <div id="evidence-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          max-height: 280px;
          overflow-y: auto;
          padding: 4px;
        ">
    `;

    // Tampilkan semua bukti (tapi yang belum ditemukan di-lock)
    for (const evi of allEvidence) {
      const isFound = discovered.some((d) => d.id === evi.id);
      const icon = isFound ? evi.icon || "📄" : "🔒";
      const title = isFound ? evi.title : "???";
      const desc = isFound ? evi.description_short : "Belum ditemukan";
      const opacity = isFound ? "1" : "0.5";
      const cursor = isFound ? "pointer" : "default";

      html += `
        <div class="evidence-item ${isFound ? "found" : "locked"}" 
             data-evi-id="${evi.id}"
             style="
               border: 2px solid ${isFound ? "#000080" : "#ccc"};
               padding: 12px 8px;
               text-align: center;
               background: ${isFound ? "#f8f8ff" : "#f5f5f5"};
               cursor: ${cursor};
               opacity: ${opacity};
               transition: all 0.15s;
               ${isFound ? "hover: border-color: #0000c0;" : ""}
             "
        >
          <div style="font-size: 32px;">${icon}</div>
          <div style="font-size: 13px; font-weight: bold; margin-top: 4px; word-break: break-word;">
            ${title}
          </div>
          <div style="font-size: 11px; color: #888; margin-top: 2px;">
            ${isFound ? desc : "🔒 Terkunci"}
          </div>
          ${
            isFound
              ? `<div style="font-size: 10px; color: #000080; margin-top: 4px;">✅ Ditemukan</div>`
              : ""
          }
        </div>
      `;
    }

    html += `
        </div>

        <!-- Legend -->
        <div style="margin-top: 12px; display: flex; gap: 16px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
          <span>📄 = Ditemukan</span>
          <span>🔒 = Belum ditemukan</span>
        </div>
      </div>
    `;

    body.innerHTML = html;

    // --- Event: Tab switching ---
    body.querySelectorAll(".evi-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        // Update active tab style
        body.querySelectorAll(".evi-tab").forEach((t) => {
          t.style.background = "#ddd";
          t.style.color = "#000";
        });
        tab.style.background = "#000080";
        tab.style.color = "#fff";

        const folder = tab.dataset.folder;
        this._filterEvidence(folder);
      });
    });

    // --- Event: Klik bukti untuk lihat detail ---
    body.querySelectorAll(".evidence-item.found").forEach((item) => {
      item.addEventListener("click", () => {
        const eviId = item.dataset.eviId;
        this._showEvidenceDetail(eviId);
      });
    });
  }

  /**
   * Filter bukti berdasarkan folder.
   * @param {string} folder - Nama folder atau 'all'
   */
  _filterEvidence(folder) {
    const grid = document.querySelector("#evidence-grid");
    if (!grid) return;

    const items = grid.querySelectorAll(".evidence-item");
    const allEvidence = evidenceEngine.getAllEvidence();

    for (const item of items) {
      const eviId = item.dataset.eviId;
      const evi = allEvidence.find((e) => e.id === eviId);
      if (!evi) continue;

      let show = false;
      if (folder === "all") {
        show = true;
      } else {
        const structure = caseLoader.activeCase?.evidence_structure;
        if (structure && structure[folder]) {
          show = structure[folder].includes(eviId);
        }
      }
      item.style.display = show ? "" : "none";
    }
  }

  /**
   * Menampilkan detail bukti di jendela terpisah.
   * @param {string} eviId
   */
  async _showEvidenceDetail(eviId) {
    const evi = evidenceEngine.getEvidenceMeta(eviId);
    if (!evi) return;

    // Cek jika sudah terbuka
    const detailId = `${this.detailWindowId}_${eviId}`;
    if (this.wm.isOpen(detailId)) {
      this.wm.bringToFront(detailId);
      return;
    }

    const winEl = this.wm.register(detailId, {
      title: `📄 ${evi.title}`,
      width: 540,
      height: 400,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body"; // Putih untuk readability

    // Tampilkan loading
    body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: var(--font-mono, monospace);">
        <p>⏳ Memuat detail bukti...</p>
      </div>
    `;

    this.wm.open(detailId);

    // Muat konten
    try {
      const content = await evidenceEngine.getEvidenceContent(eviId);
      await Markdown.load();
      const html = Markdown.render(content);

      body.innerHTML = `
        <div style="padding: 16px; max-width: 100%; overflow-wrap: break-word; font-size: 14px; line-height: 1.6;">
          ${html}
        </div>
        <div style="padding: 8px 16px; border-top: 1px solid #eee; background: #f8f8f8; display: flex; justify-content: space-between; font-size: 12px; color: #888;">
          <span>ID: ${eviId}</span>
          <button id="btn-close-detail" style="
            background: none;
            border: none;
            color: #000080;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
            font-size: 13px;
          ">✕ Tutup</button>
        </div>
      `;

      body.querySelector("#btn-close-detail")?.addEventListener("click", () => {
        this.wm.close(detailId);
      });
    } catch (error) {
      console.error("[EvidenceViewer] Gagal memuat detail bukti:", error);
      body.innerHTML = `
        <div style="padding: 20px; color: #ff4444; font-family: var(--font-mono, monospace);">
          <p>❌ Gagal memuat konten</p>
          <p style="font-size: 14px; color: #ff8888;">${error.message}</p>
        </div>
      `;
    }
  }
}
