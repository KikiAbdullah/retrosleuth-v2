# 🕵️ RetroSleuth: Case Files Detective

**RetroSleuth** adalah game investigasi kriminal imersif yang berjalan sepenuhnya di browser modern.  
Anda adalah detektif di era 1970-an, duduk di depan terminal komputer hijau berpendar, menganalisis bukti, dan menginterogasi tersangka dengan kecerdasan buatan (AI) lokal.

Alih-alih memilih dialog dari daftar, Anda **mengetik pertanyaan sendiri**. Setiap tersangka memiliki ingatan, kepribadian, dan rahasia—yang bisa berbohong, marah, atau akhirnya mengaku jika dihadapkan pada bukti yang tepat.

> 🎮 **Live Demo**: [https://kikiabdullah.github.io/retrosleuth-v2/](https://kikiabdullah.github.io/retrosleuth-v2/)
>
> 📄 **Dokumentasi Lengkap**: [PRD.md](PRD.md) · 🏢 **Kantor Virtual (AI Workspace)**: [docs/AI_OFFICE.md](docs/AI_OFFICE.md)

Mulai **v2.1.0**, RetroSleuth punya **Kantor Virtual**: sebuah "AI workspace" di dalam game.
Delapan tersangka dan dua NPC hidup di **Wisma Angker** sepanjang malam — masing-masing punya
jabatan, jadwal kerja, kebutuhan tubuh, ingatan, dan relasinya sendiri. Mereka berjalan antar
ruangan, mengetik surat, meronda, berbisik, bertengkar, dan **menghasilkan artefak** (buku tamu,
slip telepon, catatan ronda, draf wasiat) yang bisa Anda sita sebagai bukti. Anda menonton lewat
CCTV, menyadap percakapan, dan mengintip pikiran mereka — sementara satu panggilan AI "sutradara"
(OpenRouter **free tier**) sesekali menghidupkan dialognya. Tanpa API pun dunia ini tetap hidup.

---

## ✨ Fitur Utama

| Fitur                              | Deskripsi                                                                                                                        |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 🕵️ **Interogasi AI Open-Ended**    | Bukan pohon dialog. Anda mengetik pertanyaan bebas ke tersangka, dan AI merespons secara dinamis sesuai kepribadian karakter.    |
| 🏢 **Kantor Virtual (AI Workspace)** | Denah top-down Wisma Angker: 10 penghuni berjalan, bekerja, dan mengobrol sendiri sepanjang malam (17:00–02:30). Tonton lewat CCTV, sadap, atau intai pikiran. |
| 🧠 **Agen Otonom per Karakter** | Tiap karakter punya jabatan, jadwal kerja, kebutuhan (energi/lapar/sosial), stres, ingatan berskor, dan graf relasi sendiri — bukan skrip dialog. |
| 🗂️ **Pekerjaan Jadi Bukti** | Hasil kerja agen menjadi artefak (buku tamu, slip PABX, catatan ronda, draf wasiat). Menyitanya membuka bukti — termasuk 2 bukti dinamis yang baru lahir saat permainan berjalan. |
| 🎭 **Anti-Spoiler Berlapis** | Saat lampu ruang kerja mati (22:05–23:10), kamera buta: tidak ada log, tidak ada saksi, tidak ada sadapan. Prompt AI tidak pernah diberi tahu siapa pelakunya. |
| 🔑 **OpenRouter Free Tier** | Satu-satunya penyedia AI: model `:free`. Kuota harian, rate limiter, antrean prioritas, cache, retry/backoff, dan auto-degrade ke mode lokal. |
| 🛡️ **Kunci API Aman (opsional)** | Main langsung dari browser, **atau** jalankan proxy Node 1 berkas (`tools/openrouter-proxy.mjs`) supaya kunci tidak pernah terlihat di browser. |
| 🖥️ **Estetika CRT Autentik**       | Monitor hijau retro dengan efek _scanline_, _flicker_, _glow_, dan font monospace `VT323`. Bisa dimatikan jika mengganggu.       |
| 📝 **Data-Driven & Modding-First** | Semua konten (kasus, karakter, bukti) disimpan dalam file JSON dan Markdown. Buat kasus sendiri tanpa menyentuh kode!            |
| ⏱️ **Investigasi Real-Time**       | Bukti, laporan lab, dan panggilan telepon muncul sesuai waktu nyata. Deadline 2 jam memberi tekanan psikologis. *(planned)* |
| 💾 **Persistent Progression**      | Progres otomatis tersimpan ke IndexedDB. Tutup browser, lanjutkan nanti dari titik terakhir.                                     |
| 🎹 **Audio Prosedural**            | Semua suara (ketikan, notifikasi, alarm, melodi kemenangan) dihasilkan via Web Audio API. **Zero byte** file audio eksternal.    |
| 📦 **Zero Dependencies**           | Murni Vanilla JS, HTML, dan CSS. Tidak ada framework, tidak ada _build step_. Buka `index.html` dan mainkan!                     |
| 🌐 **GitHub Pages Ready**          | Static hosting. Push ke repository, aktifkan GitHub Pages, dan langsung _live_.                                                  |

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ Modules
- **UI Style**: Windows 1.0 / CRT Monitor Retro
- **AI Communication**: `fetch` ke **OpenRouter** (`/api/v1/chat/completions`) — langsung dari browser atau lewat proxy Node tanpa dependensi
- **AI Workspace**: mesin simulasi agen mandiri (denah + A*, memori, relasi, jabatan, insiden) di `assets/js/office/` — jalan penuh tanpa API
- **Persistence**: IndexedDB (via `idb`) dengan fallback `localStorage`
- **Audio**: Web Audio API (Oscillator-based procedural sounds)
- **Markdown**: `marked.js` (dimuat dari CDN)
- **Deployment**: Static hosting (GitHub Pages, Netlify, Vercel)

---

## 🚀 Cara Menjalankan

### 1. Prasyarat

- Browser modern (Chrome/Edge 90+, Firefox 90+, Safari 15+)
- (Opsional) Server AI lokal untuk fitur interogasi

### 2. Menjalankan Tanpa Server AI (Offline Mode)

Game tetap 100% bisa dimainkan tanpa AI. Fitur interogasi akan menampilkan respons _fallback_ generik.

```bash
# Clone repository
git clone https://github.com/KikiAbdullah/retrosleuth-v2.git
cd retrosleuth-v2

# Jalankan dengan static server (pilih salah satu)
npm run serve        # python3 -m http.server 8080 --bind 0.0.0.0
npx serve .          # atau Live Server VS Code
# Buka http://localhost:8080 (atau port yang diberikan serve)
```

Tidak ada `npm install` yang diperlukan — **nol dependensi**. `package.json` hanya berisi
script utilitas (server statis, proxy AI, dan uji headless).

```bash
npm run simulate     # jalankan semalam penuh di terminal (0 request AI) — cek dunia hidup
npm run check:boot   # boot seluruh aplikasi di Node (DOM tiruan), 52 langkah verifikasi
npm run check        # keduanya
```

Atau cukup **double-click** `index.html` di file explorer (beberapa browser mungkin memblokir CORS file lokal, gunakan static server untuk pengalaman terbaik).

> **Catatan**: Game ini menggunakan ES Modules, sehingga **wajib** dijalankan melalui static server (bukan `file://`). Gunakan ekstensi Live Server di VS Code atau `npx serve .`.

### 3. Mengaktifkan AI (OpenRouter Free Tier)

Game **tidak butuh AI** untuk tamat — Kantor Virtual dan interogasi punya mesin lokal.
Tetapi dengan AI, ucapan dan pikiran karakter jadi jauh lebih hidup.

**Langkah 1 — ambil kunci gratis**

1. Daftar di [openrouter.ai](https://openrouter.ai) → *Keys* → **Create Key**.
2. Pilih model berakhiran `:free` (mis. `meta-llama/llama-3.3-70b-instruct:free`).
   Kuota free tier: **50 request/hari**, **20 request/menit**.

**Langkah 2 — pilih mode**

<table>
<tr><th>Mode</th><th>Cara</th><th>Cocok untuk</th></tr>
<tr>
<td><b>A. Langsung</b><br>(default)</td>
<td>Settings ▸ AI ▸ isi <b>API Key</b> → disimpan di <code>localStorage</code> browser Anda.</td>
<td>Main sendiri di <code>localhost</code>.<br>⚠️ jangan dipakai di situs publik.</td>
</tr>
<tr>
<td><b>B. Proxy Node</b><br>(1 berkas, nol dependensi)</td>
<td>
<pre>export OPENROUTER_API_KEY="sk-or-v1-..."
npm run proxy            # listen di 0.0.0.0:8787</pre>
lalu Settings ▸ AI ▸ <b>Proxy URL</b> = <code>http://localhost:8787</code>
</td>
<td>GitHub Pages / demo publik — kunci tetap di server, kuota dijaga server.</td>
</tr>
</table>

**Langkah 3 — uji**: Settings ▸ AI ▸ **Test Connection** (menampilkan model, latensi, dan sisa kredit).

**Langkah 4 — atur Kantor Virtual**: Settings ▸ tab 🏢 **Kantor**

| Setting | Saran |
|---|---|
| `Level AI` | **Hemat** untuk kuota 50/hari · **Normal** (default) · **Intens** bila punya kredit |
| `AI on-demand` | biarkan **nyala** — AI hanya bekerja saat jendela Kantor dibuka |
| `Cadangan interogasi` | 12 request — kantor tidak boleh memakainya |
| `Kecepatan` | 1x (realistis) sampai 8x (cepat) |

> 💡 Tanpa kunci sama sekali, semua tetap jalan: dialog memakai **SimVoice**
> (bank kalimat procedural per kepribadian) dan panel AI menampilkan `⚙️ lokal`.
> Setting lama (endpoint `localhost:20128` / model `ag-gemini3`) **dimigrasi otomatis**.

## 🎮 Panduan Bermain Singkat

1. **🖥️ Boot Sequence** — Animasi terminal DOS-style muncul saat game dimulai. Tunggu atau klik untuk melanjutkan.
2. **👋 Welcome Window** — Panduan fitur muncul otomatis. Baca dan tutup untuk memulai.
3. **📁 Case Files** — Pilih kasus yang ingin diselidiki.
4. **📋 Briefing** — Baca laporan polisi pembuka untuk memahami konteks dan korban.
5. **🔍 Evidence** — Baca bukti yang tersedia. Klik bukti untuk melihat detail lengkap.
6. **👤 Dossier** — Lihat profil tersangka. Klik **INTEROGASI** untuk mulai bertanya.
7. **🗣️ Interrogation** — Ketik pertanyaan bebas, AI akan merespons sesuai karakter.
   - _Tips_: Sodorkan bukti fisik via **Evidence Strip** untuk mendapatkan pengakuan.
   - Perhatikan **Emotion Bars** (Trust, Stress, Fear, Anger) sebagai indikator kejujuran.
8. **🏢 Kantor Virtual** — Klik ikon 🏢 di desktop (atau taskbar) untuk mengawasi Wisma Angker:
   - **Peta CCTV** — lihat penghuni berjalan & bekerja. Klik orang untuk membuka panelnya, klik ruangan untuk aksi.
   - **🎧 Sadap** — dengarkan percakapan dua orang di satu ruangan (kadang membuka rahasia relasi).
   - **🧠 Intai** — baca pikiran terdalam satu karakter (memakai 1 request AI bila tersedia).
   - **🔍 Geledah** — cari artefak yang tertinggal di ruangan.
   - **🗂️ Artefak** — sita hasil kerja mereka; bukti baru masuk inventaris & membuka ingatan terkunci.
   - **▓ Blackout** — saat lampu ruang kerja mati, kamera buta: tidak ada yang bisa dilihat/disadap di sana.
9. **⏱️ Timeline** — Lihat kronologi kejadian dengan filter berdasarkan tipe, partisipan, dan bukti.
10. **📝 Notes** — Catat teori dan kontradiksi Anda (auto-save, Ctrl+S).
11. **⚖️ Accusation** — Jika sudah yakin, ajukan tuduhan dengan pelaku, motif, dan bukti yang cukup.
12. **🎉 Solved!** — Jika tuduhan benar, kasus selesai dan epilog akan muncul.

**Fitur yang belum tersedia**: Crime Scene interaktif, Objectives Tracker *(sedang dikembangkan)*.

---

## ⌨️ Keyboard Shortcuts

| Shortcut     | Aksi                                 |
| :----------- | :----------------------------------- |
| `Ctrl + Tab` | Cycle antar jendela yang terbuka     |
| `Escape`     | Tutup jendela aktif                  |
| `F1`         | Buka window Help / Welcome           |
| `F12`        | Toggle efek CRT (Scanline & Flicker) |
| `Ctrl + S`   | Quick Save (simpan progres manual)   |

---

## 🛠️ Modding & Konten Kustom

RetroSleuth dirancang sebagai platform **data-driven** dan **modding-first**. Anda bisa membuat kasus baru hanya dengan menulis JSON dan Markdown—tanpa perlu coding!

### Struktur Dasar Kasus

```
cases/
├── index.json                     # Registri global kasus
└── case_001/                      # Folder kasus baru
    ├── case.json                  # Manifest utama
    ├── briefing.md                # Laporan pembuka
    ├── solution.md                # Epilog solusi
    ├── characters/                # Data karakter
    │   ├── char_001.json
    │   └── char_002.json
    └── evidence/                  # Bukti (Markdown)
        ├── evi_001.md
        └── evi_002.md
```

### Panduan Membuat Kasus

1. Buat folder baru di `cases/` dengan ID increment (`case_002`, `case_003`, dst).
2. Buat `case.json` (manifest) — lihat contoh di `cases/case_001/`.
3. Tambahkan file karakter (`char_XXX.json`) dan bukti (`evi_XXX.md`).
4. Daftarkan kasus di `cases/index.json`.

📖 **Panduan Lengkap**: Lihat [PRD.md](PRD.md) bagian Data Model & Content Authoring untuk skema JSON/Markdown.

---

## 📁 Struktur Proyek

```
retrosleuth/
├── index.html                      # Entry point utama
├── README.md                       # Dokumentasi ini
├── .gitignore
│
├── assets/
│   ├── css/                        # Semua stylesheet
│   │   ├── variables.css           # CSS Custom Properties (Design Tokens)
│   │   ├── reset.css               # Reset browser
│   │   ├── crt.css                 # Efek scanline & flicker
│   │   ├── desktop.css             # Desktop & ikon
│   │   ├── windows.css             # Styling jendela retro
│   │   ├── taskbar.css             # Taskbar bawah
│   │   ├── interrogation.css       # UI interogasi
│   │   ├── evidence.css            # UI bukti
│   │   ├── notes.css               # UI notepad
│   │   ├── briefing.css            # UI briefing
│   │   ├── dossier.css             # UI dossier karakter
│   │   ├── settings.css            # UI pengaturan
│   │   ├── accusation.css          # UI formulir tuduhan
│   │   └── office.css              # UI Kantor Virtual (CCTV, panel agen)
│   │
│   ├── js/
│   │   ├── main.js                 # Bootstrapper aplikasi
│   │   ├── core/                   # Inti sistem
│   │   │   ├── EventBus.js         # Pub/Sub system
│   │   │   └── Store.js            # GameState singleton
│   │   ├── engine/                 # Logika bisnis
│   │   │   ├── CaseLoader.js       # Muat data kasus
│   │   │   ├── EvidenceEngine.js   # Manajemen bukti
│   │   │   ├── SolutionEngine.js   # Validasi tuduhan
│   │   │   ├── TimelineEngine.js   # Manajemen timeline
│   │   │   └── RealTimeManager.js  # Event real-time ✅ v4.2.0
│   │   │
│   │   │   # Planned (belum diimplementasikan):
│   │   │   # (semua engine sudah diimplementasikan)
│   │   ├── ai/                     # Kecerdasan Buatan
│   │   │   ├── AIClient.js         # Rute panggilan AI (OpenRouter + Budget)
│   │   │   ├── OpenRouterClient.js # ✨ Klien HTTP OpenRouter (direct/proxy, retry, health, credits)
│   │   │   ├── BudgetManager.js    # ✨ Kuota harian, rate limiter, antrean prioritas, cache, degrade
│   │   │   ├── AgentPrompts.js     # ✨ Prompt agen + sanitizer + penyaring spoiler
│   │   │   ├── PromptBuilder.js    # System prompt builder (+ konteks Kantor Virtual)
│   │   │   ├── TrustSystem.js      # Kalkulasi emosi
│   │   │   └── FallbackMode.js     # Respons offline
│   │   ├── office/                 # ✨ KANTOR VIRTUAL (AI Workspace)
│   │   │   ├── FloorPlan.js        # Denah, pintu, stasiun kerja, A*, blackout
│   │   │   ├── MemoryStream.js     # Ingatan agen: skor, kadaluarsa, kunci spoiler, refleksi
│   │   │   ├── Relationships.js    # Graf relasi trust/affinity/fear/tension
│   │   │   ├── JobSystem.js        # Jabatan, jadwal, tugas, perilaku bebas
│   │   │   ├── SimVoice.js         # Bank kalimat offline (tanpa AI)
│   │   │   ├── OfficeDirector.js   # Sutradara AI: 1 panggilan batch untuk semua agen
│   │   │   ├── ArtifactForge.js    # Artefak kerja → bukti dinamis
│   │   │   ├── OfficeWorld.js      # Orkestrator tick/fase/insiden/persepsi/aksi pemain
│   │   │   └── OfficeController.js # Pengikat ke game (muat office.json, gerbang AI, save)
│   │   ├── modules/                # Modul UI spesifik (9 file)
│   │   │   ├── CaseHub.js          # Hub pemilihan kasus
│   │   │   ├── CaseBriefing.js     # Tampilan briefing.md
│   │   │   ├── EvidenceViewer.js   # File explorer bukti
│   │   │   ├── CharacterDossier.js # Profil tersangka
│   │   │   ├── InterrogationRoom.js# Chat AI interogasi
│   │   │   ├── AccusationForm.js   # Formulir tuduhan
│   │   │   ├── NotesApp.js         # Notepad detektif
│   │   │   ├── TimelineViewer.js   # Timeline kronologis
│   │   │   ├── OfficeWindow.js     # ✨ Jendela Kantor Virtual (peta, roster, log, artefak, AI)
│   │   │   └── SettingsWindow.js   # Pengaturan AI/audio/CRT (+ tab Kantor, proxy)
│   │   ├── ui/                     # UI Foundation
│   │   │   ├── WindowManager.js    # Sistem windowing
│   │   │   ├── DesktopManager.js   # Ikon desktop
│   │   │   └── Taskbar.js          # Taskbar & jam
│   │   └── utils/                  # Utilitas
│   │       ├── AudioManager.js     # Web Audio procedural
│   │       ├── Markdown.js         # Renderer Markdown
│   │       ├── Typewriter.js       # Efek ketik
│   │       ├── Storage.js          # localStorage wrapper
│   │       └── DatabaseManager.js  # IndexedDB wrapper
│   │
│   └── images/                     # Ikon desktop
│
├── cases/                          # Konten kasus (data-driven)
│   ├── index.json
│   └── case_001/
│       ├── case.json
│       ├── briefing.md
│       ├── solution.md
│       ├── office.json             # ✨ Dunia Kantor Virtual (~70 KB, data-driven)
│       ├── characters/
│       └── evidence/
│
├── docs/
│   └── AI_OFFICE.md                # ✨ Arsitektur Kantor Virtual + anggaran AI + anti-spoiler
│
├── tools/                          # ✨ Utilitas pengembangan (bukan bagian game)
│   ├── openrouter-proxy.mjs        # Proxy OpenRouter 1 berkas, nol dependensi
│   ├── simulate-night.mjs          # Uji headless: semalam penuh, 0 request AI
│   ├── boot-check.mjs              # Uji integrasi: boot app + semua aksi pemain
│   └── dom-shim.mjs                # DOM tiruan untuk kedua uji di atas
│
├── package.json                    # Script utilitas saja (dependencies: kosong)
└── PRD.md                          # Product Requirements Document
```

---

## 📊 Status Pengembangan

| Fase | Komponen | Status |
|------|----------|--------|
| Fase 1 | Desktop, Window, Taskbar, CRT, Boot Sequence | ✅ Selesai |
| Fase 2 | Case Loader, Evidence Engine, Briefing, Dossier | ✅ Selesai |
| Fase 3 | AI Client, Prompt Builder, Interrogation Room, Trust System | ✅ Selesai |
| Fase 4 | Solution Engine, Accusation Form, Notes, Timeline, Save/Load | ✅ Selesai |
| Fase 5 | Konten kasus lengkap ("Malam di Wisma Angker") | ✅ Selesai |
| Fase 5b | **Kantor Virtual (AI Workspace)** — agen otonom, OpenRouter, BudgetManager, artefak→bukti | ✅ Selesai v2.1.0 |
| Fase 6 | Audio, CRT Toggle, Settings, Polish | ✅ Selesai |
| Fase 7 | Modding Toolkit, Voice Input, Multiplayer | 🔲 Direncanakan |

**Komponen tambahan yang belum diimplementasikan:**
- `CrimeSceneViewer` — TKP interaktif (data model sudah dimuat)
- `ObjectivesTracker` — Checklist objective (method di GameState sudah ada)

**Sudah diimplementasikan:** `RealTimeManager` (v4.2.0) · `NotificationSystem` ·
`OfficeWorld` + `OfficeController` + `OfficeWindow` (v2.1.0) · `OpenRouterClient` +
`BudgetManager` (v2.1.0). Lihat [docs/AI_OFFICE.md](docs/AI_OFFICE.md).

---

## 🐛 Troubleshooting

| Masalah                               | Solusi                                                                                                      |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| **Game tidak termuat (blank)**        | Pastikan Anda menggunakan static server (Live Server, `npx serve`). Jangan buka langsung `file://`.         |
| **CORS error saat interogasi**        | Jalankan server AI dengan flag `--cors`. Atau akses game via `localhost`, bukan IP.                         |
| **404 saat load module JS**           | Pastikan nama file modul sesuai casing yang benar (contoh: `AIClient.js`, bukan `AiClient.js`).             |
| **Suara tidak keluar**                | Klik di mana saja pada halaman untuk mengaktifkan AudioContext (kebijakan browser). Cek volume di Settings. |
| **Save tidak pulih**                  | Pastikan IndexedDB tidak dibersihkan (jangan hapus data situs di DevTools).                                 |
| **AI tidak merespons**                | Cek Settings ▸ AI ▸ **Test Connection**. Pastikan API key / Proxy URL terisi dan model berakhiran `:free`. Mode lokal aktif otomatis bila AI mati. |
| **Kantor Virtual diam / tidak ada AI** | Itu normal tanpa kunci: dunia tetap hidup lewat mesin lokal. Panel AI menampilkan `⚙️ lokal`. Isi kunci di Settings untuk `🤖 AI`. |
| **Kena limit 429 / kuota habis**      | Free tier = 50 request/hari & 20/menit. Turunkan `Level AI` ke **Hemat**, biarkan `AI on-demand` nyala, atau tambah kredit $10 di OpenRouter (1.000/hari). |
| **Interogasi kehabisan kuota karena kantor** | Naikkan `Cadangan interogasi` (default 12) di Settings ▸ Kantor. Kantor tidak pernah memakai cadangan itu. |
| **Proxy tidak terhubung**             | Jalankan `npm run proxy`, pastikan `OPENROUTER_API_KEY` ter-set, lalu isi Proxy URL `http://localhost:8787`. Cek `http://localhost:8787/health`. |
| **Ruangan gelap di peta CCTV**        | Bukan bug: ruang kerja **blackout 22:05–23:10**. Kamera buta — tidak ada log, saksi, atau sadapan di sana. Tunggu lampu menyala. |

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Baik itu laporan _bug_, saran fitur, atau _pull request_.

1. Fork repository ini
2. Buat branch baru (`git checkout -b fitur-keren`)
3. Commit perubahan (`git commit -m 'Tambahkan fitur X'`)
4. Push ke branch (`git push origin fitur-keren`)
5. Buka Pull Request

---

## 📄 Lisensi

Distribusikan di bawah lisensi **MIT**. Bebas digunakan, dimodifikasi, dan didistribusikan.

---

<div align="center">
  <sub>Dibuat dengan 🕵️ dan ☕ oleh <a href="https://github.com/KikiAbdullah">KikiAbdullah</a></sub>
  <br>
  <sub>Versi 4.1.0 — Core Complete (25/30 components)</sub>
</div>
