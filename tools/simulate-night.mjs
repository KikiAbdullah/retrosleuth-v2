#!/usr/bin/env node
/**
 * ============================================================
 *  SIMULATE-NIGHT.MJS — Uji kepala-terpotong (headless) untuk
 *  Wisma Angker RetroSleuth.
 * ------------------------------------------------------------
 *  Menjalankan SEMUA malam 14 Juni 1979 di dalam Node (tanpa
 *  browser, tanpa API, tanpa kuota) lalu melaporkan:
 *    • apakah sepuluh penghuni benar-benar bergerak & bekerja
 *    • berapa urusan rumah selesai, percakapan, ingatan, artefak
 *    • apakah insiden & blackout berjalan
 *    • UJI ANTI-SPOILER: tidak boleh ada ingatan/ucapan yang
 *      membocorkan pelaku atau racun sebelum waktunya
 *
 *  PAKAI:
 *    node tools/simulate-night.mjs            # ringkas
 *    node tools/simulate-night.mjs --full     # + cuplikan log & memori
 *    node tools/simulate-night.mjs --case case_001
 * ============================================================
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ------------------------------------------------------------
//  1. STUB LINGKUNGAN BROWSER (sebelum modul game diimpor)
// ------------------------------------------------------------
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
  clear: () => store.clear(),
};
globalThis.window = globalThis;
globalThis.document = {
  addEventListener() {},
  getElementById: () => null,
  createElement: () => ({ style: {}, appendChild() {}, querySelector: () => null, addEventListener() {} }),
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  head: { appendChild() {} },
};
try {
  Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
} catch {
  /* Node sudah menyediakan navigator — biarkan */
}
globalThis.fetch = async () => {
  throw new Error("offline (headless)");
};
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// ------------------------------------------------------------
//  2. MUAT DATA
// ------------------------------------------------------------
const args = process.argv.slice(2);
const full = args.includes("--full");
const caseIdx = args.indexOf("--case");
const caseFolder = caseIdx > -1 ? args[caseIdx + 1] : "case_001";

const caseDir = path.join(ROOT, "cases", caseFolder);
const wismaPath = path.join(caseDir, "wisma.json");
const casePath = path.join(caseDir, "case.json");

if (!fs.existsSync(wismaPath)) {
  console.error(`❌ ${wismaPath} tidak ada. Wisma Angker belum didefinisikan untuk kasus ini.`);
  process.exit(1);
}

const wismaData = JSON.parse(fs.readFileSync(wismaPath, "utf8"));
const caseData = JSON.parse(fs.readFileSync(casePath, "utf8"));

const characters = (caseData.characters || [])
  .map((ref) => {
    const p = path.join(caseDir, caseData.assets?.character_directory || "characters", ref.file);
    if (!fs.existsSync(p)) return null;
    return { ...ref, ...JSON.parse(fs.readFileSync(p, "utf8")) };
  })
  .filter(Boolean);

// ------------------------------------------------------------
//  3. JALANKAN DUNIA
// ------------------------------------------------------------
const { WismaWorld } = await import(path.join(ROOT, "assets/js/wisma/WismaWorld.js"));
const { EventBus } = await import(path.join(ROOT, "assets/js/core/EventBus.js"));

const world = new WismaWorld({
  data: wismaData,
  characters,
  director: null, // murni offline — menguji tulang punggung simulasi
  evidenceEngine: {
    unlockEvidence: (id) => unlockedEvidence.add(id),
    registerDynamicEvidence: () => true,
  },
  notificationSystem: null,
});

const unlockedEvidence = new Set();
EventBus.on("wisma:request-evidence", ({ evidenceId }) => unlockedEvidence.add(evidenceId));
const started = Date.now();
let steps = 0;
const errors = [];

// rekam semua ucapan & ingatan untuk uji spoiler
const spoken = [];
const remembered = [];

process.on("uncaughtException", (e) => errors.push(`uncaught: ${e.message}`));

while (world.clock < world.endMin) {
  try {
    world.advance(1, { quiet: true });
    steps++;
  } catch (err) {
    errors.push(`tick ${world.clock}: ${err.message}\n${err.stack?.split("\n").slice(0, 3).join("\n")}`);
    break;
  }
  // panggil sutradara (offline) sesekali agar jalur AI-fallback ikut teruji
  if (steps % 20 === 0) {
    try {
      world._maybeDirector();
      world._maybeReflections();
    } catch (err) {
      errors.push(`director ${world.clock}: ${err.message}`);
    }
  }
}

// kumpulkan ucapan & ingatan
for (const e of world.log) {
  if (e.kind === "talk") spoken.push(e.text);
}
for (const a of world.agents.values()) {
  for (const m of a.memory.entries) remembered.push({ who: a.name, ...m });
}

const ms = Date.now() - started;

// ------------------------------------------------------------
//  4. LAPORAN
// ------------------------------------------------------------
const line = "─".repeat(72);
console.log(line);
console.log("🕵️  RETROSLEUTH — SIMULASI WISMA ANGKER (headless, 0 request AI)");
console.log(line);
console.log(`Kasus        : ${caseData.meta?.title} (${caseFolder})`);
console.log(`Rentang      : ${WismaWorld.timeLabel(world.startMin)} → ${WismaWorld.timeLabel(world.endMin)} (${steps} langkah)`);
console.log(`Durasi uji   : ${ms} ms (${(ms / Math.max(1, steps)).toFixed(2)} ms/langkah)`);
console.log(`Fase akhir   : ${world.phaseLabel}`);
console.log(`Insiden jalan: ${world.executedIncidents.size}/${world.incidents.length}`);
console.log(`Percakapan   : ${world.stats.conversations}`);
console.log(`Entri log    : ${world.log.length}`);
console.log(`Bukti terbuka: ${[...unlockedEvidence].join(", ") || "-"}`);
console.log("");

console.log("PENGHUNI".padEnd(18), "URUSAN", "INGATAN", "RUANGAN AKHIR", "STATUS");
for (const a of world.agents.values()) {
  const done = a.tasksCompleted || 0;
  console.log(
    a.name.padEnd(18),
    String(done).padEnd(5),
    String(a.memory.entries.length).padEnd(7),
    world.floor.roomName(a.room).padEnd(14),
    a.deceased ? "✝ meninggal" : a.left ? "pergi" : a.present ? `${a.state} · stres ${Math.round(a.mood.stress)}` : "belum tiba"
  );
}
console.log("");

// artefak
const arts = world.forge.all();
console.log(`ARTEFAK HASIL KERJA (${arts.length})`);
for (const art of arts) {
  console.log(`  • ${art.title.padEnd(46)} ${art.roomName.padEnd(16)} ${art.timeLabel}  oleh ${art.agentName}  → ${art.evidence || art.dynamic}`);
}
console.log("");

// relasi paling panas
const rels = world.relations
  .toJSON()
  .map((r) => ({ ...r, nama: `${world.agents.get(r.a)?.name || r.a} ↔ ${world.agents.get(r.b)?.name || r.b}` }))
  .sort((x, y) => y.tension - x.tension)
  .slice(0, 6);
console.log("RELASI PALING TEGANG");
for (const r of rels) {
  console.log(`  • ${r.nama.padEnd(34)} trust ${String(r.trust).padStart(3)}  affinity ${String(r.affinity).padStart(3)}  tension ${String(r.tension).padStart(3)}`);
}
console.log("");

// ------------------------------------------------------------
//  5. UJI ANTI-SPOILER
// ------------------------------------------------------------
const FORBIDDEN = [
  /meracun/i,
  /sianida/i,
  /saya yang membunuh/i,
  /aku yang membunuh/i,
  /racun (itu )?(milik|punya)/i,
];
const leaks = [];
for (const t of spoken) {
  if (FORBIDDEN.some((rx) => rx.test(t))) leaks.push(`UCAPAN: ${t}`);
}
for (const m of remembered) {
  if (m.spoiler) continue; // ingatan berspoiler memang dikunci dari pemain & AI
  if (FORBIDDEN.some((rx) => rx.test(m.text))) leaks.push(`INGATAN ${m.who}: ${m.text}`);
}
// tidak boleh ada yang "melihat" ke dalam ruang kerja saat blackout
const blackoutLeaks = [];
for (const m of remembered) {
  if (m.fromIncident) continue; // siaran insiden: diketahui semua orang, bukan mengintip
  if (m.room === "ruang_kerja" && m.type === "observation") {
    const minutes = m.clock;
    if (minutes >= 22 * 60 + 5 && minutes <= 23 * 60 + 10) blackoutLeaks.push(`${m.who} @${m.timeLabel}: ${m.text}`);
  }
}

console.log("UJI ANTI-SPOILER");
console.log(`  Kebocoran racun/pelaku : ${leaks.length === 0 ? "✅ tidak ada" : "❌ " + leaks.length}`);
leaks.slice(0, 5).forEach((l) => console.log(`     - ${l}`));
console.log(`  Saksi saat blackout    : ${blackoutLeaks.length === 0 ? "✅ tidak ada" : "❌ " + blackoutLeaks.length}`);
blackoutLeaks.slice(0, 5).forEach((l) => console.log(`     - ${l}`));
console.log("");

if (errors.length) {
  console.log(`❌ ERROR (${errors.length}):`);
  errors.slice(0, 5).forEach((e) => console.log("   " + e));
}

if (full) {
  console.log(line);
  console.log("CUPLIKAN LOG CCTV (30 entri penting)");
  console.log(line);
  for (const e of world.visibleLog(400).filter((x) => x.importance >= 45).slice(-30).reverse()) {
    console.log(`${e.timeLabel} [${e.kind.padEnd(8)}] ${e.roomName.padEnd(18)} ${e.text}`);
  }
  console.log("");
  console.log(line);
  console.log("MEMORI TIAP PENGHUNI (5 terpenting)");
  console.log(line);
  for (const a of world.agents.values()) {
    console.log(`\n▶ ${a.name} — ${a.job}`);
    for (const m of a.memory.important(5)) {
      console.log(`   (${m.timeLabel}) [${m.importance}] ${m.text}`);
    }
    if (a.thought) console.log(`   💭 ${a.thought}`);
  }
}

console.log("");
console.log(line);
const ok = errors.length === 0 && leaks.length === 0 && blackoutLeaks.length === 0 && world.stats.conversations > 0;
console.log(ok ? "✅ SIMULASI SEHAT — dunia hidup tanpa satu pun panggilan AI." : "⚠️  ADA MASALAH — lihat laporan di atas.");
console.log(line);
process.exit(ok ? 0 : 1);
