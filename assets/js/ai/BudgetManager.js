/**
 * ============================================================
 *  BUDGETMANAGER.JS — Polisi Kuota AI (OpenRouter Free Tier)
 * ------------------------------------------------------------
 *  Kenyataan pahit free tier OpenRouter:
 *    • 20 request / menit
 *    • 50 request / hari  (1.000/hari kalau akun pernah top-up $10)
 *
 *  Kalau 8 karakter "berpikir" sendiri-sendiri tiap 10 detik, kuota
 *  seharian habis dalam 6 menit. Karena itu SEMUA panggilan AI
 *  (interogasi + simulasi wisma) harus antre di sini.
 *
 *  Yang dilakukan modul ini:
 *   1. Kuota harian   → dihitung per tanggal lokal, disimpan permanen
 *   2. Rate per menit → sliding window, job ditunda kalau penuh
 *   3. Prioritas      → interogasi pemain > sadapan > director > refleksi
 *   4. Cadangan       → slot khusus interogasi supaya wisma tidak
 *                        "memakan" jatah pertanyaan pemain
 *   5. Cache          → prompt identik tidak dibayar dua kali
 *   6. Degradasi      → 3x gagal beruntun ⇒ mode OFFLINE sementara
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";

const LS_BUDGET = "retrosleuth_ai_budget";
const LS_CACHE = "retrosleuth_ai_cache";
const CACHE_MAX_ENTRIES = 40;

/** Prioritas default per jenis panggilan. */
export const PRIORITY = {
  interrogation: 100, // pemain sedang menunggu jawaban
  deep: 70, // "intai pikiran" satu karakter
  eavesdrop: 65, // sadap percakapan
  director: 40, // tick rutin seluruh wisma
  reflect: 20, // ringkasan memori (paling murah dikorbankan)
};

/** Jenis yang boleh memakai slot cadangan interogasi. */
const RESERVED_KINDS = new Set(["interrogation"]);

export class BudgetManager {
  /**
   * @param {Object} config
   * @param {number} [config.dailyLimit=50]
   * @param {number} [config.perMinuteLimit=20]
   * @param {number} [config.reserve=12]      - slot khusus interogasi
   * @param {number} [config.concurrency=1]
   * @param {boolean} [config.cacheEnabled=true]
   */
  constructor(config = {}) {
    this.dailyLimit = config.dailyLimit ?? 50;
    this.perMinuteLimit = config.perMinuteLimit ?? 20;
    // sisakan sedikit ruang aman di bawah plafon provider
    this.safePerMinute = Math.max(1, Math.min(this.perMinuteLimit - 2, this.perMinuteLimit));
    this.reserve = config.reserve ?? 12;
    this.concurrency = config.concurrency ?? 1;
    this.cacheEnabled = config.cacheEnabled !== false;
    this.degradeCooldownMs = config.degradeCooldownMs ?? 10 * 60 * 1000;

    /** @type {Array<Object>} antrean job */
    this.queue = [];
    this.running = 0;
    this.consecutiveFailures = 0;
    this.degradedUntil = 0;

    /** @type {number[]} timestamp panggilan (sliding window 60 detik) */
    this.minuteWindow = [];

    this.usage = this._loadUsage();
    this.cache = this._loadCache();
  }

  // ============================================================
  //  KONFIGURASI
  // ============================================================

  updateConfig(config = {}) {
    if (config.dailyLimit !== undefined) this.dailyLimit = config.dailyLimit;
    if (config.perMinuteLimit !== undefined) {
      this.perMinuteLimit = config.perMinuteLimit;
      this.safePerMinute = Math.max(1, Math.min(this.perMinuteLimit - 2, this.perMinuteLimit));
    }
    if (config.reserve !== undefined) this.reserve = config.reserve;
    if (config.cacheEnabled !== undefined) this.cacheEnabled = config.cacheEnabled;
    this._persistUsage();
    this.emit();
  }

  // ============================================================
  //  KUOTA
  // ============================================================

  _todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  _loadUsage() {
    try {
      const raw = localStorage.getItem(LS_BUDGET);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === this._todayKey()) return parsed;
      }
    } catch {
      /* ignore */
    }
    return { date: this._todayKey(), used: 0, byKind: {}, failed: 0, cachedHits: 0 };
  }

  _persistUsage() {
    try {
      localStorage.setItem(LS_BUDGET, JSON.stringify(this.usage));
    } catch {
      /* ignore */
    }
  }

  _countLastMinute() {
    const cutoff = Date.now() - 60_000;
    this.minuteWindow = this.minuteWindow.filter((t) => t > cutoff);
    return this.minuteWindow.length;
  }

  /**
   * Apakah jenis panggilan ini masih boleh memakai kuota?
   * @param {string} kind
   * @returns {{allowed:boolean,reason:string,dailyLeft:number,minuteLeft:number}}
   */
  canSpend(kind = "director") {
    const dailyLeft = Math.max(0, this.dailyLimit - this.usage.used);
    const minuteLeft = Math.max(0, this.safePerMinute - this._countLastMinute());

    if (this.isDegraded) {
      return { allowed: false, reason: "AI sedang dalam mode degradasi (cooldown).", dailyLeft, minuteLeft };
    }
    if (dailyLeft <= 0) {
      return { allowed: false, reason: "Kuota harian habis.", dailyLeft, minuteLeft };
    }
    if (!RESERVED_KINDS.has(kind)) {
      const usable = dailyLeft - this.reserve;
      if (usable <= 0) {
        return {
          allowed: false,
          reason: `Sisa ${dailyLeft} panggilan dicadangkan untuk interogasi.`,
          dailyLeft,
          minuteLeft,
        };
      }
    }
    if (minuteLeft <= 0) {
      return { allowed: false, reason: "Menunggu jendela 1 menit berikutnya.", dailyLeft, minuteLeft };
    }
    return { allowed: true, reason: "", dailyLeft, minuteLeft };
  }

  get isDegraded() {
    return Date.now() < this.degradedUntil;
  }

  /** Statistik untuk HUD. */
  stats() {
    const dailyLeft = Math.max(0, this.dailyLimit - this.usage.used);
    return {
      date: this.usage.date,
      used: this.usage.used,
      dailyLimit: this.dailyLimit,
      dailyLeft,
      reserve: this.reserve,
      wismaLeft: Math.max(0, dailyLeft - this.reserve),
      minuteUsed: this._countLastMinute(),
      minuteLimit: this.perMinuteLimit,
      queueLength: this.queue.length,
      running: this.running,
      degraded: this.isDegraded,
      degradedSecondsLeft: this.isDegraded ? Math.ceil((this.degradedUntil - Date.now()) / 1000) : 0,
      byKind: { ...this.usage.byKind },
      failed: this.usage.failed,
      cachedHits: this.usage.cachedHits,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  emit() {
    EventBus.emit("ai:budget", this.stats());
  }

  /** Paksa keluar dari mode degradasi (tombol "Coba lagi"). */
  clearDegradation() {
    this.degradedUntil = 0;
    this.consecutiveFailures = 0;
    this.emit();
  }

  resetDaily() {
    this.usage = { date: this._todayKey(), used: 0, byKind: {}, failed: 0, cachedHits: 0 };
    this._persistUsage();
    this.emit();
  }

  // ============================================================
  //  CACHE
  // ============================================================

  _loadCache() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {};
  }

  _persistCache() {
    try {
      const keys = Object.keys(this.cache);
      // buang entri tertua kalau kepenuhan
      if (keys.length > CACHE_MAX_ENTRIES) {
        keys
          .sort((a, b) => (this.cache[a].t || 0) - (this.cache[b].t || 0))
          .slice(0, keys.length - CACHE_MAX_ENTRIES)
          .forEach((k) => delete this.cache[k]);
      }
      localStorage.setItem(LS_CACHE, JSON.stringify(this.cache));
    } catch {
      /* ignore */
    }
  }

  cacheGet(key) {
    if (!this.cacheEnabled || !key) return null;
    const entry = this.cache[key];
    if (!entry) return null;
    if (entry.ttl && Date.now() - entry.t > entry.ttl) {
      delete this.cache[key];
      return null;
    }
    return entry.value;
  }

  cacheSet(key, value, ttlMs = 15 * 60 * 1000) {
    if (!this.cacheEnabled || !key) return;
    this.cache[key] = { value, t: Date.now(), ttl: ttlMs };
    this._persistCache();
  }

  clearCache() {
    this.cache = {};
    try {
      localStorage.removeItem(LS_CACHE);
    } catch {
      /* ignore */
    }
  }

  /** Hash string ringan (bukan kriptografis) untuk cache key. */
  static hash(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
  }

  // ============================================================
  //  ANTREAN
  // ============================================================

  /**
   * Masukkan pekerjaan AI ke antrean.
   * @param {Object} job
   * @param {string} job.kind - 'interrogation'|'deep'|'eavesdrop'|'director'|'reflect'
   * @param {Function} job.run - async () => hasil (dipanggil hanya kalau kuota ada)
   * @param {number} [job.priority]
   * @param {string} [job.cacheKey]
   * @param {number} [job.ttl]
   * @param {number} [job.maxWaitMs] - kalau rate limit, tunggu maksimal segini
   * @param {boolean} [job.dropIfBusy] - batalkan (bukan tunggu) kalau kuota menit penuh
   * @returns {Promise<{ok:boolean,degraded:boolean,cached:boolean,reason?:string,value?:any}>}
   */
  enqueue(job) {
    const kind = job.kind || "director";
    const priority = job.priority ?? PRIORITY[kind] ?? 30;

    // Cache hit → gratis, tidak menyentuh kuota
    if (job.cacheKey) {
      const hit = this.cacheGet(job.cacheKey);
      if (hit !== null) {
        this.usage.cachedHits++;
        this._persistUsage();
        this.emit();
        return Promise.resolve({ ok: true, degraded: false, cached: true, value: hit });
      }
    }

    // Kuota harian habis → jangan antre sia-sia
    const gate = this.canSpend(kind);
    if (!gate.allowed && gate.reason !== "Menunggu jendela 1 menit berikutnya.") {
      return Promise.resolve({ ok: false, degraded: true, cached: false, reason: gate.reason });
    }

    return new Promise((resolve) => {
      this.queue.push({
        ...job,
        kind,
        priority,
        createdAt: Date.now(),
        maxWaitMs: job.maxWaitMs ?? (kind === "interrogation" ? 60_000 : 8_000),
        resolve,
      });
      this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
      this.emit();
      this._pump();
    });
  }

  async _pump() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      const waited = Date.now() - job.createdAt;

      const gate = this.canSpend(job.kind);
      if (!gate.allowed) {
        // Masih boleh menunggu?
        if (waited < job.maxWaitMs && !job.dropIfBusy) {
          this.queue.push(job);
          this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
          this.running++;
          setTimeout(() => {
            this.running--;
            this._pump();
          }, Math.min(4000, 1500 + waited / 4));
          return;
        }
        job.resolve({ ok: false, degraded: true, cached: false, reason: gate.reason });
        continue;
      }

      this.running++;
      this._execute(job);
    }
  }

  async _execute(job) {
    // Catat pemakaian SEBELUM panggilan (request gagal pun dihitung provider)
    this.minuteWindow.push(Date.now());
    this.usage.used++;
    this.usage.byKind[job.kind] = (this.usage.byKind[job.kind] || 0) + 1;
    this._persistUsage();
    this.emit();

    let result;
    try {
      result = await job.run();
    } catch (err) {
      result = { ok: false, error: err?.message || String(err) };
    } finally {
      this.running--;
    }

    if (result?.ok) {
      this.consecutiveFailures = 0;
      if (job.cacheKey) this.cacheSet(job.cacheKey, result.value, job.ttl);
    } else {
      this.usage.failed++;
      this.consecutiveFailures++;
      this._persistUsage();
      if (this.consecutiveFailures >= 3 && job.kind !== "interrogation") {
        this.degradedUntil = Date.now() + this.degradeCooldownMs;
        this.consecutiveFailures = 0;
        EventBus.emit("ai:degraded", {
          reason: result?.error || "3 kegagalan beruntun",
          until: this.degradedUntil,
        });
        console.warn("[Budget] ⚠️ Mode degradasi: simulasi wisma pindah ke mesin lokal.");
      }
    }

    this.emit();
    job.resolve({
      ok: !!result?.ok,
      degraded: false,
      cached: false,
      value: result?.value,
      reason: result?.error || null,
      meta: result?.meta || null,
    });

    // lanjutkan antrean
    setTimeout(() => this._pump(), 250);
  }
}

// ------------------------------------------------------------
//  Singleton
// ------------------------------------------------------------
export let budget = null;

export function initBudgetManager(config) {
  budget = new BudgetManager(config);
  return budget;
}
