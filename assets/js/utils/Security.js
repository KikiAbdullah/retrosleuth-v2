/**
 * ============================================================
 *  SECURITY.JS — Input Sanitization & XSS Prevention
 *  Menggunakan DOMPurify dari CDN untuk membersihkan HTML.
 *  Fallback ke manual escaping jika CDN gagal dimuat.
 * ============================================================
 */

export class Security {
  static #purifyLoaded = false;
  static #purify = null;
  static #loadingPromise = null;

  /**
   * Memuat DOMPurify dari CDN.
   * @returns {Promise<boolean>}
   */
  static async load() {
    if (this.#purifyLoaded) return true;
    if (this.#loadingPromise) return this.#loadingPromise;

    this.#loadingPromise = new Promise((resolve) => {
      try {
        if (window.DOMPurify) {
          this.#purify = window.DOMPurify;
          this.#purifyLoaded = true;
          console.log("[Security] DOMPurify sudah tersedia.");
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js";
        script.async = true;

        script.onload = () => {
          this.#purify = window.DOMPurify;
          this.#purifyLoaded = true;
          console.log("[Security] DOMPurify dimuat dari CDN.");
          resolve(true);
        };

        script.onerror = () => {
          console.warn("[Security] Gagal memuat DOMPurify. Menggunakan fallback manual.");
          this.#purifyLoaded = false;
          resolve(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("[Security] Error saat memuat DOMPurify:", error);
        this.#purifyLoaded = false;
        resolve(false);
      }
    });

    return this.#loadingPromise;
  }

  /**
   * Membersihkan HTML dari XSS.
   * @param {string} html - HTML yang akan dibersihkan.
   * @param {Object} options - Opsi DOMPurify.
   * @returns {string} HTML yang aman.
   */
  static sanitize(html, options = {}) {
    if (!html || typeof html !== "string") return "";

    if (this.#purifyLoaded && this.#purify) {
      try {
        const config = {
          ALLOWED_TAGS: [
            "b", "i", "em", "strong", "u", "br", "p", "ul", "ol", "li",
            "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
            "hr", "sub", "sup", "span", "a", "img", "table", "thead", "tbody",
            "tr", "th", "td", "div", "del", "ins", "mark", "small",
          ],
          ALLOWED_ATTR: [
            "href", "title", "alt", "src", "class", "id", "target",
            "rel", "width", "height", "style",
          ],
          ALLOW_DATA_ATTR: false,
          ADD_ATTR: ["target"],
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
          FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onblur"],
          ...options,
        };
        return this.#purify.sanitize(html, config);
      } catch (error) {
        console.warn("[Security] DOMPurify sanitize gagal:", error);
        return this.#fallbackSanitize(html);
      }
    }

    return this.#fallbackSanitize(html);
  }

  /**
   * Sanitasi fallback manual jika DOMPurify tidak tersedia.
   * @param {string} html
   * @returns {string}
   */
  static #fallbackSanitize(html) {
    if (!html) return "";

    // Hapus semua tag HTML berbahaya
    let clean = html;

    // Hapus script tags dan isinya
    clean = clean.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gim, "");

    // Hapus event handlers
    clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gim, "");

    // Hapus javascript: URLs
    clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gim, 'href="#"');

    // Hapus data: URLs (kecuali image)
    clean = clean.replace(/src\s*=\s*["']data:(?!image)[^"']*["']/gim, 'src=""');

    // Hapus style tags
    clean = clean.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gim, "");

    // Hapus iframe, object, embed
    clean = clean.replace(/<(iframe|object|embed|form|input|button)[\s\S]*?>[\s\S]*?<\/\1>/gim, "");
    clean = clean.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gim, "");

    return clean;
  }

  /**
   * Escape HTML entities (untuk teks biasa, bukan HTML).
   * @param {string} text
   * @returns {string}
   */
  static escapeHtml(text) {
    if (!text || typeof text !== "string") return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
      "`": "&#x60;",
    };
    return text.replace(/[&<>"'`/]/g, (char) => map[char] || char);
  }

  /**
   * Validasi dan sanitasi URL.
   * @param {string} url
   * @returns {string} URL yang aman, atau string kosong jika berbahaya.
   */
  static sanitizeUrl(url) {
    if (!url || typeof url !== "string") return "";

    const trimmed = url.trim();

    // Izinkan hanya http, https, mailto, tel
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
    const hasAllowedProtocol = allowedProtocols.some(
      (protocol) => trimmed.toLowerCase().startsWith(protocol)
    );

    // Izinkan relative URLs
    const isRelative = trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?");

    if (!hasAllowedProtocol && !isRelative) {
      return "";
    }

    // Hapus javascript: dan data: URLs
    if (
      trimmed.toLowerCase().startsWith("javascript:") ||
      trimmed.toLowerCase().startsWith("data:")
    ) {
      return "";
    }

    return trimmed;
  }

  /**
   * Sanitasi input teks dari user (untuk chat, notes, dll).
   * @param {string} input
   * @param {number} maxLength - Maksimal panjang input.
   * @returns {string}
   */
  static sanitizeInput(input, maxLength = 500) {
    if (!input || typeof input !== "string") return "";

    // Trim
    let clean = input.trim();

    // Batasi panjang
    if (clean.length > maxLength) {
      clean = clean.substring(0, maxLength);
    }

    // Hapus null bytes
    clean = clean.replace(/\0/g, "");

    // Hapus control characters (kecuali newline dan tab)
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    return clean;
  }

  /**
   * Cegah prompt injection untuk AI.
   * @param {string} message
   * @returns {string}
   */
  static sanitizeForAI(message) {
    if (!message || typeof message !== "string") return "";

    let clean = this.sanitizeInput(message, 1000);

    // Deteksi dan netralisasi pola prompt injection umum
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions?/gi,
      /forget\s+(everything|all|what)\s+(you|i)\s+(know|learned|were)/gi,
      /you\s+are\s+now\s+(a|an|the)/gi,
      /pretend\s+(to\s+be|you\s+are)/gi,
      /act\s+as\s+(if\s+you\s+are|a|an)/gi,
      /jailbreak/gi,
      /system\s*:\s*/gi,
      /\[system\]/gi,
      /<\|system\|>/gi,
    ];

    for (const pattern of injectionPatterns) {
      clean = clean.replace(pattern, "[FILTERED]");
    }

    return clean;
  }

  /**
   * Mengecek apakah DOMPurify sudah dimuat.
   * @returns {boolean}
   */
  static isLoaded() {
    return this.#purifyLoaded && !!this.#purify;
  }
}