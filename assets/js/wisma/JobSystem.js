/**
 * ============================================================
 *  JOBSYSTEM.JS — Jabatan, Tugas, Jadwal & Hasil Kerja
 * ------------------------------------------------------------
 *  "Tiap karakter melakukan pekerjaannya masing-masing" diwujudkan
 *  di sini. Setiap orang punya:
 *    • jabatan (title, employer, duties, pressure, pride)
 *    • daftar tugas (label, kata kerja, titik aktivitas, durasi, tag)
 *    • jadwal harian (HH:MM → tugas)
 *    • perilaku bebas saat jadwal kosong (didorong kebutuhan)
 *    • artefak: hasil kerja nyata yang bisa disita detektif
 *
 *  Contoh: Tio mencatat log gerbang  ⇒ artefak "Log Keamanan Gerbang"
 *          Rina mengetik surat       ⇒ artefak "Tembusan Surat Ketikan"
 *          Marni menguping di pintu  ⇒ artefak "Kesaksian Marni"
 * ============================================================
 */

export class JobSystem {
  /**
   * @param {Object} wismaData - isi wisma.json
   * @param {Object} floorPlan  - instance FloorPlan (untuk tahu ruangan tempat aktivitas)
   */
  constructor(wismaData, floorPlan) {
    this.data = wismaData;
    this.floor = floorPlan;
    /** @type {Map<string,Object>} */
    this.jobs = new Map(Object.entries(wismaData.jobs || {}));
    /** @type {Map<string,Object>} */
    this.tasks = new Map();
    for (const [agentId, job] of this.jobs) {
      for (const t of job.tasks || []) {
        this.tasks.set(t.id, { ...t, owner: agentId, room: this._roomOfTask(t) });
      }
    }
    /** Jadwal ternormalisasi: agentId -> [{min, entry}] */
    this.schedules = new Map();
    const startMin = JobSystem.parseTime(wismaData.meta?.start_time || "17:00");
    for (const [agentId, job] of this.jobs) {
      const list = (job.schedule || [])
        .map((e) => ({ min: JobSystem.parseTime(e.at, startMin), entry: e }))
        .sort((a, b) => a.min - b.min);
      this.schedules.set(agentId, list);
    }
  }

  /** Ruangan tempat tugas dikerjakan (dari titik aktivitas, atau override). */
  _roomOfTask(t) {
    if (t.room) return t.room;
    const st = this.floor?.station(t.station);
    return st ? st.room : null;
  }

  /**
   * "HH:MM" → menit sejak tengah malam.
   * Jam sebelum 06:00 dianggap hari berikutnya (+1440).
   */
  static parseTime(str, startMin = null) {
    if (typeof str === "number") return str;
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(String(str || "").trim());
    if (!m) return startMin || 0;
    let mins = Number(m[1]) * 60 + Number(m[2]);
    if (Number(m[1]) < 6) mins += 1440;
    return mins;
  }

  /** menit → "HH:MM" (mendukung > 24 jam). */
  static formatTime(mins) {
    const m = ((Math.round(mins) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  jobFor(agentId) {
    return this.jobs.get(agentId) || null;
  }

  task(id) {
    return this.tasks.get(id) || null;
  }

  tasksOf(agentId) {
    return this.jobs.get(agentId)?.tasks || [];
  }

  /**
   * Entri jadwal yang sedang berlaku pada menit tertentu.
   * @returns {{entry:Object,min:number}|null}
   */
  activeSchedule(agentId, clockMin) {
    const list = this.schedules.get(agentId) || [];
    let current = null;
    for (const item of list) {
      if (item.min <= clockMin) current = item;
      else break;
    }
    return current;
  }

  /** Entri jadwal berikutnya (untuk "tujuan selanjutnya" di UI/AI). */
  nextSchedule(agentId, clockMin) {
    const list = this.schedules.get(agentId) || [];
    return list.find((i) => i.min > clockMin) || null;
  }

  /**
   * Tugas yang harus dikerjakan sekarang.
   * Mengembalikan null kalau entri jadwalnya `leave` (orangnya pergi)
   * atau `free` (pakai perilaku bebas).
   * @returns {{task:Object|null, kind:'task'|'free'|'leave'|'idle', freeType?:string, until:number}}
   */
  resolveNow(agentId, clockMin) {
    const current = this.activeSchedule(agentId, clockMin);
    const next = this.nextSchedule(agentId, clockMin);
    const until = next ? next.min : clockMin + 60;

    if (!current) return { task: null, kind: "idle", until };

    const entry = current.entry;
    if (entry.leave) return { task: null, kind: "leave", until };
    if (entry.task) {
      const t = this.task(entry.task);
      if (t) return { task: t, kind: "task", until };
    }
    return { task: null, kind: "free", freeType: entry.free || "wander", until };
  }

  /**
   * Perilaku bebas berdasarkan kebutuhan (saat tidak ada jadwal tugas).
   * @param {string} agentId
   * @param {{energy:number,hunger:number,social:number,stress:number}} needs
   * @param {Function} [rnd]
   * @returns {Object} tugas sintetis
   */
  pickFreeTask(agentId, needs = {}, rnd = Math.random) {
    const custom = this.data.free_behaviors?.[agentId];
    const defaults = this.data.free_behaviors?.default || [];
    const pool = [...(custom || []), ...defaults];
    if (pool.length === 0) {
      return JobSystem.syntheticTask("idle", "Melamun", "melamun", null, 15);
    }

    // Dorongan kebutuhan memilih kategori
    let want = null;
    if ((needs.energy || 50) < 32) want = "rest";
    else if ((needs.hunger || 50) > 72) want = "eat";
    else if ((needs.social || 50) < 30) want = "social";
    else if ((needs.stress || 0) > 75) want = "smoke";

    let candidates = want ? pool.filter((p) => p.task === want || p.need === want) : [];
    if (candidates.length === 0) candidates = pool;

    // 35% peluang mengerjakan tugas jabatannya sendiri (orang rajin tetap rajin)
    const ownTasks = this.tasksOf(agentId);
    if (ownTasks.length > 0 && rnd() < 0.35) {
      const t = ownTasks[Math.floor(rnd() * ownTasks.length)];
      const full = this.task(t.id);
      if (full) return full;
    }

    const pick = candidates[Math.floor(rnd() * candidates.length)];
    if (pick.task && this.task(pick.task)) {
      const real = this.task(pick.task);
      return { ...real, duration_min: pick.duration || real.duration_min };
    }
    return JobSystem.syntheticTask(
      pick.task || "wander",
      pick.label || "Berkeliaran",
      pick.verb || "berjalan",
      pick.station || null,
      pick.duration || 15,
      pick.room || null
    );
  }

  /** Tugas sintetis (dibuat dari perilaku bebas). */
  static syntheticTask(id, label, verb, station, duration, room = null) {
    return {
      id: `free_${id}`,
      label,
      verb,
      station,
      duration_min: duration,
      tags: ["bebas"],
      chatter: "casual",
      synthetic: true,
      room: room || null,
    };
  }

  /** Ruangan tujuan sebuah tugas (titik aktivitas → ruangan, atau ruangan tugas). */
  roomFor(task) {
    if (!task) return null;
    if (task.room) return task.room;
    const st = task.station ? this.floor?.station(task.station) : null;
    return st ? st.room : null;
  }

  /** Apakah tugas ini butuh rekan tertentu (mis. rapat dua orang)? */
  requiresPartner(task) {
    return task?.with || null;
  }

  /** Artefak yang dihasilkan sebuah tugas (kalau ada). */
  artifactFor(taskId) {
    return this.task(taskId)?.artifact || null;
  }
}
