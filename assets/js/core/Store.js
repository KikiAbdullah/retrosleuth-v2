/**
 * ============================================================
 *  STORE.JS — GameState Singleton (Fase 4)
 *  Menyimpan seluruh state pemain: bukti, chat, emosi, dll.
 *  Auto-save dengan debounce 2 detik ke IndexedDB (atau localStorage).
 * ============================================================
 */

export class Store {
  static #instance = null;
  static #STORAGE_KEY = "retrosleuth_save";
  static #saveTimeout = null;

  /**
   * State default
   */
  static #defaultState = {
    currentCaseId: null,
    startedAt: null,
    discoveredEvidence: [],
    chatHistories: {},
    interrogationStates: {},
    notes: "",
    completedObjectives: [],
    accusationAttempts: 0,
    caseStatus: "idle", // 'idle' | 'active' | 'solved' | 'failed'
    executedEvents: [],
    audioSettings: {
      master: 0.7,
      sfx: 1.0,
      ambient: 0.3,
      muted: false,
    },
    boardData: null, // Untuk Investigation Board (Fase 4)
  };

  /**
   * Mendapatkan instance singleton Store.
   * @returns {Store}
   */
  static getInstance() {
    if (!this.#instance) {
      this.#instance = new Store();
    }
    return this.#instance;
  }

  constructor() {
    if (Store.#instance) {
      return Store.#instance;
    }
    this.state = { ...Store.#defaultState };
    Store.#instance = this;
    this._loadFromStorage();
  }

  // ============================================================
  //  PERSISTENCE (Fase 4: IndexedDB via DatabaseManager)
  // ============================================================

  /**
   * Memuat state dari penyimpanan (IndexedDB atau localStorage).
   */
  async _loadFromStorage() {
    try {
      // Coba load dari DatabaseManager jika tersedia
      let saved = null;
      if (window.__RETROSLEUTH?.databaseManager) {
        const db = window.__RETROSLEUTH.databaseManager;
        const caseId = this.state.currentCaseId;
        if (caseId) {
          saved = await db.loadCaseState(caseId);
        }
      }

      // Fallback ke localStorage
      if (!saved) {
        const raw = localStorage.getItem(Store.#STORAGE_KEY);
        if (raw) {
          saved = JSON.parse(raw);
        }
      }

      if (saved) {
        this.state = { ...Store.#defaultState, ...saved };
        console.log("[Store] ✅ State dimuat dari penyimpanan.");
      }
    } catch (error) {
      console.warn("[Store] Gagal memuat state:", error);
    }
  }

  /**
   * Menyimpan state ke penyimpanan (IndexedDB atau localStorage).
   * @returns {Promise<boolean>}
   */
  async save() {
    try {
      // Coba simpan ke DatabaseManager jika tersedia
      if (window.__RETROSLEUTH?.databaseManager) {
        const db = window.__RETROSLEUTH.databaseManager;
        const caseId = this.state.currentCaseId;
        if (caseId) {
          await db.saveCaseState(caseId, this.state);
          console.log("[Store] ✅ State tersimpan ke IndexedDB.");
          return true;
        }
      }

      // Fallback ke localStorage
      localStorage.setItem(Store.#STORAGE_KEY, JSON.stringify(this.state));
      console.log("[Store] ✅ State tersimpan ke localStorage.");
      return true;
    } catch (error) {
      console.error("[Store] ❌ Gagal menyimpan state:", error);
      return false;
    }
  }

  /**
   * Auto-save dengan debounce (2 detik).
   * Dipanggil setiap kali ada perubahan state.
   */
  autoSave() {
    if (Store.#saveTimeout) {
      clearTimeout(Store.#saveTimeout);
    }
    Store.#saveTimeout = setTimeout(() => {
      this.save();
      Store.#saveTimeout = null;
    }, 2000);
  }

  /**
   * Mereset state ke default.
   */
  reset() {
    this.state = { ...Store.#defaultState };
    localStorage.removeItem(Store.#STORAGE_KEY);
    // Hapus dari IndexedDB jika ada
    if (window.__RETROSLEUTH?.databaseManager) {
      const caseId = this.state.currentCaseId;
      if (caseId) {
        window.__RETROSLEUTH.databaseManager.deleteCaseState(caseId);
      }
    }
    console.log("[Store] ✅ State direset.");
  }

  // ============================================================
  //  API — EVIDENCE
  // ============================================================

  /**
   * Menambahkan bukti ke discoveredEvidence.
   * @param {string} evidenceId
   * @returns {boolean} true jika berhasil (belum ada sebelumnya).
   */
  addEvidence(evidenceId) {
    if (this.state.discoveredEvidence.includes(evidenceId)) {
      return false;
    }
    this.state.discoveredEvidence.push(evidenceId);
    this.autoSave();
    return true;
  }

  /**
   * Mengecek apakah bukti sudah ditemukan.
   * @param {string} evidenceId
   * @returns {boolean}
   */
  hasEvidence(evidenceId) {
    return this.state.discoveredEvidence.includes(evidenceId);
  }

  /**
   * Mendapatkan semua bukti yang sudah ditemukan.
   * @returns {string[]}
   */
  getDiscoveredEvidence() {
    return [...this.state.discoveredEvidence];
  }

  // ============================================================
  //  API — CHAT HISTORY
  // ============================================================

  /**
   * Mendapatkan riwayat chat untuk karakter.
   * @param {string} charId
   * @returns {Array<{role: string, content: string}>}
   */
  getChatHistory(charId) {
    if (!this.state.chatHistories[charId]) {
      this.state.chatHistories[charId] = [];
    }
    return this.state.chatHistories[charId];
  }

  /**
   * Menambahkan pesan ke riwayat chat.
   * @param {string} charId
   * @param {string} role - 'user' atau 'assistant'
   * @param {string} content
   */
  addChatMessage(charId, role, content) {
    if (!this.state.chatHistories[charId]) {
      this.state.chatHistories[charId] = [];
    }
    this.state.chatHistories[charId].push({ role, content });
    this.autoSave();
  }

  // ============================================================
  //  API — INTERROGATION STATE (Emosi)
  // ============================================================

  /**
   * Mendapatkan state emosi karakter.
   * @param {string} charId
   * @returns {Object} { stress, trust, fear, anger }
   */
  getInterrogationState(charId) {
    if (!this.state.interrogationStates[charId]) {
      this.state.interrogationStates[charId] = {
        stress: 30,
        trust: 30,
        fear: 30,
        anger: 30,
      };
    }
    return this.state.interrogationStates[charId];
  }

  /**
   * Mengupdate state emosi karakter.
   * @param {string} charId
   * @param {Object} deltas - Perubahan nilai (bisa positif/negatif)
   */
  updateInterrogationState(charId, deltas) {
    const current = this.getInterrogationState(charId);
    for (const key of ["stress", "trust", "fear", "anger"]) {
      if (deltas[key] !== undefined) {
        current[key] = Math.max(0, Math.min(100, current[key] + deltas[key]));
      }
    }
    this.autoSave();
  }

  /**
   * Menetapkan state emosi karakter secara langsung (untuk inisialisasi).
   * @param {string} charId
   * @param {Object} state - { stress, trust, fear, anger }
   */
  setInterrogationState(charId, state) {
    this.state.interrogationStates[charId] = {
      stress: Math.max(0, Math.min(100, state.stress || 30)),
      trust: Math.max(0, Math.min(100, state.trust || 30)),
      fear: Math.max(0, Math.min(100, state.fear || 30)),
      anger: Math.max(0, Math.min(100, state.anger || 30)),
    };
    this.autoSave();
  }

  // ============================================================
  //  API — NOTES
  // ============================================================

  /**
   * Mendapatkan catatan detektif.
   * @returns {string}
   */
  getNotes() {
    return this.state.notes || "";
  }

  /**
   * Menetapkan catatan detektif.
   * @param {string} text
   */
  setNotes(text) {
    this.state.notes = text || "";
    this.autoSave();
  }

  // ============================================================
  //  API — OBJECTIVES
  // ============================================================

  /**
   * Menandai objective sebagai selesai.
   * @param {string} objectiveId
   * @returns {boolean} true jika baru selesai.
   */
  markObjective(objectiveId) {
    if (this.state.completedObjectives.includes(objectiveId)) {
      return false;
    }
    this.state.completedObjectives.push(objectiveId);
    this.autoSave();
    return true;
  }

  /**
   * Mengecek apakah objective sudah selesai.
   * @param {string} objectiveId
   * @returns {boolean}
   */
  isObjectiveCompleted(objectiveId) {
    return this.state.completedObjectives.includes(objectiveId);
  }

  // ============================================================
  //  API — CASE STATUS
  // ============================================================

  /**
   * Memulai kasus baru.
   * @param {string} caseId
   */
  startCase(caseId) {
    this.state.currentCaseId = caseId;
    this.state.startedAt = Date.now();
    this.state.caseStatus = "active";
    this.state.discoveredEvidence = [];
    this.state.chatHistories = {};
    this.state.interrogationStates = {};
    this.state.completedObjectives = [];
    this.state.executedEvents = [];
    this.state.accusationAttempts = 0;
    this.autoSave();
  }

  /**
   * Menyelesaikan kasus (solved atau failed).
   * @param {string} status - 'solved' atau 'failed'
   */
  finishCase(status) {
    this.state.caseStatus = status;
    this.autoSave();
  }

  // ============================================================
  //  API — REAL-TIME EVENTS
  // ============================================================

  /**
   * Menandai event real-time sebagai sudah dieksekusi.
   * @param {string} eventId
   */
  markEventExecuted(eventId) {
    if (!this.state.executedEvents.includes(eventId)) {
      this.state.executedEvents.push(eventId);
      this.autoSave();
    }
  }

  /**
   * Mengecek apakah event sudah dieksekusi.
   * @param {string} eventId
   * @returns {boolean}
   */
  isEventExecuted(eventId) {
    return this.state.executedEvents.includes(eventId);
  }

  // ============================================================
  //  API — INVESTIGATION BOARD (Fase 4)
  // ============================================================

  /**
   * Mendapatkan data board.
   * @returns {Object|null}
   */
  getBoardData() {
    return this.state.boardData || null;
  }

  /**
   * Menetapkan data board.
   * @param {Object} boardData
   */
  setBoardData(boardData) {
    this.state.boardData = boardData;
    this.autoSave();
  }

  // ============================================================
  //  UTILITY
  // ============================================================

  /**
   * Mendapatkan seluruh state (untuk debugging).
   * @returns {Object}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Memperbarui state dari object (untuk load dari save).
   * @param {Object} data
   */
  restoreState(data) {
    this.state = { ...Store.#defaultState, ...data };
    this.autoSave();
  }

  /**
   * Menyimpan state secara sinkron (untuk emergency / sebelum refresh).
   */
  saveSync() {
    try {
      localStorage.setItem(Store.#STORAGE_KEY, JSON.stringify(this.state));
      console.log("[Store] ✅ State tersimpan sinkron (localStorage).");
      return true;
    } catch (error) {
      console.error("[Store] ❌ Gagal menyimpan sinkron:", error);
      return false;
    }
  }
}

// Ekspor instance singleton
export const GameState = Store.getInstance();
