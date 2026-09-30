/**
 * ============================================================
 *  AICLIENT.JS — Klien Interogasi (di atas OpenRouter + Budget)
 * ------------------------------------------------------------
 *  Dulu modul ini fetch langsung ke server lokal dengan API key
 *  yang di-hardcode. Sekarang:
 *   • semua HTTP lewat OpenRouterClient (retry, fallback model, proxy)
 *   • semua panggilan lewat BudgetManager (kuota free tier aman)
 *   • default: OpenRouter model :free, key KOSONG (diisi di Settings)
 *   • konteks Wisma Angker ikut disuntikkan ke prompt (PromptBuilder)
 *
 *  API publik lama tetap sama: sendMessage(), checkHealth(),
 *  updateConfig() — supaya InterrogationRoom tidak perlu diubah.
 * ============================================================
 */

import { GameState } from "../core/Store.js";
import { EventBus } from "../core/EventBus.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { TrustSystem } from "./TrustSystem.js";
import { Security } from "../utils/Security.js";
import { openRouter, DEFAULT_MODELS } from "./OpenRouterClient.js";
import { budget } from "./BudgetManager.js";
import { getFallbackResponse, getFallbackResponseWithError } from "./FallbackMode.js";

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class AIClient {
  /**
   * @param {string|Object} endpoint - URL endpoint, ATAU object config penuh.
   * @param {string} [apiKey]
   * @param {string} [model]
   */
  constructor(endpoint = DEFAULT_ENDPOINT, apiKey = "", model = DEFAULT_MODELS.primary) {
    if (endpoint && typeof endpoint === "object") {
      const cfg = endpoint;
      this.endpoint = cfg.endpoint || DEFAULT_ENDPOINT;
      this.apiKey = cfg.apiKey || "";
      this.model = cfg.model || DEFAULT_MODELS.primary;
      this.proxyUrl = cfg.proxyUrl || "";
      this.temperature = cfg.temperature ?? 0.85;
      this.maxTokens = cfg.maxTokens ?? 420;
      this.fallbackModels = cfg.fallbackModels || DEFAULT_MODELS.fallbacks;
    } else {
      this.endpoint = endpoint || DEFAULT_ENDPOINT;
      this.apiKey = apiKey || "";
      this.model = model || DEFAULT_MODELS.primary;
      this.proxyUrl = "";
      this.temperature = 0.85;
      this.maxTokens = 420;
      this.fallbackModels = DEFAULT_MODELS.fallbacks;
    }
    this.timeout = 45000;
  }

  /** Apakah AI siap dipakai (punya key atau proxy)? */
  get ready() {
    return openRouter.usable;
  }

  /**
   * Mengirim pertanyaan detektif ke tersangka.
   * @param {string} suspectId
   * @param {string} userMessage
   * @returns {Promise<{success:boolean, reply:string, blocked:boolean, source?:string}>}
   */
  async sendMessage(suspectId, userMessage) {
    // Bangun prompt lebih dulu (murah, tanpa jaringan)
    const systemPrompt = PromptBuilder.build(suspectId);
    const history = GameState.getChatHistory(suspectId).slice(-8);
    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    if (!openRouter.usable) {
      return this._fallback(suspectId, userMessage, "AI belum dikonfigurasi (isi API key OpenRouter di ⚙️ Settings).");
    }

    // Interogasi adalah prioritas tertinggi & punya slot cadangan sendiri
    const result = budget
      ? await budget.enqueue({
          kind: "interrogation",
          priority: 100,
          maxWaitMs: 60000,
          run: async () => {
            const res = await openRouter.chat({
              messages,
              temperature: this.temperature,
              maxTokens: this.maxTokens,
              tag: "interrogation",
            });
            if (!res.ok) return { ok: false, error: res.error };
            const text = Security.sanitizeInput(res.text, 2000);
            if (!text.trim()) return { ok: false, error: "Respons kosong" };
            return { ok: true, value: { reply: text, model: res.model } };
          },
        })
      : null;

    if (result?.ok && result.value?.reply) {
      const reply = result.value.reply;
      GameState.addChatMessage(suspectId, "user", userMessage);
      GameState.addChatMessage(suspectId, "assistant", reply);
      TrustSystem.process(suspectId, userMessage, reply);
      EventBus.emit("ai:reply", { suspectId, model: result.value.model });
      return { success: true, reply, blocked: false, source: "ai" };
    }

    return this._fallback(suspectId, userMessage, result?.reason || "Gagal menghubungi AI.");
  }

  /** Jalur darurat: tetap simpan riwayat, tapi pakai respons generik. */
  _fallback(suspectId, userMessage, reason) {
    console.warn("[AIClient] Fallback:", reason);
    const reply = reason?.includes("dibatalkan")
      ? getFallbackResponseWithError("Server AI tidak merespons (timeout)")
      : getFallbackResponse();

    GameState.addChatMessage(suspectId, "user", userMessage);
    GameState.addChatMessage(suspectId, "assistant", reply);
    EventBus.emit("ai:fallback", { suspectId, reason });
    return { success: false, reply, blocked: false, source: "fallback" };
  }

  /** Cek kesehatan koneksi AI. */
  async checkHealth() {
    const res = await openRouter.health();
    return res.ok;
  }

  /** Cek kesehatan lengkap (untuk UI Settings). */
  async checkHealthDetailed() {
    return openRouter.health();
  }

  /** Sisa kredit akun OpenRouter. */
  async credits() {
    return openRouter.credits();
  }

  /**
   * Memperbarui konfigurasi AI.
   * @param {Object} config
   */
  updateConfig(config = {}) {
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens !== undefined) this.maxTokens = config.maxTokens;
    if (config.proxyUrl !== undefined) this.proxyUrl = config.proxyUrl;
    if (config.fallbackModels) this.fallbackModels = config.fallbackModels;

    openRouter.updateConfig({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      model: this.model,
      proxyUrl: this.proxyUrl,
      fallbackModels: this.fallbackModels,
    });
  }
}

// ------------------------------------------------------------
//  Singleton
// ------------------------------------------------------------
export let aiClient = null;

/**
 * @param {string|Object} endpoint - URL atau object config
 * @param {string} [apiKey]
 * @param {string} [model]
 */
export function initAIClient(endpoint, apiKey, model) {
  aiClient = new AIClient(endpoint, apiKey, model);
  return aiClient;
}
