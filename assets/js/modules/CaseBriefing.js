/**
 * ============================================================
 *  CASEBRIEFING.JS — Menampilkan Briefing Kasus
 *  Merender briefing.md dengan Markdown.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { Markdown } from "../utils/Markdown.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";

export class CaseBriefing {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "briefing";
    this.isOpen = false;

    // Auto-open saat case:loaded
    EventBus.on("case:loaded", ({ caseData }) => {
      this.showBriefing(caseData);
    });
  }

  /**
   * Menampilkan briefing untuk kasus yang dimuat.
   * @param {Object} caseData
   */
  async showBriefing(caseData) {
    if (!caseData) return;

    // Buka window
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: `📋 Briefing — ${caseData.meta.title}`,
      width: 620,
      height: 480,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body terminal"; // Mode terminal untuk efek retro

    // Tampilkan loading
    body.innerHTML = `
      <div style="padding: 20px; color: #33ff33; font-size: 16px;">
        <p>⏳ Memuat briefing...</p>
      </div>
    `;

    this.wm.open(this.windowId);

    // Muat konten briefing
    try {
      const briefingFile = caseData.assets?.briefing_file || "briefing.md";
      const folder = caseLoader.globalIndex?.cases_list.find(
        (c) => c.id === caseData.id
      )?.folder;
      if (!folder) throw new Error("Folder kasus tidak ditemukan");

      const url = `${caseLoader.basePath}/${folder}/${briefingFile}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const mdText = await response.text();

      // Render Markdown
      await Markdown.load();
      const html = Markdown.render(mdText);

      // Tampilkan konten
      body.innerHTML = `
        <div style="padding: 8px; max-width: 100%; overflow-wrap: break-word;">
          ${html}
        </div>
        <div style="margin-top: 16px; border-top: 1px solid #1a4d1a; padding-top: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
          <button id="btn-close-briefing" style="
            background: #1a4d1a;
            color: #33ff33;
            border: 1px solid #33ff33;
            padding: 6px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
          ">📁 Kembali ke Kasus</button>
          <button id="btn-evidence-briefing" style="
            background: #1a4d1a;
            color: #33ff33;
            border: 1px solid #33ff33;
            padding: 6px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
          ">🔍 Lihat Bukti</button>
        </div>
      `;

      // Event: Tutup briefing
      body
        .querySelector("#btn-close-briefing")
        ?.addEventListener("click", () => {
          this.wm.close(this.windowId);
        });

      // Event: Buka Evidence Viewer
      body
        .querySelector("#btn-evidence-briefing")
        ?.addEventListener("click", () => {
          EventBus.emit("evidence:view", {});
        });

      // Buka bukti awal
      if (caseData.initial_evidence && caseData.initial_evidence.length > 0) {
        evidenceEngine.unlockInitialEvidence(caseData.initial_evidence);
      }

      this.isOpen = true;
    } catch (error) {
      console.error("[CaseBriefing] Gagal memuat briefing:", error);
      body.innerHTML = `
        <div style="padding: 20px; color: #ff4444;">
          <p>❌ Gagal memuat briefing</p>
          <p style="color: #ff8888; font-size: 14px;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 12px; padding: 6px 16px; background: #1a4d1a; color: #33ff33; border: 1px solid #33ff33; font-family: var(--font-mono, monospace); cursor: pointer;">
            🔄 Coba Lagi
          </button>
        </div>
      `;
    }
  }

  /**
   * Menutup briefing.
   */
  close() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.close(this.windowId);
    }
    this.isOpen = false;
  }
}
