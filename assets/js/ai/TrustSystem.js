/**
 * ============================================================
 *  TRUSTSYSTEM.JS — Kalkulasi Perubahan Emosi Karakter
 *  Berbasis aturan: kata kunci, bukti yang disodorkan, dll.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { evidenceEngine } from "../engine/EvidenceEngine.js";

export class TrustSystem {
  /**
   * Memproses interaksi dan menghitung delta emosi.
   * @param {string} suspectId - ID karakter.
   * @param {string} userMessage - Pesan pemain.
   * @param {string} aiResponse - Respons AI.
   * @returns {Object} Deltas yang diterapkan.
   */
  static process(suspectId, userMessage, aiResponse) {
    const deltas = { stress: 0, trust: 0, fear: 0, anger: 0 };

    // --- 1. Deteksi bukti yang disebutkan dalam pesan ---
    const mentionedEvidence = this._detectEvidenceMentioned(userMessage);
    const discovered = GameState.getDiscoveredEvidence();

    for (const eviId of mentionedEvidence) {
      const isDiscovered = discovered.includes(eviId);
      const isKeyEvidence = this._isKeyEvidence(eviId);

      if (isDiscovered && isKeyEvidence) {
        // Bukti sangat memberatkan
        deltas.trust -= 15;
        deltas.stress += 30;
        deltas.fear += 25;
        deltas.anger += 10;
      } else if (isDiscovered) {
        // Bukti biasa
        deltas.trust -= 5;
        deltas.stress += 20;
        deltas.fear += 15;
        deltas.anger += 5;
      }
    }

    // --- 2. Deteksi pola konfrontasi ---
    const confrontationPatterns = [
      /kamu bohong/i,
      /kau berbohong/i,
      /aku tahu kau/i,
      /jangan bohong/i,
      /kau pembunuh/i,
      /kau pelaku/i,
      /aku tidak percaya/i,
    ];
    for (const pattern of confrontationPatterns) {
      if (pattern.test(userMessage)) {
        deltas.trust -= 10;
        deltas.stress += 15;
        deltas.anger += 15;
        break;
      }
    }

    // --- 3. Deteksi empati ---
    const empathyPatterns = [
      /saya mengerti/i,
      /aku mengerti/i,
      /saya paham/i,
      /maaf/i,
      /kasihan/i,
    ];
    for (const pattern of empathyPatterns) {
      if (pattern.test(userMessage)) {
        deltas.trust += 15;
        deltas.stress -= 10;
        deltas.fear -= 5;
        deltas.anger -= 10;
        break;
      }
    }

    // --- 4. Deteksi ancaman ---
    const threatPatterns = [
      /penjara/i,
      /polisi/i,
      /hukuman/i,
      /saya akan buktikan/i,
    ];
    for (const pattern of threatPatterns) {
      if (pattern.test(userMessage)) {
        deltas.trust -= 15;
        deltas.stress += 25;
        deltas.fear += 20;
        deltas.anger += 20;
        break;
      }
    }

    // --- 5. Deteksi penyebutan nama karakter lain dengan tuduhan ---
    const charIds = this._getAllCharacterIds();
    for (const charId of charIds) {
      if (charId === suspectId) continue;
      const namePattern = new RegExp(charId.replace("char_", ""), "i");
      if (namePattern.test(userMessage)) {
        // Menyebut tersangka lain
        deltas.trust += 5;
        deltas.stress -= 5;
        deltas.fear -= 10;
        deltas.anger += 5;
        break;
      }
    }

    // --- 6. Respons AI mengandung kebohongan (indikator) ---
    const lieIndicators = [
      /saya tidak tahu/i,
      /saya tidak ingat/i,
      /bukan saya/i,
      /saya tidak melakukan/i,
      /saya tidak bersalah/i,
    ];
    for (const indicator of lieIndicators) {
      if (indicator.test(aiResponse)) {
        deltas.trust -= 5;
        deltas.stress += 10;
        deltas.fear += 5;
        break;
      }
    }

    // --- 7. Respons AI mengandung pengakuan parsial ---
    const partialConfession = [
      /mungkin/i,
      /sebenarnya/i,
      /saya akui/i,
      /saya menyesal/i,
    ];
    for (const indicator of partialConfession) {
      if (indicator.test(aiResponse)) {
        deltas.trust += 10;
        deltas.stress -= 15;
        deltas.fear += 10;
        deltas.anger -= 5;
        break;
      }
    }

    // --- Terapkan delta ke GameState ---
    this._applyDeltas(suspectId, deltas);

    // Emit event
    EventBus.emit("interrogation:stateChanged", {
      suspectId,
      deltas,
    });

    return deltas;
  }

  /**
   * Mendeteksi ID bukti yang disebutkan dalam pesan.
   * @param {string} message
   * @returns {string[]}
   */
  static _detectEvidenceMentioned(message) {
    const mentioned = [];
    const registry = evidenceEngine.getAllEvidence();
    for (const evi of registry) {
      // Cek ID: evi_001, evi_002, dll
      if (message.includes(evi.id)) {
        mentioned.push(evi.id);
        continue;
      }
      // Cek judul (case insensitive)
      if (
        evi.title &&
        message.toLowerCase().includes(evi.title.toLowerCase())
      ) {
        mentioned.push(evi.id);
        continue;
      }
    }
    return mentioned;
  }

  /**
   * Mengecek apakah bukti termasuk kunci (secondary evidence di solution).
   * @param {string} eviId
   * @returns {boolean}
   */
  static _isKeyEvidence(eviId) {
    const activeCase = window.__RETROSLEUTH?.caseLoader?.activeCase;
    if (!activeCase) return false;
    const solution = activeCase.solution_matrix;
    if (!solution) return false;
    const secondary = solution.secondary_evidence || [];
    return secondary.includes(eviId) || solution.primary_evidence === eviId;
  }

  /**
   * Mendapatkan semua ID karakter dari kasus aktif.
   * @returns {string[]}
   */
  static _getAllCharacterIds() {
    const activeCase = window.__RETROSLEUTH?.caseLoader?.activeCase;
    if (!activeCase) return [];
    return activeCase.characters.map((c) => c.id);
  }

  /**
   * Menerapkan delta ke GameState.
   * @param {string} suspectId
   * @param {Object} deltas
   */
  static _applyDeltas(suspectId, deltas) {
    const current = GameState.getInterrogationState(suspectId);
    const newState = {
      stress: Math.max(0, Math.min(100, current.stress + (deltas.stress || 0))),
      trust: Math.max(0, Math.min(100, current.trust + (deltas.trust || 0))),
      fear: Math.max(0, Math.min(100, current.fear + (deltas.fear || 0))),
      anger: Math.max(0, Math.min(100, current.anger + (deltas.anger || 0))),
    };
    GameState.setInterrogationState(suspectId, newState);
  }
}
