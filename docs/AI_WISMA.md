# 🏚️ Wisma Angker (Simulasi Penghuni) — Dokumen Arsitektur

> Fitur **Fase 5b** RetroSleuth: setiap penghuni punya "kecerdasan" dan urusan rumahnya
> sendiri. Mereka berjalan, bekerja, mengobrol, berbohong, dan menghasilkan
> **artefak** (memo, buku tamu, slip telepon, catatan ronda) yang bisa disita
> detektif — sementara pemain menonton lewat CCTV, menyadap, dan mengintip pikiran.
>
> Semua ini berjalan **100% offline** (tanpa satu pun panggilan API). OpenRouter
> free tier hanya dipakai untuk *memperkaya* ucapan/pikiran, dan selalu opsional.

---

## 1. Ringkasan desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Bentuk fitur | **Hybrid**: simulasi denah top-down + panel per-agen + artefak jadi bukti | Tren *AI agent workspace*, tapi dalam bentuk **rumah tinggal** sesuai cerita (Wisma Angker) — bukan kantor |
| Otak agen | **Sutradara batch** (1 panggilan AI menggerakkan semua agen) + panggilan per-karakter hanya untuk momen penting | Kuota free tier cuma **50 request/hari** dan **20 request/menit** |
| Penyedia AI | **OpenRouter free tier saja** (model berakhiran `:free`) | Satu penyedia, tanpa biaya, mudah dipindah ke proxy |
| Tanpa AI | **SimVoice + jadwal + kebutuhan** (prosedural) | Game harus tetap tamat dimainkan offline / GitHub Pages |
| Kunci API | **Dua mode**: langsung dari browser *atau* proxy Node 1 berkas | Aman untuk publikasi, tetap simpel untuk lokal |
| Spoiler | **Anti-spoiler berlapis** (data → prompt → memori → UI) | Wisma tidak boleh membocorkan pelaku sebelum waktunya |

---

## 2. Peta berkas

```
assets/js/
├── ai/
│   ├── OpenRouterClient.js   Klien HTTP OpenRouter (direct / proxy), retry + backoff, health, credits
│   ├── BudgetManager.js      Kuota harian, rate limiter per menit, antrean prioritas, cache, auto-degrade
│   ├── AgentPrompts.js       Pembangun prompt agen + sanitizer JSON + penyaring spoiler
│   ├── AIClient.js           (ditulis ulang) rute semua panggilan AI lewat OpenRouter + Budget
│   └── PromptBuilder.js      (+ `_wismaContext`) suntik konteks wisma ke prompt interogasi
├── wisma/
│   ├── FloorPlan.js          Denah: ruangan, pintu, titik aktivitas, pathfinding A*, blackout/visibilitas
│   ├── MemoryStream.js       Ingatan agen: skor kepentingan, kadaluarsa, kunci spoiler, refleksi
│   ├── Relationships.js      Graf relasi: trust / affinity / fear / tension + rahasia yang terbuka
│   ├── JobSystem.js          Peran di wisma, jadwal per menit, urusan rumah, perilaku bebas
│   ├── SimVoice.js           Bank kalimat offline (gumam kerja, obrolan, argumen, pikiran batin)
│   ├── WismaDirector.js     "Sutradara" AI: 1 panggilan batch → instruksi semua agen
│   ├── ArtifactForge.js      Artefak hasil kerja → bukti dinamis di EvidenceEngine
│   ├── WismaWorld.js        Orkestrator simulasi (tick, fase, insiden, persepsi, aksi pemain)
│   └── WismaController.js   Pengikat ke game: muat wisma.json, gerbang AI, save/unload
├── modules/
│   ├── WismaWindow.js       Jendela UI: peta CCTV, roster, log, artefak, relasi, panel AI
│   └── SettingsWindow.js     (+ tab Wisma, field proxy, migrasi setting lama)
└── ui/DesktopManager.js      (+ ikon 🏚️ Wisma Angker)

assets/css/wisma.css         Gaya jendela Wisma Angker
cases/case_001/wisma.json    Data dunia (~70 KB, data-driven)
tools/
├── openrouter-proxy.mjs      Proxy Node tanpa dependensi (kunci di server)
├── simulate-night.mjs        Uji headless: jalankan semalam penuh, 0 request AI
├── boot-check.mjs            Uji integrasi: boot aplikasi + semua aksi pemain (52 langkah)
└── dom-shim.mjs              DOM tiruan untuk kedua uji di atas
```

---

## 2b. Kosakata fitur

Karena latarnya **rumah tinggal**, bukan kantor, istilah yang muncul di UI dan prompt
mengikuti bahasa rumah tangga:

| Istilah UI | Artinya | Kunci data internal (tidak berubah) |
|---|---|---|
| **Peran di wisma** | siapa orang itu di rumah (kepala pelayan, pembantu dapur, satpam, nyonya rumah, notaris, tamu) | `jobs.<id>.title`, `employer` |
| **Kewajiban sehari-hari** | daftar tanggung jawab perannya | `jobs.<id>.duties[]` |
| **Urusan** / **urusan rumah** | satu kegiatan terjadwal yang sedang/akan dikerjakan | `task`, `schedule[]` |
| **Titik aktivitas** | perabot/lokasi tempat urusan itu dikerjakan (meja ketik, kompor, pos ronda) | `stations[]` |
| **Barang hasil kerja** | artefak yang bisa disita jadi bukti | `artifacts` |

> Kunci JSON/JS (`jobs`, `task`, `duties`, `stations`) sengaja **tidak** diganti agar
> simpanan lama, modding, dan kode tetap stabil — yang berubah hanya bahasa yang
> dilihat pemain dan dibaca model AI.

---

## 3. Siklus simulasi (tick)

```
setiap 500 ms (nyata) ── advance(1 menit simulasi @1x)
   │
   ├─ 1. fase          normal → tension → incident → crisis → aftermath
   ├─ 2. insiden       skrip malam (16 entri): cek, kopi, argumen, mati lampu, mayat…
   ├─ 3. kebutuhan     energy ↓, hunger ↑, social ↑, stres meluruh ke baseline peran
   ├─ 4. pergerakan    A* antar ruangan lewat pintu/tangga/jendela (14 tile/menit)
   ├─ 5. urusan rumah  jadwal → urusan → titik aktivitas → progres → artefak
   ├─ 6. percakapan    pasangan "panas" di ruangan sama → skrip SimVoice / AI
   ├─ 7. persepsi      siapa melihat siapa → ingatan berskor kepentingan
   ├─ 8. sutradara AI  tiap `intervalMin` (default 20 menit sim) → 1 panggilan batch
   └─ 9. refleksi      ringkas ingatan jadi kesimpulan (opsional AI)
```

Satu malam = 17:00 → 02:30 = **570 menit simulasi** ≈ **4,75 menit nyata** pada 1x
(kecepatan 2x/4x/8x tersedia di UI). Biaya AI semalam penuh ≈ **28 panggilan**
(sutradara saja), jauh di bawah kuota harian 50.

### Fase malam

| Fase | Rentang | Perilaku |
|---|---|---|
| `normal` | 17:00–21:00 | semua orang bekerja sesuai jadwal, obrolan ringan |
| `tension` | 21:00–22:00 | relasi memanas, argumen, ancaman |
| `incident` | 22:00–22:30 | **mati lampu ruang kerja**, suara pecah, korban tewas 22:25 |
| `crisis` | 22:30–00:15 | kepanikan, semua dikumpulkan, interogasi spontan |
| `aftermath` | 00:15–02:30 | gosip, bersih-bersih, orang mulai pulang |

---

## 4. Strategi anggaran AI (`BudgetManager`)

Kuota OpenRouter **free tier**: 50 request/hari, 20 request/menit (akun-wide).
Setelah membeli kredit $10 sekali seumur hidup: 1.000/hari (RPM tetap 20).

```
level AI (Settings ▸ Wisma)     arti
─────────────────────────────────────────────────────────────
off      tidak ada panggilan AI sama sekali (SimVoice penuh)
hemat    sutradara tiap 40 menit, tanpa refleksi AI      ≈ 14 panggilan/malam
normal   sutradara tiap 20 menit + refleksi               ≈ 28 panggilan/malam  ← default
intens   sutradara tiap 10 menit + intai/sadap pakai AI   ≈ 50 panggilan/malam
```

Mekanisme pengaman:

1. **Kuota harian** — penghitung tersimpan di `localStorage`, reset otomatis tiap tanggal baru.
2. **Cadangan interogasi** — default **12 request** disisakan; wisma tidak boleh memakainya
   (`wismaLeft = dailyLeft - reserve`). Interogasi adalah inti game, wisma hanya bumbu.
3. **Rate limiter** — jendela geser 60 detik; plafon efektif `perMinuteLimit - 2` (18/menit)
   supaya tidak menabrak 429.
4. **Antrean prioritas** — `interrogation (0) > eavesdrop (1) > probe (2) > director (3) > reflection (4)`.
   Job prioritas rendah dibuang lebih dulu saat kuota menipis.
5. **Retry + backoff** — 429/5xx dicoba ulang (maks 2x) dengan jeda menaik + `Retry-After`.
6. **Cache** — jawaban identik dalam 15 menit tidak diminta ulang.
7. **Auto-degrade** — 3 kegagalan beruntun atau kuota habis → mode lokal 10 menit,
   lalu dicoba lagi. UI selalu menampilkan sumber jawaban (`🤖 AI` / `⚙️ lokal`).

---

## 5. Dua mode kunci API

### A. Langsung dari browser (default, paling simpel)

Settings ▸ AI ▸ isi **OpenRouter API Key** → disimpan di `localStorage` browser Anda.
Cocok untuk main sendiri di `localhost`.
⚠️ Jangan pakai mode ini di situs publik: kunci terlihat di jaringan & storage browser.

### B. Proxy Node 1 berkas (untuk GitHub Pages / publik)

```bash
# 1. taruh kunci (pilih salah satu)
export OPENROUTER_API_KEY="sk-or-v1-..."
echo "sk-or-v1-..." > tools/.openrouter-key      # pastikan file ini di-.gitignore

# 2. jalankan proxy
npm run proxy                                     # http://0.0.0.0:8787

# 3. di game: Settings ▸ AI ▸ Proxy URL = http://localhost:8787
```

Proxy (`tools/openrouter-proxy.mjs`, **tanpa dependensi**) melakukan:

| Butir | Detail |
|---|---|
| Kunci di server | browser tidak pernah melihat `OPENROUTER_API_KEY` |
| Kuota server-side | `DAILY_LIMIT=50`, `RPM_LIMIT=18` — menolak sebelum menembak OpenRouter |
| CORS | `ALLOW_ORIGIN=*` (default) atau origin tertentu |
| Cache | `CACHE_TTL_MS` (default 0 = mati) |
| Endpoint | `POST /chat`, `GET /health`, `GET /credits` |
| Variabel env | `PORT`, `HOST`, `ALLOW_ORIGIN`, `DAILY_LIMIT`, `RPM_LIMIT`, `CACHE_TTL_MS`, `OPENROUTER_MODEL` |

> GitHub Pages tidak bisa menjalankan Node. Untuk publik, taruh proxy di service
> kecil (Fly.io, Render, VPS) lalu isi Proxy URL-nya di Settings.

---

## 6. Anti-spoiler (lapisan demi lapisan)

Kasus ini punya **blackout ruang kerja 22:05–23:10** — justru di situlah racun
bekerja. Karena itu:

1. **Data** — `wisma.json` tidak memuat `truths`/`secrets` karakter; hanya peran,
   jadwal, relasi, dan insiden yang *teramati*.
2. **Visibilitas** — selama blackout `FloorPlan.isVisible('ruang_kerja') === false`:
   tidak ada log, tidak ada persepsi, tidak ada sadapan, agen di dalam ruangan
   ditandai `hidden`/`unmonitored` dan **tidak digambar** di peta CCTV.
3. **Snapshot AI** — sutradara mendapat posisi sebenarnya (ia perlu menata adegan)
   tetapi tiap agen membawa flag `unobservable: true` + catatan fase, dan prompt
   melarang karakter lain "melihat" ke ruangan itu.
4. **Memori** — ingatan bernilai spoiler dikunci (`locked`) sampai bukti terkait
   ditemukan; `MemoryStream.visible(discovered)` menyaringnya.
5. **Prompt interogasi** — `PromptBuilder` aturan 9–10: jangan pernah mengaku,
   jangan membocorkan peristiwa yang tidak mungkin diketahui karakter.
6. **Sanitizer** — `AgentPrompts._spoilerFilter` membuang frasa pengakuan
   (`meracun`, `sianida`, `aku yang membunuh`, …) dari keluaran AI sebelum
   dipakai dunia.
7. **Uji otomatis** — `npm run simulate` memindai seluruh ucapan/ingatan semalam
   dan **gagal** bila ada kebocoran atau ada saksi di ruangan blackout.

---

## 7. Format `wisma.json`

Semua data-driven; menambah kasus baru = menulis satu berkas JSON.

| Kunci | Isi |
|---|---|
| `meta` | judul, `start_time`/`end_time`, `tick_ms`, `minutes_per_tick`, `incident_time`, ruang & jam blackout |
| `grid` | `cols`, `rows`, `tile` (px) untuk denah |
| `rooms[]` | `id`, `name`, `x/y/w/h`, `floor`, `kind`, `locked`, `blackout` |
| `doors[]` | `from`, `to`, `ax/ay/bx/by`, `type` (`door`/`stairs`/`window`), `locked`, `label` |
| `stations[]` | titik kerja: `id`, `room`, `x/y`, `label`, `kind` |
| `npcs[]` | penghuni non-karakter (satpam, korban) |
| `jobs{}` | per peran: `title`, `employer`, `duties[]`, `skills[]`, `pressure`, `pride`, `schedule[]` |
| `free_behaviors{}` | perilaku saat menganggur (makan, istirahat, gosip, rokok) |
| `relationships[]` | `a`, `b`, `trust`, `affinity`, `fear`, `tension`, `secret_note`, `reveal_evidence` |
| `chatter{}` | bank kalimat per suasana (`work`, `casual`, `argue`, `anxious`, …) |
| `incidents[]` | skrip malam: `at`, `rooms[]`, `broadcast`, `stress`, `unlock_evidence`, `gather` |
| `ai{}` | model, anggaran, tingkat otonomi |
| `artifact_template{}` | kerangka artefak → bukti |
| `simulation{}` | `movement.speed_tiles_per_min`, `needs_decay`, `memory`, `perception`, `conversation` |
| `agents{}` | per karakter: kepribadian sim, jadwal, kebutuhan awal, ruang asal |
| `phase_notes{}` | catatan naratif per fase untuk prompt sutradara |
| `room_blackout_static` | teks statis yang tampil di layar CCTV saat blackout |

### Artefak → bukti

Urusan yang selesai dapat menyetor artefak (`ArtifactForge`). 14 artefak pada
`case_001`: **12** terhubung ke bukti yang sudah ada (`evi_003`, `evi_005`,
`evi_007`, `evi_011`, `evi_016`, `evi_018`, `evi_020`, `evi_022`, `evi_023`,
`evi_024`, `evi_025`, …) dan **2** dibuat dinamis saat permainan berjalan:

| Artefak | Bukti dinamis |
|---|---|
| Catatan Ronda Malam Budi | `memory_log` |
| Catatan Ancaman Bos Guntur | `threat_note` |

Mengambil artefak (`world.takeArtifact(id)`) memanggil
`EvidenceEngine.unlockEvidence()` / `registerDynamicEvidence()` → bukti masuk
inventaris, dossier karakter ikut terbarui, dan memori terkunci yang terkait
menjadi terlihat.

---

## 8. API yang paling sering dipakai

```js
// dari konsol browser (semua terekspos untuk debugging)
const { wisma, wismaWindow, world } = window.__RETROSLEUTH;

world.start(); world.pause(); world.setSpeed(4); world.seekTo(22*60+30);
world.advance(1);                        // maju 1 menit simulasi
world.hud();                             // jam, fase, statistik
world.roster();                          // semua penghuni (ringan, untuk peta)
world.agentCard('char_002');             // panel lengkap satu karakter
world.roomsState(); world.doorsState();  // denah untuk render

await world.probe('char_001');           // intai pikiran (1 request AI bila tersedia)
await world.eavesdrop('char_002','char_007'); // sadap percakapan 2 orang seruangan
world.searchRoom('ruang_kerja');         // geledah ruangan
world.takeArtifact('art_001');           // sita artefak → bukti

world.snapshotForAI({});                 // bahan prompt sutradara
world.save(); world.hasSave(); world.clearSave();   // localStorage per kasus
wisma.applySettings({ level: 'hemat', speed: 2 });
```

Event (`EventBus`) yang dipancarkan dunia:

```
wisma:tick  wisma:state  wisma:phase  wisma:incident  wisma:agent-moved
wisma:conversation  wisma:artifact  wisma:request-evidence  wisma:eavesdrop
wisma:probe  wisma:ai-gate  ai:budget
```

---

## 9. Pengaturan (Settings ▸ Wisma)

| Field | Default | Arti |
|---|---|---|
| `level` | `normal` | `off` / `hemat` / `normal` / `intens` — seberapa sering AI dipanggil |
| `intervalMin` | `20` | jeda panggilan sutradara (menit simulasi) |
| `speed` | `1` | 1x / 2x / 4x / 8x |
| `dailyLimit` | `50` | kuota request per hari |
| `perMinuteLimit` | `20` | kuota per menit (dipakai 18 agar aman) |
| `reserve` | `12` | cadangan khusus interogasi |
| `enabled` | `true` | matikan seluruh fitur wisma |
| `aiOnDemand` | `true` | AI hanya aktif saat jendela Wisma dibuka ← **penghemat utama** |
| `autoStart` | `true` | simulasi jalan sendiri begitu kasus dimuat |
| `useAIForEavesdrop` | `true` | sadapan memakai AI (bila kuota ada) |
| `useAIForReflection` | `true` | refleksi memori memakai AI |

Setting lama (endpoint `localhost:20128`, model `ag-gemini3`, kunci tertanam)
**dimigrasi otomatis** saat pertama kali dibuka: kunci hardcoded dibuang, endpoint
diganti OpenRouter, dan model disetel ke model `:free`.

---

## 10. Uji otomatis

```bash
npm run check:boot   # boot seluruh aplikasi di Node (DOM tiruan), 52 langkah
npm run simulate     # jalankan semalam penuh headless, 0 request AI
npm run simulate:full# + cuplikan log CCTV & memori tiap penghuni
npm run check        # keduanya
```

`check:boot` memverifikasi: import & boot, ikon desktop, muat kasus, dunia
terbangun (16 ruangan / 18 pintu / 75 urusan / 16 insiden), render 6 tab, kartu
agen, `probe`, `eavesdrop`, penolakan sadapan saat blackout, `searchRoom`,
`takeArtifact`, `hud`, `snapshotForAI` bebas spoiler, tab Wisma di Settings,
`applySettings`, prompt interogasi memuat `[WISMA ANGKER]` dan bebas spoiler,
fallback AI tanpa kunci, `checkHealthDetailed`, `budget.stats`, save/hasSave/clearSave,
unload.

`simulate` memverifikasi: 570 tick selesai, semua insiden terpicu, artefak
terbentuk, dan **dua uji anti-spoiler** (tidak ada kata racun/pelaku di seluruh
ucapan & ingatan; tidak ada saksi di ruang kerja selama blackout).

> Kedua uji memakai `tools/dom-shim.mjs` — DOM tiruan, `fetch` yang membaca dari
> disk, dan **tanpa akses jaringan**. Jadi tidak ada kuota AI yang terpakai saat uji.

---

## 11. Menambah kasus baru

1. Buat folder `cases/case_XXX/` dengan `case.json`, `characters/`, `evidence/`.
2. Tulis `cases/case_XXX/wisma.json` (salin dari `case_001`, ganti denah/jadwal).
3. Pastikan setiap `jobs.<peran>.schedule[]` menunjuk `task` yang terdaftar di
   `agents.<id>.tasks[]`, dan setiap `station` ada di `stations[]`.
4. Tandai urusan sensitif dengan `"spoiler": true` dan `"reveal_evidence": ["evi_xxx"]`.
5. Jalankan `npm run simulate` (ubah `CASE` di berkas uji bila perlu) → harus hijau.

Tidak ada build step, tidak ada dependensi npm, tidak ada kompilasi: cukup JSON.
