/**
 * ============================================================
 *  AICLIENT.JS — HTTP Client untuk Server AI Lokal
 *  Format OpenAI-compatible. Menangani timeout, error, fallback.
 * ============================================================
 */

import { GameState } from "../core/Store.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { TrustSystem } from "./TrustSystem.js";
import {
  getFallbackResponse,
  getFallbackResponseWithError,
} from "./FallbackMode.js";

export class AIClient {
  /**
   * @param {string} endpoint - URL endpoint AI (default: http://localhost:20128/v1/chat/completions)
   * @param {string} apiKey - API key (default: placeholder)
   * @param {string} model - Nama model (default: gemini-2.5)
   */
  constructor(
    endpoint = "http://localhost:20128/v1/chat/completions",
    apiKey = "sk-d9da44a505179175-7im48b-73d30919",
    model = "gemini-2.5"
  ) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
    this.timeout = 30000; // 30 detik
    this.temperature = 0.8;
  }

  /**
   * Mengirim pesan ke AI dan mengembalikan respons.
   * @param {string} suspectId - ID karakter.
   * @param {string} userMessage - Pertanyaan pemain.
   * @returns {Promise<{success: boolean, reply: string, blocked: boolean}>}
   */
  async sendMessage(suspectId, userMessage) {
    try {
      // 1. Bangun system prompt
      const systemPrompt = PromptBuilder.build(suspectId);

      // 2. Ambil riwayat chat (maksimal 8 pesan terakhir)
      const history = GameState.getChatHistory(suspectId);
      const recentHistory = history.slice(-8);

      // 3. Susun messages
      const messages = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: userMessage },
      ];

      // 4. Kirim request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 5. Proses respons
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "";

      if (!reply || reply.trim() === "") {
        throw new Error("Respons AI kosong");
      }

      // 6. Simpan chat history
      GameState.addChatMessage(suspectId, "user", userMessage);
      GameState.addChatMessage(suspectId, "assistant", reply);

      // 7. Proses emosi
      TrustSystem.process(suspectId, userMessage, reply);

      return { success: true, reply, blocked: false };
    } catch (error) {
      console.error("[AIClient] Error:", error);

      // Fallback
      let fallbackReply;
      if (error.name === "AbortError") {
        fallbackReply = getFallbackResponseWithError(
          "Server AI tidak merespons (timeout)"
        );
      } else if (error.message.includes("HTTP")) {
        fallbackReply = getFallbackResponseWithError("Server AI error");
      } else {
        fallbackReply = getFallbackResponse();
      }

      // Simpan chat history (tetap simpan pertanyaan dan respons fallback)
      GameState.addChatMessage(suspectId, "user", userMessage);
      GameState.addChatMessage(suspectId, "assistant", fallbackReply);

      return { success: false, reply: fallbackReply, blocked: false };
    }
  }

  /**
   * Mengecek kesehatan server AI.
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const healthUrl = this.endpoint.replace(
        "/v1/chat/completions",
        "/health"
      );
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.warn("[AIClient] Health check gagal:", error);
      return false;
    }
  }

  /**
   * Memperbarui konfigurasi AI.
   * @param {Object} config
   */
  updateConfig(config) {
    if (config.endpoint) this.endpoint = config.endpoint;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
  }
}

// Ekspor instance singleton
export let aiClient = null;

export function initAIClient(endpoint, apiKey, model) {
  aiClient = new AIClient(endpoint, apiKey, model);
  return aiClient;
}
