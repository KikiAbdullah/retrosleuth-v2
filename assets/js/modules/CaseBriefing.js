/**
 * ============================================================
 *  CASEBRIEFING.JS — Dokumen Briefing Kasus Resmi
 *  Estetika: Surat resmi kepolisian jadul yang keren
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { Markdown } from "../utils/Markdown.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";

export class CaseBriefing {
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "briefing";
    this.isOpen = false;

    EventBus.on("case:loaded", ({ caseData }) => {
      this.showBriefing(caseData);
    });
  }

  async showBriefing(caseData) {
    if (!caseData) return;

    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: `Briefing — ${caseData.meta.title}`,
      width: 760,
      height: 580,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body briefing";

    body.innerHTML = `
      <div class="briefing-loading">
        <div class="briefing-loading-text">⏳ Memuat dokumen briefing...</div>
      </div>`;

    this.wm.open(this.windowId);

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
      await Markdown.load();
      const html = Markdown.render(mdText);

      const victimPhoto = caseData.victim?.photo;
      const victimImage = victimPhoto ? caseLoader.getVictimImage(victimPhoto) : null;

      const victimName = caseData.victim?.name || "Tidak diketahui";
      const victimPhotoHtml = victimImage ? `
        <div class="briefing-victim-photo-wrap">
          <img class="briefing-victim-photo" src="${victimImage}" alt="${victimName}" onerror="this.style.display='none'">
        </div>` : `
        <div class="briefing-victim-photo-wrap" style="border:2px solid #1a3a6a;background:#d0c8b8;">
          <span style="font-size:28px;">👤</span>
        </div>`;

      const victimSection = `
        <div class="briefing-victim-section">
          ${victimPhotoHtml}
          <div class="briefing-victim-info">
            <span class="briefing-victim-label">Korban</span>
            <span class="briefing-victim-name">${victimName}</span>
            <div class="briefing-info-grid" style="margin-top:4px;">
              ${caseData.victim?.age ? `<span class="briefing-info-label">Usia</span><span class="briefing-info-value">${caseData.victim.age} tahun</span>` : ""}
              ${caseData.victim?.occupation ? `<span class="briefing-info-label">Pekerjaan</span><span class="briefing-info-value">${caseData.victim.occupation}</span>` : ""}
              ${caseData.victim?.cause_of_death ? `<span class="briefing-info-label">Penyebab Kematian</span><span class="briefing-info-value">${caseData.victim.cause_of_death}</span>` : ""}
              ${caseData.victim?.time_of_death ? `<span class="briefing-info-label">Estimasi Waktu</span><span class="briefing-info-value">${caseData.victim.time_of_death}</span>` : ""}
              ${caseData.victim?.location ? `<span class="briefing-info-label">Lokasi</span><span class="briefing-info-value">${caseData.victim.location}</span>` : ""}
            </div>
          </div>
        </div>`;

      body.innerHTML = `
        <div class="briefing-topbar">
          <div class="briefing-topbar-left">
            <div class="briefing-topbar-title">📋 BRIEFING KASUS</div>
            <div class="briefing-topbar-case">${caseData.meta.title || "Kasus Tidak Dikenal"}</div>
          </div>
          <div class="briefing-topbar-badge">RAHASIA</div>
        </div>

        <div class="briefing-doc">
          <div class="briefing-header">
            <div class="briefing-header-icon">⚖️</div>
            <h1>Briefing Kasus</h1>
            <h2>${caseData.meta.title || ""}</h2>
          </div>

          <hr class="briefing-divider-thick">

          ${victimSection}

          <div class="briefing-section">
            <div class="briefing-section-title">📄 Detail Kasus</div>
            <div class="briefing-section-body">
              ${html}
            </div>
          </div>

          <hr class="briefing-divider">
        </div>

        <div class="briefing-actions">
          <button class="briefing-btn" id="btn-evidence-briefing">🔍 LIHAT BUKTI</button>
          <button class="briefing-btn briefing-btn-secondary" id="btn-close-briefing">✕ TUTUP</button>
        </div>`;

      body.querySelector("#btn-close-briefing")?.addEventListener("click", () => {
        this.wm.close(this.windowId);
      });

      body.querySelector("#btn-evidence-briefing")?.addEventListener("click", () => {
        EventBus.emit("evidence:view", {});
      });

      if (caseData.initial_evidence && caseData.initial_evidence.length > 0) {
        evidenceEngine.unlockInitialEvidence(caseData.initial_evidence);
      }

      this.isOpen = true;
    } catch (error) {
      console.error("[CaseBriefing] Gagal memuat briefing:", error);
      body.innerHTML = `
        <div class="briefing-topbar">
          <div class="briefing-topbar-left">
            <div class="briefing-topbar-title">📋 BRIEFING KASUS</div>
          </div>
          <div class="briefing-topbar-badge" style="background:rgba(139,0,0,0.4);border-color:rgba(255,100,100,0.3);">ERROR</div>
        </div>
        <div class="briefing-error">
          <div class="briefing-error-icon">❌</div>
          <div class="briefing-error-title">Gagal Memuat Briefing</div>
          <div class="briefing-error-msg">${error.message}</div>
          <button class="briefing-btn" onclick="location.reload()">🔄 COBA LAGI</button>
        </div>`;
    }
  }

  close() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.close(this.windowId);
    }
    this.isOpen = false;
  }
}
