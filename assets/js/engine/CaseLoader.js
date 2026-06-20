/**
 * ============================================================
 *  CASELOADER.JS — Memuat data kasus dari file JSON/MD
 *  Data-driven: semua konten dari file, bukan hardcode.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";

export class CaseLoader {
  /**
   * @param {string} basePath - Path ke folder cases/ (default: "./cases")
   */
  constructor(basePath = "./cases") {
    this.basePath = basePath;
    this.globalIndex = null;
    this.activeCase = null;
    this.isLoading = false;
    this.loadingPromise = null;
  }

  // ============================================================
  //  LOAD GLOBAL INDEX
  // ============================================================

  /**
   * Memuat index.json yang berisi daftar semua kasus.
   * @returns {Promise<Object>}
   */
  async loadGlobalIndex() {
    const url = `${this.basePath}/index.json`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Gagal memuat index.json`);
      }
      const data = await response.json();

      // Validasi dasar
      if (!data.cases_list || !Array.isArray(data.cases_list)) {
        throw new Error("index.json: 'cases_list' tidak valid atau kosong");
      }

      // Validasi setiap entri
      for (const caseEntry of data.cases_list) {
        if (!caseEntry.id || !caseEntry.folder || !caseEntry.title) {
          console.warn(
            "[CaseLoader] Entri kasus tidak lengkap, dilewati:",
            caseEntry
          );
        }
      }

      this.globalIndex = data;
      console.log(
        `[CaseLoader] ✅ ${
          data.total_cases || data.cases_list.length
        } kasus dimuat dari index.json`
      );
      EventBus.emit("index:loaded", {
        totalCases: data.total_cases || data.cases_list.length,
      });
      return data;
    } catch (error) {
      console.error("[CaseLoader] ❌ Gagal memuat index.json:", error);
      EventBus.emit("index:loadError", { error: error.message });
      throw error;
    }
  }

  /**
   * Mendapatkan daftar kasus yang sudah di-cache.
   * @returns {Array}
   */
  getCaseList() {
    return this.globalIndex?.cases_list || [];
  }

  // ============================================================
  //  LOAD FULL CASE
  // ============================================================

  /**
   * Memuat seluruh data kasus dari folder.
   * @param {string} caseFolder - Nama folder kasus (contoh: "case_001").
   * @returns {Promise<Object>}
   */
  async loadFullCase(caseFolder) {
    if (this.isLoading) {
      console.warn("[CaseLoader] Loading sudah berjalan. Menunggu...");
      return this.loadingPromise;
    }

    this.isLoading = true;
    this.loadingPromise = this._doLoad(caseFolder);

    try {
      const caseData = await this.loadingPromise;
      this.activeCase = caseData;
      this.isLoading = false;

      // Update GameState
      GameState.currentCaseId = caseData.id;
      GameState.startedAt = Date.now();
      GameState.caseStatus = "active";
      GameState.save();

      EventBus.emit("case:loaded", { caseData });
      console.log(
        `[CaseLoader] ✅ Kasus "${caseData.meta.title}" berhasil dimuat.`
      );
      return caseData;
    } catch (error) {
      this.isLoading = false;
      console.error("[CaseLoader] ❌ Gagal memuat kasus:", error);
      EventBus.emit("case:loadError", { error: error.message });
      throw error;
    }
  }

  /**
   * Internal: melakukan loading sebenarnya.
   * @param {string} caseFolder
   * @returns {Promise<Object>}
   */
  async _doLoad(caseFolder) {
    // 1. Cari metadata di globalIndex
    if (!this.globalIndex) {
      await this.loadGlobalIndex();
    }

    const meta = this.globalIndex.cases_list.find(
      (c) => c.folder === caseFolder
    );
    if (!meta) {
      throw new Error(
        `Kasus dengan folder '${caseFolder}' tidak ditemukan di index.json`
      );
    }

    // 2. Fetch manifest case.json
    const manifestUrl = `${this.basePath}/${caseFolder}/case.json`;
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) {
      throw new Error(`HTTP ${manifestRes.status}: Gagal memuat case.json`);
    }
    const manifest = await manifestRes.json();

    // 3. Validasi manifest
    this._validateManifest(manifest);

    // 4. Fetch semua karakter (paralel)
    const charPromises = (manifest.characters || []).map(async (charRef) => {
      const charUrl = `${this.basePath}/${caseFolder}/${
        manifest.assets?.character_directory || "characters"
      }/${charRef.file}`;
      try {
        const res = await fetch(charUrl);
        if (!res.ok) {
          console.warn(`[CaseLoader] Gagal memuat karakter '${charRef.id}'.`);
          return null;
        }
        const charData = await res.json();
        return { ...charRef, ...charData };
      } catch (error) {
        console.warn(
          `[CaseLoader] Error memuat karakter '${charRef.id}':`,
          error
        );
        return null;
      }
    });

    // 5. Fetch semua bukti (paralel) — konten Markdown
    const eviPromises = (manifest.evidence_registry || []).map(
      async (eviRef) => {
        const eviUrl = `${this.basePath}/${caseFolder}/${
          manifest.assets?.evidence_directory || "evidence"
        }/${eviRef.file}`;
        try {
          const res = await fetch(eviUrl);
          if (!res.ok) {
            console.warn(`[CaseLoader] Gagal memuat bukti '${eviRef.id}'.`);
            return { ...eviRef, content: "*[File bukti tidak ditemukan]*" };
          }
          const content = await res.text();
          return { ...eviRef, content };
        } catch (error) {
          console.warn(
            `[CaseLoader] Error memuat bukti '${eviRef.id}':`,
            error
          );
          return { ...eviRef, content: "*[Error memuat konten]*" };
        }
      }
    );

    // Tunggu semua selesai
    const [characters, evidence] = await Promise.all([
      Promise.all(charPromises),
      Promise.all(eviPromises),
    ]);

    // 6. Gabungkan semua data
    return {
      id: manifest.id,
      meta: manifest.meta,
      victim: manifest.victim,
      assets: manifest.assets || {
        briefing_file: "briefing.md",
        evidence_directory: "evidence",
        character_directory: "characters",
        images_directory: "images",
      },
      evidence_registry: manifest.evidence_registry || [],
      evidence_structure: manifest.evidence_structure || {},
      evidence: evidence.filter(Boolean),
      characters: characters.filter(Boolean),
      solution_matrix: manifest.solution_matrix || null,
      initial_evidence: manifest.initial_evidence || [],
      timeline: manifest.timeline || [],
      objectives: manifest.objectives || [],
      crime_scene: manifest.crime_scene || null,
      real_time_events: manifest.real_time_events || [],
      meta_data: meta,
    };
  }

  /**
   * Validasi manifest case.json.
   * @param {Object} manifest
   */
  _validateManifest(manifest) {
    const errors = [];

    if (!manifest.id) errors.push("'id' wajib diisi");
    if (!manifest.meta?.title) errors.push("'meta.title' wajib diisi");
    if (!manifest.victim?.name) errors.push("'victim.name' wajib diisi");

    if (
      !manifest.evidence_registry ||
      manifest.evidence_registry.length === 0
    ) {
      errors.push("'evidence_registry' wajib diisi minimal 1 bukti");
    }

    if (!manifest.characters || manifest.characters.length === 0) {
      errors.push("'characters' wajib diisi minimal 1 karakter");
    }

    if (!manifest.solution_matrix?.culprit_id) {
      errors.push("'solution_matrix.culprit_id' wajib diisi");
    }

    // Validasi referensi internal
    if (manifest.solution_matrix && manifest.characters) {
      const allCharIds = manifest.characters.map((c) => c.id);
      if (!allCharIds.includes(manifest.solution_matrix.culprit_id)) {
        errors.push(
          `'solution_matrix.culprit_id' (${manifest.solution_matrix.culprit_id}) tidak ada di daftar karakter`
        );
      }
    }

    if (manifest.solution_matrix && manifest.evidence_registry) {
      const allEviIds = manifest.evidence_registry.map((e) => e.id);
      if (!allEviIds.includes(manifest.solution_matrix.primary_evidence)) {
        errors.push(
          `'solution_matrix.primary_evidence' (${manifest.solution_matrix.primary_evidence}) tidak ada di evidence_registry`
        );
      }
    }

    if (errors.length > 0) {
      console.warn("[CaseLoader] Validasi case.json menemukan masalah:");
      errors.forEach((e) => console.warn(`  - ${e}`));
      // Tidak throw error agar tetap bisa dimuat (hanya warning)
    }
  }

  // ============================================================
  //  API — AKSES DATA AKTIF
  // ============================================================

  /**
   * Mendapatkan data kasus yang sedang aktif.
   * @returns {Object|null}
   */
  getActiveCase() {
    return this.activeCase;
  }

  /**
   * Mendapatkan data karakter berdasarkan ID.
   * @param {string} charId
   * @returns {Object|null}
   */
  getCharacterData(charId) {
    if (!this.activeCase) return null;
    return this.activeCase.characters.find((c) => c.id === charId) || null;
  }

  /**
   * Mendapatkan URL gambar karakter.
   * @param {string} charId
   * @returns {string|null}
   */
  getCharacterImage(charId) {
    const charData = this.getCharacterData(charId);
    if (!charData?.photo) return null;
    const folder = this.globalIndex.cases_list.find(
      (c) => c.id === this.activeCase.id
    )?.folder;
    if (!folder) return null;
    return `${this.basePath}/${folder}/${charData.photo}`;
  }

  /**
   * Mendapatkan URL gambar korban.
   * @param {string} victimPhoto - Path relatif foto korban (contoh: "images/victim.png")
   * @returns {string|null}
   */
  getVictimImage(victimPhoto) {
    if (!victimPhoto) return null;
    const folder = this.globalIndex.cases_list.find(
      (c) => c.id === this.activeCase.id
    )?.folder;
    if (!folder) return null;
    return `${this.basePath}/${folder}/${victimPhoto}`;
  }

  /**
   * Mendapatkan data bukti berdasarkan ID.
   * @param {string} eviId
   * @returns {Object|null}
   */
  getEvidenceData(eviId) {
    if (!this.activeCase) return null;
    return this.activeCase.evidence.find((e) => e.id === eviId) || null;
  }

  /**
   * Memuat konten bukti secara lazy (jika belum dimuat).
   * @param {string} eviId
   * @returns {Promise<string>}
   */
  async loadEvidenceContent(eviId) {
    const eviMeta = this.activeCase?.evidence_registry.find(
      (e) => e.id === eviId
    );
    if (!eviMeta) return null;

    // Cek cache
    const cached = this.activeCase.evidence.find((e) => e.id === eviId);
    if (cached?.content) return cached.content;

    // Fetch dari file
    const caseFolder = this.globalIndex.cases_list.find(
      (c) => c.id === this.activeCase.id
    )?.folder;
    if (!caseFolder) return null;

    const url = `${this.basePath}/${caseFolder}/${this.activeCase.assets.evidence_directory}/${eviMeta.file}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();

      // Update cache
      if (cached) {
        cached.content = content;
      }
      return content;
    } catch (error) {
      console.error(
        `[CaseLoader] Gagal memuat konten bukti '${eviId}':`,
        error
      );
      return "*[Gagal memuat konten]*";
    }
  }

  /**
   * Membersihkan data kasus aktif.
   */
  unloadCase() {
    this.activeCase = null;
    this.isLoading = false;
    this.loadingPromise = null;
    GameState.currentCaseId = null;
    EventBus.emit("case:unloaded");
    console.log("[CaseLoader] Kasus dibersihkan dari memori.");
  }
}

// Ekspor instance singleton (akan diinisialisasi di main.js)
export let caseLoader = null;

/**
 * Membuat instance CaseLoader (dipanggil di main.js).
 * @param {string} basePath
 */
export function initCaseLoader(basePath = "./cases") {
  caseLoader = new CaseLoader(basePath);
  return caseLoader;
}
