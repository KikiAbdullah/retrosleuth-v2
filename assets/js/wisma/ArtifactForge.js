/**
 * ============================================================
 *  ARTIFACTFORGE.JS — Hasil Kerja Nyata dari Tiap Karakter
 * ------------------------------------------------------------
 *  Inilah bagian "simulasi wisma"-nya yang paling terasa: setiap
 *  penghuni menjalani URUSAN RUMAHNYA, dan urusan itu meninggalkan
 *  barang di dunia.
 *
 *   Tio mencatat log gerbang      → Log Keamanan Gerbang (evi_003)
 *   Rina mencatat buku tamu       → Buku Tamu Wisma (evi_007)
 *   Sugeng memeriksa draf wasiat  → Draf Surat Wasiat (evi_011)
 *   Budi meronda malam            → catatan ronda dari INGATANNYA sendiri
 *
 *  Detektif harus MENGAMATI lalu MENGGELEDAH ruangan untuk menyitanya.
 *  Barang yang berhubungan langsung dengan pelaku dikunci sampai
 *  detektif punya alasan untuk mencarinya (anti-spoiler).
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";

export class ArtifactForge {
  /**
   * @param {Object} deps
   * @param {Object} [deps.template]  - template header/footer dari wisma.json
   * @param {Object} [deps.evidenceEngine]
   * @param {Object} [deps.notificationSystem]
   */
  constructor({ template = null, evidenceEngine = null, notificationSystem = null } = {}) {
    this.template = template || {};
    this.evidence = evidenceEngine;
    this.notify = notificationSystem;
    /** @type {Map<string,Object>} */
    this.items = new Map();
  }

  setEvidenceEngine(engine) {
    this.evidence = engine;
  }

  setNotificationSystem(ns) {
    this.notify = ns;
  }

  // ============================================================
  //  PRODUKSI
  // ============================================================

  /**
   * Sebuah tugas selesai → barangnya muncul di dunia.
   * @param {Object} ctx
   * @param {Object} ctx.def        - definisi artefak dari wisma.json
   * @param {string} ctx.agentName
   * @param {string} ctx.agentJob
   * @param {string} ctx.agentId
   * @param {string} ctx.taskId
   * @param {string} ctx.taskLabel
   * @param {string} ctx.roomId
   * @param {string} ctx.roomName
   * @param {string} ctx.timeLabel
   * @param {Array}  [ctx.memories] - ingatan agen (untuk artefak dinamis)
   * @param {string} [ctx.phase]
   * @returns {Object|null} artefak
   */
  produce(ctx) {
    const def = ctx.def;
    if (!def?.id) return null;
    if (this.items.has(def.id)) {
      // sudah pernah dibuat → perbarui posisi (mis. dipindah orang)
      const old = this.items.get(def.id);
      if (!old.taken) {
        old.roomId = ctx.roomId;
        old.timeLabel = ctx.timeLabel;
      }
      return old;
    }

    const artifact = {
      id: def.id,
      title: def.title || "Barang Tak Dikenal",
      evidence: def.evidence || null,
      dynamic: def.dynamic || null,
      lock: def.lock || [],
      agentId: ctx.agentId,
      agentName: ctx.agentName,
      agentJob: ctx.agentJob || "",
      taskId: ctx.taskId,
      taskLabel: ctx.taskLabel || "",
      roomId: ctx.roomId,
      roomName: ctx.roomName || ctx.roomId,
      timeLabel: ctx.timeLabel,
      phase: ctx.phase || "normal",
      producedAt: Date.now(),
      found: false, // sudah terlihat oleh pemain (hasil geladah)
      taken: false, // sudah disita
      content: null,
      memories: (ctx.memories || []).slice(0, 12).map((m) => ({
        time: m.timeLabel || "",
        clock: m.clock ?? 0,
        text: m.text || "",
        room: m.room || null,
      })),
    };

    this.items.set(artifact.id, artifact);
    EventBus.emit("wisma:artifact-produced", { artifact });
    return artifact;
  }

  // ============================================================
  //  KUNCI ANTI-SPOILER
  // ============================================================

  isLocked(artifact, discoveredEvidence = []) {
    if (!artifact.lock || artifact.lock.length === 0) return false;
    return !artifact.lock.some((id) => discoveredEvidence.includes(id));
  }

  lockHint(artifact) {
    if (!artifact.lock?.length) return "";
    return `Butuh petunjuk lain dulu (${artifact.lock.join(", ")}).`;
  }

  // ============================================================
  //  GELADAH / SITA
  // ============================================================

  /**
   * Barang apa saja yang ada di ruangan ini?
   * @returns {{found:Array, hiddenLocked:number, alreadyTaken:number}}
   */
  searchRoom(roomId, discoveredEvidence = []) {
    const found = [];
    let hiddenLocked = 0;
    let alreadyTaken = 0;

    for (const a of this.items.values()) {
      if (a.roomId !== roomId) continue;
      if (a.taken) {
        alreadyTaken++;
        continue;
      }
      if (this.isLocked(a, discoveredEvidence)) {
        hiddenLocked++;
        continue;
      }
      a.found = true;
      found.push(a);
    }
    return { found, hiddenLocked, alreadyTaken };
  }

  /** Daftar semua artefak yang sudah terlihat (untuk panel "Barang Temuan"). */
  foundList() {
    return [...this.items.values()].filter((a) => a.found || a.taken);
  }

  all() {
    return [...this.items.values()];
  }

  get(id) {
    return this.items.get(id) || null;
  }

  /**
   * Sita artefak → menjadi bukti resmi di Evidence Viewer.
   * @returns {{ok:boolean, evidenceId?:string, title?:string, reason?:string, isNew?:boolean}}
   */
  take(id, discoveredEvidence = []) {
    const a = this.items.get(id);
    if (!a) return { ok: false, reason: "Barang tidak ditemukan." };
    if (a.taken) return { ok: false, reason: "Sudah disita sebelumnya." };
    if (this.isLocked(a, discoveredEvidence)) {
      return { ok: false, reason: this.lockHint(a) };
    }

    let evidenceId = a.evidence;
    let isNew = false;

    // Artefak dinamis → daftarkan sebagai bukti baru (konten dibuat dari simulasi)
    if (!evidenceId) {
      evidenceId = a.id;
      a.content = this._buildContent(a);
      const registered = this.evidence?.registerDynamicEvidence?.({
        id: evidenceId,
        title: a.title,
        icon: "🗃",
        description_short: `Hasil urusan rumah ${a.agentName} — "${a.taskLabel || "-"}" — di ${a.roomName}.`,
        content: a.content,
        source: "wisma",
      });
      isNew = registered !== false;
    }

    const unlocked = this.evidence?.unlockEvidence?.(evidenceId) ?? false;
    a.taken = true;
    a.takenAt = Date.now();
    a.evidenceId = evidenceId;

    this.notify?.add?.(
      `🗃 Disita dari ${a.roomName}: ${a.title}${unlocked ? "" : " (sudah tercatat)"}`,
      `wisma-artifact-${a.id}`
    );

    EventBus.emit("wisma:artifact-taken", { artifact: a, evidenceId, unlocked, isNew });
    return { ok: true, evidenceId, title: a.title, isNew, unlocked };
  }

  /**
   * Susun isi catatan: urut waktu (malam ini lewat tengah malam), tanpa
   * entri kembar, dan noise perpindahan dibuang bila catatan berarti cukup.
   */
  _logEntries(a) {
    const seen = new Set();
    const rows = [];
    for (const m of a.memories || []) {
      const t = String(m.text || "").trim();
      if (!t) continue;
      const k = t.toLowerCase().replace(/\s+/g, " ").slice(0, 55);
      if (seen.has(k)) continue;
      seen.add(k);
      rows.push({ ...m, _noise: /berjalan menuju|lewat |keluar dari/.test(t) });
    }
    rows.sort((x, y) => (x.clock ?? 0) - (y.clock ?? 0));
    const berarti = rows.filter((r) => !r._noise);
    return (berarti.length >= 4 ? berarti : rows).slice(-10);
  }

  /**
   * Kepala dokumen ala rumah tangga: urusan apa, siapa yang menjalani,
   * perannya di wisma, lalu di mana & jam berapa barangnya tertinggal.
   */
  _docMeta(a) {
    const urusan = a.taskLabel ? a.taskLabel.charAt(0).toLowerCase() + a.taskLabel.slice(1) : "-";
    return [
      `**Urusan**: ${urusan} — ${a.agentName}`,
      `**Peran di wisma**: ${a.agentJob || "-"}`,
      `**Ditemukan di**: ${a.roomName}, pukul ${a.timeLabel}`,
      ``,
    ].join("\n");
  }

  /** Bangun konten Markdown untuk artefak tanpa file bukti. */
  _buildContent(a) {
    const header = (this.template?.header || "")
      .replace("{agent}", a.agentName)
      .replace("{job}", a.agentJob || "-")
      .replace("{time}", a.timeLabel)
      .replace("{room}", a.roomName)
      .replace("{status}", a.taken ? "telah disita detektif" : "masih berada di lokasi");

    let body = "";
    if (a.dynamic === "memory_log") {
      const urusan = a.taskLabel ? a.taskLabel.charAt(0).toLowerCase() + a.taskLabel.slice(1) : "urusannya";
      body = [
        `# ${a.title}`,
        ``,
        this._docMeta(a),
        `Catatan ini ditulis tergesa-gesa di kertas bekas daftar belanja.`,
        `Isinya adalah hal-hal yang dilihat ${a.agentName} sendiri selama ${urusan}:`,
        ``,
      ].join("\n");

      const rows = this._logEntries(a);
      if (rows.length === 0) {
        body += `_Tidak ada yang tercatat. Malam itu berlangsung terlalu biasa._\n`;
      } else {
        body += `| Jam | Yang dilihat / didengar di sekitar rumah | Dari mana ia melihat |\n`;
        body += `| :-- | :-- | :-- |\n`;
        for (const m of rows) {
          body += `| ${m.time || "-"} | ${m.text.replace(/\|/g, "/")} | ${m.room || "-"} |\n`;
        }
      }
      body += `\n> Nilai barang ini terletak pada JAM dan TEMPAT: cocokkan dengan Timeline kasus.\n> Ingat: tidak semua yang tercatat di rumah ini jujur — pemegangnya bisa saja berbohong saat diinterogasi.\n`;
    } else if (a.dynamic === "threat_note") {
      body = [
        `# ${a.title}`,
        ``,
        this._docMeta(a),
        `Kertas sobekan bungkus rokok, tulisan besar dan menekan:`,
        ``,
        `> "TANGGAL 15. JANGAN LUPA. AKU TIDAK MENERIMA ALASAN LAGI."`,
        `> "KALAU UANG TIDAK ADA, AKU DATANG SENDIRI KE RUMAH ITU."`,
        ``,
        `Di balik kertas terdapat coretan angka: **497.000.000** dan inisial **R.W.**`,
        ``,
        `Catatan penyidik: kertas ini dibuang terburu-buru. Penulisnya sedang berada di dalam wisma malam itu.`,
      ].join("\n");
    } else {
      body = [
        `# ${a.title}`,
        ``,
        this._docMeta(a),
        (() => {
          const rows = this._logEntries(a);
          return rows.length
            ? `Yang tersirat dari barang ini:\n\n${rows.map((m) => `- (${m.time}) ${m.text}`).join("\n")}`
            : `_Barang ini tidak banyak bercerita._`;
        })(),
      ].join("\n");
    }

    const footer = (this.template?.footer || "")
      .replace("{agent}", a.agentName)
      .replace("{task}", a.taskLabel)
      .replace("{room}", a.roomName)
      .replace("{time}", a.timeLabel);

    return `${header}\n${body}\n${footer}`.trim() + "\n";
  }

  // ============================================================
  //  SERIALIZASI
  // ============================================================

  toJSON() {
    return [...this.items.values()].map((a) => ({ ...a }));
  }

  restore(list) {
    this.items.clear();
    if (!Array.isArray(list)) return;
    for (const a of list) {
      if (a?.id) this.items.set(a.id, a);
    }
  }
}
