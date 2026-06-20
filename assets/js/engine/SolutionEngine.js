/**
 * ============================================================
 *  SOLUTIONENGINE.JS — Validasi Tuduhan Pemain
 *  Membandingkan tuduhan dengan solution_matrix di case.json.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { caseLoader } from "./CaseLoader.js";

export class SolutionEngine {
  /**
   * Memeriksa tuduhan yang diajukan pemain.
   * @param {Object} accusation - { culpritId, motive, primaryEvidence, secondaryEvidence[] }
   * @returns {Object} { correct, message, hints, isComplete }
   */
  static checkAccusation(accusation) {
    const activeCase = caseLoader.activeCase;
    if (!activeCase) {
      return {
        correct: false,
        message: "⚠️ Tidak ada kasus yang sedang aktif.",
        hints: ["Pilih kasus terlebih dahulu."],
        isComplete: false,
      };
    }

    const solution = activeCase.solution_matrix;
    if (!solution) {
      return {
        correct: false,
        message: "⚠️ Kasus ini belum memiliki solusi yang terdefinisi.",
        hints: ["Hubungi pembuat konten."],
        isComplete: false,
      };
    }

    const { culpritId, motive, primaryEvidence, secondaryEvidence } =
      accusation;

    // === Validasi 1: Pelaku ===
    if (culpritId !== solution.culprit_id) {
      GameState.accusationAttempts += 1;
      GameState.save();
      return {
        correct: false,
        message:
          "❌ Tuduhan Anda salah. Pelaku yang Anda tunjuk bukan pelaku sebenarnya.",
        hints: [
          "Periksa kembali alibi dan motif setiap tersangka.",
          "Bukti apa yang paling memberatkan?",
        ],
        isComplete: false,
      };
    }

    // === Validasi 2: Motif ===
    // Motif tidak divalidasi secara ketat (string matching), tapi kita periksa apakah motif mengandung kata kunci
    const motiveKeywords = this._extractKeywords(solution.motive);
    const motiveMatch = this._checkMotive(motive, motiveKeywords);
    if (!motiveMatch) {
      GameState.accusationAttempts += 1;
      GameState.save();
      return {
        correct: false,
        message:
          "❌ Motif Anda belum tepat. Pelaku memiliki motif yang lebih spesifik.",
        hints: [
          "Cari tahu apa yang sebenarnya mendorong pelaku membunuh.",
          "Periksa dokumen dan surat-surat.",
        ],
        isComplete: false,
      };
    }

    // === Validasi 3: Bukti Primer ===
    if (primaryEvidence !== solution.primary_evidence) {
      GameState.accusationAttempts += 1;
      GameState.save();
      return {
        correct: false,
        message:
          "❌ Bukti utama Anda belum tepat. Anda membutuhkan bukti yang lebih kuat.",
        hints: [
          "Bukti apa yang secara langsung membuktikan penyebab kematian?",
        ],
        isComplete: false,
      };
    }

    // === Validasi 4: Bukti Sekunder ===
    const requiredSecondary = solution.secondary_evidence || [];
    const missingEvidence = requiredSecondary.filter(
      (id) => !secondaryEvidence.includes(id)
    );
    const extraEvidence = secondaryEvidence.filter(
      (id) => !requiredSecondary.includes(id)
    );

    if (missingEvidence.length > 0) {
      GameState.accusationAttempts += 1;
      GameState.save();
      const missingNames = missingEvidence
        .map((id) => {
          const evi = activeCase.evidence_registry.find((e) => e.id === id);
          return evi ? evi.title : id;
        })
        .join(", ");
      return {
        correct: false,
        message: `❌ Anda masih kehilangan ${missingEvidence.length} bukti penting: ${missingNames}`,
        hints: [
          "Bukti-bukti ini sangat penting untuk membuktikan kasus.",
          "Cari di TKP atau tunggu event real-time.",
        ],
        isComplete: false,
      };
    }

    // === SEMUA VALIDASI LULUS ===
    // Tuduhan benar!
    GameState.caseStatus = "solved";
    GameState.save();

    EventBus.emit("case:solved", {
      culpritId: culpritId,
      motive: motive,
      primaryEvidence: primaryEvidence,
      secondaryEvidence: secondaryEvidence,
    });

    return {
      correct: true,
      message: "✅ SELAMAT! Tuduhan Anda benar. Kasus ini terpecahkan!",
      hints: [],
      isComplete: true,
    };
  }

  /**
   * Mengekstrak kata kunci dari motif solusi.
   * @param {string} motiveText
   * @returns {string[]}
   */
  static _extractKeywords(motiveText) {
    if (!motiveText) return [];
    // Ambil kata-kata penting (minimal 3 huruf)
    const words = motiveText.toLowerCase().split(/\s+/);
    const keywords = words.filter((word) => word.length > 3);
    // Tambahkan beberapa kata kunci umum yang mungkin disebutkan
    const commonKeys = [
      "warisan",
      "dendam",
      "cemburu",
      "uang",
      "utang",
      "balas",
      "sakit",
      "marah",
    ];
    return [...new Set([...keywords, ...commonKeys])];
  }

  /**
   * Memeriksa apakah motif pemain mengandung kata kunci yang relevan.
   * @param {string} userMotive - Motif yang dimasukkan pemain.
   * @param {string[]} keywords - Kata kunci dari solusi.
   * @returns {boolean}
   */
  static _checkMotive(userMotive, keywords) {
    if (!userMotive || userMotive.trim().length === 0) return false;
    const lower = userMotive.toLowerCase();
    // Cek apakah setidaknya 1 kata kunci muncul, atau 2 kata kunci parsial
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) matchCount++;
    }
    // Minimal 1 kata kunci cocok, atau jika tidak ada kata kunci, terima saja
    return matchCount >= 1 || keywords.length === 0;
  }

  /**
   * Mendapatkan hint berdasarkan jumlah percobaan.
   * @param {number} attempts
   * @returns {string}
   */
  static getHintByAttempts(attempts) {
    const hints = [
      "Baca ulang semua bukti yang sudah Anda temukan.",
      "Perhatikan kontradiksi antara alibi dan bukti.",
      "Coba interogasi tersangka dengan pertanyaan yang lebih spesifik.",
      "Hubungkan motif dengan bukti fisik. Siapa yang paling diuntungkan?",
      "Periksa kembali kronologi kejadian. Siapa yang memiliki kesempatan?",
    ];
    const index = Math.min(attempts - 1, hints.length - 1);
    return hints[Math.max(0, index)];
  }
}
