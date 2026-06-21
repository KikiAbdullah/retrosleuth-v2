/**
 * ============================================================
 *  EVIDENCEVIEWER.JS — File Manager Bukti Resmi
 *  Estetika: Dokumen kepolisian jadul yang keren
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";
import { Markdown } from "../utils/Markdown.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { SearchEngine } from "../utils/SearchEngine.js";
import { Security } from "../utils/Security.js";
// Note: SearchEngine and Security use .js extension for ES module compatibility

export class EvidenceViewer {
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "evidence";
    this.detailWindowId = "evidence_detail";

    EventBus.on("evidence:unlocked", () => {
      if (this.wm.isOpen(this.windowId)) {
        this._renderGrid();
      }
    });

    EventBus.on("evidence:view", () => {
      this.open();
    });
  }

  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "Evidence File Manager",
      width: 720,
      height: 520,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body evidence-body";

    this.wm.open(this.windowId);
    this._renderGrid();
  }

  _renderGrid() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;
    const body = winEl.querySelector(".window-body");
    if (!body) return;

    if (!caseLoader.activeCase) {
      body.innerHTML = `
        <div class="evidence-empty">
          <div class="evidence-empty-icon">📂</div>
          <div class="evidence-empty-text">Tidak ada kasus aktif</div>
          <div class="evidence-empty-hint">Pilih kasus dari Case Files terlebih dahulu.</div>
        </div>`;
      return;
    }

    const discovered = evidenceEngine.getDiscoveredEvidence();
    const allEvidence = evidenceEngine.getAllEvidence();

    if (allEvidence.length === 0) {
      body.innerHTML = `
        <div class="evidence-empty">
          <div class="evidence-empty-icon">📄</div>
          <div class="evidence-empty-text">Tidak ada bukti</div>
          <div class="evidence-empty-hint">Kasus ini belum memiliki bukti terdaftar.</div>
        </div>`;
      return;
    }

    const total = allEvidence.length;
    const found = discovered.length;
    const folders = evidenceEngine.getFolders();

    let tabsHtml = `<button class="evi-tab active" data-folder="all">Semua</button>`;
    for (const folder of folders) {
      tabsHtml += `<button class="evi-tab" data-folder="${folder}">${folder}</button>`;
    }

    let gridHtml = "";
    for (const evi of allEvidence) {
      const isFound = discovered.some((d) => d.id === evi.id);
      const icon = isFound ? (evi.icon || "📄") : "🔒";
      const title = isFound ? evi.title : "???";
      const desc = isFound ? (evi.description_short || "") : "Belum ditemukan";

      gridHtml += `
        <div class="evidence-item ${isFound ? "found" : "locked"}" data-evi-id="${evi.id}">
          <div class="evidence-item-icon">${icon}</div>
          <div class="evidence-item-title">${title}</div>
          ${isFound ? `<div class="evidence-item-desc">${desc}</div>` : ""}
          ${isFound ? `<div class="evidence-item-badge">✅ DITEMUKAN</div>` : ""}
        </div>`;
    }

    body.innerHTML = `
      <div class="evidence-topbar">
        <div class="evidence-topbar-left">
          <div class="evidence-topbar-title">📄 EVIDENCE FILE</div>
          <div class="evidence-topbar-subtitle">Berkas Bukti Kasus — ${caseLoader.activeCase.meta?.title || ""}</div>
        </div>
        <div class="evidence-topbar-stats">${found} / ${total} DITEMUKAN</div>
      </div>

      <div class="evidence-toolbar">
        ${tabsHtml}
      </div>

      <!-- Search Box -->
      <div class="evidence-search-container">
        <input type="text" class="evidence-search-input" id="evi-search" placeholder="🔍 Cari bukti..." />
        <span class="evidence-search-hint" id="evi-search-hint"></span>
      </div>

      <div class="evidence-grid-container">
        <div id="evidence-grid">
          ${gridHtml}
        </div>
      </div>

      <div class="evidence-legend">
        <span>📄 = Ditemukan</span>
        <span>🔒 = Belum ditemukan</span>
      </div>`;

    // Tab switching
    body.querySelectorAll(".evi-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        body.querySelectorAll(".evi-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this._filterEvidence(tab.dataset.folder);
      });
    });

    // Click bukti
    body.querySelectorAll(".evidence-item.found").forEach((item) => {
      item.addEventListener("click", () => {
        this._showEvidenceDetail(item.dataset.eviId);
      });
    });

    // --- Search ---
    const searchInput = body.querySelector("#evi-search");
    const searchHint = body.querySelector("#evi-search-hint");
    if (searchInput) {
      // Build search index dari bukti yang ada (hanya yang sudah ditemukan)
      const buildIndex = () => {
        const discovered = evidenceEngine.getDiscoveredEvidence();
        const docs = discovered.map((e) => ({
          id: e.id,
          title: e.title || "",
          content: e.description_short || e.title || "",
          type: "evidence",
        }));
        SearchEngine.buildIndex(docs);
      };
      buildIndex();

      let searchTimeout = null;
      searchInput.addEventListener("input", () => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const query = searchInput.value.trim();
          if (query.length === 0) {
            searchHint.textContent = "";
            // Reset: tampilkan semua
            body.querySelectorAll(".evidence-item").forEach((item) => {
              item.style.display = "";
            });
            return;
          }
          const results = SearchEngine.search(query, { maxResults: 20 });
          const resultIds = new Set(results.map((r) => r.id));
          body.querySelectorAll(".evidence-item").forEach((item) => {
            item.style.display = resultIds.has(item.dataset.eviId) ? "" : "none";
          });
          searchHint.textContent = `${results.length} hasil ditemukan`;
        }, 300);
      });
    }
  }

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

  async _showEvidenceDetail(eviId) {
    const evi = evidenceEngine.getEvidenceMeta(eviId);
    if (!evi) return;

    const detailId = `${this.detailWindowId}_${eviId}`;
    if (this.wm.isOpen(detailId)) {
      this.wm.bringToFront(detailId);
      return;
    }

    const winEl = this.wm.register(detailId, {
      title: `Bukti — ${evi.title}`,
      width: 640,
      height: 500,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body evidence-detail-body";

    body.innerHTML = `
      <div class="evidence-detail-header">
        <div class="evidence-detail-header-left">
          <div class="evidence-detail-icon">${evi.icon || "📄"}</div>
          <div>
            <div class="evidence-detail-title">${evi.title}</div>
            <div class="evidence-detail-id">ID: ${eviId.toUpperCase()}</div>
          </div>
        </div>
        <div class="evidence-detail-badge">BUKTI</div>
      </div>
      <div class="evidence-loading">
        <div class="evidence-loading-text">⏳ Memuat dokumen bukti...</div>
      </div>`;

    this.wm.open(detailId);

    try {
      const content = await evidenceEngine.getEvidenceContent(eviId);
      await Markdown.load();
      const html = Markdown.render(content);

      body.innerHTML = `
        <div class="evidence-detail-header">
          <div class="evidence-detail-header-left">
            <div class="evidence-detail-icon">${evi.icon || "📄"}</div>
            <div>
              <div class="evidence-detail-title">${evi.title}</div>
              <div class="evidence-detail-id">ID: ${eviId.toUpperCase()}</div>
            </div>
          </div>
          <div class="evidence-detail-badge">BUKTI</div>
        </div>
        <div class="evidence-detail-content">
          ${html}
        </div>
        <div class="evidence-detail-footer">
          <span>ID: ${eviId.toUpperCase()}</span>
          <button class="evidence-btn" id="btn-close-detail">✕ TUTUP</button>
        </div>`;

      body.querySelector("#btn-close-detail")?.addEventListener("click", () => {
        this.wm.close(detailId);
      });
    } catch (error) {
      console.error("[EvidenceViewer] Gagal memuat detail bukti:", error);
      body.innerHTML = `
        <div class="evidence-detail-header" style="background:#5a1a1a;">
          <div class="evidence-detail-header-left">
            <div class="evidence-detail-icon">❌</div>
            <div>
              <div class="evidence-detail-title">Error</div>
            </div>
          </div>
        </div>
        <div class="evidence-error">
          <div class="evidence-error-title">Gagal Memuat Konten</div>
          <div class="evidence-error-msg">${error.message}</div>
        </div>`;
    }
  }
}
