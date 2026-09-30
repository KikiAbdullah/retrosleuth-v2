/**
 * ============================================================
 *  WISMAWORLD.JS — Dunia simulasi "Wisma Angker"
 * ------------------------------------------------------------
 *  Rumah besar ini HIDUP: sepuluh penghuni (8 karakter kasus +
 *  satpam Tio + Haryanto sendiri) menjalani malam 14 Juni 1979
 *  sesuai peran masing-masing di rumah itu. Mereka berjalan, bekerja, saling
 *  melihat, mengobrol, bergosip, takut, dan meninggalkan barang.
 *
 *  Prinsip desain:
 *   1. SIMULASI LOKAL adalah tulang punggung (0 request AI).
 *      Jadwal, kebutuhan, persepsi, gerak, dan percakapan dihitung
 *      di sini setiap tick.
 *   2. AI adalah "sutradara" yang memperkaya: satu panggilan
 *      batch memberi pikiran + ucapan + koreksi emosi untuk SEMUA
 *      penghuni sekaligus (hemat kuota free tier).
 *   3. PENGETAHUAN PARSIAL: karakter hanya tahu apa yang mereka
 *      lihat/dengar. Tidak ada yang mahatahu — termasuk AI.
 *   4. ANTI-SPOILER: data `truths`/`secrets` tidak pernah dipakai
 *      di sini, dan ruang kerja blackout saat kejadian.
 *
 *  Unit waktu: menit simulasi sejak tengah malam. Malam berjalan
 *  17:00 (1020) → 02:30 (1590).
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { FloorPlan } from "./FloorPlan.js";
import { JobSystem } from "./JobSystem.js";
import { MemoryStream } from "./MemoryStream.js";
import { RelationshipGraph } from "./Relationships.js";
import { ArtifactForge } from "./ArtifactForge.js";
import { SimVoice } from "./SimVoice.js";

const SAVE_PREFIX = "retrosleuth_wisma_";
const LOG_MAX = 400;

/** Bobot kepentingan ingatan per jenis obrolan/aktivitas. */
const IMPORTANCE = {
  sneak: 82,
  secret: 80,
  argue: 78,
  threat: 75,
  plead: 70,
  cry: 68,
  tense: 62,
  gossip: 52,
  rehearse: 34,
  patrol: 40,
  service: 30,
  formal: 42,
  polite: 26,
  casual: 30,
  anxious: 45,
  silent: 55,
  work: 24,
  supervise: 30,
  cold: 48,
};

export class WismaWorld {
  /**
   * @param {Object} deps
   * @param {Object} deps.data            - isi wisma.json
   * @param {Array}  deps.characters      - karakter kasus (dari CaseLoader)
   * @param {Object} deps.director        - WismaDirector (boleh null → murni offline)
   * @param {Object} [deps.evidenceEngine]
   * @param {Object} [deps.notificationSystem]
   * @param {Object} [deps.config]
   */
  constructor({ data, characters = [], director = null, evidenceEngine = null, notificationSystem = null, config = {} }) {
    this.data = data;
    this.meta = data.meta || {};
    this.sim = data.simulation || {};

    this.floor = new FloorPlan(data);
    this.jobs = new JobSystem(data, this.floor);
    this.relations = new RelationshipGraph(data.relationships || []);
    this.forge = new ArtifactForge({
      template: data.artifact_template,
      evidenceEngine,
      notificationSystem,
    });
    this.director = director;
    this.notify = notificationSystem;

    /** @type {Map<string,Object>} */
    this.agents = new Map();
    this._buildAgents(characters);

    // --- waktu ---
    this.startMin = JobSystem.parseTime(this.meta.start_time || "17:00");
    this.endMin = JobSystem.parseTime(this.meta.end_time || "02:30", this.startMin);
    this.clock = this.startMin;

    // --- kontrol ---
    this.running = false;
    this.speed = 1;
    this.tickMs = config.tickMs || this.meta.tick_ms || 500;
    this.minutesPerTick = config.minutesPerTick || this.meta.minutes_per_tick || 1;
    this._timer = null;
    this._lastTickAt = 0;

    // --- status dunia ---
    this.phase = "normal";
    this.phaseLabel = "NORMAL";
    this.gatherRoom = null;
    this.executedIncidents = new Set();
    this.incidents = (data.incidents || [])
      .map((i) => ({ ...i, min: JobSystem.parseTime(i.at, this.startMin) }))
      .sort((a, b) => a.min - b.min);

    /** @type {Array<Object>} log CCTV */
    this.log = [];
    this._logSeq = 0;

    // --- cooldown & penjadwalan internal ---
    this.convCooldown = new Map(); // "a|b" -> clock
    this.observeCooldown = new Map(); // agentId -> Map(otherId -> {clock, key})
    this.lastDirectorAt = this.clock;
    this.reflectCooldown = new Map();
    this.pendingDirector = null; // promise yang sedang berjalan

    this.stats = {
      ticks: 0,
      aiCalls: 0,
      simCalls: 0,
      conversations: 0,
      artifacts: 0,
      startedAt: Date.now(),
    };

    this.config = {
      perceptionAdjacent: this.sim.perception?.adjacent ?? 0.35,
      conversationCooldown: this.sim.conversation?.cooldown_min ?? 12,
      minSocialForTalk: this.sim.conversation?.min_social ?? 45,
      speedTilesPerMin: this.sim.movement?.speed_tiles_per_min ?? 18,
      reflectEveryMin: this.sim.memory?.reflect_every_min ?? 90,
      memoryMax: this.sim.memory?.max_per_agent ?? 90,
      autoSaveEveryTicks: 120,
    };

    this._seedInitialMemories();
    this._log("system", "Sistem pemantau Wisma Angker aktif. Semua kanal beroperasi.", null, { silent: true });
  }

  // ============================================================
  //  PEMBANGUNAN AGEN
  // ============================================================

  _buildAgents(characters) {
    const cfg = this.data.agents || {};
    const npcDefs = this.data.npcs || [];

    // 1) Karakter dari kasus (hanya field PUBLIK — anti spoiler)
    for (const ch of characters) {
      if (!ch?.id) continue;
      this.agents.set(ch.id, this._makeAgent({
        id: ch.id,
        name: ch.name,
        age: ch.age,
        role: ch.role,
        occupation: ch.occupation,
        personality: ch.personality,
        voiceStyle: ch.voice_style,
        publicBackground: ch.public_background,
        emotional: ch.emotional_state,
        playable: true,
        npc: false,
        setup: cfg[ch.id] || {},
      }));
    }

    // 2) NPC dari wisma.json
    for (const n of npcDefs) {
      if (this.agents.has(n.id)) continue;
      this.agents.set(n.id, this._makeAgent({
        id: n.id,
        name: n.name,
        age: n.age,
        role: n.role,
        occupation: n.occupation,
        personality: n.personality,
        voiceStyle: n.voice_style,
        publicBackground: n.public_background || "",
        emotional: n.initial,
        playable: false,
        npc: true,
        setup: cfg[n.id] || {},
        diesAt: n.dies_at ? JobSystem.parseTime(n.dies_at, this.startMin) : null,
      }));
    }
  }

  _makeAgent(spec) {
    const setup = spec.setup || {};
    const job = this.jobs.jobFor(spec.id);
    const traits = SimVoice.traitsOf({
      personality: spec.personality,
      voice_style: spec.voiceStyle,
      role: spec.role,
    });
    const homeRoom = setup.home_room || job?.tasks?.[0]?.room || "koridor_bawah";
    const home = this.floor.room(homeRoom) ? homeRoom : "koridor_bawah";
    const point = this.floor.randomPoint(home);

    const emotional = spec.emotional || {};
    const initial = setup.initial || {};

    return {
      id: spec.id,
      name: spec.name,
      age: spec.age || null,
      role: spec.role || "",
      occupation: spec.occupation || "",
      job: job?.title || spec.occupation || "penghuni",
      jobData: job,
      personalityRaw: spec.personality || "",
      traits,
      voiceStyle: spec.voiceStyle || "",
      publicBackground: spec.publicBackground || "",
      npc: !!spec.npc,
      playable: spec.playable !== false,
      diesAt: spec.diesAt ?? null,

      // --- posisi & gerak ---
      room: home,
      homeRoom: home,
      pos: { x: point.x, y: point.y },
      prevPos: { x: point.x, y: point.y },
      waypoints: [],
      wpIndex: 0,
      targetStation: null,

      // --- keadaan ---
      present: false, // belum tiba di wisma
      left: false,
      deceased: false,
      arriveAt: setup.arrive_at ? JobSystem.parseTime(setup.arrive_at, this.startMin) : this.startMin,
      state: "idle", // idle|moving|working|talking|resting|leaving|deceased|left
      task: null,
      taskProgress: 0,
      taskStartedAt: null,
      idleUntil: 0,
      talkingUntil: 0,
      activityOverride: null,
      overrideUntil: 0,
      aiDestination: null,

      // --- kebutuhan & suasana hati ---
      needs: {
        energy: initial.energy ?? this.sim.needs?.energy?.start ?? 75,
        hunger: initial.hunger ?? this.sim.needs?.hunger?.start ?? 55,
        social: initial.social ?? this.sim.needs?.social?.start ?? 50,
      },
      mood: {
        stress: initial.stress ?? emotional.stress ?? this.sim.mood?.stress_start ?? 35,
        fear: emotional.fear ?? 20,
        anger: emotional.anger ?? 10,
        trust: emotional.trust ?? 30,
      },

      // --- pikiran ---
      memory: new MemoryStream(spec.id, { max: this.config?.memoryMax || 60 }),
      thought: "",
      speech: "",
      speechTo: null,
      bubble: null, // {text, until, kind}
      suspicion: new Map(), // id -> skor
      intent: "",
      lastConversationAt: 0,
      tasksCompleted: 0,
      observedBy: new Set(),
    };
  }

  /** Ingatan awal: semua orang "tahu" situasi dasar rumah malam itu. */
  _seedInitialMemories() {
    for (const a of this.agents.values()) {
      a.memory.add({
        text: `${a.name} mulai menjalani malamnya di ${this.floor.roomName(a.homeRoom)}.`,
        type: "self",
        importance: 25,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: a.homeRoom,
      });
    }
  }

  // ============================================================
  //  KONTROL WAKTU
  // ============================================================

  start() {
    if (this.running) return;
    if (this.clock >= this.endMin) {
      this._log("system", "Malam sudah berakhir. Muat ulang untuk memulai lagi.", null);
      return;
    }
    this.running = true;
    this._lastTickAt = performance?.now?.() || Date.now();
    this._timer = setInterval(() => this.tick(), this.tickMs);
    EventBus.emit("wisma:state", { running: true, clock: this.clock });
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this.save();
    EventBus.emit("wisma:state", { running: false, clock: this.clock });
  }

  toggle() {
    if (this.running) this.pause();
    else this.start();
    return this.running;
  }

  setSpeed(mult) {
    this.speed = Math.max(0.25, Math.min(8, mult));
    EventBus.emit("wisma:speed", { speed: this.speed });
  }

  /** Lompat waktu (dipakai tombol "lompat ke 22:00" & pengujian). */
  seekTo(minutes) {
    const target = Math.min(this.endMin, Math.max(this.startMin, minutes));
    let guard = 0;
    while (this.clock < target && guard++ < 4000) {
      this.advance(Math.min(this.minutesPerTick, target - this.clock), { quiet: true });
    }
    EventBus.emit("wisma:seek", { clock: this.clock });
  }

  reset(reloadFromSave = false) {
    this.pause();
    this.clock = this.startMin;
    this.phase = "normal";
    this.phaseLabel = "NORMAL";
    this.gatherRoom = null;
    this.executedIncidents.clear();
    this.log = [];
    this._logSeq = 0;
    this.convCooldown.clear();
    this.observeCooldown.clear();
    this.reflectCooldown.clear();
    this._logCooldowns?.clear();
    this.lastDirectorAt = this.clock;
    this.forge.items.clear();
    for (const r of this.floor.rooms.values()) this.floor.clearBlackout(r.id);

    const characters = [...this.agents.values()].map((a) => ({
      id: a.id, name: a.name, age: a.age, role: a.role, occupation: a.occupation,
      personality: a.personalityRaw, voice_style: a.voiceStyle,
      public_background: a.publicBackground, emotional_state: a.mood,
    }));
    const setups = this.data.agents || {};
    const npcs = new Map((this.data.npcs || []).map((n) => [n.id, n]));

    this.agents.clear();
    for (const c of characters) {
      const npc = npcs.get(c.id);
      this.agents.set(c.id, this._makeAgent({
        ...c,
        personality: npc?.personality || c.personality,
        npc: !!npc,
        playable: !npc,
        setup: setups[c.id] || {},
        diesAt: npc?.dies_at ? JobSystem.parseTime(npc.dies_at, this.startMin) : null,
      }));
    }
    this._seedInitialMemories();
    this._log("system", "Simulasi diulang dari pukul 17.00.", null);
    try {
      localStorage.removeItem(SAVE_PREFIX + (GameState.currentCaseId || "default"));
    } catch { /* ignore */ }
    EventBus.emit("wisma:reset", {});
  }

  /** Satu tick realtime. */
  tick() {
    const minutes = this.minutesPerTick * this.speed;
    this.advance(minutes);
    this._lastTickAt = performance?.now?.() || Date.now();
    this.stats.ticks++;
    if (this.stats.ticks % this.config.autoSaveEveryTicks === 0) this.save();
    if (this.clock >= this.endMin) {
      this._log("system", "Pukul 02.30 — shift malam berakhir. Polisi mengambil alih wisma.", null);
      this.pause();
    }
    EventBus.emit("wisma:tick", { clock: this.clock, timeLabel: WismaWorld.timeLabel(this.clock), phase: this.phase });
  }

  /**
   * Majukan simulasi sejumlah menit (inti dari semua logika).
   * @param {number} minutes
   * @param {Object} [opts]
   */
  advance(minutes, opts = {}) {
    if (minutes <= 0) return;
    const sub = Math.max(1, Math.ceil(minutes / 0.5));
    const step = minutes / sub;

    for (let i = 0; i < sub; i++) {
      this.clock += step;
      this.floor.tickBlackout(this.clock);
      this._applyIncidents();

      for (const a of this.agents.values()) {
        a.clock = this.clock; // seed dialog & frasa aktivitas
        this._updateAgent(a, step);
      }

      this._conversationPass();
      this._decayBubbles(step);
    }

    if (!opts.quiet) {
      this._maybeDirector();
      this._maybeReflections();
    }
  }

  // ============================================================
  //  SIKLUS HIDUP SATU AGEN
  // ============================================================

  _updateAgent(a, step) {
    // simpan posisi sebelumnya untuk interpolasi rendering
    a.prevPos = { x: a.pos.x, y: a.pos.y };

    // 1) belum tiba / sudah pergi / meninggal
    if (a.deceased) {
      a.state = "deceased";
      return;
    }
    if (a.diesAt !== null && this.clock >= a.diesAt && !a.deceased) {
      a.deceased = true;
      a.state = "deceased";
      a.task = null;
      a.waypoints = [];
      if (this.floor.isVisible(a.room)) {
        this._log("incident", `${a.name} tidak lagi bergerak.`, a.room, { agents: [a.id], importance: 100 });
      }
      EventBus.emit("wisma:agent-died", { id: a.id });
      return;
    }
    if (!a.present) {
      if (this.clock >= a.arriveAt) this._arrive(a);
      else return;
    }
    if (a.left) return;

    // 2) kebutuhan tubuh
    const decay = this.sim.needs_decay || { energy: 0.35, hunger: 0.45, social: 0.55 };
    a.needs.energy = clamp(a.needs.energy - (decay.energy || 0.3) * step * (a.state === "resting" ? -1.6 : 1), 0, 100);
    a.needs.hunger = clamp(a.needs.hunger + (decay.hunger || 0.4) * step * (this._isEating(a) ? -3 : 1), 0, 100);
    a.needs.social = clamp(a.needs.social + (decay.social || 0.5) * step * (a.state === "talking" ? -2.5 : 1), 0, 100);

    // stres mereda pelan; orang dengan tekanan kerja tinggi lebih lambat tenang
    const baseline = (a.jobData?.pressure ?? 40) * 0.35;
    const decayRate = a.mood.stress > baseline ? 0.45 : -0.15;
    a.mood.stress = clamp(a.mood.stress - decayRate * step, 0, 100);

    // 3) sedang bicara → urusan tertunda
    if (this.clock < a.talkingUntil) {
      a.state = "talking";
      this._moveAlong(a, step);
      return;
    }

    // 4) pindah ruangan karena AI / kumpul darurat
    if (a.aiDestination && a.room !== a.aiDestination) {
      this._setDestination(a, a.aiDestination, null, { allowWindow: false });
    }

    // 5) sedang berjalan
    if (a.waypoints.length > 0 && a.wpIndex < a.waypoints.length) {
      a.state = "moving";
      const arrived = this._moveAlong(a, step);
      if (arrived) {
        a.aiDestination = null;
        a.waypoints = [];
        a.state = "idle";
        this._onArrivedRoom(a);
      }
      this._perceive(a);
      return;
    }

    // 6) pilih / lanjutkan urusan rumah
    this._assignWork(a);

    if (a.task) {
      const isRest = (a.task.tags || []).includes("istirahat") || a.task.id.startsWith("free_rest");
      a.state = isRest ? "resting" : "working";
      a.taskProgress += step;
      this._workChatter(a, step);
      if (a.taskProgress >= (a.task.duration_min || 15)) this._completeTask(a);
    } else {
      a.state = this.clock < a.idleUntil ? "resting" : "idle";
    }

    this._perceive(a);
  }

  _isEating(a) {
    return !!a.task && (a.task.tags || []).includes("konsumsi") && /makan|minum|kopi|teh/i.test(a.task.label || "");
  }

  _arrive(a) {
    a.present = true;
    a.left = false;
    const arrivalRoom = this.floor.room(a.homeRoom) ? a.homeRoom : "halaman_depan";
    // orang yang datang dari luar muncul di halaman dulu, lalu masuk
    const fromOutside = arrivalRoom === "halaman_depan" || a.arriveAt > this.startMin + 30;
    const startRoom = fromOutside ? "halaman_depan" : arrivalRoom;
    a.room = startRoom;
    const p = this.floor.randomPoint(startRoom);
    a.pos = { x: p.x, y: p.y };
    a.prevPos = { ...a.pos };
    this._log("move", `${a.name} tiba di wisma (${this.floor.roomName(startRoom)}).`, startRoom, {
      agents: [a.id],
      importance: 55,
    });
    a.memory.add({
      text: `Saya tiba di ${this.floor.roomName(startRoom)}.`,
      type: "self",
      importance: 40,
      clock: this.clock,
      timeLabel: WismaWorld.timeLabel(this.clock),
      room: startRoom,
    });
    EventBus.emit("wisma:agent-arrived", { id: a.id, room: startRoom });
  }

  /** Selesaikan urusan & tentukan kegiatan berikutnya. */
  _assignWork(a) {
    // jeda antar urusan (biar tidak robotik)
    if (!a.task && this.clock < a.idleUntil) return;

    // perintah berkumpul darurat mengalahkan jadwal
    if (this.gatherRoom && a.room !== this.gatherRoom && !a.deceased) {
      this._setDestination(a, this.gatherRoom, null, {});
      a.task = null;
      return;
    }

    const res = this.jobs.resolveNow(a.id, this.clock);

    if (res.kind === "leave") {
      this._leave(a);
      return;
    }

    let task = res.task;
    if (res.kind === "free" || res.kind === "idle" || !task) {
      task = this.jobs.pickFreeTask(a.id, {
        energy: a.needs.energy,
        hunger: a.needs.hunger,
        social: a.needs.social,
        stress: a.mood.stress,
      });
    }

    const sameAsCurrent = a.task && a.task.id === task.id && a.taskProgress < (a.task.duration_min || 15);
    if (sameAsCurrent) return;

    // urusan lama hampir rampung? selesaikan dulu supaya hasilnya tidak hilang
    if (a.task && a.task.id !== task.id) {
      const dur = a.task.duration_min || 15;
      if (a.taskProgress >= dur * 0.7) this._completeTask(a);
      else {
        a.task = null;
        a.taskProgress = 0;
      }
    }

    // ganti urusan
    if (a.task?.id !== task.id) {
      a.task = task;
      a.taskProgress = 0;
      a.taskStartedAt = this.clock;
      a.chatterType = task.chatter || "work";
      const targetRoom = this.jobs.roomFor(task) || a.room;
      const announce = !task.id.startsWith("free_") && !task.synthetic;
      if (targetRoom !== a.room) {
        this._setDestination(a, targetRoom, task.station, { allowWindow: !!task.allow_window });
        // diumumkan nanti saat benar-benar tiba di lokasinya
        a.pendingStartLog = announce ? task.label : null;
      } else {
        if (task.station) {
          const pt = this.floor.stationPoint(task.station, targetRoom);
          a.waypoints = [{ x: pt.x, y: pt.y, room: targetRoom, station: task.station }];
          a.wpIndex = 0;
        }
        if (announce && this.floor.isVisible(a.room)) {
          this._log("work", `${a.name} mulai ${task.label.toLowerCase()}.`, a.room, { agents: [a.id] });
        }
        a.pendingStartLog = null;
      }
      this._remember(a, {
        text: `Saya ${task.label.toLowerCase()} di ${this.floor.roomName(targetRoom)}.`,
        type: "self",
        importance: 22,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: targetRoom,
        spoiler: !!task.spoiler,
        revealEvidence: task.reveal_evidence || [],
      });
    }
  }

  _completeTask(a) {
    const task = a.task;
    if (!task) return;
    a.tasksCompleted++;

    const roomId = a.room;
    const visible = this.floor.isVisible(roomId);

    // --- hasil kerja nyata: artefak ---
    if (task.artifact) {
      const art = this.forge.produce({
        def: task.artifact,
        agentId: a.id,
        agentName: a.name,
        agentJob: a.job,
        taskId: task.id,
        taskLabel: task.label,
        roomId,
        roomName: this.floor.roomName(roomId),
        timeLabel: WismaWorld.timeLabel(this.clock),
        phase: this.phase,
        // ANTI-SPOILER: barang fisik hanya memuat hal yang memang bisa
        // ditulis/diceritakan pemegangnya — ingatan berspoiler & privat dibuang.
        memories: a.memory
          .recent(12)
          .filter((m) => !m.spoiler && !m.private)
          .map((m) => ({
            timeLabel: m.timeLabel,
            clock: m.clock,
            text: m.text,
            room: m.room ? this.floor.roomName(m.room) : "",
          })),
      });
      if (art) {
        this.stats.artifacts++;
        if (visible) {
          this._log("artifact", `${a.name} meninggalkan sesuatu di ${this.floor.roomName(roomId)}.`, roomId, {
            agents: [a.id],
            importance: 70,
            artifactId: art.id,
          });
        }
      }
    }

    // --- reveal evidence karena diamati (mis. Tio mencatat, Marni menguping) ---
    if (task.reveal_evidence?.length && visible) {
      this._remember(a, {
        text: `Selama ${task.label.toLowerCase()}, saya mencatat hal yang mungkin penting.`,
        type: "self",
        importance: 60,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: roomId,
        spoiler: !!task.spoiler,
        revealEvidence: task.reveal_evidence,
      });
    }

    if (visible) {
      this._log("work", `${a.name} menyelesaikan: ${task.label.toLowerCase()}.`, roomId, { agents: [a.id] });
    }

    // kebutuhan terpenuhi sebagian
    if ((task.tags || []).includes("istirahat")) a.needs.energy = clamp(a.needs.energy + 18, 0, 100);
    if (this._isEating(a)) a.needs.hunger = clamp(a.needs.hunger - 45, 0, 100);
    if ((task.tags || []).includes("sosial")) a.needs.social = clamp(a.needs.social - 20, 0, 100);

    a.task = null;
    a.taskProgress = 0;
    a.idleUntil = this.clock + 1 + Math.random() * 3;
  }

  _leave(a) {
    if (a.left) return;
    if (a.room !== "halaman_depan" && a.room !== "jalan_samping") {
      this._setDestination(a, "halaman_depan", null, {});
      a.state = "leaving";
      return;
    }
    a.left = true;
    a.present = false;
    a.state = "left";
    a.task = null;
    a.waypoints = [];
    this._log("move", `${a.name} meninggalkan wisma.`, a.room, { agents: [a.id], importance: 60 });
    EventBus.emit("wisma:agent-left", { id: a.id });
  }

  // ============================================================
  //  GERAK
  // ============================================================

  _setDestination(a, roomId, station = null, opts = {}) {
    if (!this.floor.room(roomId)) return false;
    const target = station ? this.floor.stationPoint(station, roomId) : null;
    const wps = this.floor.buildWaypoints(
      { x: a.pos.x, y: a.pos.y, room: a.room },
      roomId,
      target,
      { allowWindow: !!opts.allowWindow }
    );
    if (wps.length <= 1 && a.room !== roomId) return false;
    a.waypoints = wps;
    a.wpIndex = 1; // titik 0 = posisi sekarang
    a.targetStation = station;
    a.state = "moving";
    return true;
  }

  /** Gerakkan sepanjang waypoint. Mengembalikan true kalau sudah sampai. */
  _moveAlong(a, step) {
    if (!a.waypoints.length || a.wpIndex >= a.waypoints.length) return true;
    // jarak yang bisa ditempuh dalam `step` menit simulasi (tile)
    const budgetDist = Math.max(0.05, this.config.speedTilesPerMin * step);
    let remaining = budgetDist;

    while (remaining > 0 && a.wpIndex < a.waypoints.length) {
      const next = a.waypoints[a.wpIndex];
      const dx = next.x - a.pos.x;
      const dy = next.y - a.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= remaining || dist < 0.001) {
        const prevRoom = a.room;
        a.pos = { x: next.x, y: next.y };
        a.room = next.room || a.room;
        remaining -= dist;
        a.wpIndex++;
        if (next.label && prevRoom !== a.room && this.floor.isVisible(a.room) && this._logCooldownOk(`mv|${a.id}`, 1)) {
          this._log("move", `${a.name} lewat ${next.label} → ${this.floor.roomName(a.room)}.`, a.room, {
            agents: [a.id],
            door: next.doorId,
            doorType: next.doorType,
            importance: next.doorType === "window" ? 88 : 28,
          });
        }
        if (next.doorType === "window") {
          this._log("move", `${a.name} MEMANJAT lewat ${next.label}.`, a.room, {
            agents: [a.id],
            importance: 88,
            doorType: "window",
          });
        }
      } else {
        a.pos = { x: a.pos.x + (dx / dist) * remaining, y: a.pos.y + (dy / dist) * remaining };
        remaining = 0;
      }
    }
    return a.wpIndex >= a.waypoints.length;
  }

  _onArrivedRoom(a) {
    const stationLabel = a.targetStation ? this.floor.station(a.targetStation)?.label : null;
    if (a.task) {
      a.activityPhrase = SimVoice.actionPhrase(a, a.task, stationLabel);
    }
    if (a.pendingStartLog && this.floor.isVisible(a.room)) {
      this._log("work", `${a.name} mulai ${String(a.pendingStartLog).toLowerCase()}.`, a.room, { agents: [a.id] });
    }
    a.pendingStartLog = null;
    EventBus.emit("wisma:agent-moved", { id: a.id, room: a.room });
  }

  // ============================================================
  //  PERSEPSI & INGATAN
  // ============================================================

  _perceive(a) {
    if (!a.present || a.deceased) return;
    const room = a.room;
    if (!this.floor.isVisible(room)) return; // blackout: tidak ada yang melihat

    let map = this.observeCooldown.get(a.id);
    if (!map) {
      map = new Map();
      this.observeCooldown.set(a.id, map);
    }

    for (const other of this.agentsInRoom(room)) {
      if (other.id === a.id || !other.present || other.deceased) continue;
      const activity = this.activityOf(other);
      const key = `${other.state}|${activity}|${other.task?.id || ""}`;
      const last = map.get(other.id);
      if (last && this.clock - last.clock < 15 && last.key === key) continue;
      map.set(other.id, { clock: this.clock, key });

      const chatter = other.chatterType || other.task?.chatter || "work";
      let importance = IMPORTANCE[chatter] ?? 30;
      // aktivitas mencurigakan di fase tegang lebih menempel di ingatan
      if (this.phase !== "normal") importance += 8;
      if (other.task?.spoiler) importance = 90;

      const isHiddenAct = ["sneak", "silent"].includes(chatter);
      const roomName = this.floor.roomName(room);
      const act = String(activity || "").trim();
      // kalau frasa aktivitas sudah menyebut lokasi, jangan tempel ruangan lagi
      // (hindari "Tio berjalan menuju Pos Satpam di Pos Satpam.")
      const adaLokasi = /menuju|\bdi\b/i.test(act) || act.toLowerCase().includes(roomName.toLowerCase());
      const text = isHiddenAct
        ? `${other.name} ${act} — gerak-geriknya mencurigakan.`
        : adaLokasi
        ? `${other.name} ${act}.`
        : `${other.name} ${act} di ${roomName}.`;

      this._remember(a, {
        text,
        type: "observation",
        importance,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room,
        about: other.id,
        spoiler: !!other.task?.spoiler,
        revealEvidence: other.task?.reveal_evidence || [],
      });

      other.observedBy.add(a.id);

      if (importance >= 70 && this._logCooldownOk(`obs|${a.id}|${other.id}`, 8)) {
        this._log("observe", `${a.name} memperhatikan ${other.name} — ${activity}.`, room, {
          agents: [a.id, other.id],
          importance,
          spoiler: !!other.task?.spoiler,
        });
      }
    }

    // dengar samar-samar dari ruangan sebelah
    if (Math.random() < (this.config.perceptionAdjacent || 0.35) * 0.25) {
      for (const nb of this.floor.neighbors(room)) {
        if (!this.floor.isVisible(nb)) continue;
        for (const other of this.agentsInRoom(nb)) {
          const chatter = other.chatterType || other.task?.chatter || "work";
          if (!["argue", "cry", "threat", "plead", "tense"].includes(chatter)) continue;
          if (Math.random() > 0.3) continue;
          a.memory.add({
            text: `Terdengar suara ${chatter === "cry" ? "isak tangis" : chatter === "argue" ? "pertengkaran" : chatter === "threat" ? "ancaman" : chatter === "plead" ? "orang memohon" : "ketegangan"} dari arah ${this.floor.roomName(nb)}.`,
            type: "observation",
            importance: 58,
            clock: this.clock,
            timeLabel: WismaWorld.timeLabel(this.clock),
            room,
            about: other.id,
          });
          this._log("observe", `${a.name} mendengar sesuatu dari ${this.floor.roomName(nb)}.`, room, {
            agents: [a.id, other.id],
            importance: 58,
          });
          a.mood.stress = clamp(a.mood.stress + 3, 0, 100);
        }
      }
    }
  }

  // ============================================================
  //  PERCAKAPAN
  // ============================================================

  _conversationPass() {
    for (const room of this.floor.rooms.values()) {
      if (room.blackout) continue;
      const people = this.agentsInRoom(room.id).filter(
        (a) => a.present && !a.deceased && !a.left && this.clock >= a.talkingUntil
      );
      if (people.length < 2) continue;

      // cari pasangan paling "panas"
      let best = null;
      for (let i = 0; i < people.length; i++) {
        for (let j = i + 1; j < people.length; j++) {
          const a = people[i];
          const b = people[j];
          const key = [a.id, b.id].sort().join("|");
          const cd = this.convCooldown.get(key) || -999;
          if (this.clock - cd < (this.config.conversationCooldown || 12)) continue;
          if (a.needs.social < 12 || b.needs.social < 12) continue; // sedang tidak ingin diganggu
          if (a.state === "moving" || b.state === "moving") continue;

          const rel = this.relations.get(a.id, b.id);
          const heat = rel.tension * 1.2 + rel.affinity * 0.8 + (a.mood.stress + b.mood.stress) * 0.4;
          const eagerness = (a.needs.social + b.needs.social) * 0.22;
          const score = heat + eagerness + Math.random() * 35;
          if (!best || score > best.score) best = { a, b, key, score, rel };
        }
      }
      if (!best) continue;
      // peluang mengobrol naik kalau keduanya butuh teman
      const talkChance = 0.3 + (best.a.needs.social + best.b.needs.social) / 400;
      if (Math.random() > talkChance) continue;

      this._runConversation(best.a, best.b, best.key, best.rel, room.id);
    }
  }

  /**
   * Jalankan percakapan dua orang (offline). Versi AI hanya dipanggil
   * kalau pemain menekan tombol SADAP (lihat eavesdrop()).
   */
  _runConversation(a, b, key, rel, roomId) {
    this.convCooldown.set(key, this.clock);
    this.stats.conversations++;

    const chatter = this._pickChatter(a, b);
    const lines = SimVoice.conversation(a, b, {
      chatter,
      roomName: this.floor.roomName(roomId),
      timeLabel: WismaWorld.timeLabel(this.clock),
    });

    a.talkingUntil = this.clock + 3;
    b.talkingUntil = this.clock + 3;
    a.state = "talking";
    b.state = "talking";
    a.lastConversationAt = this.clock;
    b.lastConversationAt = this.clock;
    a.needs.social = clamp(a.needs.social - 22, 0, 100);
    b.needs.social = clamp(b.needs.social - 22, 0, 100);

    // efek pada relasi
    if (["argue", "threat"].includes(chatter)) {
      this.relations.delta(a.id, b.id, { tension: 5, affinity: -3, trust: -2 });
      a.mood.stress = clamp(a.mood.stress + 6, 0, 100);
      b.mood.stress = clamp(b.mood.stress + 6, 0, 100);
      if (chatter === "threat") b.mood.fear = clamp(b.mood.fear + 8, 0, 100);
    } else if (["secret", "plead"].includes(chatter)) {
      this.relations.delta(a.id, b.id, { trust: 3, affinity: 2, tension: -1 });
    } else if (chatter === "gossip") {
      this.relations.delta(a.id, b.id, { affinity: 2, trust: 1 });
    } else {
      this.relations.delta(a.id, b.id, { affinity: 1, tension: -1 });
    }

    // ingatan kedua pihak
    const importance = IMPORTANCE[chatter] ?? 40;
    for (const [self, other] of [[a, b], [b, a]]) {
      const myLines = lines.filter((l) => l.who === self.id).map((l) => l.text);
      const theirLines = lines.filter((l) => l.who === other.id).map((l) => l.text);
      self.speech = myLines[0] || "";
      self.speechTo = other.id;
      self.bubble = { text: self.speech, until: this.clock + 4, kind: chatter };
      self.memory.add({
        text: `Berbicara dengan ${other.name}: "${theirLines[0] || myLines[0] || "…"}"`,
        type: "conversation",
        importance: importance + 5,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: roomId,
        about: other.id,
        spoiler: chatter === "secret",
      });
    }

    // pihak ketiga di ruangan yang sama ikut mendengar + gosip menyebar
    for (const listener of this.agentsInRoom(roomId)) {
      if (listener.id === a.id || listener.id === b.id) continue;
      if (!listener.present || listener.deceased) continue;
      listener.memory.add({
        text: `Mendengar ${a.name} dan ${b.name} berbicara${chatter === "secret" ? " pelan-pelan" : ""} di ${this.floor.roomName(roomId)}.`,
        type: "observation",
        importance: importance - 5,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: roomId,
        about: chatter === "secret" ? a.id : null,
        spoiler: chatter === "secret",
      });
      const aboutId = Math.random() < 0.5 ? a.id : b.id;
      this.relations.gossip(aboutId, listener.id, aboutId === a.id ? b.id : a.id, 0.18);
    }

    // tulis ke log CCTV
    for (const line of lines.slice(0, 3)) {
      const speaker = line.who === a.id ? a : b;
      this._log("talk", this._speechText(speaker, line.text), roomId, {
        agents: [a.id, b.id],
        importance,
        chatter,
        spoiler: chatter === "secret",
      });
    }

    EventBus.emit("wisma:conversation", {
      roomId,
      roomName: this.floor.roomName(roomId),
      timeLabel: WismaWorld.timeLabel(this.clock),
      participants: [a.id, b.id],
      lines,
      chatter,
      source: "sim",
      secrecy: chatter === "secret" ? "rahasia" : chatter === "argue" ? "terbuka" : "semi",
    });
  }

  _pickChatter(a, b) {
    const rel = this.relations.get(a.id, b.id);
    const ta = a.chatterType || a.task?.chatter || "casual";
    const tb = b.chatterType || b.task?.chatter || "casual";

    if (rel.tension > 78 && Math.random() < 0.55) return "argue";
    if (rel.fear > 70 && Math.random() < 0.4) return "plead";
    if (rel.affinity > 80 && rel.trust > 65 && Math.random() < 0.45) return "secret";
    if (this.phase === "crisis" && Math.random() < 0.5) return "anxious";
    if (this.phase === "aftermath" && Math.random() < 0.45) return "gossip";
    if (["threat", "cold"].includes(ta)) return ta;
    if (["threat", "cold"].includes(tb)) return tb;
    return Math.random() < 0.5 ? ta : tb;
  }

  _workChatter(a, step) {
    if (!a.task) return;
    // gumam singkat saat bekerja: rata-rata sekali tiap ~8 menit simulasi,
    // dan tidak boleh beruntun dalam 3 menit terakhir.
    if (a.lastChatterAt && this.clock - a.lastChatterAt < 3) return;
    if (Math.random() > step / 8) return;
    a.lastChatterAt = this.clock;
    const others = this.agentsInRoom(a.room).filter((o) => o.id !== a.id && o.present && !o.deceased);
    if (others.length === 0 && Math.random() < 0.6) return;
    if (!this.floor.isVisible(a.room)) return;
    const chatter = a.chatterType || a.task.chatter || "work";
    if (chatter === "silent") {
      a.bubble = { text: SimVoice.line(a, "silent", {}), until: this.clock + 3, kind: "silent" };
      return;
    }
    const text = SimVoice.line(a, chatter, {
      otherName: others[0]?.name,
      roomName: this.floor.roomName(a.room),
      seed: Math.round(this.clock),
    });
    a.speech = text;
    a.speechTo = others[0]?.id || null;
    a.bubble = { text, until: this.clock + 3, kind: chatter };
    this._log("talk", this._speechText(a, text), a.room, { agents: [a.id, ...(others[0] ? [others[0].id] : [])], chatter });
    for (const o of others) {
      this._remember(o, {
        text: text.startsWith("(") ? `${a.name} ${text}` : `${a.name} berkata: "${text}"`,
        type: "conversation",
        importance: (IMPORTANCE[chatter] ?? 30) - 5,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: a.room,
        about: a.id,
      });
    }
  }

  _decayBubbles(step) {
    for (const a of this.agents.values()) {
      if (a.bubble && this.clock >= a.bubble.until) a.bubble = null;
      if (a.activityOverride && this.clock >= a.overrideUntil) a.activityOverride = null;
    }
  }

  // ============================================================
  //  INSIDEN DUNIA (skrip malam kejadian)
  // ============================================================

  _applyIncidents() {
    for (const inc of this.incidents) {
      if (this.executedIncidents.has(inc.id)) continue;
      if (this.clock < inc.min) break;
      this.executedIncidents.add(inc.id);

      // blackout sensor
      if (inc.type === "blackout") {
        const until = inc.until === "99:99" ? this.endMin + 999 : JobSystem.parseTime(inc.until, this.startMin);
        for (const roomId of inc.rooms || []) this.floor.setBlackout(roomId, until);
      }

      // perubahan fase
      if (inc.phase && inc.phase !== this.phase) {
        this.phase = inc.phase;
        this.phaseLabel = inc.phase.toUpperCase();
        EventBus.emit("wisma:phase", { phase: this.phase, label: this.phaseLabel, note: this.data.phase_notes?.[this.phase] });
      }

      // perintah berkumpul
      if (inc.gather) {
        this.gatherRoom = inc.gather;
        for (const a of this.agents.values()) {
          if (!a.present || a.deceased || a.left) continue;
          a.task = null;
          a.taskProgress = 0;
          this._setDestination(a, inc.gather, null, {});
          a.mood.stress = clamp(a.mood.stress + (inc.stress || 20) * 0.6, 0, 100);
        }
      }

      // stres massal
      if (inc.stress) {
        for (const a of this.agents.values()) {
          if (!a.present || a.deceased) continue;
          let factor = 0.15;
          if (!inc.rooms || inc.rooms.length === 0) factor = 0.6;
          else if (inc.rooms.includes(a.room)) factor = 1;
          else if (inc.rooms.some((r) => this.floor.isAdjacent(a.room, r))) factor = 0.5;
          a.mood.stress = clamp(a.mood.stress + inc.stress * factor, 0, 100);
          if (factor >= 0.5) {
            a.memory.add({
              text: inc.broadcast || inc.label,
              type: "observation",
              importance: 85,
              clock: this.clock,
              timeLabel: WismaWorld.timeLabel(this.clock),
              room: a.room,
              fromIncident: true,
            });
          }
        }
      }

      this._log("incident", inc.broadcast || inc.label, inc.rooms?.[0] || null, {
        importance: 95,
        incidentId: inc.id,
      });
      this.notify?.add?.(inc.broadcast || `🏚️ ${inc.label}`, `wisma-${inc.id}`);
      EventBus.emit("wisma:incident", { incident: inc });

      if (inc.unlock_evidence) {
        EventBus.emit("wisma:request-evidence", { evidenceId: inc.unlock_evidence, source: inc.id });
      }
    }
  }

  // ============================================================
  //  LOG / CCTV
  // ============================================================

  /**
   * @param {string} kind - system|move|work|talk|observe|incident|artifact|ai|thought
   * @param {string} text
   * @param {?string} roomId
   * @param {Object} [meta]
   */
  _log(kind, text, roomId = null, meta = {}) {
    // ruangan blackout → jangan bocorkan apa pun
    if (roomId && !this.floor.isVisible(roomId) && kind !== "incident" && kind !== "system") {
      if (Math.random() < 0.35) {
        this._pushLog("static", this.data.room_blackout_static || "▓▓ SINYAL HILANG ▓▓", roomId, { importance: 10 });
      }
      return;
    }
    this._pushLog(kind, text, roomId, meta);
  }

  /** Rem sederhana: satu jenis log per pasangan/subjek maksimal tiap N menit. */
  _logCooldownOk(key, minutes) {
    if (!this._logCooldowns) this._logCooldowns = new Map();
    const last = this._logCooldowns.get(key) ?? -9999;
    if (this.clock - last < minutes) return false;
    this._logCooldowns.set(key, this.clock);
    if (this._logCooldowns.size > 400) {
      // buang yang sudah lama
      for (const [k, v] of this._logCooldowns) {
        if (this.clock - v > 120) this._logCooldowns.delete(k);
      }
    }
    return true;
  }

  _pushLog(kind, text, roomId, meta = {}) {
    const entry = {
      id: `log_${++this._logSeq}`,
      kind,
      text,
      roomId,
      roomName: roomId ? this.floor.roomName(roomId) : "SISTEM",
      clock: this.clock,
      timeLabel: WismaWorld.timeLabel(this.clock),
      agents: meta.agents || [],
      importance: meta.importance ?? 25,
      spoiler: !!meta.spoiler,
      artifactId: meta.artifactId || null,
      incidentId: meta.incidentId || null,
      source: meta.source || "sim",
    };
    this.log.push(entry);
    if (this.log.length > LOG_MAX) this.log.splice(0, this.log.length - LOG_MAX);
    EventBus.emit("wisma:log", entry);
    return entry;
  }

  /** Log yang aman ditampilkan ke pemain (memfilter spoiler terkunci). */
  visibleLog(limit = 120) {
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    return this.log
      .slice(-limit)
      .reverse()
      .map((e) => {
        if (!e.spoiler) return e;
        const task = this._taskWithReveal(e);
        const unlocked = !task || task.reveal_evidence?.some((id) => discovered.includes(id));
        return unlocked ? e : { ...e, text: "▒▒▒ [rekaman tidak jelas] ▒▒▒", redacted: true };
      });
  }

  _taskWithReveal(entry) {
    for (const id of entry.agents || []) {
      const a = this.agents.get(id);
      if (a?.task?.reveal_evidence) return a.task;
    }
    return null;
  }

  // ============================================================
  //  AI — DIRECTOR BATCH
  // ============================================================

  _maybeDirector() {
    if (!this.director?.aiActive) return;
    const interval = this.director.config.intervalMin || 20;
    if (this.clock - this.lastDirectorAt < interval) return;
    if (this.pendingDirector) return;

    const presentCount = [...this.agents.values()].filter((a) => a.present && !a.deceased && !a.left).length;
    if (presentCount < 2) return;

    this.lastDirectorAt = this.clock;
    const snapshot = this.snapshotForAI();

    this.pendingDirector = this.director
      .directorTick(snapshot)
      .then((res) => {
        if (res.source === "ai") this.stats.aiCalls++;
        else this.stats.simCalls++;
        this._applyDirector(res, interval);
      })
      .catch((err) => {
        console.warn("[WismaWorld] Director gagal:", err);
      })
      .finally(() => {
        this.pendingDirector = null;
      });
  }

  _applyDirector(res, interval) {
    if (!res?.agents) return;
    const discovered = GameState.getDiscoveredEvidence?.() || [];

    for (const [id, d] of res.agents) {
      const a = this.agents.get(id);
      if (!a || !a.present || a.deceased || a.left) continue;

      if (d.thought) {
        a.thought = d.thought;
        a.memory.add({
          text: d.thought,
          type: "self",
          importance: 38,
          clock: this.clock,
          timeLabel: WismaWorld.timeLabel(this.clock),
          room: a.room,
          private: true,
        });
      }

      if (d.speech) {
        const safe = this._spoilerFilter(d.speech);
        if (safe && this.floor.isVisible(a.room)) {
          a.speech = safe;
          a.speechTo = d.speechTo || null;
          a.bubble = { text: safe, until: this.clock + Math.max(4, interval / 3), kind: "ai" };
          this._log("talk", this._speechText(a, safe), a.room, {
            agents: [a.id, ...(d.speechTo ? [d.speechTo] : [])],
            importance: 50,
            source: res.source,
          });
          const target = d.speechTo ? this.agents.get(d.speechTo) : null;
          if (target && target.room === a.room && target.present) {
            this._remember(target, {
              text: safe.startsWith("(") ? `${a.name} ${safe}` : `${a.name} berkata kepada saya: "${safe}"`,
              type: "conversation",
              importance: 58,
              clock: this.clock,
              timeLabel: WismaWorld.timeLabel(this.clock),
              room: a.room,
              about: a.id,
            });
            target.bubble = null;
          }
          for (const o of this.agentsInRoom(a.room)) {
            if (o.id === a.id || o.id === d.speechTo) continue;
            this._remember(o, {
              text: safe.startsWith("(") ? `Melihat ${a.name} ${safe}` : `Mendengar ${a.name} berkata: "${safe}"`,
              type: "observation",
              importance: 45,
              clock: this.clock,
              timeLabel: WismaWorld.timeLabel(this.clock),
              room: a.room,
              about: a.id,
            });
          }
        }
      }

      if (d.action) {
        a.activityOverride = d.action;
        a.overrideUntil = this.clock + interval;
      }

      if (d.moveTo && d.moveTo !== a.room && !this.gatherRoom && this.floor.room(d.moveTo)) {
        const ok = this._setDestination(a, d.moveTo, null, {});
        if (ok) a.aiDestination = d.moveTo;
      }

      if (d.mood) {
        a.mood.stress = clamp(a.mood.stress + (d.mood.stress || 0), 0, 100);
        a.needs.energy = clamp(a.needs.energy + (d.mood.energy || 0), 0, 100);
        a.needs.social = clamp(a.needs.social - (d.mood.social || 0) * 2, 0, 100);
      }

      if (d.relation?.with) {
        this.relations.delta(a.id, d.relation.with, {
          trust: d.relation.trust,
          affinity: d.relation.affinity,
          tension: d.relation.tension,
        });
      }

      if (d.memory) {
        a.memory.add({
          text: d.memory,
          type: "ai",
          importance: 62,
          clock: this.clock,
          timeLabel: WismaWorld.timeLabel(this.clock),
          room: a.room,
        });
      }

      EventBus.emit("wisma:agent-updated", { id: a.id });
    }

    if (res.worldNote) {
      this._pushLog("ai", `📡 ${res.worldNote}`, null, { importance: 30, source: res.source });
    }
    this._log("ai", res.source === "ai" ? "Sutradara AI memperbarui semua penghuni." : "Mesin simulasi lokal memperbarui penghuni.", null, {
      importance: 12,
      source: res.source,
    });
  }

  /** Saring kalimat yang bisa membocorkan solusi kasus. */
  _spoilerFilter(text) {
    if (!text) return "";
    const forbidden = [
      /saya (yang )?(meracuni|menaruh racun|membunuh)/i,
      /aku (yang )?(meracuni|menaruh racun|membunuh)/i,
      /sianida (ke|di) dalam gelas/i,
      /racun (itu )?(milikku|punyaku)/i,
      /dia mati karena (saya|aku)/i,
    ];
    for (const rx of forbidden) {
      if (rx.test(text)) return "[suara tidak terdengar jelas]";
    }
    return text;
  }

  async _maybeReflections() {
    if (!this.director) return;
    const every = this.config.reflectEveryMin || 90;
    for (const a of this.agents.values()) {
      if (!a.present || a.deceased || a.left) continue;
      const last = this.reflectCooldown.get(a.id) ?? this.startMin - 999;
      if (this.clock - last < every) continue;
      if (a.memory.entries.length < 4) continue;
      this.reflectCooldown.set(a.id, this.clock);

      const snap = this.agentSnapshot(a, { deep: true });
      // refleksi adalah panggilan prioritas rendah; kalau kuota ketat, pakai SimVoice
      const res = await this.director.reflect(this.snapshotForAI({ light: true }), snap);
      const data = res?.data;
      if (!data) continue;
      for (const r of data.reflections || []) {
        a.memory.addReflection(r, this.clock, WismaWorld.timeLabel(this.clock));
        this._log("thought", `${a.name} merenung: "${r}"`, a.room, {
          agents: [a.id],
          importance: 45,
          source: res.source,
          privateish: true,
        });
      }
      if (data.suspicion?.id) {
        a.suspicion.set(data.suspicion.id, data.suspicion.score);
      }
      break; // satu refleksi per siklus supaya tidak memboroskan kuota
    }
  }

  // ============================================================
  //  AKSI PEMAIN
  // ============================================================

  /**
   * Sadap percakapan dua penghuni (1 request AI kalau tersedia).
   * @returns {Promise<Object>}
   */
  async eavesdrop(aId, bId) {
    const a = this.agents.get(aId);
    const b = this.agents.get(bId);
    if (!a || !b) return { ok: false, reason: "Karakter tidak ditemukan." };
    if (!a.present || !b.present) return { ok: false, reason: "Mereka tidak sedang berada di wisma." };
    if (a.deceased || b.deceased) return { ok: false, reason: "Salah satu dari mereka sudah tidak bernyawa." };
    if (a.room !== b.room) return { ok: false, reason: "Mereka tidak berada di ruangan yang sama." };
    if (!this.floor.isVisible(a.room)) {
      return { ok: false, reason: "Kanal pemantau ruangan itu sedang mati (blackout)." };
    }

    const rel = this.relations.get(a.id, b.id);
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    const ctx = {
      roomId: a.room,
      roomName: this.floor.roomName(a.room),
      timeLabel: WismaWorld.timeLabel(this.clock),
      chatter: this._pickChatter(a, b),
      relation: {
        trust: rel.trust,
        affinity: rel.affinity,
        tension: rel.tension,
        fear: rel.fear,
        publicNote: rel.public_note,
        secretNote: rel.secret_note,
        secretKnown: this.relations.isSecretRevealed(a.id, b.id, discovered),
      },
      topic: this._topicFor(a, b),
    };

    const snapshot = this.snapshotForAI({ light: true });
    let res;
    if (this.director) {
      res = await this.director.eavesdrop(
        snapshot,
        this.agentSnapshot(a, { deep: true }),
        this.agentSnapshot(b, { deep: true }),
        ctx
      );
    } else {
      // tanpa sutradara → pakai generator offline
      const shim = (ag) => ({
        id: ag.id,
        name: ag.name,
        traits: ag.traits,
        clock: this.clock,
        needs: ag.needs,
        mood: ag.mood,
        phase: this.phase,
        chatterType: ag.chatterType,
      });
      const lines = SimVoice.conversation(shim(a), shim(b), {
        chatter: ctx.chatter,
        roomName: ctx.roomName,
      });
      res = {
        source: "sim",
        data: {
          lines,
          learned: [],
          overheardFact: SimVoice.overheardFact(shim(a), shim(b), {
            timeLabel: ctx.timeLabel,
            roomName: ctx.roomName,
          }),
          secrecy: ctx.chatter === "secret" ? "rahasia" : "semi",
          relation: { trust: 0, affinity: 1, tension: ctx.chatter === "argue" ? 3 : 0 },
        },
      };
    }

    const data = res?.data;
    if (!data) return { ok: false, reason: "Sadapan gagal." };

    // tandai relasi sebagai sudah diamati detektif → buka catatan rahasia
    this.relations.markObserved(a.id, b.id);

    // simpan ke ingatan kedua pihak & pihak ketiga
    for (const l of data.learned || []) {
      const who = this.agents.get(l.id);
      if (who) {
        who.memory.add({
          text: l.memory,
          type: "conversation",
          importance: 70,
          clock: this.clock,
          timeLabel: ctx.timeLabel,
          room: a.room,
          about: l.id === a.id ? b.id : a.id,
        });
      }
    }

    if (data.relation) {
      this.relations.delta(a.id, b.id, data.relation);
    }

    for (const line of data.lines) {
      const speaker = line.who === a.id ? a : b;
      speaker.bubble = { text: line.text, until: this.clock + 5, kind: "wiretap" };
      this._log("talk", `${speaker.name}: "${line.text}"`, a.room, {
        agents: [a.id, b.id],
        importance: 72,
        source: res.source,
        wiretap: true,
      });
    }

    const payload = {
      ok: true,
      source: res.source,
      lines: data.lines,
      overheardFact: data.overheardFact || "",
      secrecy: data.secrecy || "semi",
      roomName: ctx.roomName,
      timeLabel: ctx.timeLabel,
      participants: [
        { id: a.id, name: a.name },
        { id: b.id, name: b.name },
      ],
      secretNote: this.relations.isSecretRevealed(a.id, b.id, discovered) ? rel.secret_note : "",
    };

    if (payload.overheardFact) {
      this.notify?.add?.(`🎧 Sadapan ${a.name} & ${b.name}: ${payload.overheardFact}`, `wisma-wiretap-${this._logSeq}`);
    }
    EventBus.emit("wisma:eavesdrop", payload);
    return payload;
  }

  /** Intai pikiran satu penghuni (1 request AI kalau tersedia). */
  async probe(agentId) {
    const a = this.agents.get(agentId);
    if (!a) return { ok: false, reason: "Karakter tidak ditemukan." };
    if (!a.present || a.deceased || a.left) {
      return { ok: false, reason: "Orang ini tidak ada di dalam wisma saat ini." };
    }
    const snapshot = this.snapshotForAI({ light: true });
    const res = await this.director?.deepProbe(snapshot, this.agentSnapshot(a, { deep: true }));
    const data = res?.data;
    if (!data) return { ok: false, reason: "Gagal mengintai pikiran." };

    a.thought = data.thought || a.thought;
    if (data.intent) a.intent = data.intent;
    if (data.monologue) {
      a.memory.add({
        text: data.monologue,
        type: "self",
        importance: 66,
        clock: this.clock,
        timeLabel: WismaWorld.timeLabel(this.clock),
        room: a.room,
        private: true,
      });
    }
    if (data.mood) {
      a.mood.stress = clamp(a.mood.stress + (data.mood.stress || 0), 0, 100);
      a.needs.energy = clamp(a.needs.energy + (data.mood.energy || 0), 0, 100);
    }
    if (data.speech && this.floor.isVisible(a.room)) {
      a.bubble = { text: data.speech, until: this.clock + 5, kind: "probe" };
      this._log("talk", this._speechText(a, data.speech), a.room, { agents: [a.id], importance: 55, source: res.source });
    }
    if (data.moveTo && data.moveTo !== a.room && !this.gatherRoom) {
      this._setDestination(a, data.moveTo, null, {});
    }

    const payload = {
      ok: true,
      source: res.source,
      id: a.id,
      name: a.name,
      thought: a.thought,
      monologue: data.monologue || "",
      intent: data.intent || "",
      timeLabel: WismaWorld.timeLabel(this.clock),
      roomName: this.floor.roomName(a.room),
    };
    this._log("thought", `🧠 Pikiran ${a.name}: "${a.thought}"`, a.room, {
      agents: [a.id],
      importance: 50,
      source: res.source,
    });
    EventBus.emit("wisma:probe", payload);
    return payload;
  }

  /** Geladah sebuah ruangan → bongkar artefak hasil kerja penghuni. */
  searchRoom(roomId) {
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    const res = this.forge.searchRoom(roomId, discovered);
    const people = this.agentsInRoom(roomId).filter((a) => a.present && !a.deceased);

    if (res.found.length > 0) {
      this._log("artifact", `Anda menggeledah ${this.floor.roomName(roomId)} dan menemukan ${res.found.length} barang.`, roomId, {
        importance: 75,
      });
      // penghuni menyadari digeledah → stres naik
      for (const p of people) {
        p.mood.stress = clamp(p.mood.stress + 6, 0, 100);
        p.memory.add({
          text: `Detektif menggeledah ${this.floor.roomName(roomId)}.`,
          type: "observation",
          importance: 72,
          clock: this.clock,
          timeLabel: WismaWorld.timeLabel(this.clock),
          room: roomId,
        });
      }
    }

    EventBus.emit("wisma:room-searched", { roomId, ...res });
    return {
      ok: true,
      roomId,
      roomName: this.floor.roomName(roomId),
      found: res.found,
      hiddenLocked: res.hiddenLocked,
      alreadyTaken: res.alreadyTaken,
      occupants: people.map((p) => ({ id: p.id, name: p.name, activity: this.activityOf(p) })),
      hint:
        res.found.length === 0 && res.hiddenLocked > 0
          ? "Ada sesuatu yang tersembunyi di sini, tapi Anda belum punya alasan untuk membongkarnya."
          : res.found.length === 0
          ? "Tidak ada barang berarti di ruangan ini."
          : null,
    };
  }

  takeArtifact(id) {
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    const res = this.forge.take(id, discovered);
    if (res.ok) {
      this._log("artifact", `🗃 Disita: ${res.title}.`, null, { importance: 80 });
    }
    return res;
  }

  _topicFor(a, b) {
    const pool = this.data.chatter?.[this.phase] || [];
    const work = [a.task?.label, b.task?.label].filter(Boolean);
    if (work.length && Math.random() < 0.5) {
      return `Kegiatan mereka saat ini: ${work.join(" dan ")}.`;
    }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : "Keadaan rumah malam itu.";
  }

  // ============================================================
  //  SNAPSHOT UNTUK AI
  // ============================================================

  /**
   * Tambah ingatan dengan penyaring anti-kembar: teks yang sama persis
   * dalam 20 menit terakhir tidak dicatat ulang (menghindari memori
   * berulang saat urusan diulang-ulang).
   */
  _remember(a, m) {
    if (!m?.text) return null;
    if (!a._lastMemoryText) a._lastMemoryText = new Map();
    const last = a._lastMemoryText.get(m.text);
    if (last !== undefined && this.clock - last < 20) return null;
    a._lastMemoryText.set(m.text, this.clock);
    if (a._lastMemoryText.size > 120) a._lastMemoryText.clear();
    return a.memory.add(m);
  }

  /**
   * Format satu ucapan ke log. Arah panggung "(...)" tidak dikutip
   * sebagai kalimat, melainkan ditulis sebagai tindakan.
   */
  _speechText(a, text) {
    const t = String(text || "").trim();
    if (t.startsWith("(")) return `${a.name} ${t.replace(/^\(|\)$/g, "")}`;
    return `${a.name}: "${t}"`;
  }

  /** Daftar penghuni di sebuah ruangan. */
  agentsInRoom(roomId) {
    const out = [];
    for (const a of this.agents.values()) {
      if (a.room === roomId && a.present && !a.left && !a.deceased) out.push(a);
    }
    return out;
  }

  getAgent(id) {
    return this.agents.get(id) || null;
  }

  /** Frasa aktivitas saat ini. */
  activityOf(a) {
    if (a.deceased) return "tergeletak diam";
    if (!a.present) return a.left ? "sudah pergi" : "belum tiba";
    if (a.activityOverride) return a.activityOverride;
    if (a.state === "moving") {
      const dest = a.waypoints.at(-1);
      return `berjalan menuju ${dest?.room ? this.floor.roomName(dest.room) : "ruangan lain"}`;
    }
    if (a.state === "talking") return "sedang berbicara";
    if (a.task) {
      const st = a.targetStation ? this.floor.station(a.targetStation)?.label : null;
      const taskRoom = this.jobs.roomFor(a.task);
      const preparing = !!taskRoom && taskRoom !== a.room;
      return SimVoice.actionPhrase(a, a.task, st, { preparing });
    }
    return "berdiri tanpa kegiatan";
  }

  /**
   * Snapshot ringkas dunia untuk prompt AI.
   * @param {Object} [opts] - {light:true} untuk memangkas ukuran
   */
  snapshotForAI(opts = {}) {
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    const agents = [];

    for (const a of this.agents.values()) {
      if (!a.present || a.deceased || a.left) continue;
      agents.push(this.agentSnapshot(a, { deep: false, discovered }));
    }

    const recentEvents = this.log
      .filter((e) => !e.privateish && e.kind !== "static" && e.importance >= 30)
      .slice(-8)
      .map((e) => ({ time: e.timeLabel, text: `${e.roomName}: ${e.text}` }));

    return {
      title: this.meta.title || "Wisma Angker",
      date: this.meta.date || "",
      clock: WismaWorld.timeLabel(this.clock),
      phase: this.phase,
      phaseLabel: this.phaseLabel,
      phaseNote: this.data.phase_notes?.[this.phase] || "",
      spoilerRule: this.meta.spoiler_guard?.rule || "Ruangan blackout tidak bisa dilihat siapa pun.",
      rooms: opts.light ? [] : this.floor.roomList.map((r) => ({ id: r.id, name: r.name })),
      recentEvents,
      agents: opts.light ? agents.slice(0, 3) : agents,
    };
  }

  /**
   * Snapshot satu agen (hanya informasi PUBLIK + ingatan hasil simulasi).
   * Field rahasia kasus TIDAK pernah ikut.
   */
  agentSnapshot(a, opts = {}) {
    const discovered = opts.discovered || GameState.getDiscoveredEvidence?.() || [];
    const others = this.agentsInRoom(a.room).filter((o) => o.id !== a.id);

    const memories = a.memory
      .visible(discovered)
      .filter((m) => !m.locked && !m.private)
      .slice(-(opts.deep ? 8 : 3))
      .map((m) => `${m.timeLabel} ${m.text}`.trim());

    const next = this.jobs.nextSchedule(a.id, this.clock);
    const nextGoal = next?.entry?.task
      ? this.jobs.task(next.entry.task)?.label
      : next?.entry?.free
      ? "kegiatan bebas"
      : next?.entry?.leave
      ? "bersiap pulang"
      : null;

    return {
      id: a.id,
      name: a.name,
      age: a.age,
      job: a.job,
      traits: a.traits.join("/"),
      room: a.room,
      // Snapshot AI sengaja JUJUR (sutradara perlu tahu posisi sebenarnya),
      // tetapi ditandai `unobservable` bila ruangan sedang gelap/kamera mati,
      // sehingga prompt bisa melarang karakter lain "melihat" ke sana.
      roomName: this.floor.roomName(a.room),
      activity: this.activityOf(a),
      detailedActivity: a.task
        ? `Urusan: ${a.task.label}, sudah berjalan ${Math.round(a.taskProgress)} dari ${a.task.duration_min} menit, di ${this.floor.roomName(this.jobs.roomFor(a.task) || a.room)}.`
        : "Tidak ada urusan terjadwal.",
      nextGoal,
      needs: {
        energy: Math.round(a.needs.energy),
        hunger: Math.round(a.needs.hunger),
        social: Math.round(a.needs.social),
      },
      mood: { stress: Math.round(a.mood.stress), fear: Math.round(a.mood.fear) },
      visibleWith: others.map((o) => o.name),
      memories,
      longMemory: memories,
      recentMemory: a.memory.recent(4).map((m) => ({ text: m.text, timeLabel: m.timeLabel })),
      lastMemory: a.memory.recent(1)[0]?.text || "",
      relations: this.relations.summarizeFor(a.id, 3, discovered),
      publicBackground: opts.deep ? a.publicBackground : "",
      chatter: a.chatterType || a.task?.chatter || "casual",
      phase: this.phase,
      clock: this.clock,
      unobservable: !this.floor.isVisible(a.room),
    };
  }

  // ============================================================
  //  DATA UNTUK UI
  // ============================================================

  /** Status lengkap satu agen untuk panel UI. */
  agentCard(id) {
    const a = this.agents.get(id);
    if (!a) return null;
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    const rels = this.relations.listFor(a.id, discovered, (x) => this.agents.get(x)?.name || x);
    const unmonitored = a.present && !a.left && !this.floor.isVisible(a.room);
    return {
      id: a.id,
      unmonitored,
      name: a.name,
      age: a.age,
      role: a.role,
      job: a.job,
      jobData: a.jobData
        ? {
            title: a.jobData.title,
            employer: a.jobData.employer,
            duties: a.jobData.duties || [],
            skills: a.jobData.skills || [],
            pressure: a.jobData.pressure,
            pride: a.jobData.pride,
          }
        : null,
      traits: a.traits,
      npc: a.npc,
      present: a.present,
      left: a.left,
      deceased: a.deceased,
      state: a.state,
      room: a.room,
      roomName: unmonitored ? "▓ tidak terpantau" : this.floor.roomName(a.room),
      activity: unmonitored ? "sinyal kamera mati" : this.activityOf(a),
      task: a.task ? { id: a.task.id, label: a.task.label, progress: a.taskProgress, duration: a.task.duration_min } : null,
      tasksCompleted: a.tasksCompleted,
      nextGoal: this.jobs.nextSchedule(a.id, this.clock)?.entry?.task
        ? this.jobs.task(this.jobs.nextSchedule(a.id, this.clock).entry.task)?.label
        : null,
      needs: { ...a.needs },
      mood: { ...a.mood },
      thought: a.thought,
      speech: a.speech,
      intent: a.intent,
      bubble: a.bubble,
      suspicion: [...a.suspicion.entries()].map(([sid, score]) => ({
        id: sid,
        name: this.agents.get(sid)?.name || sid,
        score,
      })),
      memories: a.memory.visible(discovered).reverse(),
      reflections: a.memory.reflections,
      relations: rels,
      observedBy: [...a.observedBy].map((x) => this.agents.get(x)?.name || x),
    };
  }

  /** Data ringan semua agen untuk render peta. */
  roster() {
    return [...this.agents.values()].map((a) => ({
      hidden: a.present && !a.left && !this.floor.isVisible(a.room),
      id: a.id,
      name: a.name,
      npc: a.npc,
      present: a.present,
      left: a.left,
      deceased: a.deceased,
      room: a.room,
      pos: { ...a.pos },
      prevPos: { ...a.prevPos },
      state: a.state,
      activity: this.activityOf(a),
      bubble: a.bubble ? { ...a.bubble } : null,
      stress: Math.round(a.mood.stress),
      job: a.job,
      traits: a.traits,
    }));
  }

  roomsState() {
    const discovered = GameState.getDiscoveredEvidence?.() || [];
    return this.floor.roomList.map((r) => ({
      id: r.id,
      name: r.name,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      kind: r.kind,
      icon: r.icon,
      blackout: r.blackout,
      occupants: r.blackout ? [] : this.agentsInRoom(r.id).map((a) => a.id),
      hiddenOccupants: r.blackout ? this.agentsInRoom(r.id).length : 0,
      artifacts: this.forge
        .all()
        .filter((x) => x.roomId === r.id && !x.taken && !this.forge.isLocked(x, discovered))
        .map((x) => ({ id: x.id, title: x.title, found: x.found })),
      hiddenArtifacts: this.forge
        .all()
        .filter((x) => x.roomId === r.id && !x.taken && this.forge.isLocked(x, discovered)).length,
      stations: this.floor.stationsInRoom(r.id).map((s) => ({ id: s.id, x: s.x, y: s.y, icon: s.icon, label: s.label })),
    }));
  }

  doorsState() {
    return this.doors;
  }

  get doors() {
    return this.floor.doors;
  }

  hud() {
    const present = [...this.agents.values()].filter((a) => a.present && !a.left && !a.deceased);
    return {
      timeLabel: WismaWorld.timeLabel(this.clock),
      clock: this.clock,
      startMin: this.startMin,
      endMin: this.endMin,
      progress: (this.clock - this.startMin) / Math.max(1, this.endMin - this.startMin),
      phase: this.phase,
      phaseLabel: this.phaseLabel,
      phaseNote: this.data.phase_notes?.[this.phase] || "",
      running: this.running,
      speed: this.speed,
      presentCount: present.length,
      totalAgents: this.agents.size,
      conversations: this.stats.conversations,
      artifacts: this.forge.foundList().length,
      artifactsTaken: this.forge.all().filter((a) => a.taken).length,
      aiCalls: this.stats.aiCalls,
      simCalls: this.stats.simCalls,
      aiActive: !!this.director?.aiActive,
      aiLevel: this.director?.config?.level || "off",
      lastAiSource: this.director?.metrics?.lastSource || "sim",
      lastAiError: this.director?.metrics?.lastError || null,
      nextDirectorIn: this.director?.aiActive
        ? Math.max(0, Math.round((this.director.config.intervalMin || 20) - (this.clock - this.lastDirectorAt)))
        : null,
      gatherRoom: this.gatherRoom ? this.floor.roomName(this.gatherRoom) : null,
    };
  }

  static timeLabel(mins) {
    return JobSystem.formatTime(mins);
  }

  // ============================================================
  //  SIMPAN / MUAT
  // ============================================================

  _saveKey() {
    return SAVE_PREFIX + (GameState.currentCaseId || "default");
  }

  /** Kunci lama (sebelum fitur ini dinamai ulang jadi "Wisma Angker"). */
  _legacySaveKey() {
    return "retrosleuth_office_" + (GameState.currentCaseId || "default");
  }

  /**
   * Baca sesi tersimpan: pakai kunci baru, dan bila tidak ada, ambil dari
   * kunci lama lalu pindahkan (migrasi sekali jalan, tanpa kehilangan progres).
   */
  _readSave() {
    try {
      const key = this._saveKey();
      let raw = localStorage.getItem(key);
      if (raw) return raw;
      const legacy = this._legacySaveKey();
      raw = localStorage.getItem(legacy);
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(legacy);
      }
      return raw;
    } catch {
      return null;
    }
  }

  save() {
    try {
      const data = {
        version: 1,
        caseId: GameState.currentCaseId,
        clock: this.clock,
        phase: this.phase,
        gatherRoom: this.gatherRoom,
        executedIncidents: [...this.executedIncidents],
        log: this.log.slice(-160),
        relations: this.relations.toJSON(),
        artifacts: this.forge.toJSON(),
        stats: this.stats,
        agents: [...this.agents.values()].map((a) => ({
          id: a.id,
          room: a.room,
          pos: a.pos,
          present: a.present,
          left: a.left,
          deceased: a.deceased,
          state: a.state,
          task: a.task?.id || null,
          taskProgress: a.taskProgress,
          needs: a.needs,
          mood: a.mood,
          thought: a.thought,
          intent: a.intent,
          suspicion: [...a.suspicion.entries()],
          memory: a.memory.toJSON(),
          observedBy: [...a.observedBy],
        })),
      };
      localStorage.setItem(this._saveKey(), JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn("[WismaWorld] Gagal menyimpan:", err);
      return false;
    }
  }

  /**
   * Muat ulang sesi malam yang sama (kalau ada).
   * @returns {boolean} true jika berhasil dipulihkan
   */
  load() {
    try {
      const raw = this._readSave();
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return false;

      this.clock = data.clock ?? this.startMin;
      this.phase = data.phase || "normal";
      this.phaseLabel = this.phase.toUpperCase();
      this.gatherRoom = data.gatherRoom || null;
      this.executedIncidents = new Set(data.executedIncidents || []);
      this.log = data.log || [];
      this._logSeq = this.log.length;
      this.stats = { ...this.stats, ...(data.stats || {}) };

      if (data.relations) this.relations = RelationshipGraph.fromJSON(data.relations);
      if (data.artifacts) this.forge.restore(data.artifacts);

      for (const saved of data.agents || []) {
        const a = this.agents.get(saved.id);
        if (!a) continue;
        Object.assign(a, {
          room: saved.room,
          pos: saved.pos,
          prevPos: { ...saved.pos },
          present: saved.present,
          left: saved.left,
          deceased: saved.deceased,
          state: saved.state,
          taskProgress: saved.taskProgress || 0,
          needs: saved.needs,
          mood: saved.mood,
          thought: saved.thought,
          intent: saved.intent,
          observedBy: new Set(saved.observedBy || []),
        });
        a.suspicion = new Map(saved.suspicion || []);
        a.memory = MemoryStream.fromJSON(saved.memory);
        if (saved.task) a.task = this.jobs.task(saved.task);
      }

      // pulihkan blackout dari insiden yang sudah jalan
      for (const inc of this.incidents) {
        if (inc.type === "blackout" && this.executedIncidents.has(inc.id)) {
          const until = inc.until === "99:99" ? this.endMin + 999 : JobSystem.parseTime(inc.until, this.startMin);
          for (const roomId of inc.rooms || []) this.floor.setBlackout(roomId, until);
        }
      }

      this._pushLog("system", "Sesi pemantauan sebelumnya dipulihkan.", null, { importance: 20 });
      return true;
    } catch (err) {
      console.warn("[WismaWorld] Gagal memuat:", err);
      return false;
    }
  }

  hasSave() {
    try {
      return !!this._readSave();
    } catch {
      return false;
    }
  }

  clearSave() {
    try {
      localStorage.removeItem(this._saveKey());
      localStorage.removeItem(this._legacySaveKey());
    } catch { /* ignore */ }
  }
}

/** Util: batasi angka 0..100 (atau min..max). */
export function clamp(v, min = 0, max = 100) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
