/**
 * ============================================================
 *  FILEHELPER.JS — Export/Import Save File
 *  Menggunakan FileSaver.js dari CDN untuk download file.
 *  Fallback ke manual download jika CDN gagal.
 * ============================================================
 */

export class FileHelper {
  static #saverLoaded = false;
  static #loadingPromise = null;

  /**
   * Memuat FileSaver.js dari CDN.
   * @returns {Promise<boolean>}
   */
  static async load() {
    if (this.#saverLoaded) return true;
    if (this.#loadingPromise) return this.#loadingPromise;

    this.#loadingPromise = new Promise((resolve) => {
      try {
        if (window.saveAs) {
          this.#saverLoaded = true;
          console.log("[FileHelper] FileSaver.js sudah tersedia.");
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/file-saver@2/dist/FileSaver.min.js";
        script.async = true;

        script.onload = () => {
          this.#saverLoaded = true;
          console.log("[FileHelper] FileSaver.js dimuat dari CDN.");
          resolve(true);
        };

        script.onerror = () => {
          console.warn("[FileHelper] Gagal memuat FileSaver.js. Menggunakan fallback.");
          this.#saverLoaded = false;
          resolve(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("[FileHelper] Error saat memuat FileSaver.js:", error);
        this.#saverLoaded = false;
        resolve(false);
      }
    });

    return this.#loadingPromise;
  }

  /**
   * Download file sebagai JSON.
   * @param {Object} data - Data yang akan di-download.
   * @param {string} filename - Nama file.
   */
  static downloadJSON(data, filename) {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });

      if (this.#saverLoaded && window.saveAs) {
        window.saveAs(blob, filename);
      } else {
        // Fallback: buat link download manual
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      console.log(`[FileHelper] File "${filename}" berhasil di-download.`);
    } catch (error) {
      console.error("[FileHelper] Gagal download file:", error);
      throw error;
    }
  }

  /**
   * Baca file JSON yang di-upload.
   * @param {File} file - File yang di-upload.
   * @returns {Promise<Object>} Parsed JSON data.
   */
  static readJSON(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            resolve(data);
          } catch (parseError) {
            reject(new Error("File JSON tidak valid: " + parseError.message));
          }
        };
        reader.onerror = () => reject(new Error("Gagal membaca file."));
        reader.readAsText(file);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Buka file picker dan baca file JSON.
   * @param {string} accept - MIME type yang diterima.
   * @returns {Promise<Object|null>} Parsed JSON data, atau null jika dibatalkan.
   */
  static async openJSON(accept = ".json,application/json") {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;

        input.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          try {
            const data = await this.readJSON(file);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        input.oncancel = () => resolve(null);
        input.click();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Validasi struktur save data.
   * @param {Object} data
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validateSaveData(data) {
    const errors = [];

    if (!data || typeof data !== "object") {
      errors.push("Data tidak valid atau kosong.");
      return { valid: false, errors };
    }

    if (!data.currentCaseId && !data.caseId) {
      errors.push("Field 'currentCaseId' atau 'caseId' tidak ditemukan.");
    }

    if (!data.discoveredEvidence || !Array.isArray(data.discoveredEvidence)) {
      errors.push("Field 'discoveredEvidence' tidak valid.");
    }

    if (!data.chatHistories || typeof data.chatHistories !== "object") {
      errors.push("Field 'chatHistories' tidak valid.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}