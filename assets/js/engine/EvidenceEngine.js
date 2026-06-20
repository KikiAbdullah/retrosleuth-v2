/**
 * ============================================================
 *  EVIDENCEENGINE.JS — Manajemen Bukti
 *  Registri, unlock, dan caching konten bukti.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "./CaseLoader.js";

export class EvidenceEngine {
  constructor() {
    /** @type {Map<string, Object>} */
    this.registry = new Map();
    /** @type {Map<string, string>} */
    this.contentCache = new Map();
  }

  // ============================================================
  //  REGISTRI
  // ============================================================

  /**
   * Mendaftarkan semua bukti dari evidence_registry.
   * @param {Array} evidenceArray - Array dari case.json evidence_registry.
   */
  registerEvidence(evidenceArray) {
    this.registry.clear();
    this.contentCache.clear();

    for (const evi of evidenceArray) {
      this.registry.set(evi.id, {
        id: evi.id,
        title: evi.title,
        file: evi.file,
        icon: evi.icon || "📄",
        description_short: evi.description_short || "",
        content: evi.content || null,
      });

      if (evi.content) {
        this.contentCache.set(evi.id, evi.content);
      }
    }

    console.log(`[EvidenceEngine] ${this.registry.size} bukti terdaftar.`);
  }

  // ============================================================
  //  UNLOCK EVIDENCE
  // ============================================================

  /**
   * Membuka bukti untuk pemain.
   * @param {string} id - ID bukti (contoh: "evi_001").
   * @returns {boolean} true jika berhasil (belum ditemukan sebelumnya).
   */
  unlockEvidence(id) {
    if (!this.registry.has(id)) {
      console.warn(`[EvidenceEngine] Bukti '${id}' tidak terdaftar.`);
      return false;
    }

    if (this.isUnlocked(id)) {
      console.warn(`[EvidenceEngine] Bukti '${id}' sudah ditemukan.`);
      return false;
    }

    // Tambahkan ke GameState
    const added = GameState.addEvidence(id);
    if (!added) return false;

    // Emit event
    EventBus.emit("evidence:unlocked", { evidenceId: id });

    console.log(`[EvidenceEngine] 🔍 Bukti '${id}' ditemukan!`);
    return true;
  }

  /**
   * Mengecek apakah bukti sudah ditemukan.
   * @param {string} id
   * @returns {boolean}
   */
  isUnlocked(id) {
    return GameState.hasEvidence(id);
  }

  // ============================================================
  //  GETTERS
  // ============================================================

  /**
   * Mendapatkan metadata bukti.
   * @param {string} id
   * @returns {Object|null}
   */
  getEvidenceMeta(id) {
    return this.registry.get(id) || null;
  }

  /**
   * Mendapatkan konten Markdown bukti (lazy load).
   * @param {string} id
   * @returns {Promise<string>}
   */
  async getEvidenceContent(id) {
    // Cek cache
    if (this.contentCache.has(id)) {
      return this.contentCache.get(id);
    }

    // Minta CaseLoader untuk fetch
    if (caseLoader) {
      const content = await caseLoader.loadEvidenceContent(id);
      if (content) {
        this.contentCache.set(id, content);
      }
      return content;
    }

    return "*[Tidak dapat memuat konten]*";
  }

  /**
   * Mendapatkan semua bukti yang sudah ditemukan (metadata).
   * @returns {Array<Object>}
   */
  getDiscoveredEvidence() {
    const discovered = GameState.getDiscoveredEvidence();
    return discovered.map((id) => this.getEvidenceMeta(id)).filter(Boolean);
  }

  /**
   * Mendapatkan semua bukti (termasuk yang belum ditemukan).
   * @returns {Array<Object>}
   */
  getAllEvidence() {
    return Array.from(this.registry.values());
  }

  /**
   * Mendapatkan bukti berdasarkan folder (dari evidence_structure).
   * @param {string} folderName
   * @returns {Array<Object>}
   */
  getEvidenceByFolder(folderName) {
    const structure = caseLoader?.activeCase?.evidence_structure;
    if (!structure || !structure[folderName]) return [];

    return structure[folderName]
      .map((id) => this.getEvidenceMeta(id))
      .filter(Boolean);
  }

  /**
   * Mendapatkan semua folder yang tersedia di evidence_structure.
   * @returns {string[]}
   */
  getFolders() {
    const structure = caseLoader?.activeCase?.evidence_structure;
    if (!structure) return [];
    return Object.keys(structure);
  }

  // ============================================================
  //  INITIAL EVIDENCE
  // ============================================================

  /**
   * Membuka bukti awal saat kasus dimulai.
   * @param {string[]} initialIds - Array ID bukti.
   */
  unlockInitialEvidence(initialIds) {
    if (!initialIds || initialIds.length === 0) return;
    for (const id of initialIds) {
      this.unlockEvidence(id);
    }
    console.log(`[EvidenceEngine] ${initialIds.length} bukti awal dibuka.`);
  }

  /**
   * Mereset engine (saat case:unloaded).
   */
  reset() {
    this.registry.clear();
    this.contentCache.clear();
  }
}

// Ekspor instance singleton
export let evidenceEngine = null;

export function initEvidenceEngine() {
  evidenceEngine = new EvidenceEngine();
  return evidenceEngine;
}
