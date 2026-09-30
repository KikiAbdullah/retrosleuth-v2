/**
 * ============================================================
 *  WISMAWINDOW.JS — Jendela "Wisma Angker" (Simulasi Penghuni)
 * ------------------------------------------------------------
 *  Layar kiri  : monitor keamanan CRT — denah Wisma Angker,
 *                penghuni bergerak real-time, gelembung ucapan,
 *                ruangan blackout (statis), penanda barang.
 *  Panel kanan : 4 tab
 *                PENGHUNI  — roster + peran & urusan rumah tiap orang
 *                AGEN      — pikiran, memori, peran di wisma, relasi
 *                CCTV      — log peristiwa (feed keamanan)
 *                BARANG    — artefak hasil kerja yang bisa disita
 *  Toolbar     : jam simulasi, fase, play/pause, kecepatan,
 *                lompat waktu, meter kuota AI, SADAP / INTAI /
 *                GELDAH / INTEROGASI.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { GameState } from "../core/Store.js";
import { budget } from "../ai/BudgetManager.js";
import { AudioManager } from "../utils/AudioManager.js";

const KIND_COLOR = {
  outdoor: { fill: "rgba(20,70,35,0.55)", stroke: "#2f8f4f" },
  hall: { fill: "rgba(40,50,60,0.6)", stroke: "#6f8fa0" },
  work: { fill: "rgba(25,60,70,0.6)", stroke: "#3fa9bf" },
  social: { fill: "rgba(60,45,70,0.55)", stroke: "#9a7fc0" },
  private: { fill: "rgba(55,40,40,0.55)", stroke: "#b07a7a" },
  crime: { fill: "rgba(80,20,20,0.6)", stroke: "#ff5a5a" },
};

const AGENT_COLORS = ["#4dff88", "#ffd166", "#7ec8ff", "#ff9de2", "#c3ff7e", "#ffa07a", "#9d8bff", "#7affd6", "#ffe07a", "#ff7a7a"];

export class WismaWindow {
  /**
   * @param {WindowManager} wm
   * @param {() => WismaWorld|null} getWorld
   * @param {Object} [deps]
   */
  constructor(wm, getWorld, deps = {}) {
    this.wm = wm;
    this.getWorld = getWorld;
    this.windowId = "wisma";
    this.caseHub = deps.caseHub || null;

    this.selectedAgent = null;
    this.selectedRoom = null;
    this.activeTab = "roster";
    this.built = false;
    this._raf = null;
    this._resizeObs = null;
    this._hover = null;
    this._modal = null;
    this._lastLogId = null;

    this._onBudget = (stats) => this._renderBudget(stats);
    this._onLog = () => {
      if (this.activeTab === "log") this._renderLog();
    };
    this._onTick = () => {
      this._renderHud();
      if (this.activeTab === "roster") this._renderRoster();
      if (this.activeTab === "agent" && this.selectedAgent) this._renderAgentCard(this.selectedAgent, { light: true });
      if (this.activeTab === "barang") this._renderArtifacts();
    };
  }

  // ============================================================
  //  BUKA / TUTUP
  // ============================================================

  open() {
    if (this.wm.isOpen(this.windowId)) {
      this.wm.bringToFront(this.windowId);
      this._startLoop();
      return;
    }

    const winEl = this.wm.register(this.windowId, {
      title: "🏚️ Wisma Angker — Pemantau Penghuni",
      width: Math.min(1120, window.innerWidth - 60),
      height: Math.min(700, window.innerHeight - 90),
      resizable: true,
      maximizable: true,
    });

    this.wm.open(this.windowId);
    this._buildUI(winEl);
    this._startLoop();
    AudioManager.play?.("open");
  }

  close() {
    this._stopLoop();
    this.wm.close(this.windowId);
  }

  _startLoop() {
    EventBus.on("ai:budget", this._onBudget);
    EventBus.on("wisma:log", this._onLog);
    EventBus.on("wisma:tick", this._onTick);
    if (this._raf) return;
    const loop = () => {
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop() {
    EventBus.off("ai:budget", this._onBudget);
    EventBus.off("wisma:log", this._onLog);
    EventBus.off("wisma:tick", this._onTick);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._resizeObs) this._resizeObs.disconnect();
    const world = this.getWorld?.();
    world?.save?.();
  }

  // ============================================================
  //  UI
  // ============================================================

  _buildUI(winEl) {
    const body = winEl.querySelector(".window-body");
    body.style.padding = "0";
    body.style.overflow = "hidden";
    body.innerHTML = `
      <div class="wisma-root">
        <div class="wisma-toolbar">
          <span class="wisma-clock" id="ws-clock">--:--</span>
          <span class="wisma-phase" id="ws-phase" data-phase="normal">NORMAL</span>
          <button class="wisma-btn primary" id="ws-play">▶ JALAN</button>
          <button class="wisma-btn" id="ws-speed">1×</button>
          <span style="font-size:12px;color:#555;">lompat:</span>
          <button class="wisma-btn" data-jump="20:00">20:00</button>
          <button class="wisma-btn" data-jump="22:00">22:00</button>
          <button class="wisma-btn" data-jump="00:15">00:15</button>
          <span class="wisma-spacer"></span>
          <button class="wisma-btn" id="ws-wiretap" title="Sadap percakapan dua penghuni di ruangan terpilih (1 panggilan AI)">🎧 SADAP</button>
          <button class="wisma-btn" id="ws-probe" title="Intai pikiran penghuni terpilih (1 panggilan AI)">🧠 INTAI</button>
          <button class="wisma-btn" id="ws-search" title="Geladah ruangan terpilih (gratis)">🔦 GELDAH</button>
          <button class="wisma-btn" id="ws-interrogate" title="Bawa penghuni ini ke ruang interogasi">🗣️ INTEROGASI</button>
          <span class="wisma-budget" id="ws-budget" title="Kuota OpenRouter free tier">AI <b>-/-</b></span>
          <button class="wisma-btn danger" id="ws-reset" title="Ulang malam dari pukul 17.00">↺</button>
        </div>

        <div class="wisma-main">
          <div class="wisma-screen" id="ws-screen">
            <canvas id="ws-canvas"></canvas>
            <div class="wisma-screen-label" id="ws-screen-label">KAMERA 01 — DENAH WISMA</div>
            <div class="wisma-screen-hint" id="ws-hint">Klik penghuni untuk memilih • klik ruangan untuk menggeledah</div>
          </div>

          <div class="wisma-side">
            <div class="wisma-tabs">
              <button class="wisma-tab active" data-tab="roster">👥 PENGHUNI</button>
              <button class="wisma-tab" data-tab="agent">🧠 AGEN</button>
              <button class="wisma-tab" data-tab="log">📼 CCTV</button>
              <button class="wisma-tab" data-tab="barang">🗃 BARANG</button>
            </div>
            <div class="wisma-panel" id="ws-panel"></div>
          </div>
        </div>
      </div>
    `;

    this.rootEl = body.querySelector(".wisma-root");
    this.canvas = body.querySelector("#ws-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.panel = body.querySelector("#ws-panel");

    this._bindToolbar(body);
    this._bindTabs(body);
    this._bindCanvas(body);

    // ukuran canvas mengikuti container
    const screen = body.querySelector("#ws-screen");
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObs = new ResizeObserver(() => this._fitCanvas());
      this._resizeObs.observe(screen);
    }
    this._fitCanvas();

    this.built = true;
    this._renderTab();
    this._renderHud();
    if (budget) this._renderBudget(budget.stats());
  }

  _bindToolbar(body) {
    body.querySelector("#ws-play")?.addEventListener("click", () => {
      const world = this.getWorld?.();
      if (!world) return;
      const running = world.toggle();
      const btn = body.querySelector("#ws-play");
      btn.textContent = running ? "⏸ JEDA" : "▶ JALAN";
      btn.classList.toggle("on", running);
      AudioManager.play?.("click");
    });

    body.querySelector("#ws-speed")?.addEventListener("click", (e) => {
      const world = this.getWorld?.();
      if (!world) return;
      const steps = [1, 2, 4, 8];
      const next = steps[(steps.indexOf(world.speed) + 1) % steps.length];
      world.setSpeed(next);
      e.target.textContent = `${next}×`;
    });

    body.querySelectorAll("[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        const world = this.getWorld?.();
        if (!world) return;
        const [h, m] = b.dataset.jump.split(":").map(Number);
        const mins = h * 60 + m + (h < 6 ? 1440 : 0);
        world.seekTo(mins);
        this._renderHud();
        this._renderTab();
      });
    });

    body.querySelector("#ws-wiretap")?.addEventListener("click", () => this._onWiretap());
    body.querySelector("#ws-probe")?.addEventListener("click", () => this._onProbe());
    body.querySelector("#ws-search")?.addEventListener("click", () => this._onSearch());
    body.querySelector("#ws-interrogate")?.addEventListener("click", () => this._onInterrogate());
    body.querySelector("#ws-reset")?.addEventListener("click", () => {
      const world = this.getWorld?.();
      if (!world) return;
      if (!confirm("Ulang seluruh malam dari pukul 17.00? Progres simulasi wisma akan dihapus (bukti yang sudah disita tetap ada).")) return;
      world.reset();
      this._renderHud();
      this._renderTab();
    });
  }

  _bindTabs(body) {
    body.querySelectorAll(".wisma-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.activeTab = tab.dataset.tab;
        body.querySelectorAll(".wisma-tab").forEach((t) => t.classList.toggle("active", t === tab));
        this._renderTab();
      });
    });
  }

  _bindCanvas(body) {
    const canvas = this.canvas;
    canvas.addEventListener("click", (e) => {
      const world = this.getWorld?.();
      if (!world) return;
      const hit = this._hitTest(e);
      if (hit?.agentId) {
        this.selectedAgent = hit.agentId;
        this.selectedRoom = hit.roomId || this.selectedRoom;
        this.activeTab = "agent";
        body.querySelectorAll(".wisma-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "agent"));
        this._renderAgentCard(hit.agentId);
        AudioManager.play?.("click");
      } else if (hit?.roomId) {
        this.selectedRoom = hit.roomId;
        this._renderHud();
        if (this.activeTab === "roster") this._renderRoster();
      }
    });

    canvas.addEventListener("dblclick", (e) => {
      const hit = this._hitTest(e);
      if (hit?.roomId && !hit?.agentId) this._onSearch(hit.roomId);
    });

    canvas.addEventListener("mousemove", (e) => {
      const hit = this._hitTest(e);
      this._hover = hit;
      const hint = document.getElementById("ws-hint");
      if (!hint) return;
      if (hit?.agentId) {
        const world = this.getWorld();
        const a = world.getAgent(hit.agentId);
        hint.textContent = `${a.name} — ${world.activityOf(a)} (${world.floor.roomName(a.room)}) • klik untuk memilih`;
      } else if (hit?.roomId) {
        const world = this.getWorld();
        const r = world.roomsState().find((x) => x.id === hit.roomId);
        hint.textContent = r
          ? `${r.name} — ${r.occupants.length} orang${r.blackout ? " • SINYAL HILANG" : ""}${r.artifacts.length ? ` • ${r.artifacts.length} barang terlihat` : ""} • klik ganda untuk menggeledah`
          : "";
      } else {
        hint.textContent = "Klik penghuni untuk memilih • klik ruangan untuk menggeledah";
      }
    });
  }

  _fitCanvas() {
    const wrap = this.canvas?.parentElement;
    if (!wrap || !this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this._dpr = dpr;
    this._viewW = w;
    this._viewH = h;
  }

  // ============================================================
  //  RENDER HUD
  // ============================================================

  _renderHud() {
    const world = this.getWorld?.();
    const clockEl = document.getElementById("ws-clock");
    const phaseEl = document.getElementById("ws-phase");
    const labelEl = document.getElementById("ws-screen-label");
    if (!clockEl || !phaseEl) return;

    if (!world) {
      clockEl.textContent = "--:--";
      phaseEl.textContent = "TIDAK ADA KASUS";
      phaseEl.dataset.phase = "normal";
      return;
    }

    const hud = world.hud();
    clockEl.textContent = hud.timeLabel;
    phaseEl.textContent = hud.phaseLabel;
    phaseEl.dataset.phase = hud.phase;
    phaseEl.title = hud.phaseNote;

    if (labelEl) {
      const roomName = this.selectedRoom ? world.floor.roomName(this.selectedRoom) : "DENAH WISMA";
      labelEl.textContent = `KAMERA 01 — ${roomName.toUpperCase()} • ${hud.timeLabel} • ${hud.presentCount}/${hud.totalAgents} HADIR${hud.aiActive ? " • AI AKTIF" : " • SIMULASI LOKAL"}`;
    }

    const playBtn = document.getElementById("ws-play");
    if (playBtn) {
      playBtn.textContent = hud.running ? "⏸ JEDA" : "▶ JALAN";
      playBtn.classList.toggle("on", hud.running);
    }
  }

  _renderBudget(stats) {
    const el = document.getElementById("ws-budget");
    if (!el || !stats) return;
    el.classList.remove("warn", "dead");
    if (stats.degraded) {
      el.classList.add("dead");
      el.innerHTML = `AI ⚠ DEGRADASI ${stats.degradedSecondsLeft}s`;
      el.title = "Terlalu banyak kegagalan. Wisma berjalan dengan simulasi lokal sementara waktu.";
      return;
    }
    if (stats.dailyLeft <= 0) {
      el.classList.add("dead");
      el.innerHTML = `AI <b>0</b>/${stats.dailyLimit}`;
      el.title = "Kuota harian OpenRouter habis. Simulasi tetap jalan (mode lokal).";
      return;
    }
    if (stats.wismaLeft <= 3) el.classList.add("warn");
    el.innerHTML = `AI <b>${stats.used}</b>/${stats.dailyLimit} • menit ${stats.minuteUsed}/${stats.minuteLimit} • antrean ${stats.queueLength}`;
    el.title = `Sisa untuk wisma: ${stats.wismaLeft} panggilan (${stats.reserve} dicadangkan untuk interogasi).`;
  }

  // ============================================================
  //  TAB
  // ============================================================

  _renderTab() {
    const world = this.getWorld?.();
    if (!world) {
      this.panel.innerHTML = `
        <div class="ws-empty">
          <p style="font-size:15px;color:#000080;font-weight:bold;">🏚️ Wisma Angker belum aktif</p>
          <p>Belum ada kasus yang dimuat. Simulasi ini mengikuti data kasus: penghuninya adalah karakter kasus itu sendiri, dan jadwalnya mengikuti linimasa malam kejadian.</p>
          <button class="wisma-btn primary" id="ws-open-case">📁 Buka Case Files</button>
          <p style="margin-top:10px;">Setelah kasus dimuat, jendela ini menampilkan denah Wisma, sepuluh penghuni yang menjalani perannya masing-masing: pelayan, dapur, ronda, notaris, keluarga, dan tamu, dan monitor keamanan real-time.</p>
        </div>`;
      this.panel.querySelector("#ws-open-case")?.addEventListener("click", () => {
        this.caseHub?.open?.();
      });
      return;
    }

    switch (this.activeTab) {
      case "roster": return this._renderRoster();
      case "agent": return this._renderAgentCard(this.selectedAgent);
      case "log": return this._renderLog();
      case "barang": return this._renderArtifacts();
      default: return this._renderRoster();
    }
  }

  _renderRoster() {
    const world = this.getWorld?.();
    if (!world) return;
    const roster = world.roster();
    const hud = world.hud();

    const rooms = world.roomsState();
    const interesting = rooms.filter((r) => r.artifacts.length > 0 || r.blackout);

    this.panel.innerHTML = `
      <div class="ws-section" style="margin-bottom:6px;">
        <h4>STATUS RUMAH</h4>
        <div style="font-size:12px;line-height:1.5;">
          ${hud.phaseNote}<br>
          Percakapan tercatat: <b>${hud.conversations}</b> • Barang ditemukan: <b>${hud.artifacts}</b> (${hud.artifactsTaken} disita)<br>
          ${hud.aiActive
            ? `Sutradara AI berikutnya dalam <b>${hud.nextDirectorIn ?? "?"}</b> menit simulasi (level: ${hud.aiLevel}).`
            : `Mode <b>lokal</b>: seluruh perilaku dihasilkan mesin simulasi (0 panggilan AI).`}
          ${hud.gatherRoom ? `<br><b style="color:#8b0000;">Semua orang dikumpulkan di ${hud.gatherRoom}.</b>` : ""}
        </div>
      </div>

      ${interesting.length ? `
      <div class="ws-section" style="margin-bottom:6px;">
        <h4>PERHATIAN</h4>
        ${interesting.map((r) => `<div style="font-size:12px;">${r.blackout ? "📵" : "🗃"} <b>${r.name}</b> — ${r.blackout ? "kanal pemantau mati" : `${r.artifacts.length} barang terlihat`}</div>`).join("")}
      </div>` : ""}

      <div id="ws-roster-list">
        ${roster.map((a, i) => this._rosterRow(a, i)).join("")}
      </div>
    `;

    this.panel.querySelectorAll(".ws-agent").forEach((el) => {
      el.addEventListener("click", () => {
        this.selectedAgent = el.dataset.id;
        this.selectedRoom = el.dataset.room || this.selectedRoom;
        this.activeTab = "agent";
        document.querySelectorAll(".wisma-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "agent"));
        this._renderAgentCard(this.selectedAgent);
      });
    });
  }

  _rosterRow(a, i) {
    const world = this.getWorld();
    const stressCls = !a.present || a.left || a.deceased ? "absent" : a.stress > 70 ? "stress-high" : a.stress > 45 ? "stress-mid" : "";
    const statusText = a.deceased
      ? "✝ tidak bergerak"
      : !a.present
      ? a.left ? "sudah meninggalkan wisma" : "belum tiba"
      : a.hidden
      ? "📵 tidak terpantau (kamera mati)"
      : a.activity;
    return `
      <div class="ws-agent ${a.present ? "" : "absent"} ${a.deceased ? "dead" : ""} ${this.selectedAgent === a.id ? "selected" : ""}"
           data-id="${a.id}" data-room="${a.room}" style="border-left-color:${AGENT_COLORS[i % AGENT_COLORS.length]}">
        <span class="dot ${stressCls}" title="stres ${a.stress}%"></span>
        <span>
          <span class="nm">${a.name}</span> ${a.npc ? '<span style="font-size:10px;color:#888;">(staf)</span>' : ""}
          <span class="act">${statusText}</span>
        </span>
        <span class="room">${a.hidden ? "▓▓▓" : world.floor.roomName(a.room)}<br>${a.job.slice(0, 22)}</span>
      </div>`;
  }

  _renderAgentCard(id, opts = {}) {
    const world = this.getWorld?.();
    if (!world) return;
    if (!id) {
      this.panel.innerHTML = `<div class="ws-empty">Pilih seorang penghuni di peta atau di tab PENGHUNI untuk melihat pikirannya, urusan rumahnya, ingatannya, dan relasinya.</div>`;
      return;
    }
    const card = world.agentCard(id);
    if (!card) return;

    // mode ringan: hanya perbarui angka, jangan bangun ulang DOM (menghindari flicker)
    if (opts.light && this._cardId === id && this.panel.querySelector("#ws-card-root")) {
      this._patchCardNumbers(card);
      return;
    }
    this._cardId = id;

    const bar = (label, value, cls = "") => `
      <div class="ws-bar"><span>${label}</span><span class="track"><span class="fill ${cls}" style="width:${Math.round(value)}%"></span></span><span>${Math.round(value)}</span></div>`;

    const rels = card.relations
      .map((r) => `
        <div class="ws-rel">
          <span class="who">${r.name}</span>
          <span class="nums">T${r.trust} A${r.affinity} X${r.tension}${r.fear ? ` F${r.fear}` : ""}</span>
          ${r.note ? `<span class="note">${r.note}</span>` : ""}
          ${r.secretNote ? `<span class="secret">🔒 terbuka: ${r.secretNote}</span>` : ""}
        </div>`)
      .join("");

    const mems = card.memories
      .slice(0, 26)
      .map((m) => `
        <div class="ws-mem ${m.locked ? "locked" : ""}" data-type="${m.type}">
          <span class="mt">${m.timeLabel}</span>${m.text}
          ${m.room ? `<span style="color:#999;"> @${world.floor.roomName(m.room)}</span>` : ""}
        </div>`)
      .join("");

    const susp = card.suspicion.length
      ? card.suspicion.map((s) => `<div style="font-size:12px;">👁 ${s.name} — ${s.score}%</div>`).join("")
      : `<div style="font-size:12px;color:#777;">Belum ada yang ia curigai.</div>`;

    this.panel.innerHTML = `
      <div class="ws-card" id="ws-card-root">
        <h3>${card.name} ${card.age ? `<span style="font-size:13px;color:#666;">(${card.age})</span>` : ""}</h3>
        <div class="sub">${card.role}${card.npc ? " • staf rumah" : ""}</div>

        <div class="ws-section">
          <h4>PIKIRAN SAAT INI</h4>
          <div class="ws-thought" id="ws-thought">${card.thought ? `“${card.thought}”` : "<i>Belum terbaca. Tekan 🧠 INTAI untuk menggali (1 panggilan AI).</i>"}</div>
          ${card.intent ? `<div style="font-size:12px;margin-top:4px;" id="ws-intent">🎯 ${card.intent}</div>` : ""}
          <div style="font-size:12px;margin-top:4px;" id="ws-activity">📍 ${card.roomName} — ${card.activity}</div>
        </div>

        <div class="ws-section">
          <h4>PERAN DI WISMA</h4>
          ${card.jobData ? `
            <div style="font-size:13px;"><b>${card.jobData.title}</b></div>
            <div style="font-size:11px;color:#666;">${card.jobData.employer || ""}</div>
            <div style="font-size:11px;color:#555;margin-top:4px;">Kewajiban sehari-hari di wisma:</div>
            <ul style="margin:2px 0 4px 16px;font-size:12px;">
              ${(card.jobData.duties || []).map((d) => `<li>${d}</li>`).join("")}
            </ul>
            <div style="font-size:11px;color:#555;">Keahlian: ${(card.jobData.skills || []).join(", ")}</div>
            ${bar("Tekanan", card.jobData.pressure || 0, "red")}
            ${bar("Harga diri", card.jobData.pride || 0, "amber")}
            <div style="font-size:12px;margin-top:4px;" id="ws-task">
              ${card.task
                ? `Urusan: <b>${card.task.label}</b> — ${Math.round(card.task.progress)}/${card.task.duration} menit`
                : card.nextGoal ? `Berikutnya: ${card.nextGoal}` : "Sedang senggang."}
              <br>Urusan rumah selesai malam ini: <b>${card.tasksCompleted || 0}</b>
            </div>` : `<div style="font-size:12px;">Tidak ada data peran.</div>`}
        </div>

        <div class="ws-section">
          <h4>KONDISI</h4>
          ${bar("Stres", card.mood.stress, "red")}
          ${bar("Takut", card.mood.fear, "amber")}
          ${bar("Marah", card.mood.anger || 0, "red")}
          ${bar("Energi", card.needs.energy, "green")}
          ${bar("Lapar", card.needs.hunger, "amber")}
          ${bar("Butuh sosial", card.needs.social, "green")}
          <div style="font-size:11px;color:#666;margin-top:3px;">Sifat suara: ${card.traits.join(", ")}</div>
        </div>

        <div class="ws-section">
          <h4>KECURIGAAN PRIBADI</h4>
          ${susp}
        </div>

        <div class="ws-section">
          <h4>RELASI (${card.relations.length})</h4>
          ${rels || `<div style="font-size:12px;color:#777;">Belum ada hubungan berarti.</div>`}
        </div>

        <div class="ws-section">
          <h4>INGATAN (${card.memories.length})</h4>
          ${mems || `<div style="font-size:12px;color:#777;">Belum ada ingatan malam ini.</div>`}
        </div>

        <div class="ws-actions">
          <button class="wisma-btn" data-act="probe">🧠 INTAI PIKIRAN</button>
          <button class="wisma-btn" data-act="wiretap">🎧 SADAP DI RUANGAN INI</button>
          <button class="wisma-btn" data-act="search">🔦 GELDAH ${card.roomName}</button>
          ${!card.npc ? `<button class="wisma-btn primary" data-act="interrogate">🗣️ INTEROGASI</button>` : ""}
        </div>
      </div>
    `;

    this.panel.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        if (act === "probe") this._onProbe(id);
        if (act === "wiretap") { this.selectedRoom = card.room; this._onWiretap(); }
        if (act === "search") this._onSearch(card.room);
        if (act === "interrogate") this._onInterrogate(id);
      });
    });
  }

  _patchCardNumbers(card) {
    const t = this.panel.querySelector("#ws-thought");
    if (t && card.thought) t.innerHTML = `“${card.thought}”`;
    const act = this.panel.querySelector("#ws-activity");
    if (act) act.textContent = `📍 ${card.roomName} — ${card.activity}`;
    const task = this.panel.querySelector("#ws-task");
    if (task) {
      task.innerHTML = card.task
        ? `Urusan: <b>${card.task.label}</b> — ${Math.round(card.task.progress)}/${card.task.duration} menit`
        : card.nextGoal ? `Berikutnya: ${card.nextGoal}` : "Sedang senggang.";
    }
    const intent = this.panel.querySelector("#ws-intent");
    if (intent && card.intent) intent.textContent = `🎯 ${card.intent}`;
  }

  _renderLog() {
    const world = this.getWorld?.();
    if (!world) return;
    const entries = world.visibleLog(160);
    this.panel.innerHTML = `
      <div style="font-size:11px;color:#666;margin-bottom:4px;">
        Feed keamanan — terbaru di atas. Rekaman yang berhubungan dengan hal belum terungkap akan disensor otomatis.
      </div>
      <div class="ws-log">
        ${entries
          .map((e) => `
            <div class="ws-log-entry ${e.wiretap ? "wiretap" : ""}" data-kind="${e.kind}">
              <span class="t">${e.timeLabel}</span>
              <span>${e.text}</span>
            </div>`)
          .join("")}
      </div>`;
    this._lastLogId = entries[0]?.id || null;
  }

  _renderArtifacts() {
    const world = this.getWorld?.();
    if (!world) return;
    const items = world.forge.all();
    const found = items.filter((a) => a.found || a.taken);

    this.panel.innerHTML = `
      <div class="ws-section">
        <h4>BARANG HASIL KERJA PENGHUNI</h4>
        <div style="font-size:12px;color:#555;">
          Setiap penghuni menghasilkan barang dari urusan rumahnya. Barang tersembunyi sampai Anda menggeledah ruangannya
          (klik ganda ruangan di peta, atau tombol 🔦 GELDAH). Menyita barang = menambah bukti baru.
        </div>
      </div>
      ${found.length === 0 ? `<div class="ws-empty">Belum ada barang yang ditemukan. Awasi siapa mengerjakan apa, lalu geledah ruangannya.</div>` : ""}
      ${found
        .map((a) => `
          <div class="ws-artifact ${a.taken ? "taken" : ""}">
            <div class="ti">🗃 ${a.title}</div>
            <div class="me">${a.agentName} (${a.agentJob}) • ${a.roomName} • ${a.timeLabel}</div>
            ${a.taken
              ? `<div style="color:#2e7d32;font-size:12px;">✔ sudah disita ${a.evidenceId ? `→ ${a.evidenceId}` : ""}</div>`
              : `<button class="wisma-btn primary" data-take="${a.id}" style="margin-top:4px;">SITA SEKARANG</button>`}
          </div>`)
        .join("")}
    `;

    this.panel.querySelectorAll("[data-take]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = world.takeArtifact(btn.dataset.take);
        if (res.ok) {
          AudioManager.play?.("unlock");
          this._renderArtifacts();
          this._renderHud();
        } else {
          alert(`Gagal menyita: ${res.reason}`);
        }
      });
    });
  }

  // ============================================================
  //  AKSI
  // ============================================================

  _onProbe(id) {
    const world = this.getWorld?.();
    if (!world) return;
    const target = id || this.selectedAgent;
    if (!target) {
      alert("Pilih dulu seorang penghuni di peta.");
      return;
    }
    const a = world.getAgent(target);
    this._showModal(
      `🧠 Mengintai pikiran ${a?.name || target}`,
      `<div class="wt-loading">Membaca isi kepala <b>${a?.name}</b><span class="dots"></span><br>
       <span style="font-size:11px;color:#777;">Memakai 1 panggilan AI kalau kuota tersedia; kalau tidak, mesin simulasi lokal yang menjawab.</span></div>`,
      { busy: true }
    );

    world
      .probe(target)
      .then((res) => {
        if (!res.ok) {
          this._showModal("🧠 Intai pikiran", `<div class="wt-fact">${res.reason}</div>`, {});
          return;
        }
        this._showModal(
          `🧠 Pikiran ${res.name} — ${res.timeLabel}, ${res.roomName}`,
          `
          <div class="ws-thought" style="font-size:14px;">“${res.thought || "..."}”</div>
          ${res.monologue ? `<div style="margin-top:8px;font-size:13px;line-height:1.5;">${res.monologue}</div>` : ""}
          ${res.intent ? `<div class="wt-fact">🎯 Niatnya: ${res.intent}</div>` : ""}
          <div style="margin-top:8px;font-size:11px;color:#666;">Sumber: ${res.source === "ai" ? "🤖 AI (OpenRouter)" : "⚙️ mesin simulasi lokal"}</div>
          `,
          {}
        );
        this._renderAgentCard(target);
      })
      .catch((err) => this._showModal("🧠 Intai pikiran", `<div class="wt-fact">Gagal: ${err.message}</div>`, {}));
  }

  _onWiretap(roomId) {
    const world = this.getWorld?.();
    if (!world) return;
    const room = roomId || this.selectedRoom || this.selectedAgent ? (roomId || world.getAgent(this.selectedAgent)?.room) : null;
    const target = roomId || room || this.selectedRoom;
    if (!target) {
      alert("Pilih dulu sebuah ruangan di peta (atau seorang penghuni).");
      return;
    }
    const people = world.agentsInRoom(target);
    if (people.length < 2) {
      this._showModal(
        `🎧 Sadapan — ${world.floor.roomName(target)}`,
        `<div class="wt-fact">Kurang dari dua orang di ruangan ini. Sadapan butuh percakapan.</div>`,
        {}
      );
      return;
    }

    // pilih pasangan paling panas
    let best = null;
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const rel = world.relations.get(people[i].id, people[j].id);
        const score = rel.tension + rel.affinity + Math.random() * 10;
        if (!best || score > best.score) best = { a: people[i], b: people[j], score };
      }
    }

    this._showModal(
      `🎧 Menyadap ${world.floor.roomName(target)}`,
      `<div class="wt-loading">Mendekatkan mikrofon ke <b>${best.a.name}</b> dan <b>${best.b.name}</b><span class="dots"></span></div>`,
      { busy: true }
    );

    world
      .eavesdrop(best.a.id, best.b.id)
      .then((res) => {
        if (!res.ok) {
          this._showModal("🎧 Sadapan", `<div class="wt-fact">${res.reason}</div>`, {});
          return;
        }
        const nameOf = (id) => res.participants.find((p) => p.id === id)?.name || id;
        this._showModal(
          `🎧 ${res.roomName} — ${res.timeLabel} (${res.secrecy})`,
          `
          ${res.lines
            .map((l) => `<div class="wt-line"><span class="who">${nameOf(l.who)}</span><span>“${l.text}”</span></div>`)
            .join("")}
          ${res.overheardFact ? `<div class="wt-fact">📌 Yang Anda tangkap: ${res.overheardFact}</div>` : ""}
          ${res.secretNote ? `<div class="wt-fact" style="border-left-color:#8b0000;background:#fff0f0;">🔓 Catatan hubungan terbuka: ${res.secretNote}</div>` : ""}
          <div style="margin-top:8px;font-size:11px;color:#666;">Sumber: ${res.source === "ai" ? "🤖 AI (OpenRouter)" : "⚙️ mesin simulasi lokal"} • percakapan ini juga diingat oleh penghuni lain di ruangan.</div>
          `,
          {}
        );
        this._renderTab();
      })
      .catch((err) => this._showModal("🎧 Sadapan", `<div class="wt-fact">Gagal: ${err.message}</div>`, {}));
  }

  _onSearch(roomId) {
    const world = this.getWorld?.();
    if (!world) return;
    const target = roomId || this.selectedRoom;
    if (!target) {
      alert("Pilih dulu sebuah ruangan di peta.");
      return;
    }
    const res = world.searchRoom(target);
    const occupants = res.occupants.map((o) => `${o.name} (${o.activity})`).join(", ") || "kosong";

    this._showModal(
      `🔦 Menggeledah ${res.roomName}`,
      `
      <div style="font-size:12px;color:#555;margin-bottom:6px;">Penghuni di ruangan ini: ${occupants}</div>
      ${res.found.length === 0 ? `<div class="wt-fact">${res.hint || "Tidak ada barang berarti."}</div>` : ""}
      ${res.found
        .map((a) => `
          <div class="ws-artifact">
            <div class="ti">🗃 ${a.title}</div>
            <div class="me">Ditinggalkan oleh ${a.agentName} pukul ${a.timeLabel} saat ${a.taskLabel.toLowerCase()}</div>
            <button class="wisma-btn primary" data-take="${a.id}" style="margin-top:4px;">SITA</button>
          </div>`)
        .join("")}
      ${res.hiddenLocked > 0 ? `<div style="font-size:12px;color:#8b0000;margin-top:6px;">Ada ${res.hiddenLocked} tempat yang belum berani Anda bongkar — butuh petunjuk lain dulu.</div>` : ""}
      `,
      {}
    );

    this._modal?.querySelectorAll("[data-take]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const take = world.takeArtifact(btn.dataset.take);
        if (take.ok) {
          btn.textContent = "✔ DISITA";
          btn.disabled = true;
          AudioManager.play?.("unlock");
        } else {
          alert(take.reason);
        }
      });
    });
  }

  _onInterrogate(id) {
    const world = this.getWorld?.();
    if (!world) return;
    const target = id || this.selectedAgent;
    if (!target) {
      alert("Pilih dulu seorang penghuni.");
      return;
    }
    const a = world.getAgent(target);
    if (a?.npc) {
      alert("Staf rumah (NPC) tidak bisa diinterogasi secara resmi — tapi Anda bisa mengintai pikirannya.");
      return;
    }
    this.close();
    EventBus.emit("interrogation:start", { characterId: target });
  }

  // ============================================================
  //  MODAL
  // ============================================================

  _showModal(title, bodyHtml, opts = {}) {
    this._closeModal();
    const back = document.createElement("div");
    back.className = "wisma-modal-back";
    back.innerHTML = `
      <div class="wisma-modal">
        <header><span>${title}</span><button class="wisma-btn" data-close="1">✕</button></header>
        <div class="body">${bodyHtml}</div>
      </div>`;
    back.addEventListener("click", (e) => {
      if (e.target === back && !opts.busy) this._closeModal();
    });
    back.querySelector("[data-close]")?.addEventListener("click", () => this._closeModal());
    this.rootEl.appendChild(back);
    this._modal = back;
  }

  _closeModal() {
    if (this._modal) {
      this._modal.remove();
      this._modal = null;
    }
  }

  // ============================================================
  //  HIT TEST
  // ============================================================

  _hitTest(e) {
    const world = this.getWorld?.();
    if (!world || !this._scale) return null;
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - this._offsetX) / this._scale;
    const my = (e.clientY - rect.top - this._offsetY) / this._scale;

    // agen dulu (lebih kecil)
    let agentId = null;
    for (const a of world.roster()) {
      if (!a.present || a.left) continue;
      if (a.hidden) continue;
      if (Math.hypot(a.pos.x - mx, a.pos.y - my) < 1.1) {
        agentId = a.id;
        break;
      }
    }
    const room = world.floor.roomAt(mx, my);
    return { agentId, roomId: room?.id || null, x: mx, y: my };
  }

  // ============================================================
  //  GAMBAR PETA (CRT)
  // ============================================================

  _draw() {
    const ctx = this.ctx;
    const world = this.getWorld?.();
    if (!ctx || !this.canvas.width) return;

    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#030d06";
    ctx.fillRect(0, 0, W, H);

    if (!world) {
      ctx.fillStyle = "#2fa85f";
      ctx.font = `${16 * (this._dpr || 1)}px VT323, monospace`;
      ctx.fillText("MENUNGGU DATA KASUS...", 20, 40);
      return;
    }

    const grid = world.floor.grid;
    const dpr = this._dpr || 1;
    const scale = Math.min(this._viewW / grid.cols, this._viewH / grid.rows) * dpr;
    this._scale = scale / dpr;
    const offsetX = (W - grid.cols * scale) / 2;
    const offsetY = (H - grid.rows * scale) / 2;
    this._offsetX = offsetX / dpr;
    this._offsetY = offsetY / dpr;
    ctx.setTransform(1, 0, 0, 1, offsetX, offsetY);

    // --- grid halus ---
    ctx.strokeStyle = "rgba(51,255,102,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= grid.cols; x += 2) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, grid.rows * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.rows; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(grid.cols * scale, y * scale);
      ctx.stroke();
    }

    const rooms = world.roomsState();
    const roster = world.roster();
    const t = world.clock;

    // --- ruangan ---
    for (const r of rooms) {
      const style = KIND_COLOR[r.kind] || KIND_COLOR.hall;
      const x = r.x * scale;
      const y = r.y * scale;
      const w = r.w * scale;
      const h = r.h * scale;

      ctx.fillStyle = style.fill;
      ctx.fillRect(x, y, w, h);

      if (r.id === this.selectedRoom) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }

      // blackout: statis
      if (r.blackout) {
        this._drawStatic(ctx, x, y, w, h);
        ctx.fillStyle = "#ff5a5a";
        ctx.font = `${Math.max(9, scale * 0.62)}px VT323, monospace`;
        ctx.textAlign = "center";
        ctx.fillText("▓ SINYAL HILANG ▓", x + w / 2, y + h / 2);
        ctx.textAlign = "left";
        continue;
      }

      // label ruangan
      ctx.fillStyle = "rgba(180,255,205,0.85)";
      ctx.font = `${Math.max(8, Math.min(13, scale * 0.72))}px VT323, monospace`;
      ctx.fillText(r.icon ? `${r.icon} ${r.name}` : r.name, x + 4, y + Math.max(10, scale * 0.85));

      // titik aktivitas
      for (const s of r.stations) {
        ctx.font = `${Math.max(8, scale * 0.72)}px monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(s.icon || "•", s.x * scale, (s.y + 0.8) * scale);
      }

      // penanda barang
      const arts = r.artifacts || [];
      if (arts.length) {
        const blink = Math.floor(Date.now() / 500) % 2 === 0;
        ctx.font = `${Math.max(9, scale * 0.8)}px monospace`;
        ctx.fillStyle = blink ? "#ffd166" : "#b26a00";
        ctx.fillText(`🗃${arts.length > 1 ? "×" + arts.length : ""}`, x + w - scale * 1.6, y + h - scale * 0.4);
      }
      if (r.hiddenArtifacts) {
        ctx.fillStyle = "rgba(255,90,90,0.5)";
        ctx.font = `${Math.max(8, scale * 0.6)}px monospace`;
        ctx.fillText("?", x + w - scale * 0.7, y + h - scale * 0.4);
      }

      // jumlah penghuni
      if (r.occupants.length) {
        ctx.fillStyle = "#7dffa8";
        ctx.font = `${Math.max(8, scale * 0.62)}px VT323, monospace`;
        ctx.fillText(`👤${r.occupants.length}`, x + 4, y + h - 4);
      }
    }

    // --- pintu / jendela / tangga ---
    for (const d of world.doors) {
      const ax = d.ax * scale;
      const ay = d.ay * scale;
      const bx = d.bx * scale;
      const by = d.by * scale;
      ctx.strokeStyle = d.type === "window" ? "#ffd166" : d.type === "stairs" ? "#7ec8ff" : "#9adfb0";
      ctx.lineWidth = d.type === "window" ? 2.4 : 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (d.type === "window") {
        ctx.fillStyle = "#ffd166";
        ctx.font = `${Math.max(8, scale * 0.7)}px monospace`;
        ctx.fillText("▭", ax - scale * 0.3, ay - scale * 0.2);
      }
    }

    // --- jalur gerak (jejak tipis) ---
    for (const a of roster) {
      if (!a.present || a.left || a.hidden) continue;
      ctx.strokeStyle = "rgba(125,255,168,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.prevPos.x * scale, a.prevPos.y * scale);
      ctx.lineTo(a.pos.x * scale, a.pos.y * scale);
      ctx.stroke();
    }

    // --- penghuni ---
    const idxById = new Map(roster.map((a, i) => [a.id, i]));
    for (const a of roster) {
      if (!a.present || a.left || a.hidden) continue; // ruangan blackout = kamera mati
      const color = a.deceased ? "#ff4444" : AGENT_COLORS[(idxById.get(a.id) || 0) % AGENT_COLORS.length];
      const px = a.pos.x * scale;
      const py = a.pos.y * scale;
      const r = Math.max(3.2, scale * 0.42);

      if (a.id === this.selectedAgent) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r + 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this._hover?.agentId === a.id) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // inisial
      ctx.fillStyle = "#04140a";
      ctx.font = `bold ${Math.max(7, r * 1.25)}px VT323, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(a.deceased ? "✝" : a.name.charAt(0).toUpperCase(), px, py + 0.5);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";

      // nama
      ctx.fillStyle = "rgba(220,255,230,0.9)";
      ctx.font = `${Math.max(8, scale * 0.62)}px VT323, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(a.name.split(" ")[0], px, py + r + Math.max(9, scale * 0.7));
      ctx.textAlign = "left";

      // gelembung ucapan
      if (a.bubble?.text) {
        const text = a.bubble.text.length > 46 ? a.bubble.text.slice(0, 44) + "…" : a.bubble.text;
        ctx.font = `${Math.max(8, scale * 0.6)}px VT323, monospace`;
        const wText = Math.min(ctx.measureText(text).width + 10, scale * 14);
        const bx = px - wText / 2;
        const by = py - r - Math.max(16, scale * 1.15);
        ctx.fillStyle = a.bubble.kind === "wiretap" ? "rgba(20,50,90,0.95)" : a.bubble.kind === "silent" ? "rgba(60,60,60,0.9)" : "rgba(8,30,16,0.95)";
        ctx.fillRect(bx, by, wText, Math.max(13, scale * 0.95));
        ctx.strokeStyle = a.bubble.kind === "argue" || a.bubble.kind === "threat" ? "#ff7a7a" : "#4dff88";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, wText, Math.max(13, scale * 0.95));
        ctx.fillStyle = "#d9ffe6";
        ctx.textAlign = "center";
        ctx.fillText(text, px, by + Math.max(10, scale * 0.7));
        ctx.textAlign = "left";
      }
    }

    // --- vignette ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // jam besar di pojok
    ctx.fillStyle = "rgba(77,255,136,0.55)";
    ctx.font = `${14 * dpr}px VT323, monospace`;
    ctx.fillText(`${world.meta.date || ""} • ${world.hud().timeLabel} • ${world.phaseLabel}`, 8 * dpr, H - 8 * dpr);
  }

  /** Efek statis untuk ruangan blackout. */
  _drawStatic(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const cell = Math.max(3, w / 26);
    for (let i = 0; i < 160; i++) {
      const rx = x + Math.random() * w;
      const ry = y + Math.random() * h;
      const v = Math.random();
      ctx.fillStyle = v > 0.85 ? "rgba(255,255,255,0.35)" : v > 0.6 ? "rgba(120,160,130,0.22)" : "rgba(0,0,0,0.35)";
      ctx.fillRect(rx, ry, cell, cell * 0.6);
    }
    ctx.restore();
  }
}
