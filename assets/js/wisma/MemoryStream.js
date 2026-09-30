/**
 * ============================================================
 *  MEMORYSTREAM.JS — Ingatan Per-Karakter
 * ------------------------------------------------------------
 *  Tiap penghuni punya aliran ingatan sendiri (memory stream,
 *  gaya "generative agents"). Ingatan lahir dari APA YANG IA
 *  LIHAT/DENGAR di simulasi — bukan dari naskah kasus. Inilah
 *  yang membuat tiap karakter "pintarnya" beda-beda:
 *   • Budi ingat siapa saja yang naik tangga pukul 21.50
 *   • Marni ingat suara pertengkaran dari balik pintu
 *   • Tio ingat pelat mobil yang keluar gerbang
 *
 *  Pengambilan ingatan memakai skor gabungan:
 *     kepentingan (importance) + kebaruan (recency) + relevansi
 *
 *  Ada juga `spoiler` flag: ingatan kunci dikunci sampai detektif
 *  menemukan bukti pemantiknya, supaya game tidak bocor duluan.
 * ============================================================
 */

const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","itu","ini","saya","dia","nya","untuk","pada","dengan","adalah",
  "tidak","sudah","akan","ada","orang","rumah","malam","tadi","saat","ketika","lalu","juga",
]);

export class MemoryStream {
  /**
   * @param {string} owner - id karakter pemilik ingatan
   * @param {Object} [opts]
   * @param {number} [opts.max=60]
   */
  constructor(owner, opts = {}) {
    this.owner = owner;
    this.max = opts.max || 60;
    /** @type {Array<Object>} */
    this.entries = [];
    /** @type {Array<Object>} */
    this.reflections = [];
    this._seq = 0;
  }

  // ============================================================
  //  TULIS
  // ============================================================

  /**
   * Tambah satu ingatan.
   * @param {Object} m
   * @param {string} m.text
   * @param {string} [m.type]      - 'observation'|'conversation'|'self'|'reflection'|'ai'
   * @param {number} [m.importance]- 0..100
   * @param {number} m.clock       - menit sejak tengah malam (waktu simulasi)
   * @param {string} [m.timeLabel] - "22:05"
   * @param {string} [m.room]
   * @param {string} [m.about]     - id karakter lain yang terlibat
   * @param {boolean} [m.spoiler]  - kunci sampai bukti tertentu ditemukan
   * @param {string[]} [m.revealEvidence]
   * @param {boolean} [m.private]  - tidak masuk log CCTV
   * @returns {Object} entri yang tersimpan
   */
  add(m) {
    const entry = {
      id: `${this.owner}_m${++this._seq}`,
      text: String(m.text || "").slice(0, 240),
      type: m.type || "observation",
      importance: Math.max(0, Math.min(100, Math.round(m.importance ?? 30))),
      clock: m.clock ?? 0,
      timeLabel: m.timeLabel || "",
      room: m.room || null,
      about: m.about || null,
      spoiler: !!m.spoiler,
      revealEvidence: m.revealEvidence || [],
      private: !!m.private,
      fromIncident: !!m.fromIncident,
      createdAt: Date.now(),
    };
    this.entries.push(entry);
    this._compact();
    return entry;
  }

  addReflection(text, clock, timeLabel) {
    const r = {
      id: `${this.owner}_r${this.reflections.length + 1}`,
      text: String(text || "").slice(0, 240),
      type: "reflection",
      importance: 60,
      clock,
      timeLabel: timeLabel || "",
      createdAt: Date.now(),
    };
    this.reflections.push(r);
    if (this.reflections.length > 12) this.reflections.shift();
    this.entries.push(r);
    this._compact();
    return r;
  }

  /** Buang ingatan ber-kepentingan rendah kalau kepenuhan. */
  _compact() {
    if (this.entries.length <= this.max) return;
    const now = Date.now();
    const scored = this.entries.map((e) => ({
      e,
      s: e.importance * 0.7 + (e.type === "reflection" ? 40 : 0) + (e.spoiler ? 30 : 0) -
        ((now - e.createdAt) / 3_600_000) * 5,
    }));
    scored.sort((a, b) => b.s - a.s);
    const keep = new Set(scored.slice(0, this.max).map((x) => x.e.id));
    this.entries = this.entries.filter((e) => keep.has(e.id));
  }

  // ============================================================
  //  BACA
  // ============================================================

  /** n ingatan terbaru. */
  recent(n = 5) {
    return this.entries.slice(-n).reverse();
  }

  /** n ingatan paling penting. */
  important(n = 4) {
    return [...this.entries].sort((a, b) => b.importance - a.importance).slice(0, n);
  }

  /**
   * Ambil ingatan relevan untuk sebuah konteks/pertanyaan.
   * @param {string} query
   * @param {number} limit
   * @param {number} [nowClock] - untuk menghitung kebaruan
   * @returns {Array<Object>}
   */
  retrieve(query = "", limit = 5, nowClock = null) {
    const qTokens = MemoryStream.tokenize(query);
    const now = nowClock ?? (this.entries.at(-1)?.clock ?? 0);

    const scored = this.entries.map((e) => {
      const recency = nowClock === null ? 0.5 : MemoryStream.recencyScore(now - e.clock);
      const relevance = qTokens.length === 0 ? 0.3 : MemoryStream.overlap(qTokens, e.text);
      const importance = e.importance / 100;
      return { e, score: importance * 0.5 + recency * 0.3 + relevance * 0.2 };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.e);
  }

  /**
   * Ingatan yang BOLEH dilihat pemain sekarang.
   * @param {string[]} discoveredEvidence - bukti yang sudah ditemukan detektif
   * @returns {Array<Object>} entri (dengan flag `locked` untuk yang masih terkunci)
   */
  visible(discoveredEvidence = []) {
    return this.entries.map((e) => {
      if (!e.spoiler) return { ...e, locked: false };
      const unlocked =
        e.revealEvidence.length === 0 ||
        e.revealEvidence.some((id) => discoveredEvidence.includes(id));
      return {
        ...e,
        locked: !unlocked,
        text: unlocked ? e.text : "[ingatan kabur — butuh bukti lain untuk mengingatnya]",
        revealHint: unlocked ? null : e.revealEvidence,
      };
    });
  }

  /** Ringkasan untuk prompt AI (hemat token). */
  summarizeForPrompt(limit = 4, nowClock = null) {
    return this.retrieve("", limit, nowClock).map((e) => `${e.timeLabel} ${e.text}`.trim());
  }

  static tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  }

  static overlap(tokens, text) {
    const set = new Set(MemoryStream.tokenize(text));
    if (set.size === 0) return 0;
    let hit = 0;
    for (const t of tokens) if (set.has(t)) hit++;
    return tokens.length ? hit / tokens.length : 0;
  }

  /** Skor kebaruan: 1 = baru saja, mendekati 0 = > 6 jam simulasi lalu. */
  static recencyScore(minutesAgo) {
    const m = Math.max(0, minutesAgo);
    return Math.exp(-m / 180);
  }

  // ============================================================
  //  SERIALIZASI
  // ============================================================

  toJSON() {
    return {
      owner: this.owner,
      seq: this._seq,
      entries: this.entries,
      reflections: this.reflections,
    };
  }

  static fromJSON(data) {
    const ms = new MemoryStream(data?.owner || "?");
    if (!data) return ms;
    ms._seq = data.seq || (data.entries?.length || 0);
    ms.entries = Array.isArray(data.entries) ? data.entries : [];
    ms.reflections = Array.isArray(data.reflections) ? data.reflections : [];
    return ms;
  }
}
