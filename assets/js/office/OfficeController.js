/**
 * ============================================================
 *  OFFICECONTROLLER.JS — Pengikat Kantor Virtual ke Game
 * ------------------------------------------------------------
 *  Tugasnya:
 *   1. Muat office.json milik kasus yang sedang aktif
 *   2. Rakit OpenRouterClient + BudgetManager + OfficeDirector + OfficeWorld
 *   3. Jalankan simulasi (otomatis, gratis, tanpa API)
 *   4. Hemat kuota: AI "sutradara" hanya menyala saat jendela Kantor
 *      Virtual dibuka (bisa dimatikan di Settings)
 *   5. Terjemahkan permintaan dunia → aksi game (buka bukti, notifikasi)
 *   6. Simpan/pulihkan sesi malam (localStorage per kasus)
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { OfficeWorld } from "./OfficeWorld.js";
import { OfficeDirector } from "./OfficeDirector.js";
import { openRouter } from "../ai/OpenRouterClient.js";
import { budget } from "../ai/BudgetManager.js";

export const OFFICE_DEFAULTS = {
  enabled: true,
  level: "normal", // off | hemat | normal | intens
  intervalMin: 20,
  aiOnDemand: true, // AI hanya aktif ketika jendela Kantor dibuka
  autoStart: true,
  useAIForEavesdrop: true,
  useAIForReflection: true,
  speed: 1,
};

export class OfficeController {
  /**
   * @param {Object} deps
   * @param {Object} deps.caseLoader
   * @param {Object} [deps.evidenceEngine]
   * @param {Object} [deps.notificationSystem]
   * @param {Object} [deps.settings] - object settings hidup (dari SettingsWindow)
   */
  constructor({ caseLoader, evidenceEngine = null, notificationSystem = null, settings = null }) {
    this.caseLoader = caseLoader;
    this.evidenceEngine = evidenceEngine;
    this.notificationSystem = notificationSystem;
    this.settings = settings || {};

    /** @type {OfficeWorld|null} */
    this.world = null;
    /** @type {OfficeDirector|null} */
    this.director = null;
    this.caseId = null;
    this.windowOpen = false;
    this.loaded = false;

    this._bindEvents();
  }

  get officeSettings() {
    return { ...OFFICE_DEFAULTS, ...(this.settings?.office || {}) };
  }

  _bindEvents() {
    // dunia minta bukti dibuka (mis. insiden penemuan mayat)
    EventBus.on("office:request-evidence", ({ evidenceId }) => {
      if (!evidenceId) return;
      this.evidenceEngine?.unlockEvidence?.(evidenceId);
    });

    // jendela Kantor dibuka/ditutup → kendalikan pemakaian AI
    EventBus.on("window:opened", ({ windowId }) => {
      if (windowId !== "office") return;
      this.windowOpen = true;
      this._syncAiGate();
    });
    EventBus.on("window:closed", ({ windowId }) => {
      if (windowId !== "office") return;
      this.windowOpen = false;
      this._syncAiGate();
      this.world?.save?.();
    });

    // pengaturan berubah
    EventBus.on("settings:changed", (patch) => {
      this.applySettings(patch);
    });

    // kasus dibongkar
    EventBus.on("case:unloaded", () => this.unload());
  }

  /**
   * Terapkan pengaturan (dipanggil saat boot & saat Settings disimpan).
   */
  applySettings(patch = {}) {
    if (patch) this.settings = { ...this.settings, ...patch };
    const s = this.officeSettings;

    openRouter.updateConfig({
      endpoint: this.settings.endpoint,
      apiKey: this.settings.apiKey,
      model: this.settings.model,
      proxyUrl: this.settings.proxyUrl,
      fallbackModels: this.settings.fallbackModels,
    });

    budget?.updateConfig({
      dailyLimit: s.dailyLimit ?? this.settings.aiDailyLimit ?? 50,
      perMinuteLimit: s.perMinuteLimit ?? this.settings.aiPerMinuteLimit ?? 20,
      reserve: s.reserve ?? this.settings.aiReserve ?? 12,
    });

    this.director?.setConfig({
      enabled: s.enabled !== false && s.level !== "off",
      level: s.level,
      intervalMin: Number(s.intervalMin) || 20,
      useAIForEavesdrop: s.useAIForEavesdrop !== false,
      useAIForReflection: s.useAIForReflection !== false,
      temperature: this.settings.temperature,
    });

    this._syncAiGate();
    if (this.world && s.speed) this.world.setSpeed(Number(s.speed) || 1);
    EventBus.emit("office:settings-applied", s);
  }

  /**
   * AI hanya dipakai kalau: diizinkan pengaturan + (tidak mode on-demand
   * ATAU jendela kantor sedang dibuka).
   */
  _syncAiGate() {
    if (!this.director) return;
    const s = this.officeSettings;
    const wanted = s.enabled !== false && s.level !== "off";
    const allowed = wanted && (!s.aiOnDemand || this.windowOpen);
    // `enabled` adalah gerbang runtime; `level` menyimpan pilihan pengguna
    this.director.config.enabled = allowed;
    EventBus.emit("office:ai-gate", { allowed, wanted, windowOpen: this.windowOpen });
  }

  // ============================================================
  //  MUAT UNTUK KASUS
  // ============================================================

  /**
   * @param {Object} caseData - hasil CaseLoader.loadFullCase
   * @returns {Promise<boolean>}
   */
  async loadForCase(caseData) {
    this.unload();
    if (!caseData?.id) return false;

    const folder = caseData.meta_data?.folder || caseData.id;
    const base = this.caseLoader?.basePath || "./cases";
    const url = `${base}/${folder}/office.json`;

    let data = null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      console.warn(`[Office] ℹ️ ${url} tidak ada — Kantor Virtual nonaktif untuk kasus ini.`, err.message);
      EventBus.emit("office:unavailable", { caseId: caseData.id, reason: err.message });
      return false;
    }

    // direktur AI (sutradara)
    const s = this.officeSettings;
    this.director = new OfficeDirector({
      client: openRouter,
      budget,
      config: {
        enabled: s.enabled !== false && s.level !== "off",
        level: s.level,
        intervalMin: s.intervalMin,
        temperature: this.settings.temperature,
        batchMaxTokens: data.ai?.budget?.batch_max_tokens || 900,
        deepMaxTokens: data.ai?.budget?.deep_max_tokens || 400,
        useAIForEavesdrop: s.useAIForEavesdrop,
        useAIForReflection: s.useAIForReflection,
      },
    });
    this._syncAiGate();

    // dunia
    this.world = new OfficeWorld({
      data,
      characters: caseData.characters || [],
      director: this.director,
      evidenceEngine: this.evidenceEngine,
      notificationSystem: this.notificationSystem,
    });
    this.caseId = caseData.id;
    this.loaded = true;

    // pulihkan sesi sebelumnya kalau ada
    const restored = this.world.load();
    if (restored) {
      console.log(`[Office] ✅ Sesi malam ${caseData.id} dipulihkan (jam ${OfficeWorld.timeLabel(this.world.clock)}).`);
    }

    if (s.autoStart !== false) this.world.start();
    this.world.setSpeed(Number(s.speed) || 1);

    this.notificationSystem?.add?.(
      `🏢 Kantor Virtual aktif: ${data.meta?.title || caseData.meta?.title}. ${this.world.agents.size} penghuni sedang menjalani malamnya.`,
      "office-started"
    );

    EventBus.emit("office:ready", {
      caseId: caseData.id,
      agents: this.world.agents.size,
      restored,
      aiActive: !!this.director.aiActive,
    });
    console.log(
      `[Office] 🏢 Kantor Virtual siap: ${this.world.agents.size} penghuni, ${this.world.incidents.length} insiden terjadwal, AI=${this.director.aiActive ? "aktif" : "lokal"}.`
    );
    return true;
  }

  /** Bongkar dunia (ganti kasus). */
  unload() {
    if (this.world) {
      this.world.pause();
      this.world = null;
    }
    this.director = null;
    this.loaded = false;
    this.caseId = null;
  }

  /** Paksa AI menyala walau jendela tertutup (dipakai saat interogasi berjalan). */
  setWindowOpen(open) {
    this.windowOpen = !!open;
    this._syncAiGate();
  }
}
