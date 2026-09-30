/**
 * ============================================================
 *  WISMADIRECTOR.JS — Sutradara AI Wisma Angker
 * ------------------------------------------------------------
 *  Menghubungkan dunia simulasi dengan model AI lewat BudgetManager.
 *  Empat jenis panggilan:
 *
 *   1. directorTick  → 1 request menggerakkan SEMUA penghuni
 *   2. deepProbe     → 1 request, pikiran mendalam satu orang
 *   3. eavesdrop     → 1 request, sadap percakapan dua orang
 *   4. reflect       → 1 request, merangkum ingatan jadi kecurigaan
 *
 *  Setiap panggilan PUNYA JARING PENGAMAN: kalau kuota habis,
 *  key kosong, model error, atau JSON-nya rusak → SimVoice yang
 *  mengambil alih. Simulasi tidak pernah berhenti.
 * ============================================================
 */

import { EventBus } from "../core/EventBus.js";
import { AgentPrompts } from "../ai/AgentPrompts.js";
import { SimVoice } from "./SimVoice.js";

export class WismaDirector {
  /**
   * @param {Object} deps
   * @param {import("../ai/OpenRouterClient.js").OpenRouterClient} deps.client
   * @param {import("../ai/BudgetManager.js").BudgetManager} deps.budget
   * @param {Object} [deps.config]
   */
  constructor({ client, budget, config = {} }) {
    this.client = client;
    this.budget = budget;
    this.config = {
      enabled: config.enabled !== false,
      level: config.level || "normal", // off|hemat|normal|intens
      intervalMin: config.intervalMin || 20,
      temperature: config.temperature ?? 0.9,
      batchMaxTokens: config.batchMaxTokens || 900,
      deepMaxTokens: config.deepMaxTokens || 400,
      useAIForEavesdrop: config.useAIForEavesdrop !== false,
      useAIForReflection: config.useAIForReflection ?? true,
    };

    this.metrics = {
      aiDirector: 0,
      simDirector: 0,
      aiDeep: 0,
      simDeep: 0,
      aiEavesdrop: 0,
      simEavesdrop: 0,
      parseFailures: 0,
      lastSource: "sim",
      lastError: null,
    };
  }

  setConfig(patch = {}) {
    Object.assign(this.config, patch);
    if (patch.intervalMin !== undefined) this.config.intervalMin = patch.intervalMin;
    EventBus.emit("wisma:ai-config", { ...this.config });
  }

  get aiActive() {
    return (
      this.config.enabled &&
      this.config.level !== "off" &&
      !!this.client?.usable &&
      !this.budget?.isDegraded
    );
  }

  // ============================================================
  //  1) DIRECTOR TICK
  // ============================================================

  /**
   * @param {Object} snapshot - dari WismaWorld.snapshotForAI()
   * @returns {Promise<{source:'ai'|'sim', agents:Map|null, worldNote:string, error?:string}>}
   */
  async directorTick(snapshot) {
    if (!this.aiActive) {
      return this._simDirector(snapshot, this.aiActive ? null : this._reasonWhy());
    }

    const prompt = AgentPrompts.directorBatch(snapshot);
    const result = await this.budget.enqueue({
      kind: "director",
      dropIfBusy: true, // tick berikutnya akan mencoba lagi; jangan menumpuk
      run: async () => {
        const res = await this.client.chat({
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: this.config.temperature,
          maxTokens: this.config.batchMaxTokens,
          jsonMode: true,
          tag: "director",
        });
        if (!res.ok) return { ok: false, error: res.error };
        const parsed = AgentPrompts.sanitizeDirector(
          res.json ?? null,
          snapshot.agents.map((a) => a.id),
          snapshot.rooms.map((r) => r.id)
        );
        if (!parsed) return { ok: false, error: "JSON director tidak bisa dipakai" };
        return { ok: true, value: { ...parsed, model: res.model } };
      },
    });

    if (result.ok && result.value?.agents) {
      this.metrics.aiDirector++;
      this.metrics.lastSource = "ai";
      this.metrics.lastError = null;
      EventBus.emit("wisma:ai-used", { kind: "director", model: result.value.model });
      return {
        source: "ai",
        agents: result.value.agents,
        worldNote: result.value.worldNote || SimVoice.worldNote(snapshot.phase),
      };
    }

    return this._simDirector(snapshot, result.reason || "AI tidak tersedia");
  }

  _simDirector(snapshot, reason = null) {
    this.metrics.simDirector++;
    this.metrics.lastSource = "sim";
    if (reason && reason !== this.metrics.lastError) {
      this.metrics.lastError = reason;
      EventBus.emit("wisma:ai-fallback", { kind: "director", reason });
    }

    const agents = new Map();
    for (const a of snapshot.agents) {
      const thought = SimVoice.thought(a);
      let speech = "";
      let speechTo = null;

      // bicara hanya kalau ada orang lain di ruangan yang sama & butuh sosial
      const partner = a.visibleWith?.[0] || null;
      if (partner && a.needs?.social < 70 && Math.random() < 0.55) {
        speech = SimVoice.line(a, a.chatter || "casual", { otherName: partner });
        speechTo = snapshot.agents.find((x) => x.name === partner)?.id || null;
      }

      agents.set(a.id, {
        id: a.id,
        thought,
        speech,
        speechTo,
        action: a.activity || "berdiri",
        moveTo: null,
        mood: {
          stress: a.phase === "crisis" ? 2 : a.phase === "aftermath" ? 1 : 0,
          energy: -1,
          social: partner ? 3 : -1,
        },
        relation: null,
        memory: a.lastMemory || "",
      });
    }

    return { source: "sim", agents, worldNote: SimVoice.worldNote(snapshot.phase), error: reason };
  }

  _reasonWhy() {
    if (!this.config.enabled || this.config.level === "off") return "Mode AI dimatikan pengguna.";
    if (!this.client?.usable) return "Belum ada API key / proxy OpenRouter.";
    if (this.budget?.isDegraded) return "AI sedang cooldown setelah beberapa kegagalan.";
    const gate = this.budget?.canSpend("director");
    if (gate && !gate.allowed) return gate.reason;
    return null;
  }

  // ============================================================
  //  2) DEEP PROBE (intai pikiran satu orang)
  // ============================================================

  /**
   * @param {Object} snapshot
   * @param {Object} agentSnap
   * @returns {Promise<{source:string,data:Object}>}
   */
  async deepProbe(snapshot, agentSnap) {
    if (!this.aiActive) return { source: "sim", data: this._simDeep(agentSnap) };

    const prompt = AgentPrompts.deepProbe(snapshot, agentSnap);
    const result = await this.budget.enqueue({
      kind: "deep",
      run: async () => {
        const res = await this.client.chat({
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: this.config.temperature,
          maxTokens: this.config.deepMaxTokens,
          jsonMode: true,
          tag: "deep",
        });
        if (!res.ok) return { ok: false, error: res.error };
        const clean = AgentPrompts.sanitizeDeep(
          res.json,
          agentSnap.id,
          snapshot.rooms.map((r) => r.id)
        );
        if (!clean) return { ok: false, error: "JSON deep tidak valid" };
        return { ok: true, value: clean };
      },
    });

    if (result.ok && result.value) {
      this.metrics.aiDeep++;
      this.metrics.lastSource = "ai";
      EventBus.emit("wisma:ai-used", { kind: "deep", agent: agentSnap.id });
      return { source: "ai", data: result.value };
    }
    return { source: "sim", data: this._simDeep(agentSnap), error: result.reason };
  }

  _simDeep(agentSnap) {
    this.metrics.simDeep++;
    return {
      id: agentSnap.id,
      thought: SimVoice.thought(agentSnap),
      monologue: [
        SimVoice.thought(agentSnap),
        SimVoice.line(agentSnap, agentSnap.chatter || "work", {}),
        SimVoice.reflection(agentSnap),
      ].join(" "),
      speech: SimVoice.line(agentSnap, agentSnap.chatter || "casual", {}),
      action: agentSnap.activity || "berdiri",
      moveTo: null,
      mood: { stress: agentSnap.phase === "crisis" ? 3 : 1, energy: -1, social: 0 },
      memory: agentSnap.lastMemory || "",
      intent: `${agentSnap.nextGoal || "melanjutkan urusannya"} dalam 30 menit ke depan.`,
    };
  }

  // ============================================================
  //  3) EAVESDROP (sadap percakapan)
  // ============================================================

  async eavesdrop(snapshot, aSnap, bSnap, ctx) {
    const offline = () => {
      this.metrics.simEavesdrop++;
      const lines = SimVoice.conversation(aSnap, bSnap, {
        chatter: ctx.chatter || "casual",
        roomName: ctx.roomName,
      });
      return {
        source: "sim",
        data: {
          lines,
          learned: [
            { id: aSnap.id, memory: SimVoice.reflection(aSnap) },
            { id: bSnap.id, memory: SimVoice.reflection(bSnap) },
          ],
          overheardFact: SimVoice.overheardFact(aSnap, bSnap, {
            timeLabel: ctx.timeLabel,
            roomName: ctx.roomName,
          }),
          secrecy: ctx.chatter === "secret" ? "rahasia" : "semi",
          relation: { trust: 0, affinity: 1, tension: ctx.chatter === "argue" ? 3 : 0 },
        },
      };
    };

    if (!this.aiActive || !this.config.useAIForEavesdrop) return offline();

    const prompt = AgentPrompts.eavesdrop(snapshot, aSnap, bSnap, ctx);
    const result = await this.budget.enqueue({
      kind: "eavesdrop",
      run: async () => {
        const res = await this.client.chat({
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: Math.min(1.05, this.config.temperature + 0.1),
          maxTokens: this.config.deepMaxTokens + 250,
          jsonMode: true,
          tag: "eavesdrop",
        });
        if (!res.ok) return { ok: false, error: res.error };
        const clean = AgentPrompts.sanitizeEavesdrop(res.json, aSnap.id, bSnap.id);
        if (!clean) return { ok: false, error: "JSON sadapan tidak valid" };
        return { ok: true, value: clean };
      },
    });

    if (result.ok && result.value) {
      this.metrics.aiEavesdrop++;
      this.metrics.lastSource = "ai";
      EventBus.emit("wisma:ai-used", { kind: "eavesdrop", agents: [aSnap.id, bSnap.id] });
      return { source: "ai", data: result.value };
    }
    return offline();
  }

  // ============================================================
  //  4) REFLECTION
  // ============================================================

  async reflect(snapshot, agentSnap) {
    const offline = () => ({
      source: "sim",
      data: {
        reflections: [SimVoice.reflection(agentSnap)],
        suspicion: null,
      },
    });

    if (!this.aiActive || !this.config.useAIForReflection) return offline();

    const prompt = AgentPrompts.reflection(snapshot, agentSnap);
    const result = await this.budget.enqueue({
      kind: "reflect",
      priority: 20,
      dropIfBusy: true,
      run: async () => {
        const res = await this.client.chat({
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: this.config.temperature,
          maxTokens: 300,
          jsonMode: true,
          tag: "reflect",
        });
        if (!res.ok) return { ok: false, error: res.error };
        const j = res.json;
        if (!j || !Array.isArray(j.reflections)) return { ok: false, error: "JSON refleksi tidak valid" };
        const ids = snapshot.agents.map((a) => a.id);
        const susp =
          j.suspicion && ids.includes(j.suspicion.id)
            ? { id: j.suspicion.id, score: Math.max(0, Math.min(100, Number(j.suspicion.score) || 0)) }
            : null;
        return {
          ok: true,
          value: {
            reflections: j.reflections.filter((r) => typeof r === "string").slice(0, 3).map((r) => r.slice(0, 220)),
            suspicion: susp,
          },
        };
      },
    });

    if (result.ok && result.value) return { source: "ai", data: result.value };
    return offline();
  }
}
