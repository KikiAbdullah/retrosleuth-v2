/**
 * ============================================================
 *  SETTINGSWINDOW.JS — Jendela Pengaturan (Fase 6)
 *  Tab: AI, Audio, Display. Menyimpan di localStorage/IndexedDB.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { aiClient } from "../ai/AIClient.js";
import { AudioManager } from "../utils/AudioManager.js";
import { GameState } from "../core/Store.js";
import { DatabaseManager } from "../utils/DatabaseManager.js";
import { FileHelper } from "../utils/FileHelper.js";
import { DEFAULT_MODELS } from "../ai/OpenRouterClient.js";
import { WISMA_DEFAULTS } from "../wisma/WismaController.js";

const FREE_MODEL_HINTS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-235b-a22b:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "deepseek/deepseek-r1:free",
];

const STORAGE_KEY = "retrosleuth_settings";

export class SettingsWindow {
  /**
   * @param {WindowManager} windowManager
   */
  constructor(windowManager) {
    this.wm = windowManager;
    this.windowId = "settings";
    this.settings = this._loadSettings();
    this.activeTab = "ai";

    // --- Default: OpenRouter free tier, TANPA key bawaan ---
    // (key adalah rahasia pengguna; diisi sendiri di tab AI dan disimpan lokal)
    const defaults = {
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "",
      model: DEFAULT_MODELS.primary,
      fallbackModels: DEFAULT_MODELS.fallbacks,
      proxyUrl: "",
      temperature: 0.85,
      maxTokens: 420,
      masterVolume: 0.7,
      sfxVolume: 1.0,
      ambientVolume: 0.3,
      muted: false,
      crtEnabled: true,
      wisma: { ...WISMA_DEFAULTS, dailyLimit: 50, perMinuteLimit: 20, reserve: 12 },
    };

    const previous = this.settings || {};
    this.settings = { ...defaults, ...previous };
    // settings.office adalah nama lama (v2.1.0) → dipindahkan ke settings.wisma.
    // Nilai lama dipakai sebagai dasar, nilai baru menimpa: migrasi jalan walau
    // setting tersimpan hanya sebagian.
    this.settings.wisma = {
      ...defaults.wisma,
      ...(previous.office || {}),
      ...(previous.wisma || {}),
    };
    delete this.settings.office;

    // Migrasi dari konfigurasi lama (server lokal / model & key bawaan repo)
    const isLegacy =
      !previous.endpoint ||
      String(previous.endpoint).includes("localhost:20128") ||
      previous.model === "ag-gemini3";
    if (isLegacy) {
      this.settings.endpoint = defaults.endpoint;
      this.settings.model = defaults.model;
      this.settings.fallbackModels = defaults.fallbackModels;
      // key lama bukan key OpenRouter → jangan dipakai lagi
      this.settings.apiKey =
        typeof previous.apiKey === "string" && previous.apiKey.startsWith("sk-or-")
          ? previous.apiKey
          : "";
    }
    this._saveSettings();

    // Terapkan ke AI Client
    if (aiClient) {
      aiClient.updateConfig({
        endpoint: this.settings.endpoint,
        apiKey: this.settings.apiKey,
        model: this.settings.model,
        proxyUrl: this.settings.proxyUrl,
        fallbackModels: this.settings.fallbackModels,
        temperature: this.settings.temperature,
        maxTokens: this.settings.maxTokens,
      });
    }

    // Terapkan ke Audio
    AudioManager.setMasterVolume(this.settings.masterVolume);
    AudioManager.setSfxVolume(this.settings.sfxVolume);
    AudioManager.setAmbientVolume(this.settings.ambientVolume);
    if (this.settings.muted) {
      AudioManager.toggleMute();
    }

    // Terapkan CRT
    if (!this.settings.crtEnabled) {
      document.body.classList.add("crt-off");
    } else {
      document.body.classList.remove("crt-off");
    }
  }

  // ============================================================
  //  PERSISTENCE
  // ============================================================

  _loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("[Settings] Gagal memuat pengaturan:", e);
    }
    return {};
  }

  _saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("[Settings] Gagal menyimpan pengaturan:", e);
    }
  }

  // ============================================================
  //  OPEN
  // ============================================================

  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "⚙️ Settings",
      width: 540,
      height: 480,
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this._buildUI(winEl);
  }

  // ============================================================
  //  BUILD UI
  // ============================================================

  _buildUI(winEl) {
    const body = winEl.querySelector(".window-body");
    body.style.padding = "12px";
    body.style.fontFamily = "var(--font-mono, monospace)";
    body.style.background = "#f5f5f5";

    const s = this.settings;

    body.innerHTML = `
      <h2 style="color: #000080; margin: 0 0 12px 0; font-size: 20px;">⚙️ Pengaturan</h2>

      <!-- Tabs -->
      <div style="display: flex; gap: 2px; border-bottom: 2px solid #ccc; margin-bottom: 12px;">
        <button class="settings-tab" data-tab="ai" style="
          padding: 6px 16px;
          background: ${this.activeTab === "ai" ? "#000080" : "#e0e0e0"};
          color: ${this.activeTab === "ai" ? "#fff" : "#000"};
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 14px;
        ">🤖 AI</button>
        <button class="settings-tab" data-tab="audio" style="
          padding: 6px 16px;
          background: ${this.activeTab === "audio" ? "#000080" : "#e0e0e0"};
          color: ${this.activeTab === "audio" ? "#fff" : "#000"};
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 14px;
        ">🔊 Audio</button>
        <button class="settings-tab" data-tab="display" style="
          padding: 6px 16px;
          background: ${this.activeTab === "display" ? "#000080" : "#e0e0e0"};
          color: ${this.activeTab === "display" ? "#fff" : "#000"};
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 14px;
        ">🖥️ Display</button>
        <button class="settings-tab" data-tab="wisma" style="
          padding: 6px 16px;
          background: ${this.activeTab === "wisma" ? "#000080" : "#e0e0e0"};
          color: ${this.activeTab === "wisma" ? "#fff" : "#000"};
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 14px;
        ">🏚️ Wisma</button>
        <button class="settings-tab" data-tab="danger" style="
          padding: 6px 16px;
          background: ${this.activeTab === "danger" ? "#ff4444" : "#e0e0e0"};
          color: ${this.activeTab === "danger" ? "#fff" : "#000"};
          border: none;
          font-family: var(--font-mono, monospace);
          cursor: pointer;
          font-size: 14px;
        ">⚠️ Data</button>
      </div>

      <!-- Panels -->
      <div id="settings-panels">
        ${this._renderAIPanel(s)}
        ${this._renderAudioPanel(s)}
        ${this._renderDisplayPanel(s)}
        ${this._renderWismaPanel(s)}
        ${this._renderDangerPanel()}
      </div>
    `;

    // --- Tab Switching ---
    body.querySelectorAll(".settings-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        this.activeTab = tabName;

        // Update tab style
        body.querySelectorAll(".settings-tab").forEach((t) => {
          t.style.background = "#e0e0e0";
          t.style.color = "#000";
        });
        tab.style.background = tabName === "danger" ? "#ff4444" : "#000080";
        tab.style.color = "#fff";

        // Show/hide panels
        body.querySelectorAll(".settings-panel").forEach((p) => {
          p.style.display = p.dataset.panel === tabName ? "block" : "none";
        });
      });
    });

    // Show initial panel
    body.querySelectorAll(".settings-panel").forEach((p) => {
      p.style.display = p.dataset.panel === this.activeTab ? "block" : "none";
    });

    // Bind events
    this._bindEvents(body);
  }

  // ============================================================
  //  RENDER PANELS
  // ============================================================

  _renderAIPanel(s) {
    return `
      <div class="settings-panel" data-panel="ai" style="padding: 4px 0;">
        <h3 style="color: #000080; margin: 0 0 8px 0; font-size: 16px;">🤖 AI Configuration</h3>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px 10px; align-items: center;">
          <label style="font-size: 13px;">Endpoint</label>
          <input type="text" id="ai-endpoint" value="${s.endpoint}" style="font-family: var(--font-mono); padding: 4px; width: 100%;">

          <label style="font-size: 13px;">API Key</label>
          <input type="password" id="ai-apikey" value="${s.apiKey}" style="font-family: var(--font-mono); padding: 4px; width: 100%;">

          <label style="font-size: 13px;">Model</label>
          <div style="display:flex; gap:4px; align-items:center;">
            <input type="text" id="ai-model" list="ai-model-list" value="${s.model}" style="font-family: var(--font-mono); padding: 4px; flex:1;">
            <datalist id="ai-model-list">
              ${FREE_MODEL_HINTS.map((m) => `<option value="${m}"></option>`).join("")}
            </datalist>
          </div>

          <label style="font-size: 13px;">Proxy URL</label>
          <input type="text" id="ai-proxy" value="${s.proxyUrl || ""}" placeholder="kosong = langsung ke OpenRouter" style="font-family: var(--font-mono); padding: 4px; width: 100%;">

          <label style="font-size: 13px;">Temperature</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="ai-temperature" min="0" max="1" step="0.05" value="${s.temperature}" style="flex: 1;">
            <span id="temp-display" style="font-size: 13px; min-width: 30px;">${s.temperature}</span>
          </div>

          <label style="font-size: 13px;">Max Tokens</label>
          <input type="number" id="ai-maxtokens" value="${s.maxTokens}" min="50" max="1000" style="font-family: var(--font-mono); padding: 4px; width: 80px;">
        </div>

        <div style="margin-top:8px; padding:8px; background:#fff8e1; border-left:4px solid #f9a825; font-size:12px; color:#5d4037;">
          <strong>🔑 Satu AI saja: OpenRouter (model <code>:free</code>).</strong><br>
          Ambil key di <code>openrouter.ai/keys</code> (gratis), tempel di atas. Free tier = <b>20 request/menit</b> dan
          <b>50 request/hari</b> (naik ke 1.000/hari kalau akun pernah top-up $10). Semua panggilan — interogasi maupun
          simulasi wisma — diatur oleh <em>Budget Manager</em>, jadi kuota tidak jebol.<br>
          <strong>⚠️ Key di browser = terlihat publik.</strong> Kalau game ini di-host (GitHub Pages), jalankan
          <code>tools/openrouter-proxy.mjs</code> lalu isi <em>Proxy URL</em> supaya key tetap di server.
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
          <button id="btn-test-connection" style="background: #000080; color: #fff; border: none; padding: 4px 16px; font-family: var(--font-mono); cursor: pointer;">🔌 Test Connection</button>
          <button id="btn-save-ai" style="background: #000080; color: #fff; border: none; padding: 4px 16px; font-family: var(--font-mono); cursor: pointer;">💾 Save AI Settings</button>
          <span id="ai-status" style="font-size: 13px; color: #888; align-self: center;"></span>
        </div>
      </div>
    `;
  }

  _renderAudioPanel(s) {
    return `
      <div class="settings-panel" data-panel="audio" style="padding: 4px 0; display: none;">
        <h3 style="color: #000080; margin: 0 0 8px 0; font-size: 16px;">🔊 Audio</h3>
        <div style="display: grid; grid-template-columns: 80px 1fr 60px; gap: 6px 10px; align-items: center;">
          <label style="font-size: 13px;">Master</label>
          <input type="range" id="vol-master" min="0" max="1" step="0.05" value="${
            s.masterVolume
          }" style="width: 100%;">
          <span id="vol-master-display" style="font-size: 13px;">${Math.round(
            s.masterVolume * 100
          )}%</span>

          <label style="font-size: 13px;">SFX</label>
          <input type="range" id="vol-sfx" min="0" max="1" step="0.05" value="${
            s.sfxVolume
          }" style="width: 100%;">
          <span id="vol-sfx-display" style="font-size: 13px;">${Math.round(
            s.sfxVolume * 100
          )}%</span>

          <label style="font-size: 13px;">Ambient</label>
          <input type="range" id="vol-ambient" min="0" max="1" step="0.05" value="${
            s.ambientVolume
          }" style="width: 100%;">
          <span id="vol-ambient-display" style="font-size: 13px;">${Math.round(
            s.ambientVolume * 100
          )}%</span>
        </div>
        <div style="margin-top: 8px;">
          <label style="font-size: 13px;">
            <input type="checkbox" id="chk-mute" ${
              s.muted ? "checked" : ""
            }> Mute All
          </label>
          <button id="btn-test-sound" style="margin-left: 12px; background: #666; color: #fff; border: none; padding: 2px 12px; font-family: var(--font-mono); cursor: pointer;">🔊 Test</button>
        </div>
        <div style="margin-top: 8px;">
          <button id="btn-save-audio" style="background: #000080; color: #fff; border: none; padding: 4px 16px; font-family: var(--font-mono); cursor: pointer;">💾 Save Audio</button>
        </div>
      </div>
    `;
  }

  _renderDisplayPanel(s) {
    return `
      <div class="settings-panel" data-panel="display" style="padding: 4px 0; display: none;">
        <h3 style="color: #000080; margin: 0 0 8px 0; font-size: 16px;">🖥️ Display</h3>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <label style="font-size: 13px;">
            <input type="checkbox" id="chk-crt" ${
              s.crtEnabled !== false ? "checked" : ""
            }> CRT Effect (Scanlines & Flicker)
          </label>
          <button id="btn-toggle-crt" style="background: #666; color: #fff; border: none; padding: 2px 12px; font-family: var(--font-mono); cursor: pointer;">Toggle Now</button>
        </div>
        <p style="font-size: 12px; color: #888; margin-top: 8px;">Efek monitor tabung (CRT) memberikan nuansa retro otentik. Jika mengganggu, matikan.</p>
      </div>
    `;
  }

  _renderWismaPanel(s) {
    const o = s.wisma || {};
    const levels = [
      { id: "off", label: "OFF — murni simulasi lokal (0 request)" },
      { id: "hemat", label: "HEMAT — sutradara AI tiap 40 menit (~14 request/malam)" },
      { id: "normal", label: "NORMAL — tiap 20 menit (~28 request/malam)" },
      { id: "intens", label: "INTENSIF — tiap 10 menit (~57 request/malam, butuh 1.000/hari)" },
    ];
    return `
      <div class="settings-panel" data-panel="wisma" style="padding: 4px 0; display: none;">
        <h3 style="color: #000080; margin: 0 0 8px 0; font-size: 16px;">🏚️ Wisma Angker (Simulasi Penghuni)</h3>
        <p style="font-size:12px;color:#555;margin:0 0 8px 0;">
          Sepuluh penghuni Wisma Angker menjalani malam kejadian secara mandiri: bekerja sesuai jabatan,
          saling melihat, mengobrol, dan meninggalkan barang yang bisa Anda sita.
          Simulasi ini <b>tetap hidup tanpa API</b>; AI hanya memperkaya pikiran & ucapan mereka.
        </p>

        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 6px 10px; align-items: center;">
          <label style="font-size:13px;">Kemandirian AI</label>
          <select id="ws-level" style="font-family: var(--font-mono); padding: 3px;">
            ${levels.map((l) => `<option value="${l.id}" ${o.level === l.id ? "selected" : ""}>${l.label}</option>`).join("")}
          </select>

          <label style="font-size:13px;">Interval sutradara</label>
          <input type="number" id="ws-interval" min="5" max="120" step="5" value="${o.intervalMin || 20}" style="width:80px;font-family:var(--font-mono);padding:3px;"> menit simulasi

          <label style="font-size:13px;">Kecepatan simulasi</label>
          <select id="ws-speed" style="font-family: var(--font-mono); padding: 3px; width:80px;">
            ${[1, 2, 4, 8].map((v) => `<option value="${v}" ${Number(o.speed || 1) === v ? "selected" : ""}>${v}×</option>`).join("")}
          </select>

          <label style="font-size:13px;">Kuota harian</label>
          <input type="number" id="ws-daily" min="1" max="2000" value="${o.dailyLimit || 50}" style="width:80px;font-family:var(--font-mono);padding:3px;"> request/hari

          <label style="font-size:13px;">Batas per menit</label>
          <input type="number" id="ws-rpm" min="1" max="60" value="${o.perMinuteLimit || 20}" style="width:80px;font-family:var(--font-mono);padding:3px;"> request/menit

          <label style="font-size:13px;">Cadangan interogasi</label>
          <input type="number" id="ws-reserve" min="0" max="200" value="${o.reserve ?? 12}" style="width:80px;font-family:var(--font-mono);padding:3px;"> request
        </div>

        <div style="margin-top:10px; display:grid; gap:4px; font-size:13px;">
          <label><input type="checkbox" id="ws-enabled" ${o.enabled !== false ? "checked" : ""}> Wisma Angker aktif</label>
          <label><input type="checkbox" id="ws-ondemand" ${o.aiOnDemand !== false ? "checked" : ""}> Hemat kuota: AI hanya menyala saat jendela Wisma dibuka</label>
          <label><input type="checkbox" id="ws-autostart" ${o.autoStart !== false ? "checked" : ""}> Jalankan simulasi otomatis saat kasus dimuat</label>
          <label><input type="checkbox" id="ws-eavesdrop" ${o.useAIForEavesdrop !== false ? "checked" : ""}> Pakai AI untuk 🎧 SADAP (kalau tidak, pakai mesin dialog lokal)</label>
          <label><input type="checkbox" id="ws-reflect" ${o.useAIForReflection !== false ? "checked" : ""}> Pakai AI untuk refleksi ingatan karakter</label>
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button id="btn-save-wisma" style="background:#000080;color:#fff;border:none;padding:4px 16px;font-family:var(--font-mono);cursor:pointer;">💾 Simpan Pengaturan Wisma</button>
          <button id="btn-clear-wisma-save" style="background:#666;color:#fff;border:none;padding:4px 12px;font-family:var(--font-mono);cursor:pointer;">🗑 Hapus Sesi Malam</button>
          <span id="wisma-status" style="font-size:13px;color:#888;"></span>
        </div>

        <div style="margin-top:10px; padding:8px; background:#e8f5e9; border-left:4px solid #43a047; font-size:12px; color:#1b5e20;">
          <strong>Matematika kuota:</strong> satu malam penuh = 570 menit simulasi.
          Level NORMAL memanggil sutradara AI tiap 20 menit ⇒ ±28 request. Ditambah sadapan/intai pikiran
          (1 request masing-masing) dan cadangan 12 request untuk interogasi ⇒ masih di bawah 50/hari.
          Kalau kuota habis, wisma otomatis lanjut dengan mesin simulasi lokal — tidak ada yang berhenti.
        </div>
      </div>
    `;
  }

  _renderDangerPanel() {
    return `
      <div class="settings-panel" data-panel="danger" style="padding: 4px 0; display: none;">
        <h3 style="color: #ff4444; margin: 0 0 8px 0; font-size: 16px;">⚠️ Data Management</h3>

        <!-- Export / Import -->
        <div style="background: #e8f5e9; padding: 12px; border-left: 4px solid #4CAF50; margin-bottom: 12px;">
          <p style="font-size: 13px; margin: 0 0 8px 0; color: #2e7d32;">
            <strong>💾 Export / Import Save Data</strong>
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-export-save" style="background: #4CAF50; color: #fff; border: none; padding: 6px 16px; font-family: var(--font-mono); cursor: pointer; font-size: 13px;">📤 Export Save</button>
            <button id="btn-import-save" style="background: #2196F3; color: #fff; border: none; padding: 6px 16px; font-family: var(--font-mono); cursor: pointer; font-size: 13px;">📥 Import Save</button>
          </div>
          <p style="font-size: 11px; color: #668; margin: 6px 0 0 0;">Export menyimpan progres game ke file .json. Import memuat kembali dari file.</p>
          <span id="file-status" style="font-size: 12px; display: block; margin-top: 4px;"></span>
        </div>

        <!-- Reset -->
        <div style="background: #fff3e0; padding: 12px; border-left: 4px solid #FF9800; margin-bottom: 12px;">
          <p style="font-size: 13px; margin: 0; color: #555;">
            <strong>⚠️ Perhatian:</strong> Tindakan di bawah ini tidak dapat dibatalkan.
          </p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-reset-save" style="background: #ff4444; color: #fff; border: none; padding: 6px 20px; font-family: var(--font-mono); cursor: pointer;">🗑️ Reset Save Data</button>
          <button id="btn-reset-all" style="background: #cc0000; color: #fff; border: none; padding: 6px 20px; font-family: var(--font-mono); cursor: pointer;">💥 Reset ALL Settings</button>
        </div>
        <p style="font-size: 11px; color: #888; margin-top: 8px;">
          "Reset Save Data" menghapus semua progres game. "Reset ALL Settings" mengembalikan semua pengaturan ke default.
        </p>
      </div>
    `;
  }

  // ============================================================
  //  EVENT BINDING
  // ============================================================

  _bindEvents(body) {
    // --- AI Tab ---
    const tempSlider = body.querySelector("#ai-temperature");
    const tempDisplay = body.querySelector("#temp-display");
    if (tempSlider && tempDisplay) {
      tempSlider.addEventListener("input", () => {
        tempDisplay.textContent = parseFloat(tempSlider.value).toFixed(2);
      });
    }

    body
      .querySelector("#btn-test-connection")
      ?.addEventListener("click", async () => {
        const status = body.querySelector("#ai-status");
        if (!aiClient) {
          status.textContent = "❌ AI Client belum siap";
          return;
        }
        status.textContent = "⏳ Testing...";
        const detail = await aiClient.checkHealthDetailed();
        status.textContent = detail.ok ? `✅ ${detail.detail}` : `❌ ${detail.detail}`;
        status.style.color = detail.ok ? "#4CAF50" : "#f44336";
        if (detail.ok) {
          const credit = await aiClient.credits();
          if (credit.ok) {
            status.textContent += ` | kredit $${credit.remaining.toFixed(2)} (${credit.remaining >= 10 ? "1.000 request/hari" : "50 request/hari"})`;
          }
        }
      });

    body.querySelector("#btn-save-ai")?.addEventListener("click", () => {
      const endpoint = body.querySelector("#ai-endpoint").value.trim();
      const apiKey = body.querySelector("#ai-apikey").value.trim();
      const model = body.querySelector("#ai-model").value.trim();
      const proxyUrl = body.querySelector("#ai-proxy")?.value.trim() || "";
      const temperature = parseFloat(
        body.querySelector("#ai-temperature").value
      );
      const maxTokens =
        parseInt(body.querySelector("#ai-maxtokens").value) || 300;

      this.settings.endpoint = endpoint;
      this.settings.apiKey = apiKey;
      this.settings.model = model;
      this.settings.proxyUrl = proxyUrl;
      this.settings.temperature = temperature;
      this.settings.maxTokens = maxTokens;
      this._saveSettings();

      if (aiClient) {
        aiClient.updateConfig({
          endpoint,
          apiKey,
          model,
          proxyUrl,
          temperature,
          maxTokens,
        });
      }

      // beri tahu seluruh sistem (Wisma Angker, Budget Manager, dll.)
      EventBus.emit("settings:changed", { ...this.settings });

      const status = body.querySelector("#ai-status");
      status.textContent = apiKey || proxyUrl ? "✅ Saved!" : "✅ Saved (mode offline: tanpa key)";
      status.style.color = "#4CAF50";
      setTimeout(() => {
        status.textContent = "";
      }, 3000);
    });

    // --- Wisma Tab ---
    body.querySelector("#btn-save-wisma")?.addEventListener("click", () => {
      const read = (id) => body.querySelector(`#${id}`);
      this.settings.wisma = {
        ...(this.settings.wisma || {}),
        level: read("ws-level")?.value || "normal",
        intervalMin: parseInt(read("ws-interval")?.value) || 20,
        speed: parseInt(read("ws-speed")?.value) || 1,
        dailyLimit: parseInt(read("ws-daily")?.value) || 50,
        perMinuteLimit: parseInt(read("ws-rpm")?.value) || 20,
        reserve: parseInt(read("ws-reserve")?.value) || 0,
        enabled: !!read("ws-enabled")?.checked,
        aiOnDemand: !!read("ws-ondemand")?.checked,
        autoStart: !!read("ws-autostart")?.checked,
        useAIForEavesdrop: !!read("ws-eavesdrop")?.checked,
        useAIForReflection: !!read("ws-reflect")?.checked,
      };
      this._saveSettings();
      EventBus.emit("settings:changed", { ...this.settings });
      const st = body.querySelector("#wisma-status");
      if (st) {
        st.textContent = "✅ Tersimpan & diterapkan.";
        st.style.color = "#4CAF50";
        setTimeout(() => (st.textContent = ""), 3000);
      }
    });

    body.querySelector("#btn-clear-wisma-save")?.addEventListener("click", () => {
      const wismaCtl = window.__RETROSLEUTH?.wisma;
      if (!wismaCtl?.world) {
        alert("Wisma Angker belum aktif (muat sebuah kasus dulu).");
        return;
      }
      if (!confirm("Hapus sesi malam yang tersimpan dan ulangi dari pukul 17.00?")) return;
      wismaCtl.world.reset();
      const st = body.querySelector("#wisma-status");
      if (st) st.textContent = "🗑 Sesi malam dihapus.";
    });

    // --- Audio Tab ---
    // --- Danger Tab: Export / Import ---
    body.querySelector("#btn-export-save")?.addEventListener("click", async () => {
      const status = body.querySelector("#file-status");
      try {
        await FileHelper.load();
        const saveData = GameState.getState();
        const caseId = saveData.currentCaseId || "unknown";
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "-");
        const filename = `retrosleuth-save-${caseId}-${timestamp}.json`;
        FileHelper.downloadJSON(saveData, filename);
        status.textContent = `✅ Export berhasil! File: ${filename}`;
        status.style.color = "#4CAF50";
      } catch (error) {
        status.textContent = `❌ Export gagal: ${error.message}`;
        status.style.color = "#f44336";
      }
    });

    body.querySelector("#btn-import-save")?.addEventListener("click", async () => {
      const status = body.querySelector("#file-status");
      try {
        await FileHelper.load();
        const data = await FileHelper.openJSON();
        if (!data) {
          status.textContent = "ℹ️ Import dibatalkan.";
          status.style.color = "#888";
          return;
        }
        const validation = FileHelper.validateSaveData(data);
        if (!validation.valid) {
          status.textContent = `❌ Data tidak valid: ${validation.errors.join("; ")}`;
          status.style.color = "#f44336";
          return;
        }
        // Restore state dan reload halaman untuk refresh semua UI
        GameState.restoreState(data);
        await GameState.save();
        status.textContent = `✅ Import berhasil! Memuat ulang...`;
        status.style.color = "#4CAF50";
        // Reload halaman setelah 1 detik
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        status.textContent = `❌ Import gagal: ${error.message}`;
        status.style.color = "#f44336";
      }
    });

    // --- Audio Tab ---
    const volSliders = ["master", "sfx", "ambient"];
    for (const key of volSliders) {
      const slider = body.querySelector(`#vol-${key}`);
      const display = body.querySelector(`#vol-${key}-display`);
      if (slider && display) {
        slider.addEventListener("input", () => {
          display.textContent =
            Math.round(parseFloat(slider.value) * 100) + "%";
        });
      }
    }

    body.querySelector("#btn-test-sound")?.addEventListener("click", () => {
      AudioManager.play("unlock");
      setTimeout(() => AudioManager.play("click"), 300);
      setTimeout(() => AudioManager.play("success"), 600);
    });

    body.querySelector("#btn-save-audio")?.addEventListener("click", () => {
      this.settings.masterVolume = parseFloat(
        body.querySelector("#vol-master").value
      );
      this.settings.sfxVolume = parseFloat(
        body.querySelector("#vol-sfx").value
      );
      this.settings.ambientVolume = parseFloat(
        body.querySelector("#vol-ambient").value
      );
      this.settings.muted = body.querySelector("#chk-mute").checked;
      this._saveSettings();

      AudioManager.setMasterVolume(this.settings.masterVolume);
      AudioManager.setSfxVolume(this.settings.sfxVolume);
      AudioManager.setAmbientVolume(this.settings.ambientVolume);
      if (this.settings.muted) {
        AudioManager.toggleMute();
      }

      const status = body.querySelector("#ai-status");
      status.textContent = "✅ Audio saved!";
      status.style.color = "#4CAF50";
      setTimeout(() => {
        status.textContent = "";
      }, 3000);
    });

    // --- Display Tab ---
    const crtChk = body.querySelector("#chk-crt");
    if (crtChk) {
      crtChk.addEventListener("change", () => {
        document.body.classList.toggle("crt-off", !crtChk.checked);
        this.settings.crtEnabled = crtChk.checked;
        this._saveSettings();
      });
    }

    body.querySelector("#btn-toggle-crt")?.addEventListener("click", () => {
      const chk = body.querySelector("#chk-crt");
      if (chk) {
        chk.checked = !chk.checked;
        document.body.classList.toggle("crt-off", !chk.checked);
        this.settings.crtEnabled = chk.checked;
        this._saveSettings();
      }
    });

    // --- Danger Tab ---
    body.querySelector("#btn-reset-save")?.addEventListener("click", () => {
      if (
        confirm(
          "⚠️ Anda yakin ingin menghapus semua progres permainan? Tindakan ini tidak bisa dibatalkan!"
        )
      ) {
        const caseId = GameState.currentCaseId;
        if (caseId) {
          DatabaseManager.deleteCaseState(caseId);
        }
        localStorage.removeItem("retrosleuth_save");
        GameState.reset();
        alert(
          "🗑️ Data save telah dihapus. Refresh halaman untuk memulai ulang."
        );
      }
    });

    body.querySelector("#btn-reset-all")?.addEventListener("click", () => {
      if (
        confirm(
          "💥 Reset ALL settings ke default? Ini akan menghapus semua pengaturan AI, audio, dan display."
        )
      ) {
        this.settings = {
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: "",
          model: DEFAULT_MODELS.primary,
          fallbackModels: DEFAULT_MODELS.fallbacks,
          proxyUrl: "",
          temperature: 0.85,
          maxTokens: 420,
          masterVolume: 0.7,
          sfxVolume: 1.0,
          ambientVolume: 0.3,
          muted: false,
          crtEnabled: true,
          wisma: { ...WISMA_DEFAULTS, dailyLimit: 50, perMinuteLimit: 20, reserve: 12 },
        };
        this._saveSettings();
        localStorage.removeItem(STORAGE_KEY);
        alert(
          "✅ Semua pengaturan direset. Refresh halaman untuk menerapkan perubahan."
        );
        location.reload();
      }
    });
  }
}
