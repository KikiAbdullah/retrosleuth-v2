/**
 * ============================================================
 *  CHARACTERDOSSIER.JS — Daftar & Profil Karakter
 *  Menampilkan informasi publik karakter (tanpa rahasia & TANPA SPOILER).
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { GameState } from "../core/Store.js";

export class CharacterDossier {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "dossier";
    this.detailWindowId = "dossier_detail";
    this.isOpen = false;

    // Update saat case dimuat
    EventBus.on("case:loaded", () => {
      if (this.wm.isOpen(this.windowId)) {
        this.renderContent();
      }
    });
  }

  /**
   * Membuka Dossier.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "👤 Character Dossier",
      width: 540,
      height: 420,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.renderContent();
    this.isOpen = true;
  }

  /**
   * Merender konten dossier (daftar karakter).
   * TANPA label "PELAKU" — sesuai prinsip deduksi.
   */
  renderContent() {
    const winEl = document.getElementById(`window_${this.windowId}`);
    if (!winEl) return;

    const body = winEl.querySelector(".window-body");
    if (!body) return;

    const activeCase = caseLoader.activeCase;
    if (!activeCase) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">👤 Tidak ada kasus aktif</p>
          <p style="font-size: 14px; color: #999;">Pilih kasus dari Case Files terlebih dahulu.</p>
        </div>
      `;
      return;
    }

    const characters = activeCase.characters || [];

    if (characters.length === 0) {
      body.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: var(--font-mono, monospace);">
          <p style="font-size: 18px; color: #666;">👤 Tidak ada karakter</p>
          <p style="font-size: 14px; color: #999;">Kasus ini belum memiliki karakter yang terdaftar.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 12px; font-family: var(--font-mono, monospace);">
        <h2 style="color: #000080; margin-bottom: 16px; font-size: 18px;">
          👤 Karakter (${characters.length})
        </h2>
        <p style="font-size: 13px; color: #666; margin-bottom: 12px;">
          Klik pada karakter untuk melihat profil lengkap dan status emosi.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 320px; overflow-y: auto; padding-right: 4px;">
    `;

    for (const char of characters) {
      const name = char.name || "???";
      const role = char.role || "Peran tidak diketahui";

      html += `
        <div class="dossier-card" data-char-id="${char.id}" style="
          border: 2px solid #ccc;
          padding: 12px 16px;
          cursor: pointer;
          background: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.15s;
        "
        onmouseover="this.style.borderColor='#000080'"
        onmouseout="this.style.borderColor='#ccc'"
        >
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <span style="font-size: 16px; font-weight: bold;">${name}</span>
              <span style="font-size: 13px; color: #666;">${role}</span>
            </div>
            <div style="font-size: 13px; color: #444; margin-top: 4px;">
              ${
                char.relationship_to_victim ||
                "Hubungan dengan korban tidak diketahui"
              }
            </div>
          </div>
          <div style="margin-left: 12px;">
            <button class="btn-view-char" data-char-id="${char.id}" style="
              padding: 4px 14px;
              background: #000080;
              color: #fff;
              border: none;
              font-family: var(--font-mono, monospace);
              font-size: 13px;
              cursor: pointer;
              box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
            "
            onmouseover="this.style.background='#0000a0'"
            onmouseout="this.style.background='#000080'"
            >
              🔍 Lihat Profil
            </button>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 8px;">
          <span>💡 Hubungan dan latar belakang bisa membantu menemukan motif.</span>
        </div>
      </div>
    `;

    body.innerHTML = html;

    // Event: Klik card → buka profil detail
    body.querySelectorAll(".dossier-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-view-char")) return;
        const charId = card.dataset.charId;
        this._showCharacterDetail(charId);
      });
    });

    // Event: Tombol "Lihat Profil"
    body.querySelectorAll(".btn-view-char").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const charId = btn.dataset.charId;
        this._showCharacterDetail(charId);
      });
    });
  }

  /**
   * Menampilkan profil detail karakter (publik, tanpa rahasia, TANPA spoiler).
   * @param {string} charId
   */
  _showCharacterDetail(charId) {
    const char = caseLoader.getCharacterData(charId);
    if (!char) return;

    const detailId = `${this.detailWindowId}_${charId}`;
    if (this.wm.isOpen(detailId)) {
      this.wm.bringToFront(detailId);
      return;
    }

    const winEl = this.wm.register(detailId, {
      title: `👤 ${char.name || "Karakter"}`,
      width: 480,
      height: 420,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");

    // Ambil emosi dari GameState
    const emotion = GameState.getInterrogationState(charId);

    body.innerHTML = `
      <div style="padding: 16px; font-family: var(--font-mono, monospace);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span style="font-size: 40px;">👤</span>
          <div>
            <h2 style="color: #000080; margin: 0; font-size: 22px;">${
              char.name || "???"
            }</h2>
            <span style="font-size: 14px; color: #666;">${
              char.role || "Peran tidak diketahui"
            }</span>
          </div>
        </div>

        ${char.age ? `<p><strong>Usia:</strong> ${char.age} tahun</p>` : ""}
        ${
          char.occupation
            ? `<p><strong>Pekerjaan:</strong> ${char.occupation}</p>`
            : ""
        }
        ${
          char.relationship_to_victim
            ? `<p><strong>Hubungan dengan Korban:</strong> ${char.relationship_to_victim}</p>`
            : ""
        }

        <hr style="border: 1px dashed #ccc; margin: 12px 0;">

        <h3 style="color: #000080; font-size: 16px; margin-bottom: 6px;">📖 Latar Belakang</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #333; max-height: 80px; overflow-y: auto;">
          ${char.background || "Tidak ada informasi latar belakang."}
        </p>

        <hr style="border: 1px dashed #ccc; margin: 12px 0;">

        <h3 style="color: #000080; font-size: 16px; margin-bottom: 6px;">🎭 Kepribadian</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #333;">
          ${char.personality || "Tidak ada informasi kepribadian."}
        </p>

        <hr style="border: 1px dashed #ccc; margin: 12px 0;">

        <h3 style="color: #000080; font-size: 16px; margin-bottom: 6px;">📌 Alibi</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #333;">
          ${char.alibi || "Tidak ada alibi yang terdaftar."}
        </p>

        ${
          emotion
            ? `
          <hr style="border: 1px dashed #ccc; margin: 12px 0;">
          <h3 style="color: #000080; font-size: 16px; margin-bottom: 6px;">😰 Status Emosi Saat Ini</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 14px;">
            <span>Trust: ${emotion.trust}%</span>
            <span>Stress: ${emotion.stress}%</span>
            <span>Fear: ${emotion.fear}%</span>
            <span>Anger: ${emotion.anger}%</span>
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 4px;">
            (Emosi berubah saat interogasi berlangsung)
          </p>
        `
            : ""
        }

        <div style="margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; display: flex; gap: 8px;">
          <button id="btn-interrogate-char" style="
            background: #000080;
            color: #fff;
            border: none;
            padding: 6px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
            box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
          ">🗣️ Interogasi (Fase 3)</button>
          <button id="btn-close-dossier-detail" style="
            background: #ccc;
            color: #000;
            border: none;
            padding: 6px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
          ">✕ Tutup</button>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
          ⚠️ Profil ini hanya menampilkan informasi publik. Rahasia dan kebohongan hanya terungkap melalui interogasi.
        </p>
      </div>
    `;

    this.wm.open(detailId);

    // Event: Interogasi (placeholder untuk Fase 3)
    body
      .querySelector("#btn-interrogate-char")
      ?.addEventListener("click", () => {
        console.log(`[Dossier] Membuka interogasi untuk ${charId} (Fase 3)`);
        this.wm.close(detailId);
        EventBus.emit("interrogation:start", { characterId: charId });
      });

    body
      .querySelector("#btn-close-dossier-detail")
      ?.addEventListener("click", () => {
        this.wm.close(detailId);
      });
  }
}
