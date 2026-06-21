/**
 * ============================================================
 *  SEARCHENGINE.JS — Full-Text Search via Lunr.js
 *  Index pencarian untuk bukti, notes, karakter, timeline.
 *  Fallback ke simple string matching jika CDN gagal.
 * ============================================================
 */

export class SearchEngine {
  static #lunrLoaded = false;
  static #idx = null;
  static #loadingPromise = null;
  static #documents = new Map();

  /**
   * Memuat Lunr.js dari CDN.
   * @returns {Promise<boolean>}
   */
  static async load() {
    if (this.#lunrLoaded) return true;
    if (this.#loadingPromise) return this.#loadingPromise;

    this.#loadingPromise = new Promise((resolve) => {
      try {
        if (window.lunr) {
          this.#lunrLoaded = true;
          console.log("[SearchEngine] Lunr.js sudah tersedia.");
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/lunr/lunr.min.js";
        script.async = true;

        script.onload = () => {
          this.#lunrLoaded = true;
          console.log("[SearchEngine] Lunr.js dimuat dari CDN.");
          resolve(true);
        };

        script.onerror = () => {
          console.warn("[SearchEngine] Gagal memuat Lunr.js. Menggunakan fallback.");
          this.#lunrLoaded = false;
          resolve(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("[SearchEngine] Error saat memuat Lunr.js:", error);
        this.#lunrLoaded = false;
        resolve(false);
      }
    });

    return this.#loadingPromise;
  }

  /**
   * Membuat index pencarian dari dokumen.
   * @param {Array<{id: string, title: string, content: string, type: string}>} documents
   */
  static buildIndex(documents) {
    this.#documents.clear();

    if (!documents || documents.length === 0) {
      this.#idx = null;
      return;
    }

    // Simpan dokumen untuk fallback
    for (const doc of documents) {
      this.#documents.set(doc.id, doc);
    }

    if (this.#lunrLoaded && window.lunr) {
      try {
        const lunrBuilder = new window.lunr.Builder();
        lunrBuilder.ref("id");
        lunrBuilder.field("title", { boost: 10 });
        lunrBuilder.field("content", { boost: 5 });
        lunrBuilder.field("type", { boost: 3 });

        for (const doc of documents) {
          if (doc.id && doc.title) {
            lunrBuilder.add(doc);
          }
        }

        this.#idx = lunrBuilder.build();
        console.log(`[SearchEngine] Index dibangun: ${documents.length} dokumen.`);
      } catch (error) {
        console.warn("[SearchEngine] Gagal membangun index:", error);
        this.#idx = null;
      }
    }
  }

  /**
   * Mencari dokumen berdasarkan query.
   * @param {string} query
   * @param {Object} options - Opsi pencarian.
   * @returns {Array<{id, title, type, score, snippet}>}
   */
  static search(query, options = {}) {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const cleanQuery = query.trim().toLowerCase();
    const maxResults = options.maxResults || 20;
    const filterType = options.type || null;

    // Gunakan Lunr jika tersedia
    if (this.#lunrLoaded && this.#idx) {
      try {
        const results = this.#idx.search(cleanQuery);
        const mapped = results
          .filter((r) => r.score > 0.1)
          .slice(0, maxResults)
          .map((r) => {
            const doc = this.#documents.get(r.ref);
            if (!doc) return null;
            if (filterType && doc.type !== filterType) return null;
            return {
              id: doc.id,
              title: doc.title,
              type: doc.type,
              score: r.score,
              snippet: this._generateSnippet(doc.content, cleanQuery),
            };
          })
          .filter(Boolean);

        if (mapped.length > 0) return mapped;
      } catch (error) {
        console.warn("[SearchEngine] Lunr search gagal:", error);
      }
    }

    // Fallback: simple string matching
    return this._fallbackSearch(cleanQuery, maxResults, filterType);
  }

  /**
   * Pencarian fallback dengan string matching sederhana.
   * @param {string} query
   * @param {number} maxResults
   * @param {string|null} filterType
   * @returns {Array}
   */
  static _fallbackSearch(query, maxResults, filterType) {
    const results = [];
    const queryWords = query.split(/\s+/).filter((w) => w.length > 1);

    for (const [id, doc] of this.#documents) {
      if (filterType && doc.type !== filterType) continue;

      const titleLower = (doc.title || "").toLowerCase();
      const contentLower = (doc.content || "").toLowerCase();

      let score = 0;

      // Exact match di title
      if (titleLower.includes(query)) {
        score += 10;
      }

      // Word match di title
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          score += 5;
        }
      }

      // Match di content
      for (const word of queryWords) {
        const regex = new RegExp(word, "gi");
        const matches = contentLower.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > 0) {
        results.push({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          score,
          snippet: this._generateSnippet(doc.content, query),
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Generate snippet dari konten yang cocok.
   * @param {string} content
   * @param {string} query
   * @param {number} maxLength
   * @returns {string}
   */
  static _generateSnippet(content, query, maxLength = 120) {
    if (!content) return "";

    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);

    // Cari posisi match
    let matchPos = contentLower.indexOf(queryLower);
    if (matchPos === -1) {
      // Cari word match
      for (const word of queryWords) {
        matchPos = contentLower.indexOf(word);
        if (matchPos !== -1) break;
      }
    }

    if (matchPos === -1) {
      // Tidak ada match, return awal konten
      return content.substring(0, maxLength) + (content.length > maxLength ? "..." : "");
    }

    // Hitung start snippet
    const padding = Math.floor((maxLength - query.length) / 2);
    let start = Math.max(0, matchPos - padding);
    let end = Math.min(content.length, start + maxLength);

    // Adjust start jika end sudah di ujung
    if (end === content.length) {
      start = Math.max(0, end - maxLength);
    }

    let snippet = content.substring(start, end);

    // Tambahkan ellipsis
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";

    return snippet;
  }

  /**
   * Menambah dokumen ke index.
   * @param {Object} doc
   */
  static addDocument(doc) {
    if (!doc || !doc.id) return;
    this.#documents.set(doc.id, doc);

    // Rebuild index jika Lunr tersedia
    if (this.#lunrLoaded) {
      this.buildIndex(Array.from(this.#documents.values()));
    }
  }

  /**
   * Menghapus dokumen dari index.
   * @param {string} id
   */
  static removeDocument(id) {
    this.#documents.delete(id);

    if (this.#lunrLoaded) {
      this.buildIndex(Array.from(this.#documents.values()));
    }
  }

  /**
   * Reset index.
   */
  static clear() {
    this.#documents.clear();
    this.#idx = null;
  }

  /**
   * Mengecek apakah Lunr.js sudah dimuat.
   * @returns {boolean}
   */
  static isLoaded() {
    return this.#lunrLoaded;
  }

  /**
   * Mendapatkan jumlah dokumen di index.
   * @returns {number}
   */
  static getDocumentCount() {
    return this.#documents.size;
  }
}