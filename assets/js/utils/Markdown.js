/**
 * ============================================================
 *  MARKDOWN.JS — Renderer Markdown via marked.js
 *  Memuat library dari CDN secara dinamis.
 * ============================================================
 */

export class Markdown {
  static #loaded = false;
  static #marked = null;

  /**
   * Memuat library marked.js dari CDN.
   * @returns {Promise<void>}
   */
  static async load() {
    if (this.#loaded) return;

    return new Promise((resolve, reject) => {
      try {
        // Cek apakah sudah ada di window
        if (window.marked) {
          this.#marked = window.marked;
          this.#loaded = true;
          console.log("[Markdown] marked.js sudah tersedia.");
          resolve();
          return;
        }

        // Buat script tag
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
        script.async = true;

        script.onload = () => {
          this.#marked = window.marked;
          this.#loaded = true;
          console.log("[Markdown] marked.js dimuat dari CDN.");
          resolve();
        };

        script.onerror = () => {
          console.warn(
            "[Markdown] Gagal memuat marked.js. Menggunakan fallback."
          );
          this.#loaded = false;
          resolve(); // Tetap resolve agar tidak menghentikan aplikasi
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("[Markdown] Error saat memuat marked.js:", error);
        resolve();
      }
    });
  }

  /**
   * Merender Markdown ke HTML.
   * @param {string} mdText - Teks Markdown.
   * @param {Object} options - Opsi rendering.
   * @returns {string} HTML string.
   */
  static render(mdText, options = {}) {
    if (!mdText || typeof mdText !== "string") {
      return "<p><em>Konten kosong</em></p>";
    }

    // Jika marked.js belum dimuat, gunakan fallback sederhana
    if (!this.#loaded || !this.#marked) {
      return this._fallbackRender(mdText);
    }

    try {
      // Konfigurasi marked
      const renderer = new this.#marked.Renderer();
      // Tambahkan target="_blank" ke link
      renderer.link = (href, title, text) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer"${
          title ? ` title="${title}"` : ""
        }>${text}</a>`;
      };

      return this.#marked.parse(mdText, {
        renderer,
        breaks: true,
        gfm: true,
        ...options,
      });
    } catch (error) {
      console.warn("[Markdown] Error rendering:", error);
      return this._fallbackRender(mdText);
    }
  }

  /**
   * Fallback: render Markdown sederhana tanpa library.
   * @param {string} text
   * @returns {string}
   */
  static _fallbackRender(text) {
    let html = text;

    // Escape HTML
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Heading
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // List
    html = html.replace(/^[-*]\s+(.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Link
    html = html.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank">$1</a>'
    );

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    // Blockquote
    html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

    // Horizontal rule
    html = html.replace(/^---$/gim, "<hr>");

    return html;
  }

  /**
   * Mengecek apakah marked.js sudah dimuat.
   * @returns {boolean}
   */
  static isLoaded() {
    return this.#loaded && !!this.#marked;
  }
}
