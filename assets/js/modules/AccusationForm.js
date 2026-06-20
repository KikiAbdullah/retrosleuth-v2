/**
 * ============================================================
 *  ACCUSATIONFORM.JS — Formulir Tuduhan Pemain
 *  Menampilkan dropdown pelaku, bukti, dan motif.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "../engine/CaseLoader.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";
import { SolutionEngine } from "../engine/SolutionEngine.js";
import { Markdown } from "../utils/Markdown.js";

export class AccusationForm {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "accusation";
    this.isOpen = false;
    this.resultWindowId = "accusation_result";

    // Listen untuk reset jika case di-unload
    EventBus.on("case:unloaded", () => {
      if (this.wm.isOpen(this.windowId)) {
        this.wm.close(this.windowId);
      }
    });
  }

  /**
   * Membuka form tuduhan.
   */
  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    // Cek apakah ada kasus aktif
    if (!caseLoader.activeCase) {
      alert(
        "⚠️ Tidak ada kasus yang sedang aktif. Pilih kasus terlebih dahulu."
      );
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "⚖️ Ajukan Tuduhan",
      width: 560,
      height: 480,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this.isOpen = true;
    this._buildUI(winEl);
  }

  /**
   * Membangun UI form.
   * @param {HTMLElement} winEl
   */
  _buildUI(winEl) {
    const body = winEl.querySelector(".window-body");
    body.style.padding = "16px";
    body.style.fontFamily = "var(--font-mono, monospace)";

    const activeCase = caseLoader.activeCase;
    const characters = activeCase.characters || [];
    const discovered = evidenceEngine.getDiscoveredEvidence();
    const allEvidence = evidenceEngine.getAllEvidence();
    const solution = activeCase.solution_matrix;

    // Cek apakah semua bukti sudah ditemukan
    const requiredSecondary = solution?.secondary_evidence || [];
    const foundCount = discovered.length;
    const totalRequired = requiredSecondary.length + 1; // +1 untuk primary

    let html = `
      <div style="max-height: 100%; overflow-y: auto;">
        <h2 style="color: #000080; margin-bottom: 8px;">⚖️ Ajukan Tuduhan</h2>
        <p style="font-size: 13px; color: #666; margin-bottom: 16px;">
          Isi formulir di bawah ini untuk mengajukan tuduhan resmi.
          <br>
          <strong>Bukti ditemukan:</strong> ${foundCount} / ${
      allEvidence.length
    }
          ${
            requiredSecondary.length > 0
              ? ` | <strong>Bukti wajib:</strong> ${
                  requiredSecondary.length + 1
                }`
              : ""
          }
        </p>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: bold; margin-bottom: 4px;">👤 Pelaku</label>
          <select id="acc-culprit" style="
            width: 100%;
            padding: 6px;
            font-family: var(--font-mono, monospace);
            border: 2px solid #888;
            background: #fff;
          ">
            <option value="">-- Pilih Pelaku --</option>
    `;

    for (const char of characters) {
      const canBeCulprit = char.can_be_culprit !== false;
      html += `
        <option value="${char.id}" ${
        !canBeCulprit ? 'style="color:#999;"' : ""
      }>
          ${char.name} ${!canBeCulprit ? "(kemungkinan kecil)" : ""}
        </option>
      `;
    }

    html += `
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: bold; margin-bottom: 4px;">📝 Motif</label>
          <textarea id="acc-motive" rows="2" style="
            width: 100%;
            padding: 6px;
            font-family: var(--font-mono, monospace);
            border: 2px solid #888;
            resize: vertical;
          " placeholder="Tulis motif pembunuhan..."></textarea>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: bold; margin-bottom: 4px;">📄 Bukti Primer (Wajib)</label>
          <select id="acc-primary" style="
            width: 100%;
            padding: 6px;
            font-family: var(--font-mono, monospace);
            border: 2px solid #888;
            background: #fff;
          ">
            <option value="">-- Pilih Bukti Primer --</option>
    `;

    for (const evi of discovered) {
      html += `
        <option value="${evi.id}">${evi.icon || "📄"} ${evi.title}</option>
      `;
    }

    if (discovered.length === 0) {
      html += `<option value="" disabled>⚠️ Belum ada bukti ditemukan</option>`;
    }

    html += `
          </select>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: bold; margin-bottom: 4px;">
            📎 Bukti Sekunder (Pilih minimal ${requiredSecondary.length})
          </label>
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            padding: 8px;
            border: 2px solid #888;
            max-height: 120px;
            overflow-y: auto;
            background: #fafafa;
          ">
    `;

    for (const evi of discovered) {
      const isRequired = requiredSecondary.includes(evi.id);
      html += `
        <label style="display: flex; align-items: center; gap: 4px; font-size: 13px; ${
          isRequired ? "font-weight: bold;" : ""
        }">
          <input type="checkbox" class="acc-secondary" value="${evi.id}" ${
        isRequired ? 'data-required="true"' : ""
      }>
          ${evi.icon || "📄"} ${evi.title} ${isRequired ? "⭐" : ""}
        </label>
      `;
    }

    if (discovered.length === 0) {
      html += `<span style="color: #999; grid-column: 1/3; text-align: center;">Belum ada bukti ditemukan</span>`;
    }

    html += `
          </div>
          ${
            requiredSecondary.length > 0
              ? `<p style="font-size: 11px; color: #888; margin-top: 4px;">⭐ = Bukti wajib (harus dipilih)</p>`
              : ""
          }
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 2px solid #ccc; padding-top: 12px;">
          <button id="btn-submit-accusation" style="
            background: #000080;
            color: #fff;
            border: none;
            padding: 8px 24px;
            font-family: var(--font-mono, monospace);
            font-size: 16px;
            cursor: pointer;
            box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
          ">⚖️ Ajukan Tuduhan</button>
          <button id="btn-cancel-accusation" style="
            background: #ccc;
            color: #000;
            border: none;
            padding: 8px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
          ">✕ Batal</button>
          <span style="margin-left: auto; font-size: 12px; color: #888;">
            Percobaan: ${GameState.accusationAttempts}
          </span>
        </div>

        ${
          GameState.accusationAttempts > 0
            ? `
          <div style="margin-top: 12px; padding: 8px; background: #fff3e0; border-left: 4px solid #FF9800; font-size: 13px;">
            💡 ${SolutionEngine.getHintByAttempts(GameState.accusationAttempts)}
          </div>
        `
            : ""
        }
      </div>
    `;

    body.innerHTML = html;

    // --- Event Listeners ---

    // Submit tuduhan
    body
      .querySelector("#btn-submit-accusation")
      .addEventListener("click", () => {
        this._submitAccusation(body);
      });

    // Cancel
    body
      .querySelector("#btn-cancel-accusation")
      .addEventListener("click", () => {
        this.wm.close(this.windowId);
      });

    // Enter key di textarea
    body.querySelector("#acc-motive").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        this._submitAccusation(body);
      }
    });
  }

  /**
   * Memproses pengajuan tuduhan.
   * @param {HTMLElement} body
   */
  _submitAccusation(body) {
    // Ambil nilai dari form
    const culpritId = body.querySelector("#acc-culprit").value;
    const motive = body.querySelector("#acc-motive").value.trim();
    const primaryEvidence = body.querySelector("#acc-primary").value;
    const secondaryCheckboxes = body.querySelectorAll(".acc-secondary:checked");
    const secondaryEvidence = Array.from(secondaryCheckboxes).map(
      (cb) => cb.value
    );

    // Validasi form
    if (!culpritId) {
      alert("⚠️ Pilih pelaku terlebih dahulu.");
      return;
    }
    if (!motive || motive.length < 3) {
      alert("⚠️ Tulis motif dengan jelas (minimal 3 karakter).");
      return;
    }
    if (!primaryEvidence) {
      alert("⚠️ Pilih bukti primer.");
      return;
    }
    if (secondaryEvidence.length === 0) {
      alert("⚠️ Pilih setidaknya satu bukti sekunder.");
      return;
    }

    // Cek apakah bukti sekunder wajib sudah dipilih
    const requiredCheckboxes = body.querySelectorAll(
      '.acc-secondary[data-required="true"]'
    );
    const requiredIds = Array.from(requiredCheckboxes).map((cb) => cb.value);
    const missingRequired = requiredIds.filter(
      (id) => !secondaryEvidence.includes(id)
    );
    if (missingRequired.length > 0) {
      const names = missingRequired
        .map((id) => {
          const evi = evidenceEngine.getEvidenceMeta(id);
          return evi ? evi.title : id;
        })
        .join(", ");
      alert(`⚠️ Bukti wajib belum dipilih: ${names}`);
      return;
    }

    // Submit ke SolutionEngine
    const result = SolutionEngine.checkAccusation({
      culpritId,
      motive,
      primaryEvidence,
      secondaryEvidence,
    });

    // Tampilkan hasil
    this._showResult(result);
  }

  /**
   * Menampilkan hasil tuduhan.
   * @param {Object} result
   */
  _showResult(result) {
    // Tutup form
    this.wm.close(this.windowId);

    // Buka window hasil
    const winEl = this.wm.register(this.resultWindowId, {
      title: result.correct ? "✅ Kasus Terpecahkan!" : "❌ Tuduhan Ditolak",
      width: 520,
      height: 360,
      resizable: true,
      maximizable: true,
    });

    const body = winEl.querySelector(".window-body");
    body.style.padding = "20px";
    body.style.fontFamily = "var(--font-mono, monospace)";

    const isCorrect = result.correct;
    const color = isCorrect ? "#4CAF50" : "#f44336";
    const icon = isCorrect ? "🎉" : "❌";

    let html = `
      <div style="text-align: center; padding: 8px;">
        <div style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
        <h2 style="color: ${color}; margin-bottom: 12px;">${
      isCorrect ? "KASUS TERPECAHKAN!" : "TUDUHAN DITOLAK"
    }</h2>
        <p style="font-size: 16px; color: #333; margin-bottom: 16px; line-height: 1.6;">
          ${result.message}
        </p>
    `;

    if (!isCorrect && result.hints && result.hints.length > 0) {
      html += `
        <div style="text-align: left; padding: 12px; background: #fff3e0; border-left: 4px solid #FF9800; margin-bottom: 16px;">
          <strong>💡 Petunjuk:</strong>
          <ul style="margin: 8px 0 0 20px; line-height: 1.6;">
            ${result.hints.map((h) => `<li>${h}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    if (isCorrect) {
      // Tampilkan epilog dari solution.md
      html += `
        <div style="text-align: left; padding: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50; margin-bottom: 16px; max-height: 150px; overflow-y: auto;">
          <div id="epilog-content" style="font-size: 14px; line-height: 1.6;">
            <p style="color: #666;">⏳ Memuat epilog...</p>
          </div>
        </div>
      `;
    }

    html += `
        <div style="display: flex; gap: 8px; justify-content: center; border-top: 2px solid #eee; padding-top: 16px;">
          ${
            !isCorrect
              ? `
            <button id="btn-retry-accusation" style="
              background: #000080;
              color: #fff;
              border: none;
              padding: 8px 20px;
              font-family: var(--font-mono, monospace);
              cursor: pointer;
              box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
            ">🔍 Kembali Investigasi</button>
          `
              : `
            <button id="btn-case-hub" style="
              background: #000080;
              color: #fff;
              border: none;
              padding: 8px 20px;
              font-family: var(--font-mono, monospace);
              cursor: pointer;
              box-shadow: inset -1px -1px 0 #000040, inset 1px 1px 0 #0000c0;
            ">📁 Kembali ke Case Hub</button>
          `
          }
          <button id="btn-close-result" style="
            background: #ccc;
            color: #000;
            border: none;
            padding: 8px 16px;
            font-family: var(--font-mono, monospace);
            cursor: pointer;
          ">✕ Tutup</button>
        </div>
      </div>
    `;

    body.innerHTML = html;
    this.wm.open(this.resultWindowId);

    // Jika sukses, muat epilog
    if (isCorrect) {
      this._loadEpilog(body);
    }

    // Event: Kembali ke investigasi
    body
      .querySelector("#btn-retry-accusation")
      ?.addEventListener("click", () => {
        this.wm.close(this.resultWindowId);
        this.open();
      });

    // Event: Kembali ke Case Hub
    body.querySelector("#btn-case-hub")?.addEventListener("click", () => {
      this.wm.close(this.resultWindowId);
      this.wm.close(this.windowId);
      EventBus.emit("case:unloaded");
      // Buka CaseHub
      const caseHub = window.__RETROSLEUTH?.caseHub;
      if (caseHub) caseHub.open();
    });

    // Event: Tutup
    body.querySelector("#btn-close-result")?.addEventListener("click", () => {
      this.wm.close(this.resultWindowId);
    });
  }

  /**
   * Memuat epilog dari solution.md.
   * @param {HTMLElement} body
   */
  async _loadEpilog(body) {
    const container = body.querySelector("#epilog-content");
    if (!container) return;

    try {
      const activeCase = caseLoader.activeCase;
      const folder = caseLoader.globalIndex?.cases_list.find(
        (c) => c.id === activeCase.id
      )?.folder;
      if (!folder) throw new Error("Folder kasus tidak ditemukan");

      const solutionFile =
        activeCase.solution_matrix?.explanation_file || "solution.md";
      const url = `${caseLoader.basePath}/${folder}/${solutionFile}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const mdText = await response.text();
      await Markdown.load();
      const html = Markdown.render(mdText);
      container.innerHTML = html;
    } catch (error) {
      console.error("[AccusationForm] Gagal memuat epilog:", error);
      container.innerHTML = `
        <p style="color: #888;">📖 Kasus telah terpecahkan. Selamat, Detektif!</p>
        <p style="color: #999; font-size: 13px;">(Epilog tidak tersedia: ${error.message})</p>
      `;
    }
  }
}
