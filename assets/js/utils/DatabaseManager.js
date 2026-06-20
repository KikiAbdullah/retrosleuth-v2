/**
 * ============================================================
 *  DATABASEMANAGER.JS — IndexedDB Wrapper
 *  Menggunakan library idb (dimuat dari CDN).
 *  Fallback ke localStorage jika IndexedDB tidak tersedia.
 * ============================================================
 */

import { Storage } from "./Storage.js";

// IDB Library akan dimuat dari CDN secara dinamis
let idb = null;

// Fungsi untuk memuat idb dari CDN
async function loadIdb() {
  if (idb) return idb;
  try {
    // Cek apakah sudah ada di window
    if (window.idb) {
      idb = window.idb;
      return idb;
    }
    // Load dari CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/idb@8/build/umd.js";
    script.async = false;
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    idb = window.idb;
    return idb;
  } catch (error) {
    console.warn(
      "[DatabaseManager] Gagal memuat idb, fallback ke localStorage:",
      error
    );
    return null;
  }
}

export class DatabaseManager {
  static DB_NAME = "retrosleuth_db";
  static DB_VERSION = 1;
  static db = null;
  static isSupported = false;
  static fallbackToLocalStorage = false;

  /**
   * Inisialisasi database IndexedDB.
   * @returns {Promise<boolean>} true jika berhasil.
   */
  static async init() {
    // Cek dukungan IndexedDB
    if (!window.indexedDB) {
      console.warn(
        "[DatabaseManager] IndexedDB tidak didukung. Menggunakan localStorage fallback."
      );
      this.fallbackToLocalStorage = true;
      return false;
    }

    try {
      const idbLib = await loadIdb();
      if (!idbLib) {
        this.fallbackToLocalStorage = true;
        return false;
      }

      this.db = await idbLib.openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
          // Store untuk state game per kasus
          if (!db.objectStoreNames.contains("saves")) {
            const savesStore = db.createObjectStore("saves", {
              keyPath: "caseId",
            });
            savesStore.createIndex("caseStatus", "caseStatus");
            savesStore.createIndex("savedAt", "savedAt");
          }

          // Store untuk pengaturan aplikasi
          if (!db.objectStoreNames.contains("settings")) {
            db.createObjectStore("settings", { keyPath: "key" });
          }

          console.log(
            "[DatabaseManager] Database dibuat/upgrade ke versi",
            newVersion
          );
        },
      });

      this.isSupported = true;
      this.fallbackToLocalStorage = false;
      console.log("[DatabaseManager] ✅ IndexedDB siap.");

      // Migrasi dari localStorage
      await this._migrateFromLocalStorage();

      return true;
    } catch (error) {
      console.error("[DatabaseManager] Gagal inisialisasi IndexedDB:", error);
      this.fallbackToLocalStorage = true;
      return false;
    }
  }

  /**
   * Memigrasi data dari localStorage ke IndexedDB.
   * @returns {Promise<void>}
   */
  static async _migrateFromLocalStorage() {
    if (!this.isSupported) return;

    try {
      const saves = Storage.getAllSaves();
      if (saves.length === 0) return;

      console.log(
        `[DatabaseManager] Menemukan ${saves.length} save di localStorage. Memigrasi...`
      );

      for (const { caseId, data } of saves) {
        // Cek apakah sudah ada di IndexedDB
        const existing = await this.loadCaseState(caseId);
        if (existing) {
          console.log(`  - ${caseId}: Sudah ada di IndexedDB, dilewati.`);
          Storage.clearGame(caseId);
          continue;
        }

        // Simpan ke IndexedDB
        await this.saveCaseState(caseId, data);
        Storage.clearGame(caseId);
        console.log(`  - ${caseId}: Berhasil dimigrasi.`);
      }

      console.log("[DatabaseManager] Migrasi selesai.");
    } catch (error) {
      console.warn("[DatabaseManager] Migrasi gagal:", error);
    }
  }

  /**
   * Menyimpan state game ke IndexedDB.
   * @param {string} caseId - ID kasus.
   * @param {Object} state - State game.
   * @returns {Promise<boolean>}
   */
  static async saveCaseState(caseId, state) {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      return Storage.saveGame(caseId, state);
    }

    try {
      const data = {
        caseId: caseId,
        version: 3,
        savedAt: Date.now(),
        currentCaseId: state.currentCaseId || caseId,
        startedAt: state.startedAt || null,
        discoveredEvidence: state.discoveredEvidence || [],
        chatHistories: state.chatHistories || {},
        interrogationStates: state.interrogationStates || {},
        notes: state.notes || "",
        completedObjectives: state.completedObjectives || [],
        accusationAttempts: state.accusationAttempts || 0,
        caseStatus: state.caseStatus || "active",
        executedEvents: state.executedEvents || [],
        audioSettings: state.audioSettings || {
          master: 0.7,
          sfx: 1.0,
          ambient: 0.3,
          muted: false,
        },
        boardData: state.boardData || null,
      };

      await this.db.put("saves", data);
      return true;
    } catch (error) {
      console.error("[DatabaseManager] Gagal menyimpan state:", error);
      // Fallback ke localStorage
      return Storage.saveGame(caseId, state);
    }
  }

  /**
   * Memuat state game dari IndexedDB.
   * @param {string} caseId - ID kasus.
   * @returns {Promise<Object|null>}
   */
  static async loadCaseState(caseId) {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      return Storage.loadGame(caseId);
    }

    try {
      const data = await this.db.get("saves", caseId);
      if (!data) return null;

      return {
        currentCaseId: data.currentCaseId,
        startedAt: data.startedAt,
        discoveredEvidence: data.discoveredEvidence || [],
        chatHistories: data.chatHistories || {},
        interrogationStates: data.interrogationStates || {},
        notes: data.notes || "",
        completedObjectives: data.completedObjectives || [],
        accusationAttempts: data.accusationAttempts || 0,
        caseStatus: data.caseStatus || "active",
        executedEvents: data.executedEvents || [],
        audioSettings: data.audioSettings || {
          master: 0.7,
          sfx: 1.0,
          ambient: 0.3,
          muted: false,
        },
        boardData: data.boardData || null,
      };
    } catch (error) {
      console.error("[DatabaseManager] Gagal memuat state:", error);
      return Storage.loadGame(caseId);
    }
  }

  /**
   * Menghapus state game dari IndexedDB.
   * @param {string} caseId - ID kasus.
   * @returns {Promise<boolean>}
   */
  static async deleteCaseState(caseId) {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      return Storage.clearGame(caseId);
    }

    try {
      await this.db.delete("saves", caseId);
      return true;
    } catch (error) {
      console.error("[DatabaseManager] Gagal menghapus state:", error);
      return Storage.clearGame(caseId);
    }
  }

  /**
   * Mendapatkan semua save yang ada.
   * @returns {Promise<Array>}
   */
  static async getAllSaves() {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      return Storage.getAllSaves();
    }

    try {
      return await this.db.getAll("saves");
    } catch (error) {
      console.error("[DatabaseManager] Gagal mengambil daftar save:", error);
      return Storage.getAllSaves();
    }
  }

  /**
   * Menyimpan pengaturan aplikasi.
   * @param {string} key - Key pengaturan.
   * @param {*} value - Nilai pengaturan.
   * @returns {Promise<boolean>}
   */
  static async saveSetting(key, value) {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      try {
        localStorage.setItem(
          `retrosleuth_setting_${key}`,
          JSON.stringify(value)
        );
        return true;
      } catch {
        return false;
      }
    }

    try {
      await this.db.put("settings", { key, value });
      return true;
    } catch (error) {
      console.error("[DatabaseManager] Gagal menyimpan pengaturan:", error);
      return false;
    }
  }

  /**
   * Memuat pengaturan aplikasi.
   * @param {string} key - Key pengaturan.
   * @returns {Promise<*>}
   */
  static async loadSetting(key) {
    if (this.fallbackToLocalStorage || !this.isSupported) {
      try {
        const raw = localStorage.getItem(`retrosleuth_setting_${key}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    try {
      const data = await this.db.get("settings", key);
      return data?.value || null;
    } catch (error) {
      console.error("[DatabaseManager] Gagal memuat pengaturan:", error);
      return null;
    }
  }

  /**
   * Mengecek kuota penyimpanan.
   * @returns {Promise<Object>}
   */
  static async checkQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
        const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
        const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
        return {
          usageMB,
          quotaMB,
          percent,
          usage: estimate.usage,
          quota: estimate.quota,
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}
