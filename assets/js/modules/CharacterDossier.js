/**
 * ============================================================
 *  CHARACTERDOSSIER.JS — Database Polisi RetroSleuth
 *  Aplikasi resmi detektif: profil karakter & status emosi.
 *
 *  ATURAN INFORMASI:
 *  🟢 TAMPILKAN: name, age, role, occupation, relationship_to_victim,
 *     public_background, alibi, known_facts, personality, emotion
 *  🔴 SEMBUNYIKAN: background, private_background, truths, secrets,
 *     reactions_to_evidence, interrogation_phases, emotional_volatility,
 *     can_be_culprit, reveals_evidence, red_herring_note
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { GameState } from "../core/Store.js";

export class CharacterDossier {
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "dossier";
    this.detailWindowId = "dossier_detail";

    EventBus.on("case:loaded", () => {
      if (this.wm.isOpen(this.windowId)) {
        this._renderList();
      }
    });

    // Update status dot saat interogasi berlangsung
    EventBus.on("interrogation:stateChanged", () => {
      if (this.wm.isOpen(this.windowId)) {
        this._renderList();
      }
    });
  }

  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "Sistem Informasi Tersangka",
      width: 680,
      height: 520,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body dossier-body";

    this.wm.open(this.windowId);
    this._renderList();
  }

  _renderList() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;
    const body = winEl.querySelector(".window-body");
    if (!body) return;

    const activeCase = caseLoader.activeCase;
    if (!activeCase) {
      body.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">Tidak ada kasus aktif.<br>Pilih kasus dari Case Files.</div>`;
      return;
    }

    const chars = activeCase.characters || [];
    if (chars.length === 0) {
      body.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">Tidak ada karakter terdaftar.</div>`;
      return;
    }

    let cardHtml = "";
    for (const char of chars) {
      const img = caseLoader.getCharacterImage(char.id);
      const emotion = GameState.getInterrogationState(char.id);
      const hasInterrogated = !!emotion;
      const factsCount = char.known_facts?.length || 0;
      const trustLevel = emotion?.trust ?? 0;
      const statusClass = hasInterrogated ? (trustLevel >= 60 ? "cleared" : "pending") : "unknown";
      const statusText = hasInterrogated ? (trustLevel >= 60 ? "TERBUKA" : "DIPERIKSA") : "BELUM";

      cardHtml += `
        <div class="dossier-card" data-char-id="${char.id}">
          <div class="dossier-card-photo-wrap">
            ${img
              ? `<img class="dossier-card-photo" src="${img}" alt="${char.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              : ""
            }
            <div class="dossier-card-photo-placeholder" style="${img ? "display:none" : ""}">👤</div>
          </div>
          <div class="dossier-card-info">
            <div class="dossier-card-name-row">
              <span class="dossier-card-name">${char.name || "???"}</span>
            </div>
            <div class="dossier-card-meta">${char.role || "Peran tidak diketahui"}</div>
            ${char.age ? `<div class="dossier-card-meta">${char.age} tahun · ${char.occupation || ""}</div>` : ""}
            <div class="dossier-card-rel">${char.relationship_to_victim || ""}</div>
          </div>
          <div class="dossier-card-status">
            <div class="dossier-card-status-row">
              <span class="status-dot ${statusClass}"></span>
              <span class="dossier-card-status-text">${statusText}</span>
            </div>
            <button class="dossier-card-view-btn" data-char-id="${char.id}">📂 BUKA</button>
          </div>
        </div>`;
    }

    body.innerHTML = `
      <div class="dossier-topbar">
        <div>
          <div class="dossier-topbar-title">📋 DATA TERDUGA</div>
          <div class="dossier-topbar-subtitle">Sistem Informasi Tersangka — ${activeCase.meta?.title || "Kasus Aktif"}</div>
        </div>
        <div class="dossier-topbar-count">${chars.length} REKAM</div>
      </div>
      <div class="dossier-toolbar">
        <span class="dossier-toolbar-label">Filter:</span>
        <input class="dossier-search-input" type="text" placeholder="Cari nama..." disabled>
        <span style="flex:1"></span>
        <span style="font-size:11px;color:#888;">Klik kartu untuk buka profil →</span>
      </div>
      <div class="dossier-list">
        ${cardHtml}
      </div>`;

    body.querySelectorAll(".dossier-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".dossier-card-view-btn")) return;
        this._showCharacterDetail(card.dataset.charId);
      });
    });
    body.querySelectorAll(".dossier-card-view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._showCharacterDetail(btn.dataset.charId);
      });
    });
  }

  _showCharacterDetail(charId) {
    const char = caseLoader.getCharacterData(charId);
    if (!char) return;

    const img = caseLoader.getCharacterImage(charId);
    const detailId = `${this.detailWindowId}_${charId}`;
    if (this.wm.isOpen(detailId)) {
      this.wm.bringToFront(detailId);
      return;
    }

    const winEl = this.wm.register(detailId, {
      title: `Profil — ${char.name || "Tersangka"}`,
      width: 600,
      height: 600,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.className = "window-body dossier-detail-body";

    const knownFacts = char.known_facts?.length > 0 ? `
      <ul style="margin:0;padding-left:18px;">
        ${char.known_facts.map((f) => `<li style="margin:3px 0;">${f}</li>`).join("")}
      </ul>` : "<p style='color:#888;font-style:italic;'>Tidak ada fakta tambahan.</p>";

    body.innerHTML = `
      <div class="dossier-detail-header">
        <div class="dossier-detail-photo-wrap">
          ${img
            ? `<img class="dossier-detail-photo" src="${img}" alt="${char.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ""
          }
          <div class="dossier-detail-photo-placeholder" ${img ? 'style="display:none"' : ""}>👤</div>
        </div>
        <div class="dossier-detail-header-info">
          <div class="dossier-detail-name">${char.name || "???"}</div>
          <div class="dossier-detail-role">${char.role || "Peran tidak diketahui"}</div>
          <div class="dossier-detail-id">ID: ${charId.toUpperCase()}</div>
        </div>
      </div>

      <div class="dossier-detail-content">

        <div class="dossier-section">
          <div class="dossier-section-header">📋 DATA PRIBADI</div>
          <div class="dossier-section-body">
            <div class="dossier-info-grid">
              ${char.age ? `<span class="dossier-info-label">Usia</span><span class="dossier-info-value">${char.age} tahun</span>` : ""}
              ${char.occupation ? `<span class="dossier-info-label">Pekerjaan</span><span class="dossier-info-value">${char.occupation}</span>` : ""}
              <span class="dossier-info-label">Hubungan</span>
              <span class="dossier-info-value">${char.relationship_to_victim || "—"}</span>
            </div>
          </div>
        </div>

        <div class="dossier-section">
          <div class="dossier-section-header">📖 PROFIL PUBLIK</div>
          <div class="dossier-section-body">
            ${char.public_background || "Tidak ada informasi latar belakang."}
          </div>
        </div>

        <div class="dossier-section">
          <div class="dossier-section-header">📌 ALIBI</div>
          <div class="dossier-section-body">
            ${char.alibi || "Tidak ada alibi yang terdaftar."}
          </div>
        </div>

        <div class="dossier-section">
          <div class="dossier-section-header">🔍 FAKTA TERKAIT</div>
          <div class="dossier-section-body">
            ${knownFacts}
          </div>
        </div>

      </div>

      <div class="dossier-actions">
        <button class="dossier-btn" id="btn-interrogate-char">🗣️ INTEROGASI</button>
        <button class="dossier-btn dossier-btn-secondary" id="btn-close-detail">✕ TUTUP</button>
      </div>`;

    this.wm.open(detailId);

    body.querySelector("#btn-interrogate-char")?.addEventListener("click", () => {
      this.wm.close(detailId);
      EventBus.emit("interrogation:start", { characterId: charId });
    });
    body.querySelector("#btn-close-detail")?.addEventListener("click", () => {
      this.wm.close(detailId);
    });
  }
}
