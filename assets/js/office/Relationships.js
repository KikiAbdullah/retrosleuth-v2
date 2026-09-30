/**
 * ============================================================
 *  RELATIONSHIPS.JS — Jejaring Relasi Antar Penghuni
 * ------------------------------------------------------------
 *  Empat sumbu per pasangan:
 *    trust    — mau percaya
 *    affinity — kedekatan/suka
 *    tension  — ketegangan
 *    fear     — takut
 *
 *  Relasi berubah karena: percakapan, gosip, pertengkaran,
 *  melihat orang lain berbuat aneh, dan koreksi dari AI.
 *
 *  CATATAN RAHASIA (secretNote) baru terbuka kalau detektif sudah
 *  menemukan bukti pemantiknya atau sudah menyadap pasangan itu —
 *  jadi UI tidak membocorkan cerita secara gratis.
 * ============================================================
 */

const NEUTRAL = { trust: 40, affinity: 40, tension: 15, fear: 5 };

export class RelationshipGraph {
  /**
   * @param {Array<Object>} seeds - dari office.json.relationships
   */
  constructor(seeds = []) {
    /** @type {Map<string,Object>} */
    this.map = new Map();
    for (const s of seeds) this._set(s.a, s.b, { ...NEUTRAL, ...s, observed: false });
  }

  static key(a, b) {
    return [a, b].sort().join("|");
  }

  _set(a, b, value) {
    this.map.set(RelationshipGraph.key(a, b), value);
    return value;
  }

  /**
   * Ambil relasi (dibuat netral kalau belum ada).
   * @returns {Object}
   */
  get(a, b) {
    if (a === b) {
      return { ...NEUTRAL, trust: 100, affinity: 100, public_note: "diri sendiri" };
    }
    const k = RelationshipGraph.key(a, b);
    if (!this.map.has(k)) {
      this.map.set(k, { a, b, ...NEUTRAL, public_note: "Tidak banyak berinteraksi.", secret_note: "", reveal_evidence: [], observed: false });
    }
    return this.map.get(k);
  }

  /**
   * Ubah nilai relasi (delta -100..100).
   * @param {string} a
   * @param {string} b
   * @param {{trust?:number,affinity?:number,tension?:number,fear?:number}} delta
   */
  delta(a, b, delta = {}) {
    if (a === b || !delta) return;
    const r = this.get(a, b);
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
    if (delta.trust !== undefined) r.trust = clamp(r.trust + Number(delta.trust));
    if (delta.affinity !== undefined) r.affinity = clamp(r.affinity + Number(delta.affinity));
    if (delta.tension !== undefined) r.tension = clamp(r.tension + Number(delta.tension));
    if (delta.fear !== undefined) r.fear = clamp(r.fear + Number(delta.fear));
  }

  /** Tandai bahwa detektif sudah mengamati/menyadap pasangan ini. */
  markObserved(a, b) {
    const r = this.get(a, b);
    r.observed = true;
  }

  /** Apakah catatan rahasia pasangan ini boleh ditampilkan? */
  isSecretRevealed(a, b, discoveredEvidence = []) {
    const r = this.get(a, b);
    if (r.observed) return true;
    const needed = r.reveal_evidence || [];
    return needed.length > 0 && needed.some((id) => discoveredEvidence.includes(id));
  }

  /**
   * Semua relasi yang melibatkan satu orang (untuk panel UI).
   * @param {string} id
   * @param {string[]} discoveredEvidence
   * @param {(id:string)=>string} [nameOf]
   */
  listFor(id, discoveredEvidence = [], nameOf = (x) => x) {
    const out = [];
    for (const r of this.map.values()) {
      const other = r.a === id ? r.b : r.b === id ? r.a : null;
      if (!other) continue;
      const revealed = this.isSecretRevealed(id, other, discoveredEvidence);
      out.push({
        id: other,
        name: nameOf(other),
        trust: r.trust,
        affinity: r.affinity,
        tension: r.tension,
        fear: r.fear || 0,
        note: r.public_note || "",
        secretNote: revealed ? r.secret_note || "" : "",
        revealed,
        observed: !!r.observed,
      });
    }
    return out.sort((a, b) => b.tension + b.affinity - (a.tension + a.affinity));
  }

  /**
   * Gosip: A bercerita ke B tentang C.
   * B sedikit mengadopsi perasaan A terhadap C.
   */
  gossip(from, to, about, strength = 0.25) {
    if ([from, to, about].some((x) => !x)) return;
    if (new Set([from, to, about]).size < 3) return;
    const src = this.get(from, about);
    this.delta(to, about, {
      trust: (src.trust - NEUTRAL.trust) * strength,
      affinity: (src.affinity - NEUTRAL.affinity) * strength,
      tension: (src.tension - NEUTRAL.tension) * strength,
      fear: ((src.fear || 0) - NEUTRAL.fear) * strength,
    });
  }

  /** Ringkasan relasi untuk prompt AI (sangat ringkas). */
  summarizeFor(id, limit = 3, discoveredEvidence = []) {
    return this.listFor(id, discoveredEvidence)
      .slice(0, limit)
      .map((r) => `${r.id}(T${r.trust}/A${r.affinity}/X${r.tension})`);
  }

  toJSON() {
    return [...this.map.values()];
  }

  static fromJSON(data) {
    return new RelationshipGraph(Array.isArray(data) ? data : []);
  }
}
