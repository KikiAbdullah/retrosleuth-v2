/**
 * ============================================================
 *  AGENTPROMPTS.JS — Otak "Wisma Angker"
 * ------------------------------------------------------------
 *  Rahasia menghemat kuota: SATU panggilan menggerakkan SEMUA
 *  karakter (Director Batch). Model gratis membalas JSON ringkas,
 *  lalu WismaWorld menerjemahkannya jadi tindakan, ucapan, emosi,
 *  dan ingatan di dalam simulasi.
 *
 *  Semua prompt di sini dibangun dari data murni (tanpa DOM) supaya
 *  bisa diuji dan supaya ukuran token tetap kecil.
 *
 *  PRINSIP ANTI-SPOILER (penting untuk game detektif!):
 *   - Data `truths`, `secrets`, `can_be_culprit`, `red_herring_note`
 *     TIDAK PERNAH dikirim ke model untuk simulasi wisma.
 *   - Karakter hanya tahu apa yang mereka LIHAT/DENGAR (memori sim).
 *   - Ruang kerja blackout saat kejadian ⇒ tidak ada saksi mata.
 * ============================================================
 */

export class AgentPrompts {
  /**
   * System prompt dasar: identitas dunia + aturan keras.
   * @param {Object} world - { title, date, phase, phaseNote, spoilerRule }
   * @returns {string}
   */
  static systemBase(world) {
    return [
      `[MESIN SIMULASI — ${world.title || "WISMA ANGKER"}]`,
      `Tanggal: ${world.date || "-"}. Jam simulasi: ${world.clock || "-"}. Fase: ${world.phaseLabel || world.phase || "normal"}.`,
      world.phaseNote || "",
      "",
      `Anda memerankan beberapa manusia sekaligus dalam sebuah rumah besar pada tahun 1979.`,
      `Mereka hidup, bekerja, dan saling berbicara TANPA tahu sedang diamati detektif.`,
      "",
      `[ATURAN KERAS]`,
      `1. Balas HANYA JSON valid sesuai skema. Tanpa teks lain, tanpa markdown, tanpa emoji.`,
      `2. Bahasa Indonesia. Kalimat pendek, natural, sesuai zaman 1979 (tidak ada HP/internet).`,
      `3. Setiap orang HANYA tahu apa yang tertulis di status/ingatannya. Jangan mengarang fakta baru yang besar.`,
      `4. DILARANG menyebut, menyiratkan, atau menebak siapa pelaku kejahatan di rumah ini.`,
      `5. ${world.spoilerRule || "Ruangan yang sedang blackout tidak bisa dilihat siapa pun."}`,
      `6. Jangan pernah keluar karakter, jangan menyebut AI, model, prompt, atau simulasi.`,
      `7. Emosi harus konsisten: orang lelah bicara pendek, orang takut bicara bergetar, orang marah menyindir.`,
      `8. Setiap field maks 1 kalimat. Jangan mengulang informasi yang sudah ada di status.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // ============================================================
  //  1) DIRECTOR BATCH — 1 request untuk SEMUA karakter
  // ============================================================

  /**
   * @param {Object} world - snapshot dunia (lihat WismaWorld.snapshotForAI)
   * @returns {{system:string,user:string,jsonMode:true}}
   */
  static directorBatch(world) {
    const system = AgentPrompts.systemBase(world);

    const lines = [];
    lines.push(`[TUGAS]`);
    lines.push(
      `Tentukan 20 menit berikutnya untuk ${world.agents.length} penghuni. Satu objek JSON per orang.`
    );
    lines.push("");
    lines.push(`[SKEMA BALASAN]`);
    lines.push(
      `{"agents":[{"id":"char_001","thought":"...","speech":"...","speech_to":"char_003|null","action":"...","move_to":"room_id|null","mood":{"stress":0,"energy":0,"social":0},"relation":{"with":"char_002","trust":0,"affinity":0,"tension":0},"memory":"..."}],"world_note":"..."}`
    );
    lines.push("");
    lines.push(`[ARTI FIELD]`);
    lines.push(
      `- thought    : monolog batin, <= 15 kata. Wajib ada untuk setiap orang.`
    );
    lines.push(
      `- speech     : yang diucapkan keras-keras, <= 20 kata. Kosong ("") kalau diam/bekerja.`
    );
    lines.push(`- speech_to  : id lawan bicara, atau null.`);
    lines.push(
      `- action     : kata kerja + objek yang sedang dikerjakan, <= 8 kata (contoh: "memoles sendok perak").`
    );
    lines.push(
      `- move_to    : id ruangan tujuan kalau ia pindah, atau null. Pilih hanya dari daftar ruangan.`
    );
    lines.push(
      `- mood       : perubahan -10..10 untuk stress/energy/social.`
    );
    lines.push(
      `- relation   : OPSIONAL. perubahan -10..10 pada hubungan dengan satu orang.`
    );
    lines.push(
      `- memory     : hal penting yang ia simpan dari periode ini, <= 20 kata, atau "".`
    );
    lines.push(`- world_note : satu kalimat suasana rumah, <= 20 kata.`);
    lines.push("");
    lines.push(`[RUANGAN TERSEDIA]`);
    lines.push(world.rooms.map((r) => `${r.id}=${r.name}`).join(", "));
    lines.push("");
    lines.push(`[PERISTIWA TERBARU]`);
    lines.push(
      world.recentEvents?.length
        ? world.recentEvents.map((e) => `- (${e.time}) ${e.text}`).join("\n")
        : "- Tidak ada peristiwa khusus."
    );
    lines.push("");
    lines.push(`[STATUS PENGHUNI]`);
    for (const a of world.agents) {
      lines.push(AgentPrompts._agentLine(a));
    }

    return { system, user: lines.join("\n"), jsonMode: true };
  }

  /** Satu baris status ringkas per agen (hemat token). */
  static _agentLine(a) {
    const parts = [];
    parts.push(`- ${a.id} ${a.name} (${a.age || "?"} th, ${a.job || "penghuni"})`);
    parts.push(`  sifat: ${a.traits}`);
    parts.push(
      `  posisi: ${a.room} | sedang: ${a.activity} | tujuan: ${a.nextGoal || "-"}`
    );
    parts.push(
      `  kondisi: energi ${a.needs.energy} lapar ${a.needs.hunger} sosial ${a.needs.social} stres ${a.mood.stress}`
    );
    if (a.visibleWith?.length) {
      parts.push(`  melihat: ${a.visibleWith.join(", ")}`);
    }
    if (a.memories?.length) {
      parts.push(`  ingatan: ${a.memories.join(" | ")}`);
    }
    if (a.relations?.length) {
      parts.push(`  relasi: ${a.relations.join(", ")}`);
    }
    return parts.join("\n");
  }

  // ============================================================
  //  2) DEEP PROBE — 1 karakter saja (pemain menekan "INTAI PIKIRAN")
  // ============================================================

  static deepProbe(world, agent) {
    const system = AgentPrompts.systemBase(world);
    const lines = [];
    lines.push(`[TUGAS]`);
    lines.push(
      `Perdalam satu orang: ${agent.name}. Tulis apa yang benar-benar berkecamuk di kepalanya saat ini.`
    );
    lines.push("");
    lines.push(`[SKEMA BALASAN]`);
    lines.push(
      `{"id":"${agent.id}","thought":"...","monologue":"...","speech":"...","speech_to":"id|null","action":"...","move_to":"room_id|null","mood":{"stress":0,"energy":0,"social":0},"relation":{"with":"id","trust":0,"affinity":0,"tension":0},"memory":"...","intent":"..."}`
    );
    lines.push("");
    lines.push(`- monologue : 2-3 kalimat batin, jujur, boleh kontradiktif dengan ucapan.`);
    lines.push(`- intent    : apa yang ingin ia lakukan 30 menit ke depan, <= 12 kata.`);
    lines.push("");
    lines.push(`[ORANG INI]`);
    lines.push(AgentPrompts._agentLine(agent));
    lines.push("");
    lines.push(`[LATAR PUBLIK]`);
    lines.push(agent.publicBackground || "-");
    lines.push("");
    lines.push(`[INGATAN LENGKAP (dari simulasi)]`);
    lines.push(
      agent.longMemory?.length
        ? agent.longMemory.map((m) => `- (${m.time}) ${m.text}`).join("\n")
        : "- Belum ada ingatan khusus."
    );
    lines.push("");
    lines.push(`[PEKERJAAN & TUGAS SAAT INI]`);
    lines.push(agent.detailedActivity || "-");

    return { system, user: lines.join("\n"), jsonMode: true };
  }

  // ============================================================
  //  3) EAVESDROP — sadap percakapan 2 orang (pemain menekan "SADAP")
  // ============================================================

  static eavesdrop(world, a, b, context) {
    const system = AgentPrompts.systemBase(world);
    const lines = [];
    lines.push(`[TUGAS]`);
    lines.push(
      `Tulis percakapan yang sedang terjadi antara ${a.name} dan ${b.name} di ${context.roomName}.`
    );
    lines.push(
      `Detektif menyadap dari kejauhan: ia hanya mendengar kata-kata, tidak melihat wajah.`
    );
    lines.push("");
    lines.push(`[SKEMA BALASAN]`);
    lines.push(
      `{"room":"${context.roomId}","lines":[{"who":"${a.id}","text":"..."},{"who":"${b.id}","text":"..."}],"learned":[{"id":"${a.id}","memory":"..."},{"id":"${b.id}","memory":"..."}],"relation":{"trust":0,"affinity":0,"tension":0},"overheard_fact":"...","secrecy":"public|semi|rahasia"}`
    );
    lines.push("");
    lines.push(`- lines          : 4-8 baris bergantian, tiap baris <= 22 kata.`);
    lines.push(`- learned        : apa yang masing-masing simpan setelah bicara.`);
    lines.push(
      `- overheard_fact : SATU fakta konkret yang bisa dipakai detektif (jam, tempat, benda, nama), <= 20 kata. Boleh hal sepele.`
    );
    lines.push(`- secrecy        : seberapa rahasia percakapan ini.`);
    lines.push("");
    lines.push(`[ORANG PERTAMA]`);
    lines.push(AgentPrompts._agentLine(a));
    lines.push(`[ORANG KEDUA]`);
    lines.push(AgentPrompts._agentLine(b));
    lines.push("");
    lines.push(`[HUBUNGAN MEREKA]`);
    lines.push(
      `trust ${context.relation.trust} | affinity ${context.relation.affinity} | tension ${context.relation.tension} | fear ${context.relation.fear || 0}`
    );
    lines.push(context.relation.publicNote || "");
    if (context.relation.secretKnown) lines.push(context.relation.secretNote || "");
    lines.push("");
    lines.push(`[TOPIK PEMICU]`);
    lines.push(context.topic || "Pekerjaan rumah tangga malam itu.");

    return { system, user: lines.join("\n"), jsonMode: true };
  }

  // ============================================================
  //  4) REFLECTION — ringkas ingatan jadi kesimpulan batin
  // ============================================================

  static reflection(world, agent) {
    const system = AgentPrompts.systemBase(world);
    const lines = [];
    lines.push(`[TUGAS]`);
    lines.push(
      `${agent.name} sedang merenung. Dari daftar ingatan mentah di bawah, tarik 2-3 kesimpulan batin.`
    );
    lines.push("");
    lines.push(`[SKEMA BALASAN]`);
    lines.push(`{"id":"${agent.id}","reflections":["...","..."],"suspicion":{"id":"char_00x","score":0}}`);
    lines.push("");
    lines.push(`- reflections : kalimat orang pertama, <= 18 kata, bukan fakta tapi PENAFSIRAN.`);
    lines.push(
      `- suspicion   : OPSIONAL. Orang yang mulai ia curigai, skor 0-100. Null kalau tidak ada: {"id":null,"score":0}`
    );
    lines.push(`- Ingat aturan 4: jangan menuduh siapa pun sebagai pelaku secara pasti.`);
    lines.push("");
    lines.push(`[INGATAN MENTAH]`);
    lines.push(
      agent.longMemory?.length
        ? agent.longMemory.map((m) => `- (${m.time}) ${m.text}`).join("\n")
        : "- Kosong."
    );

    return { system, user: lines.join("\n"), jsonMode: true };
  }

  // ============================================================
  //  VALIDASI & NORMALISASI BALASAN MODEL
  // ============================================================

  /**
   * Bersihkan balasan director agar aman dipakai engine.
   * Field tak dikenal dibuang, nilai di-clamp, id tak dikenal dihapus.
   * @param {any} json
   * @param {string[]} validIds
   * @param {string[]} validRooms
   * @returns {{agents:Map<string,Object>, worldNote:string}|null}
   */
  static sanitizeDirector(json, validIds, validRooms) {
    if (!json || !Array.isArray(json.agents)) return null;
    const out = new Map();
    const clampDelta = (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return 0;
      return Math.max(-10, Math.min(10, Math.round(n)));
    };
    const str = (v, max) =>
      typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

    for (const raw of json.agents) {
      if (!raw || typeof raw !== "object") continue;
      const id = String(raw.id || "").trim();
      if (!validIds.includes(id)) continue;

      const entry = {
        id,
        thought: str(raw.thought, 160),
        speech: str(raw.speech, 200),
        speechTo: validIds.includes(String(raw.speech_to || "")) ? String(raw.speech_to) : null,
        action: str(raw.action, 80),
        moveTo: validRooms.includes(String(raw.move_to || "")) ? String(raw.move_to) : null,
        mood: {
          stress: clampDelta(raw.mood?.stress),
          energy: clampDelta(raw.mood?.energy),
          social: clampDelta(raw.mood?.social),
        },
        relation: null,
        memory: str(raw.memory, 200),
      };

      if (raw.relation && validIds.includes(String(raw.relation.with || ""))) {
        entry.relation = {
          with: String(raw.relation.with),
          trust: clampDelta(raw.relation.trust),
          affinity: clampDelta(raw.relation.affinity),
          tension: clampDelta(raw.relation.tension),
        };
      }
      out.set(id, entry);
    }

    if (out.size === 0) return null;
    return { agents: out, worldNote: str(json.world_note, 200) };
  }

  /** Validasi balasan sadapan. */
  static sanitizeEavesdrop(json, aId, bId) {
    if (!json || !Array.isArray(json.lines) || json.lines.length === 0) return null;
    const clean = [];
    for (const line of json.lines.slice(0, 8)) {
      const who = line?.who === bId ? bId : aId;
      const text = typeof line?.text === "string" ? line.text.replace(/\s+/g, " ").trim().slice(0, 220) : "";
      if (text) clean.push({ who, text });
    }
    if (clean.length === 0) return null;
    return {
      lines: clean,
      learned: Array.isArray(json.learned)
        ? json.learned
            .filter((l) => [aId, bId].includes(l?.id) && typeof l?.memory === "string")
            .map((l) => ({ id: l.id, memory: l.memory.slice(0, 200) }))
        : [],
      overheardFact: typeof json.overheard_fact === "string" ? json.overheard_fact.slice(0, 220) : "",
      secrecy: ["public", "semi", "rahasia"].includes(json.secrecy) ? json.secrecy : "semi",
      relation: {
        trust: Number(json.relation?.trust) || 0,
        affinity: Number(json.relation?.affinity) || 0,
        tension: Number(json.relation?.tension) || 0,
      },
    };
  }

  /** Validasi balasan deep probe. */
  static sanitizeDeep(json, id, validRooms) {
    if (!json) return null;
    const str = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
    const clamp = (v) => {
      const n = Number(v);
      return Number.isNaN(n) ? 0 : Math.max(-10, Math.min(10, Math.round(n)));
    };
    return {
      id,
      thought: str(json.thought, 160),
      monologue: str(json.monologue, 500),
      speech: str(json.speech, 200),
      action: str(json.action, 80),
      moveTo: validRooms.includes(String(json.move_to || "")) ? String(json.move_to) : null,
      mood: {
        stress: clamp(json.mood?.stress),
        energy: clamp(json.mood?.energy),
        social: clamp(json.mood?.social),
      },
      memory: str(json.memory, 200),
      intent: str(json.intent, 160),
    };
  }
}
