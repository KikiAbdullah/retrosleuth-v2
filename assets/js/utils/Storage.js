/**
 * ============================================================
 *  STORAGE.JS — localStorage Wrapper (Legacy Fallback)
 *  Digunakan sebagai fallback jika IndexedDB tidak tersedia.
 * ============================================================
 */

const STORAGE_PREFIX = "retrosleuth_save_";

export class Storage {
  /**
   * Menyimpan state game ke localStorage.
   * @param {string} caseId - ID kasus.
   * @param {Object} state - State game.
   * @returns {boolean} true jika berhasil.
   */
  static saveGame(caseId, state) {
    try {
      const data = {
        ...state,
        version: 3,
        savedAt: Date.now(),
      };
      localStorage.setItem(`${STORAGE_PREFIX}${caseId}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("[Storage] Gagal menyimpan:", error);
      return false;
    }
  }

  /**
   * Memuat state game dari localStorage.
   * @param {string} caseId - ID kasus.
   * @returns {Object|null} State game atau null jika tidak ada.
   */
  static loadGame(caseId) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${caseId}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data;
    } catch (error) {
      console.error("[Storage] Gagal memuat:", error);
      return null;
    }
  }

  /**
   * Menghapus state game dari localStorage.
   * @param {string} caseId - ID kasus.
   * @returns {boolean} true jika berhasil.
   */
  static clearGame(caseId) {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${caseId}`);
      return true;
    } catch (error) {
      console.error("[Storage] Gagal menghapus:", error);
      return false;
    }
  }

  /**
   * Mendapatkan semua save yang ada.
   * @returns {Array} Array of { caseId, data }.
   */
  static getAllSaves() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const caseId = key.replace(STORAGE_PREFIX, "");
          const data = JSON.parse(localStorage.getItem(key));
          saves.push({ caseId, data });
        } catch (e) {
          // Skip
        }
      }
    }
    return saves;
  }

  /**
   * Mengecek apakah localStorage tersedia.
   * @returns {boolean}
   */
  static isAvailable() {
    try {
      localStorage.setItem("_test_", "test");
      localStorage.removeItem("_test_");
      return true;
    } catch {
      return false;
    }
  }
}
