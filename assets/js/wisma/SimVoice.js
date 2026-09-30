/**
 * ============================================================
 *  SIMVOICE.JS — Generator Perilaku Offline (Tanpa API)
 * ------------------------------------------------------------
 *  Simulasi wisma HARUS tetap hidup walau kuota OpenRouter habis,
 *  key belum diisi, atau internet mati. Modul ini menghasilkan
 *  pikiran, ucapan, dan aksi prosedural dalam Bahasa Indonesia,
 *  dengan cita rasa kepribadian tiap karakter.
 *
 *  Caranya: sifat karakter dibaca dari teks `personality` dan
 *  `voice_style` di JSON kasus (kata kunci → "suara"), lalu
 *  template dipilih dari bank kalimat per jenis obrolan.
 *
 *  Kalau AI aktif, hasilnya dipakai sebagai PEMERKAYA (bukan
 *  pengganti): AI mengisi pikiran & ucapan, SimVoice mengisi
 *  sisanya dan menjadi jaring pengaman.
 * ============================================================
 */

/** RNG deterministik ringan (mulberry32). */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

// ============================================================
//  BANK KALIMAT
// ============================================================

const LINES = {
  work: [
    "Sebentar, tanggung. Ini belum selesai.",
    "Berkasnya menumpuk sejak sore tadi.",
    "Jangan berisik, saya sedang menghitung.",
    "Kalau Tuan besar bertanya, bilang saya ada di sini.",
    "Sudah biasa begini tiap malam Jumat.",
    "Nanti saya serahkan sebelum tengah malam.",
    "Urusan rumah ini tidak pernah habis.",
    "Tolong jangan dipindah, saya hafal letaknya.",
  ],
  gossip: [
    "Katanya sih begitu... tapi saya tidak mau menyebut nama.",
    "Kamu dengar sendiri kan tadi di atas?",
    "Saya cuma pelayan, tapi mata saya tidak buta.",
    "Jangan bilang siapa-siapa ya, saya yang kena nanti.",
    "Sudah tiga malam ini rumah terasa aneh.",
    "Nyonya besar makin sering mengurung diri.",
    "Uang di rumah ini mengalir ke mana, siapa yang tahu.",
    "Yang penting kita tidak ikut campur.",
  ],
  anxious: [
    "Saya tidak bisa duduk diam. Maaf.",
    "Jam berapa sekarang? Sudah lewat tengah malam?",
    "Kalau mereka tahu, habislah saya.",
    "Tangan saya gemetar sejak tadi sore.",
    "Saya cuma ingin semuanya cepat selesai.",
    "Jangan tatap saya seperti itu.",
    "Saya tidak berbuat apa-apa, sungguh.",
    "Boleh saya minta air? Mulut saya kering.",
  ],
  argue: [
    "Cukup! Saya sudah muak dengan janji.",
    "Kau pikir aku tidak tahu?",
    "Turunkan suaramu di rumah ini.",
    "Aku yang tanda tangan, aku yang menentukan!",
    "Pergi. Sekarang.",
    "Kau akan menyesal mengatakan itu.",
    "Semua orang di rumah ini mendengar kita!",
    "Jangan sebut-sebut nama itu di depanku.",
  ],
  secret: [
    "(berbisik) Jangan keras-keras.",
    "Kamu bawa uangnya?",
    "Aku tidak bisa lama-lama di sini.",
    "Kalau ketahuan, kita berdua tamat.",
    "Nanti malam, jam yang sama.",
    "Simpan dulu surat itu, jangan diserahkan.",
    "Aku hanya mau memastikan kamu aman.",
    "Pergi duluan, biar aku yang belakang.",
  ],
  cry: [
    "(menutup wajah) Saya tidak kuat lagi...",
    "Maaf... maaf, saya tidak bermaksud...",
    "Kenapa harus malam ini...",
    "(isaknya tertahan di tenggorokan)",
    "Tinggalkan saya sendiri sebentar.",
    "Saya takut sekali, Pak.",
  ],
  plead: [
    "Paman, beri saya satu kesempatan lagi.",
    "Saya mohon, jangan laporkan saya.",
    "Saya akan bayar, saya janji, minggu ini.",
    "Tolong... saya masih punya nama baik.",
    "Saya tidak pernah mencuri dari Tuan, sumpah.",
    "Beri saya waktu sampai besok pagi.",
  ],
  silent: [
    "(diam, hanya napasnya terdengar)",
    "(ia menatap lantai tanpa berkedip)",
    "(tangannya berhenti bergerak sejenak)",
    "(tidak menjawab, hanya mengangguk pelan)",
  ],
  patrol: [
    "Semua pintu sudah saya periksa.",
    "Senter ini baterainya lemah lagi.",
    "Saya ronda tiap setengah jam, sesuai prosedur.",
    "Tidak ada yang aneh... sejauh ini.",
    "Lampu belakang mati sejak magrib.",
    "Saya catat di buku, biar tidak lupa.",
  ],
  service: [
    "Kopinya, Tuan. Masih panas.",
    "Nampannya saya taruh di meja kecil.",
    "Ada yang bisa saya bantu lagi?",
    "Maaf mengganggu, Tuan memanggil?",
    "Saya siapkan air hangat untuk Nyonya.",
    "Silakan, Tuan. Saya permisi dulu.",
  ],
  formal: [
    "Secara hukum, dokumen ini belum sah.",
    "Saya perlu tanda tangan saksi kedua.",
    "Mari kita baca ulang pasal tiga.",
    "Ini menyangkut warisan, tidak bisa sembarangan.",
    "Saya hanya menjalankan permintaan klien.",
    "Perlu waktu tiga hari untuk melegalisasi.",
  ],
  polite: [
    "Selamat malam, silakan duduk.",
    "Tuan besar sedang di ruang kerja.",
    "Mohon menunggu sebentar, saya catat dulu.",
    "Boleh saya tahu nama dan keperluannya?",
    "Terima kasih sudah datang malam-malam begini.",
  ],
  casual: [
    "Kudanya sehat-sehat saja?",
    "Sudah lama tidak ke Puncak?",
    "Rokok? Saya punya kretek.",
    "Dingin betul malam ini.",
    "Kamu betah kerja di sini?",
    "Hati-hati, lantai atas licin.",
  ],
  threat: [
    "Utang itu ada bunganya, Nak.",
    "Besok tanggal lima belas. Ingat itu.",
    "Saya tidak suka mengulang kalimat.",
    "Keluarga kamu tahu kamu di sini?",
    "Kalau uang tidak ada, barang bisa jadi ganti.",
    "Saya sabar, tapi tidak selamanya.",
  ],
  cold: [
    "Saya hanya menunggu.",
    "Tidak usah banyak tanya.",
    "Waktu saya mahal.",
    "Kamu tahu kenapa saya di sini.",
    "Pintu mana pun bisa saya lewati.",
  ],
  tense: [
    "Makanannya dingin.",
    "Kita perlu bicara setelah ini.",
    "Jangan bahas itu di depan pelayan.",
    "Aku sudah tanda tangan apa pun?",
    "Kamu berubah sejak pulang dari Jakarta.",
  ],
  rehearse: [
    "'Dan malam pun menutup semua dosa...' — begitu bunyinya.",
    "Dulu saya main di panggung Surabaya, tahu.",
    "Suara saya masih kuat, cuma hatinya yang lemah.",
    "Beri saya satu peran lagi, hanya satu.",
    "Latihan membuat saya tidak memikirkan rumah ini.",
  ],
  sneak: [
    "(langkahnya sengaja diperlambat)",
    "(ia menahan napas di balik pintu)",
    "(matanya memeriksa koridor dua kali)",
    "(tangannya gemetar memegang gagang laci)",
  ],
  supervise: [
    "Kerjakan yang benar, saya lihat.",
    "Piring itu belum bersih.",
    "Jangan buang-buang minyak tanah.",
    "Nanti Tuan besar marah kalau begini.",
    "Saya yang tanggung jawab kalau ada yang hilang.",
  ],
};

/** Kata kunci di JSON karakter → sifat suara. */
const TRAIT_KEYWORDS = {
  nervous: ["gugup", "panik", "cemas", "takut", "gemetar", "terbata", "naif"],
  angry: ["marah", "keras", "meledak", "temperamen", "garang", "benci"],
  cold: ["dingin", "tenang", "datar", "tanpa emosi", "calculating", "perhitungan"],
  polite: ["sopan", "halus", "ramah", "lembut", "hormat"],
  firm: ["tegas", "memerintah", "keras kepala", "otoriter", "disiplin"],
  quiet: ["pendiam", "irits", "irit bicara", "tertutup", "pendiam", "menyendiri"],
  proud: ["bangga", "gengsi", "harga diri", "sombong", "angkuh"],
  flirty: ["menggoda", "genit", "rayuan", "pesona", "menarik"],
  rough: ["kasar", "preman", "intimidasi", "mengancam", "judi"],
  sad: ["sedih", "murung", "duka", "menangis", "kecewa", "patah"],
  fearful: ["penakut", "takut", "khawatir", "waspada"],
  cunning: ["licik", "manipulatif", "cerdik", "pandai bersandiwara", "bermuslihat"],
};

const THOUGHTS = {
  nervous: [
    "Jangan sampai kelihatan. Jangan sampai kelihatan.",
    "Kalau mereka menemukan itu, saya habis.",
    "Kenapa semua orang menatap saya?",
    "Saya harus pergi sebelum tengah malam.",
  ],
  angry: [
    "Dia pikir saya bisa dibeli?",
    "Sekali lagi dia bicara begitu, saya tidak tahan.",
    "Rumah ini sudah tidak menghormati saya.",
    "Sabar... sabar... tapi sampai kapan?",
  ],
  cold: [
    "Semua orang punya harga. Tinggal dihitung.",
    "Tidak ada gunanya panik. Hitung dulu faktanya.",
    "Kalau aku diam, mereka yang akan bicara.",
    "Biarkan mereka saling curiga.",
  ],
  polite: [
    "Mudah-mudahan tidak ada yang tersinggung.",
    "Saya hanya menjalankan tugas.",
    "Tuan besar pasti lelah malam ini.",
    "Lebih baik saya tidak ikut campur.",
  ],
  firm: [
    "Rumah ini harus tertib, apa pun yang terjadi.",
    "Saya tidak suka orang berkeliaran malam-malam.",
    "Semua ada tempatnya. Semua ada jamnya.",
    "Kalau saya longgarkan sedikit, kacau semuanya.",
  ],
  quiet: [
    "Lebih baik mendengar daripada bicara.",
    "Aku lihat banyak hal malam ini.",
    "Diam saja. Catat dalam kepala.",
    "Nanti juga ketahuan sendiri.",
  ],
  proud: [
    "Nama saya tidak boleh jatuh di rumah ini.",
    "Mereka butuh saya, bukan sebaliknya.",
    "Saya tidak akan mengemis pada siapa pun.",
    "Biar mereka tahu siapa saya sebenarnya.",
  ],
  flirty: [
    "Dia pasti mencariku malam ini.",
    "Satu pesan kecil tidak akan merugikan siapa pun.",
    "Aku bisa membuatnya menunggu sampai subuh.",
    "Tidak ada yang memperhatikan kita di taman.",
  ],
  rough: [
    "Uang itu harus kembali, dengan bunga.",
    "Anak itu tidak punya nyali, gampang ditekan.",
    "Kalau lunak, orang menginjak kepala kita.",
    "Satu malam lagi, lalu selesai.",
  ],
  sad: [
    "Rumah ini dulu hangat. Sekarang dingin.",
    "Aku tidak tahu harus mengadu ke siapa.",
    "Semuanya berubah sejak surat itu datang.",
    "Aku lelah berpura-pura bahagia.",
  ],
  fearful: [
    "Aku tidak mau sendirian di lantai atas.",
    "Suara itu lagi... jangan-jangan...",
    "Kalau polisi datang, aku bilang apa?",
    "Lebih baik aku tetap di bawah.",
  ],
  cunning: [
    "Biarkan mereka menebak-nebak sendiri.",
    "Aku sudah menyiapkan jawaban untuk tiap pertanyaan.",
    "Sedikit air mata akan sangat membantu nanti.",
    "Yang penting tidak ada yang melihat tanganku.",
  ],
  neutral: [
    "Jam berapa sekarang? Malam terasa panjang.",
    "Listrik di sayap kiri mati lagi.",
    "Aku harus menyelesaikan ini sebelum subuh.",
    "Bau kopi dari dapur masih tercium sampai sini.",
    "Semoga tidak ada yang bertanya macam-macam.",
  ],
};

const WORLD_NOTES = {
  normal: [
    "Rumah besar itu bernapas pelan: piring berdenting, mesin ketik berbunyi, dan radio berdengung di dapur.",
    "Semua orang sibuk dengan urusannya, tapi mata mereka sesekali melirik ke lantai atas.",
    "Aroma kopi dan kayu tua mengisi koridor. Malam belum menunjukkan taringnya.",
  ],
  aftermath: [
    "Keheningan menempel di dinding. Orang-orang berbicara dengan suara setengah.",
    "Pintu ruang kerja tertutup rapat, dan tidak ada yang berani mengetuknya.",
    "Bayangan bergerak di koridor lantai dua, lalu berhenti mendadak saat ada yang melihat.",
  ],
  crisis: [
    "Rumah itu terjaga seluruhnya. Tidak ada yang berani tidur, tidak ada yang berani pergi.",
    "Suara isak tertahan bercampur derit lantai kayu. Semua orang saling menghitung kehadiran.",
    "Lampu dinyalakan di setiap ruangan, seolah cahaya bisa menahan tuduhan.",
  ],
};

export class SimVoice {
  /**
   * Baca sifat dari data karakter.
   * @param {{personality?:string,voice_style?:string,role?:string}} charData
   * @returns {string[]} daftar trait
   */
  static traitsOf(charData = {}) {
    const text = `${charData.personality || ""} ${charData.voice_style || ""} ${charData.role || ""}`.toLowerCase();
    const found = [];
    for (const [trait, words] of Object.entries(TRAIT_KEYWORDS)) {
      if (words.some((w) => text.includes(w))) found.push(trait);
    }
    if (found.length === 0) found.push("neutral");
    return found.slice(0, 4);
  }

  static _rngFor(agent, clockMin, salt = "") {
    return makeRng(hashSeed(`${agent.id}|${Math.round(clockMin)}|${salt}`));
  }

  /**
   * Frasa aktivitas untuk gelembung status di peta.
   * @param {Object} agent
   * @param {Object} task
   */
  static actionPhrase(agent, task, stationLabel = null, opts = {}) {
    // seed STABIL per (agen, urusan): frasa tidak berubah tiap menit,
    // supaya sistem persepsi bisa mengenali "aktivitas yang sama".
    const rnd = makeRng(hashSeed(`${agent.id}|${task?.id || "idle"}|act`));
    const verb = task?.verb || "berdiri";
    const label = task?.label ? task.label.charAt(0).toLowerCase() + task.label.slice(1) : "";

    // Tanpa label, kata kerja telanjang ("menyiapkan") butuh titik aktivitas
    // supaya tetap terbaca: "sedang menyiapkan di Rak Senter & Payung".
    if (!label) {
      const base = pick([`sedang ${verb}`, `tengah ${verb}`, verb], rnd);
      return stationLabel ? `${base} di ${stationLabel}` : base;
    }

    // Label urusan sudah memuat objeknya ("mencuci piring", "ronda malam
    // keliling wisma") — titik aktivitas tidak ditempel lagi supaya tidak
    // muncul frasa janggal seperti "meronda di Rak Senter & Payung".
    //
    // Kalau urusan itu sebenarnya berlangsung di ruangan lain (ia masih di
    // ruang persiapan, mis. mengambil senter di pos), katakan "bersiap"
    // supaya tidak terdengar seperti ia meronda di dalam pos.
    if (opts.preparing) {
      return pick([`bersiap ${label}`, `sedang bersiap ${label}`, `tengah bersiap ${label}`], rnd);
    }
    return pick([`sedang ${label}`, `tengah ${label}`, label], rnd);
  }

  /**
   * Pikiran batin (offline).
   * @param {Object} agent - {id,name,traits,needs,mood,room,phase}
   */
  static thought(agent) {
    const rnd = SimVoice._rngFor(agent, agent.clock || 0, "think");
    const traits = agent.traits?.length ? agent.traits : ["neutral"];

    // kondisi fisik mempengaruhi isi kepala
    if (agent.needs?.energy < 25 && rnd() < 0.4) {
      return pick(
        [
          "Mata saya berat sekali. Sebentar lagi saya harus duduk.",
          "Sudah lewat tengah malam, tubuh ini tidak muda lagi.",
          "Kalau bisa, saya ingin tidur di kamar sendiri sekarang.",
        ],
        rnd
      );
    }
    if (agent.needs?.hunger > 80 && rnd() < 0.3) {
      return pick(
        ["Perut saya berbunyi sejak tadi. Sisa nasi masih ada di dapur?", "Aroma kopi dari dapur membuat saya gelisah."],
        rnd
      );
    }
    if ((agent.mood?.stress || 0) > 75 && rnd() < 0.45) {
      return pick(
        [
          "Dada saya sesak. Jangan sampai orang lain melihat.",
          "Tenang... tenang... jangan lakukan kesalahan malam ini.",
          "Kalau begini terus, saya bisa pingsan di koridor.",
        ],
        rnd
      );
    }

    // fase dunia
    if (agent.phase === "crisis" && rnd() < 0.5) {
      return pick(
        [
          "Polisi di mana-mana. Apa yang harus saya katakan?",
          "Saya tidak boleh menjadi orang pertama yang dicurigai.",
          "Semua orang di rumah ini punya alasan untuk takut.",
        ],
        rnd
      );
    }

    const trait = rnd() < 0.65 ? pick(traits, rnd) : "neutral";
    const bank = THOUGHTS[trait] || THOUGHTS.neutral;
    return pick(bank, rnd);
  }

  /**
   * Satu baris ucapan (offline).
   * @param {Object} agent
   * @param {string} chatterType - 'work'|'gossip'|'argue'|...
   * @param {Object} [ctx] - {otherName, roomName, phase}
   */
  static line(agent, chatterType = "work", ctx = {}) {
    const rnd = SimVoice._rngFor(agent, agent.clock || 0, `say:${chatterType}:${ctx.seed ?? ""}`);
    const bank = LINES[chatterType] || LINES.work;
    let text = pick(bank, rnd);

    // bumbu kepribadian
    const traits = agent.traits || ["neutral"];
    if (traits.includes("nervous") && rnd() < 0.3) text = `${text} ...m-maaf, saya gugup.`;
    if (traits.includes("firm") && rnd() < 0.25) text = `${text} Jangan dibantah.`;
    if (traits.includes("polite") && rnd() < 0.3) text = `Permisi, ${text}`;
    if (traits.includes("rough") && rnd() < 0.25) text = `${text} Paham?`;
    if (traits.includes("quiet") && rnd() < 0.35) text = text.split(/[.!]/)[0].trim() + ".";

    if (ctx.otherName && rnd() < 0.2) text = `${ctx.otherName}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    return SimVoice.tidy(text);
  }

  /** Rapikan tanda baca hasil penggabungan bank kalimat + bumbu kepribadian. */
  static tidy(text) {
    let t = String(text || "").trim();
    t = t.replace(/\s+([,.!?;:])/g, "$1");          // spasi sebelum tanda baca
    t = t.replace(/([?!])\.{2,}\s*/g, "$1 ... ");   // "?..." → "? ..."
    t = t.replace(/([?!])\.(?!\.)/g, "$1");          // "?." → "?"
    t = t.replace(/\.{2,}/g, (m) => (m.length >= 3 ? "..." : "."));
    t = t.replace(/\.{3}(?=\S)/g, "... ");           // "...m" → "... m"
    t = t.replace(/\s{2,}/g, " ");
    t = t.trim();
    if (!/[.!?…"]$/.test(t)) t += ".";
    return t;
  }

  /**
   * Percakapan dua orang (offline), 4-6 baris bergantian.
   * @returns {Array<{who:string,text:string}>}
   */
  static conversation(a, b, ctx = {}) {
    const rnd = SimVoice._rngFor(a, a.clock || 0, `conv:${b.id}`);
    const type = ctx.chatter || "casual";
    const count = 4 + Math.floor(rnd() * 3);
    const lines = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const speaker = i % 2 === 0 ? a : b;
      const t = i % 2 === 0 ? type : rnd() < 0.5 ? type : "casual";
      let text = SimVoice.line(speaker, t, {
        otherName: (i % 2 === 0 ? b : a).name,
        roomName: ctx.roomName,
        seed: i,
      });
      // arah panggung "(...)" tidak enak dibaca sebagai ucapan → ganti
      if (text.trim().startsWith("(")) {
        text = SimVoice.line(speaker, "casual", { otherName: (i % 2 === 0 ? b : a).name }, { seed: `casual${i}` });
      }
      // jangan mengulang kalimat yang sama dalam satu percakapan
      let guard = 0;
      while (used.has(text) && guard++ < 4) {
        text = SimVoice.line(speaker, guard % 2 ? "casual" : t, {
          otherName: (i % 2 === 0 ? b : a).name,
          seed: `${i}:${guard}`,
        });
      }
      used.add(text);
      lines.push({ who: speaker.id, text });
    }
    return lines;
  }

  /** Fakta "dengar-dengar" yang bisa dipakai detektif (offline). */
  static overheardFact(a, b, ctx = {}) {
    const rnd = SimVoice._rngFor(a, a.clock || 0, `fact:${b.id}`);
    const time = ctx.timeLabel || "malam itu";
    const room = ctx.roomName || "ruang itu";
    const bank = [
      `${a.name} menyebut ada orang naik ke lantai dua sekitar ${time}.`,
      `${b.name} berkata pintu taman belakang tidak dikunci sejak sore.`,
      `Terdengar nama seseorang disebut pelan di ${room}, tapi tidak jelas.`,
      `${a.name} mengeluh dipanggil mendadak ke ${room} pukul ${time}.`,
      `${b.name} mengaku melihat mobil berhenti lama di dekat gerbang.`,
      `${a.name} menyebut ada berkas yang hilang dari lemari arsip.`,
      `${b.name} berbisik soal telepon yang tidak dicatat di buku lobi.`,
      `${a.name} mengatakan lampu lantai dua padam sebentar pukul ${time}.`,
    ];
    return pick(bank, rnd);
  }

  /** Refleksi offline: penafsiran atas ingatan sendiri. */
  static reflection(agent) {
    const rnd = SimVoice._rngFor(agent, agent.clock || 0, "reflect");
    const mem = agent.recentMemory || [];
    const base = pick(
      [
        "Semakin lama malam ini, semakin banyak yang tidak masuk akal.",
        "Aku yakin aku bukan satu-satunya yang melihat sesuatu.",
        "Kalau aku ditanya polisi, aku harus bicara apa adanya.",
        "Ada yang bergerak di rumah ini selain para pelayan.",
        "Aku mulai tidak percaya pada orang-orang di sekitarku.",
      ],
      rnd
    );
    if (mem.length > 0 && rnd() < 0.5) {
      return `${base} (Ingatan: ${mem[0].text})`;
    }
    return base;
  }

  /** Catatan dunia (offline). */
  static worldNote(phase) {
    const rnd = makeRng(hashSeed(`world|${phase}|${Math.floor(Date.now() / 60000)}`));
    return pick(WORLD_NOTES[phase] || WORLD_NOTES.normal, rnd);
  }

  /**
   * Reaksi terhadap insiden dunia (broadcast ke semua orang).
   * @returns {string}
   */
  static incidentReaction(agent, incident) {
    const rnd = SimVoice._rngFor(agent, agent.clock || 0, `inc:${incident.id}`);
    const stress = agent.mood?.stress || 40;
    const bank =
      stress > 70
        ? ["Apa itu tadi?!", "Saya tidak mau tahu urusan itu.", "Tolong jangan tinggalkan saya sendiri.", "Ya Tuhan..."]
        : stress > 45
        ? ["Ada apa di atas?", "Saya dengar sesuatu...", "Sebaiknya saya periksa.", "Aneh sekali malam ini."]
        : ["Mungkin cuma angin.", "Rumah tua memang berisik.", "Biar saja, bukan urusan saya.", "Hmm."];
    return pick(bank, rnd);
  }
}
