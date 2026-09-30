/**
 * ============================================================
 *  OPENROUTERCLIENT.JS — Lapisan HTTP paling bawah untuk AI
 * ------------------------------------------------------------
 *  Satu-satunya pintu keluar ke model AI (OpenRouter free tier
 *  atau proxy lokal). Semua modul (interogasi & kantor virtual)
 *  memakai klien ini lewat BudgetManager, TIDAK pernah fetch
 *  sendiri — supaya kuota 20 req/menit & 50 req/hari aman.
 *
 *  Fitur:
 *   - Mode DIRECT (key di browser) atau PROXY (key di server)
 *   - Retry + exponential backoff untuk 429 / 5xx / network
 *   - Rantai model fallback (kalau 1 model free sedang penuh)
 *   - Parser JSON toleran (model free sering cerewet / pakai ```json)
 *   - Statistik token & latensi untuk HUD
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";

export const DEFAULT_MODELS = {
  primary: "deepseek/deepseek-chat-v3-0324:free",
  fallbacks: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-235b-a22b:free",
    "google/gemini-2.0-flash-exp:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "deepseek/deepseek-r1:free",
  ],
};

export class OpenRouterClient {
  /**
   * @param {Object} config
   * @param {string} [config.endpoint]  - URL chat completions (direct).
   * @param {string} [config.apiKey]    - sk-or-... (kosongkan kalau pakai proxy).
   * @param {string} [config.model]     - Model utama.
   * @param {string[]} [config.fallbackModels]
   * @param {string} [config.proxyUrl]  - Kalau diisi, semua request lewat sini (tanpa key di browser).
   * @param {number} [config.timeout]   - ms per percobaan.
   * @param {number} [config.maxRetries]
   */
  constructor(config = {}) {
    this.endpoint =
      config.endpoint || "https://openrouter.ai/api/v1/chat/completions";
    this.apiKey = config.apiKey || "";
    this.model = config.model || DEFAULT_MODELS.primary;
    this.fallbackModels = config.fallbackModels || DEFAULT_MODELS.fallbacks;
    this.proxyUrl = config.proxyUrl || "";
    this.timeout = config.timeout || 45000;
    this.maxRetries = config.maxRetries ?? 2;
    this.appTitle = config.appTitle || "RetroSleuth Office";

    /** Statistik kumulatif sesi ini */
    this.stats = {
      requests: 0,
      succeeded: 0,
      failed: 0,
      retries: 0,
      promptTokens: 0,
      completionTokens: 0,
      avgLatencyMs: 0,
      lastModel: null,
      lastError: null,
    };
  }

  /** Mode koneksi: 'proxy' | 'direct' | 'none' */
  get mode() {
    if (this.proxyUrl) return "proxy";
    if (this.apiKey) return "direct";
    return "none";
  }

  /** Apakah klien ini bisa dipakai sama sekali? */
  get usable() {
    return this.mode !== "none";
  }

  /**
   * Update konfigurasi (dipanggil dari Settings).
   * @param {Object} config
   */
  updateConfig(config = {}) {
    if (config.endpoint !== undefined) this.endpoint = config.endpoint;
    if (config.apiKey !== undefined) this.apiKey = config.apiKey || "";
    if (config.model) this.model = config.model;
    if (config.fallbackModels) this.fallbackModels = config.fallbackModels;
    if (config.proxyUrl !== undefined) this.proxyUrl = config.proxyUrl || "";
    if (config.timeout) this.timeout = config.timeout;
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
  }

  // ============================================================
  //  API UTAMA
  // ============================================================

  /**
   * Mengirim satu percakapan.
   * @param {Object} opts
   * @param {Array<{role:string,content:string}>} opts.messages
   * @param {number} [opts.temperature]
   * @param {number} [opts.maxTokens]
   * @param {boolean} [opts.jsonMode] - Minta keluaran JSON (best-effort).
   * @param {string} [opts.tag] - Label untuk log ('director'|'deep'|'interrogation').
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<{ok:boolean,text:string,json:any,model:string,usage:Object,error:string,attempts:number,latencyMs:number}>}
   */
  async chat(opts) {
    const {
      messages,
      temperature = 0.85,
      maxTokens = 500,
      jsonMode = false,
      tag = "chat",
      signal,
    } = opts;

    if (!this.usable) {
      return this._fail("AI belum dikonfigurasi (kosong: endpoint/key/proxy).", tag, 0, 0);
    }

    // Rantai model: utama → fallback (maks 3 model supaya tidak boros kuota)
    const chain = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)].slice(0, 3);
    const started = Date.now();
    let attempts = 0;
    let lastError = "unknown";

    for (let mi = 0; mi < chain.length; mi++) {
      const model = chain[mi];
      for (let retry = 0; retry <= this.maxRetries; retry++) {
        attempts++;
        this.stats.requests++;

        try {
          const body = {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          };
          if (jsonMode) body.response_format = { type: "json_object" };

          const res = await this._post(body, tag, signal);
          const latencyMs = Date.now() - started;

          if (!res.ok) {
            lastError = `HTTP ${res.status} ${res.statusText || ""}`.trim();
            const retryable = [408, 429, 500, 502, 503, 504, 521, 522, 524].includes(res.status);

            if (retryable && retry < this.maxRetries) {
              const wait = this._backoffMs(res, retry);
              this.stats.retries++;
              EventBus.emit("ai:retry", { tag, model, status: res.status, wait });
              await sleep(wait, signal);
              continue;
            }
            // Model ini menyerah → coba model berikutnya
            break;
          }

          const data = await res.json().catch(() => null);
          const text = data?.choices?.[0]?.message?.content || "";

          if (!text || !text.trim()) {
            lastError = "Respons kosong dari provider";
            if (retry < this.maxRetries) {
              this.stats.retries++;
              await sleep(this._backoffMs(null, retry), signal);
              continue;
            }
            break;
          }

          // Sukses
          const usage = data?.usage || {};
          this.stats.succeeded++;
          this.stats.promptTokens += usage.prompt_tokens || 0;
          this.stats.completionTokens += usage.completion_tokens || 0;
          this.stats.avgLatencyMs = Math.round(
            (this.stats.avgLatencyMs * (this.stats.succeeded - 1) + latencyMs) /
              this.stats.succeeded
          );
          this.stats.lastModel = model;
          this.stats.lastError = null;

          EventBus.emit("ai:success", { tag, model, latencyMs, usage });

          return {
            ok: true,
            text: text.trim(),
            json: jsonMode ? OpenRouterClient.extractJson(text) : null,
            model,
            usage,
            error: null,
            attempts,
            latencyMs,
          };
        } catch (err) {
          lastError = err?.name === "AbortError" ? "dibatalkan/timeout" : err?.message || String(err);
          if (err?.name === "AbortError") {
            return this._fail(lastError, tag, attempts, Date.now() - started);
          }
          this.stats.retries++;
          if (retry < this.maxRetries) {
            await sleep(this._backoffMs(null, retry), signal);
            continue;
          }
        }
      }
      // lanjut ke model fallback berikutnya
    }

    return this._fail(lastError, tag, attempts, Date.now() - started);
  }

  /**
   * Tes koneksi ringan (dipakai tombol "Test Connection").
   * Memakai endpoint /models kalau direct (0 token), atau /health kalau proxy.
   * @returns {Promise<{ok:boolean,detail:string,models?:Array}>}
   */
  async health() {
    try {
      if (this.mode === "proxy") {
        const base = this.proxyUrl.replace(/\/+$/, "");
        const res = await fetch(`${base}/health`, {
          signal: AbortSignal.timeout(8000),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, detail: data?.detail || `HTTP ${res.status}`, models: data?.models };
      }

      if (this.mode === "none") {
        return { ok: false, detail: "Belum ada API key / proxy URL." };
      }

      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const data = await res.json().catch(() => ({ data: [] }));
      const free = (data.data || [])
        .filter((m) => m.id.endsWith(":free"))
        .map((m) => m.id);
      return {
        ok: true,
        detail: `${free.length} model :free tersedia. Key valid.`,
        models: free,
      };
    } catch (err) {
      return { ok: false, detail: err?.message || "Gagal menghubungi server" };
    }
  }

  /**
   * Cek sisa kredit/kuota akun (butuh key; hanya mode direct).
   * @returns {Promise<{ok:boolean,total_credits:number,total_usage:number,remaining:number}>}
   */
  async credits() {
    if (this.mode !== "direct") {
      return { ok: false, total_credits: 0, total_usage: 0, remaining: 0 };
    }
    try {
      const res = await fetch("https://openrouter.ai/api/v1/credits", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, total_credits: 0, total_usage: 0, remaining: 0 };
      const d = (await res.json())?.data || {};
      const total = Number(d.total_credits || 0);
      const used = Number(d.total_usage || 0);
      return { ok: true, total_credits: total, total_usage: used, remaining: total - used };
    } catch {
      return { ok: false, total_credits: 0, total_usage: 0, remaining: 0 };
    }
  }

  // ============================================================
  //  INTERNAL
  // ============================================================

  async _post(body, tag, externalSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const useProxy = this.mode === "proxy";
    const url = useProxy ? this.proxyUrl.replace(/\/+$/, "") + "/chat" : this.endpoint;

    const headers = { "Content-Type": "application/json" };
    if (!useProxy) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
      // Header rekomendasi OpenRouter untuk aplikasi browser
      headers["HTTP-Referer"] = globalThis.location?.origin || "https://retrosleuth.local";
      headers["X-Title"] = this.appTitle;
    } else {
      headers["X-RetroSleuth-Tag"] = tag;
    }

    try {
      return await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(useProxy ? { ...body, tag } : body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  _backoffMs(res, retry) {
    // Hormati Retry-After kalau ada (detik)
    const ra = res?.headers?.get?.("retry-after");
    if (ra) {
      const secs = Number(ra);
      if (!Number.isNaN(secs)) return Math.min(secs * 1000, 20000);
    }
    const base = 1200 * Math.pow(2, retry); // 1.2s, 2.4s, 4.8s
    return Math.min(base + Math.random() * 600, 12000);
  }

  _fail(error, tag, attempts, latencyMs) {
    this.stats.failed++;
    this.stats.lastError = error;
    EventBus.emit("ai:error", { tag, error, attempts });
    return {
      ok: false,
      text: "",
      json: null,
      model: null,
      usage: {},
      error,
      attempts,
      latencyMs,
    };
  }

  // ============================================================
  //  UTIL: PARSER JSON TOLERAN
  // ============================================================

  /**
   * Mengambil objek JSON pertama dari teks bebas.
   * Model gratis sering membungkus JSON dengan ```json ... ``` atau
   * menambahkan kalimat pembuka. Fungsi ini tetap menyelamatkan datanya.
   * @param {string} text
   * @returns {any|null}
   */
  static extractJson(text) {
    if (!text) return null;
    let t = String(text).trim();

    // 1) Buang code fence
    const fence = t.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();

    // 2) Coba parse langsung
    try {
      return JSON.parse(t);
    } catch {
      /* lanjut */
    }

    // 3) Ambil keseimbangan kurung kurawal pertama
    const start = t.indexOf("{");
    if (start === -1) {
      const arrStart = t.indexOf("[");
      if (arrStart === -1) return null;
      const arr = OpenRouterClient._balanced(t, arrStart, "[", "]");
      if (arr) {
        try {
          return JSON.parse(arr);
        } catch {
          return null;
        }
      }
      return null;
    }

    const slice = OpenRouterClient._balanced(t, start, "{", "}");
    if (!slice) return null;

    try {
      return JSON.parse(slice);
    } catch {
      // 4) Perbaikan ringan: koma menggantung & kutip tunggal
      const cleaned = slice
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\r\n\t]+/g, " ");
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }

  static _balanced(str, startIdx, open, close) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = startIdx; i < str.length; i++) {
      const c = str[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return str.slice(startIdx, i + 1);
      }
    }
    return null;
  }
}

/** Tidur yang bisa dibatalkan. */
export function sleep(ms, signal) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(id);
          resolve();
        },
        { once: true }
      );
    }
  });
}

// ------------------------------------------------------------
//  Singleton (dikonfigurasi ulang oleh SettingsWindow)
// ------------------------------------------------------------
export let openRouter = new OpenRouterClient({});

export function initOpenRouterClient(config) {
  openRouter = new OpenRouterClient(config);
  return openRouter;
}
