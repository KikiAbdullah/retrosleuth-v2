/**
 * ============================================================
 *  boot-check.mjs — Uji integrasi headless (tanpa browser)
 * ------------------------------------------------------------
 *  Menjalankan SELURUH aplikasi RetroSleuth di Node.js memakai
 *  DOM tiruan (tools/dom-shim.mjs), lalu:
 *    1. boot  (DOMContentLoaded → runBootSequence → initializeApp)
 *    2. muat kasus case_001 lewat CaseLoader (fetch dari disk)
 *    3. buka Wisma Angker, jalankan tick, render semua tab
 *    4. uji aksi pemain: intai (probe), sadap ruang, geledah, ambil artefak
 *    5. buka Pengaturan → tab Wisma → applySettings
 *    6. uji prompt interogasi (konteks wisma + anti-spoiler)
 *    7. uji jalur AI tanpa API key (harus fallback, bukan crash)
 *    8. simpan / bongkar sesi
 *
 *  Tujuannya menangkap error start-up & runtime: import rusak,
 *  nama method salah, event tidak terdaftar. Bukan uji visual.
 *
 *  Jalankan: npm run check:boot
 * ============================================================
 */

import { installDomShim } from "./dom-shim.mjs";

const { document, errors } = installDomShim();

const log = (...a) => console.log(...a);
const steps = [];
let failures = 0;

function step(name, ok, detail = "") {
  steps.push({ name, ok: !!ok, detail });
  if (!ok) failures++;
  log(`  ${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

log("────────────────────────────────────────────────────────────────────────");
log("🔌 RETROSLEUTH — UJI BOOT HEADLESS (DOM tiruan, tanpa jaringan)");
log("────────────────────────────────────────────────────────────────────────");

// ============================================================
//  1. BOOT
// ============================================================
try {
  await import("../assets/js/main.js");
  step("import main.js", true);
} catch (e) {
  step("import main.js", false, e?.message);
  console.error(e);
}

let app = null;
try {
  document.dispatchEvent({ type: "DOMContentLoaded", target: document });
  // tunggu sampai initializeApp() menaruh global-nya (maks 20 detik)
  for (let i = 0; i < 200 && !globalThis.window?.__RETROSLEUTH; i++) await sleep(100);
  app = globalThis.window?.__RETROSLEUTH;
  step("boot sequence selesai", !!app, app ? "window.__RETROSLEUTH tersedia" : "global tidak ditemukan");
} catch (e) {
  step("boot sequence selesai", false, e?.message);
  console.error(e);
}

if (!app) {
  log("\n💥 Boot gagal — sisa uji dilewati.");
  log(errors.slice(0, 10).join("\n"));
  process.exit(1);
}

// ============================================================
//  2. KOMPONEN INTI TERDAFTAR
// ============================================================
const wajib = ["wm", "desktop", "taskbar", "loader", "eviEngine", "aiClient", "openRouter", "aiBudget", "wisma", "wismaWindow", "settings", "interrogationRoom"];
for (const k of wajib) step(`komponen ${k}`, app[k] != null, app[k] == null ? "tidak terinisialisasi" : "");

try {
  const icons = app.desktop?.apps || app.desktop?.icons || [];
  const list = Array.isArray(icons) ? icons.map((i) => i.id || i.windowId) : Object.keys(icons || {});
  step("ikon 🏚️ Wisma Angker di desktop", list.includes("wisma"), list.slice(0, 12).join(", "));
} catch (e) {
  step("ikon 🏚️ Wisma Angker di desktop", false, e?.message);
}

// ============================================================
//  3. MUAT KASUS
// ============================================================
let caseData = null;
try {
  caseData = await app.loader.loadFullCase("case_001");
  step("muat case_001", !!caseData, caseData ? `${caseData.characters?.length ?? 0} karakter` : "null");
} catch (e) {
  step("muat case_001", false, e?.message);
  console.error(e);
}

await sleep(300); // beri waktu handler case:loaded (wisma.loadForCase)

const world = app.wisma?.world;
step("WismaController membangun dunia", !!world, world ? `${world.agents?.size ?? 0} penghuni` : "world kosong");
step(
  "wisma.json terbaca",
  (world?.floor?.rooms?.size ?? 0) > 0 && (world?.jobs?.tasks?.size ?? 0) > 0,
  `${world?.floor?.rooms?.size ?? 0} ruangan · ${world?.floor?.doors?.length ?? 0} pintu · ${world?.jobs?.tasks?.size ?? 0} urusan · ${world?.incidents?.length ?? 0} insiden`
);

// ============================================================
//  4. BUKA JENDELA WISMA + JALANKAN SIMULASI
// ============================================================
try {
  app.wismaWindow.open();
  step("buka jendela Wisma Angker", app.wismaWindow.built === true, "UI terbangun");
} catch (e) {
  step("buka jendela Wisma Angker", false, e?.message);
  console.error(e);
}
await sleep(150);

try {
  world.start?.();
  world.pause?.(); // loop rAF dimatikan; tick dipicu manual di bawah
  let ticks = 0;
  while (ticks < 90 && world.clock < world.endMin) {
    world.advance(1, { quiet: true });
    ticks++;
  }
  const st = world.stats || {};
  step(
    "simulasi 90 tick",
    ticks === 90,
    `jam ${world.constructor.timeLabel(world.clock)} · ${st.conversations ?? 0} percakapan · ${st.artifacts ?? 0} artefak · ${st.aiCalls ?? 0} panggilan AI`
  );
} catch (e) {
  step("simulasi 90 tick", false, e?.message);
  console.error(e);
}

// render semua tab
for (const tab of ["map", "roster", "log", "artifacts", "relations", "ai"]) {
  try {
    app.wismaWindow.tab = tab;
    app.wismaWindow._renderTab();
    app.wismaWindow._renderHud();
    if (tab === "map") app.wismaWindow._draw();
    step(`render tab "${tab}"`, true);
  } catch (e) {
    step(`render tab "${tab}"`, false, e?.message);
    console.error(e);
  }
}

// kartu agen
let firstAgent = null;
try {
  firstAgent = [...world.agents.values()].find((a) => a.present && !a.deceased);
  const card = world.agentCard(firstAgent.id);
  step("agentCard()", !!card?.name, `${card?.name} · ${card?.activity} · ${card?.tasksCompleted ?? 0} tugas selesai`);
  app.wismaWindow._renderAgentCard(firstAgent.id);
  step("render kartu agen di UI", true);
} catch (e) {
  step("agentCard()", false, e?.message);
}

// mundurkan jam ke puncak malam supaya ada artefak & aktivitas untuk diuji
try {
  world.seekTo(22 * 60 + 45);
  for (let i = 0; i < 25; i++) world.advance(1, { quiet: true });
  step("seek ke 23:10 (puncak malam)", world.clock >= 22 * 60 + 45, `jam ${world.constructor.timeLabel(world.clock)} · fase ${world.phase} · ${world.stats?.artifacts ?? 0} artefak`);
} catch (e) {
  step("seek ke puncak malam", false, e?.message);
}

// ============================================================
//  5. AKSI PEMAIN (semua harus jalan tanpa AI / mode offline)
// ============================================================
try {
  const res = await world.probe(firstAgent.id);
  const text = res?.thought || res?.text || res?.speech || "";
  step("intai pikiran (probe)", typeof text === "string" && text.length > 0, `[${res?.source ?? "?"}] ${String(text).slice(0, 60)}`);
} catch (e) {
  step("intai pikiran (probe)", false, e?.message);
  console.error(e);
}

try {
  const room = [...world.floor.rooms.keys()].find((r) => world.agentsInRoom(r).filter((x) => !x.deceased).length >= 2 && world.floor.isVisible(r));
  if (!room) throw new Error("tidak ada ruangan terpantau dengan 2+ penghuni hidup");
  const people = world.agentsInRoom(room).filter((x) => !x.deceased);
  const res = await world.eavesdrop(people[0].id, people[1].id);
  step(
    "sadap ruangan (eavesdrop)",
    res?.ok === true && Array.isArray(res.lines) && res.lines.length > 0,
    `${world.floor.roomName(room)}: ${res?.lines?.length ?? 0} baris · sumber ${res?.source ?? "?"}`
  );
  const bocorWt = JSON.stringify(res?.lines ?? []).match(/(meracun|sianida|aku yang membunuh)/i);
  step("sadapan bebas pengakuan langsung", !bocorWt, bocorWt ? `ADA "${bocorWt[0]}"` : "");
} catch (e) {
  step("sadap ruangan (eavesdrop)", false, e?.message);
}

// blackout: sadapan di ruang kerja harus DITOLAK selama kamera mati
try {
  world.seekTo(22 * 60 + 30);
  for (let i = 0; i < 5; i++) world.advance(1, { quiet: true });
  const people = world.agentsInRoom("ruang_kerja").filter((x) => !x.deceased);
  const res = people.length >= 2
    ? await world.eavesdrop(people[0].id, people[1].id)
    : { ok: false, reason: "ruangan kosong (memang tidak ada yang bisa disadap)" };
  step("sadapan ditolak saat blackout ruang kerja", res?.ok === false, res?.reason || "");
} catch (e) {
  step("sadapan ditolak saat blackout", false, e?.message);
}

try {
  const res = world.searchRoom("ruang_kerja");
  step("geledah ruangan (searchRoom)", res != null, `${res?.found?.length ?? 0} temuan`);
} catch (e) {
  step("geledah ruangan (searchRoom)", false, e?.message);
}

try {
  const items = world.forge.foundList();
  const res = items.length ? world.takeArtifact(items[0].id) : null;
  step("ambil artefak (takeArtifact)", items.length === 0 ? true : res != null, `${items.length} artefak tersedia`);
} catch (e) {
  step("ambil artefak (takeArtifact)", false, e?.message);
}

try {
  const hud = world.hud();
  step("hud()", !!hud?.timeLabel || !!hud?.clock, JSON.stringify(hud).slice(0, 90));
} catch (e) {
  step("hud()", false, e?.message);
}

try {
  const snap = world.snapshotForAI({});
  step("snapshotForAI()", Array.isArray(snap?.agents) && snap.agents.length > 0, `${snap?.agents?.length ?? 0} agen · fase ${snap?.phase}`);
  const bocor = JSON.stringify(snap).match(/(meracun|sianida|pelaku sebenarnya)/i);
  step("snapshot AI bebas spoiler", !bocor, bocor ? ` ditemukan kata "${bocor[0]}"` : "");
} catch (e) {
  step("snapshotForAI()", false, e?.message);
}

// ============================================================
//  6. PENGATURAN (tab AI + tab Wisma)
// ============================================================
try {
  app.settings.open();
  await sleep(100);
  step("buka jendela Pengaturan", true);
} catch (e) {
  step("buka jendela Pengaturan", false, e?.message);
}

try {
  app.settings._showPanel?.("wisma") ?? app.settings.showPanel?.("wisma");
  step("render tab Wisma di Pengaturan", true);
} catch (e) {
  step("render tab Wisma di Pengaturan", false, e?.message);
}

try {
  app.wisma.applySettings({ level: "normal", speed: 2, aiOnDemand: false });
  step("applySettings() wisma", app.wisma.settings?.level === "normal", `level=${app.wisma.settings?.level} speed=${app.wisma.settings?.speed} aiOnDemand=${app.wisma.settings?.aiOnDemand}`);
  app.wisma.applySettings({ level: "off" });
  step("applySettings({level:'off'})", app.wisma.settings?.level === "off", "AI dimatikan");
} catch (e) {
  step("applySettings() wisma", false, e?.message);
}

// ============================================================
//  7. PROMPT INTEROGASI + ANTI-SPOILER
// ============================================================
try {
  const { PromptBuilder } = await import("../assets/js/ai/PromptBuilder.js");
  const suspectId = "char_002";
  const prompt = String(PromptBuilder.build(suspectId) || "");
  const hasWisma = /\[WISMA ANGKER\]/.test(prompt);
  step("prompt interogasi memuat [WISMA ANGKER]", hasWisma, `${prompt.length} karakter`);

  // Blok wisma TIDAK boleh memuat kebenaran kasus (hanya fakta terpantau).
  const wismaBlock = prompt.split("[WISMA ANGKER]")[1]?.split(/\n\[[A-Z ]+\]/)[0] || "";
  const TERLARANG = /(meracun|sianida|racun|membunuh|pelaku|mayat|korban meninggal)/i;
  const bocorWisma = wismaBlock.match(TERLARANG);
  step("blok [WISMA ANGKER] bebas spoiler", !bocorWisma && wismaBlock.length > 0, bocorWisma ? `ADA "${bocorWisma[0]}"` : `${wismaBlock.length} karakter bersih`);

  // Aturan anti-bocor harus tertulis di prompt.
  step("prompt memuat aturan anti-spoiler", /(jangan|tidak boleh)[^.]*?(akui|mengaku|bocor|membongkar)/i.test(prompt), "aturan 9-10");
} catch (e) {
  step("PromptBuilder + wisma", false, e?.message);
  console.error(e);
}

// ============================================================
//  8. AI TANPA KUNCI → HARUS FALLBACK, BUKAN CRASH
// ============================================================
try {
  const res = await app.aiClient.sendMessage("char_002", "Di mana Anda pukul 22.30?");
  step("aiClient.sendMessage tanpa API key", typeof res?.reply === "string" && res.reply.length > 0, `source=${res?.source} success=${res?.success}`);
} catch (e) {
  step("aiClient.sendMessage tanpa API key", false, e?.message);
  console.error(e);
}

try {
  const detail = await app.aiClient.checkHealthDetailed();
  step("aiClient.checkHealthDetailed()", detail != null, JSON.stringify(detail).slice(0, 100));
} catch (e) {
  step("aiClient.checkHealthDetailed()", false, e?.message);
}

try {
  const st = app.aiBudget.stats();
  step(
    "budget.stats()",
    typeof st?.dailyLeft === "number",
    `dipakai ${st.used}/${st.dailyLimit} · sisa wisma ${st.wismaLeft} · cadangan interogasi ${st.reserve} · degrade=${st.degraded}`
  );
} catch (e) {
  step("budget.stats()", false, e?.message);
}

// ============================================================
//  9. SIMPAN / BONGKAR
// ============================================================
try {
  world.save();
  const keys = [];
  for (let i = 0; i < globalThis.localStorage.length; i++) keys.push(globalThis.localStorage.key(i));
  const wismaKey = keys.find((k) => /wisma/i.test(k));
  step("world.save()", !!wismaKey, wismaKey ? `kunci "${wismaKey}" (${globalThis.localStorage.getItem(wismaKey).length} byte)` : `kunci: ${keys.join(", ")}`);
  step("world.hasSave()", world.hasSave() === true);
  world.clearSave?.();
  step("world.clearSave()", world.hasSave() === false);
} catch (e) {
  step("world.save()/hasSave()", false, e?.message);
  console.error(e);
}

try {
  app.wismaWindow.close?.();
  app.wisma.unload?.();
  step("tutup jendela + wisma.unload()", app.wisma.world == null, "world dibebaskan");
} catch (e) {
  step("tutup jendela + wisma.unload()", false, e?.message);
}

// ============================================================
// 10. MIGRASI NAMA LAMA ("office" → "wisma")
// ============================================================
try {
  const KEY = "retrosleuth_settings";
  const backup = globalThis.localStorage.getItem(KEY);
  const lama = backup ? JSON.parse(backup) : {};
  delete lama.wisma; // payload pra-rename tidak punya kunci "wisma"
  lama.office = { level: "hemat", speed: 4, aiOnDemand: false };
  globalThis.localStorage.setItem(KEY, JSON.stringify(lama));
  const { SettingsWindow } = await import("../assets/js/modules/SettingsWindow.js");
  const sw = new SettingsWindow(app.wm);
  const w = sw.settings?.wisma || {};
  step(
    "migrasi settings.office → settings.wisma",
    w.level === "hemat" && w.speed === 4 && sw.settings.office === undefined,
    `level=${w.level} speed=${w.speed} kunciLama=${sw.settings.office === undefined ? "sudah dibuang" : "MASIH ADA"}`
  );
  if (backup) globalThis.localStorage.setItem(KEY, backup);
  else globalThis.localStorage.removeItem(KEY);
} catch (e) {
  step("migrasi settings.office → settings.wisma", false, e?.message);
}

try {
  await app.loader.loadFullCase("case_001"); // dunia dibangun ulang
  await sleep(350);
  const w2 = app.wisma?.world;
  if (!w2) throw new Error("dunia tidak dibangun ulang");
  w2.save();
  const payload = globalThis.localStorage.getItem("retrosleuth_wisma_case_001");
  if (!payload) throw new Error("save baru tidak tertulis");
  // seolah-olah save ini dibuat sebelum fitur dinamai ulang
  globalThis.localStorage.setItem("retrosleuth_office_case_001", payload);
  globalThis.localStorage.removeItem("retrosleuth_wisma_case_001");

  const ketemu = w2.hasSave();
  const kunciBaru = globalThis.localStorage.getItem("retrosleuth_wisma_case_001");
  const kunciLama = globalThis.localStorage.getItem("retrosleuth_office_case_001");
  step(
    "migrasi kunci save lama (retrosleuth_office_*)",
    ketemu && !!kunciBaru && kunciLama == null,
    `hasSave=${ketemu} · kunci baru=${kunciBaru ? "terisi" : "kosong"} · kunci lama=${kunciLama ? "MASIH ADA" : "bersih"}`
  );
  const dipulihkan = w2.load();
  step("pulihkan sesi dari hasil migrasi", dipulihkan === true, `jam ${w2.constructor.timeLabel(w2.clock)} · fase ${w2.phase}`);
  w2.clearSave();
} catch (e) {
  step("migrasi kunci save lama", false, e?.message);
}

// ============================================================
//  LAPORAN
// ============================================================
log("\n────────────────────────────────────────────────────────────────────────");
log(`HASIL: ${steps.length - failures}/${steps.length} langkah lulus`);
if (errors.length) {
  log(`\nconsole.error tertangkap (${errors.length}):`);
  for (const e of errors.slice(0, 8)) log(`  • ${String(e).slice(0, 300)}`);
}
log("────────────────────────────────────────────────────────────────────────");

if (failures || errors.length) {
  log("⚠️  ADA MASALAH SAAT BOOT/RUNTIME.");
  process.exit(1);
}
log("✅ APLIKASI BOOT BERSIH — siap dijalankan di browser.");
process.exit(0);
