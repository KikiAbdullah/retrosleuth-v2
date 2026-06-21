# 🕵️ RetroSleuth: Case Files Detective

**RetroSleuth** adalah game investigasi kriminal imersif yang berjalan sepenuhnya di browser modern.  
Anda adalah detektif di era 1970-an, duduk di depan terminal komputer hijau berpendar, menganalisis bukti, dan menginterogasi tersangka dengan kecerdasan buatan (AI) lokal.

Alih-alih memilih dialog dari daftar, Anda **mengetik pertanyaan sendiri**. Setiap tersangka memiliki ingatan, kepribadian, dan rahasia—yang bisa berbohong, marah, atau akhirnya mengaku jika dihadapkan pada bukti yang tepat.

> 🎮 **Live Demo**: [https://kikiabdullah.github.io/retrosleuth-v2/](https://kikiabdullah.github.io/retrosleuth-v2/)
>
> 📄 **Dokumentasi Lengkap**: [PRD.md](PRD.md)

---

## ✨ Fitur Utama

| Fitur                              | Deskripsi                                                                                                                        |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 🕵️ **Interogasi AI Open-Ended**    | Bukan pohon dialog. Anda mengetik pertanyaan bebas ke tersangka, dan AI merespons secara dinamis sesuai kepribadian karakter.    |
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
- **AI Communication**: `fetch` API ke server AI lokal (OpenAI-compatible)
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

# Jalankan dengan static server (misal: Live Server VS Code, atau npx serve)
npx serve .
# Buka http://localhost:3000
```

Atau cukup **double-click** `index.html` di file explorer (beberapa browser mungkin memblokir CORS file lokal, gunakan static server untuk pengalaman terbaik).

> **Catatan**: Game ini menggunakan ES Modules, sehingga **wajib** dijalankan melalui static server (bukan `file://`). Gunakan ekstensi Live Server di VS Code atau `npx serve .`.

### 3. Menjalankan dengan Server AI (Interogasi)

Untuk pengalaman interogasi penuh, Anda memerlukan server AI lokal yang kompatibel dengan format OpenAI (`/v1/chat/completions`).

Contoh dengan `9router` / `gemini-cli`:

```bash
# Contoh dengan 9router (pastikan CORS diaktifkan)
PORT=20128 HOSTNAME=0.0.0.0 npm run start

# Atau dengan gemini-cli
gemini-cli serve --cors --port 20128 --host 0.0.0.0
```

Buka game, klik ikon ⚙️ **Settings**, dan atur:

- **Endpoint**: `http://localhost:20128/v1/chat/completions`
- **API Key**: (sesuai konfigurasi server Anda)
- **Model**: `gemini-cli` atau model yang Anda gunakan

Klik **Test Connection** untuk memastikan koneksi berhasil.

---

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
8. **⏱️ Timeline** — Lihat kronologi kejadian dengan filter berdasarkan tipe, partisipan, dan bukti.
9. **📝 Notes** — Catat teori dan kontradiksi Anda (auto-save, Ctrl+S).
10. **⚖️ Accusation** — Jika sudah yakin, ajukan tuduhan dengan pelaku, motif, dan bukti yang cukup.
11. **🎉 Solved!** — Jika tuduhan benar, kasus selesai dan epilog akan muncul.

**Fitur yang belum tersedia**: Crime Scene interaktif, Real-Time Events, Objectives Tracker *(sedang dikembangkan)*.

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
│   │   └── accusation.css          # UI formulir tuduhan
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
│   │   │   ├── AIClient.js         # HTTP client ke LLM
│   │   │   ├── PromptBuilder.js    # System prompt builder
│   │   │   ├── TrustSystem.js      # Kalkulasi emosi
│   │   │   └── FallbackMode.js     # Respons offline
│   │   ├── modules/                # Modul UI spesifik (9 file)
│   │   │   ├── CaseHub.js          # Hub pemilihan kasus
│   │   │   ├── CaseBriefing.js     # Tampilan briefing.md
│   │   │   ├── EvidenceViewer.js   # File explorer bukti
│   │   │   ├── CharacterDossier.js # Profil tersangka
│   │   │   ├── InterrogationRoom.js# Chat AI interogasi
│   │   │   ├── AccusationForm.js   # Formulir tuduhan
│   │   │   ├── NotesApp.js         # Notepad detektif
│   │   │   ├── TimelineViewer.js   # Timeline kronologis
│   │   │   └── SettingsWindow.js   # Pengaturan AI/audio/CRT
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
│       ├── characters/
│       └── evidence/
│
└── PRD.md                         # Product Requirements Document
```

---

## 📊 Status Pengembangan

| Fase | Komponen | Status |
|------|----------|--------|
| Fase 1 | Desktop, Window, Taskbar, CRT, Boot Sequence | ✅ Selesai |
| Fase 2 | Case Loader, Evidence Engine, Briefing, Dossier | ✅ Selesai |
| Fase 3 | AI Client, Prompt Builder, Interrogation Room, Trust System | ✅ Selesai |
| Fase 4 | Solution Engine, Accusation Form, Notes, Timeline, Save/Load | ✅ Selesai |
| Fase 5 | Konten kasus lengkap ("Malam di Wisma Angker") | 🔲 Direncanakan |
| Fase 6 | Audio, CRT Toggle, Settings, Polish | ✅ Selesai |
| Fase 7 | Modding Toolkit, Voice Input, Multiplayer | 🔲 Direncanakan |

**Komponen tambahan yang belum diimplementasikan:**
- `RealTimeManager` — Event real-time (data model sudah dimuat, ✅ implemented v4.2.0)
- `CrimeSceneViewer` — TKP interaktif (data model sudah dimuat)
- `ObjectivesTracker` — Checklist objective (method di GameState sudah ada)
- `Toast` — Notifikasi pop-up

---

## 🐛 Troubleshooting

| Masalah                               | Solusi                                                                                                      |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| **Game tidak termuat (blank)**        | Pastikan Anda menggunakan static server (Live Server, `npx serve`). Jangan buka langsung `file://`.         |
| **CORS error saat interogasi**        | Jalankan server AI dengan flag `--cors`. Atau akses game via `localhost`, bukan IP.                         |
| **404 saat load module JS**           | Pastikan nama file modul sesuai casing yang benar (contoh: `AIClient.js`, bukan `AiClient.js`).             |
| **Suara tidak keluar**                | Klik di mana saja pada halaman untuk mengaktifkan AudioContext (kebijakan browser). Cek volume di Settings. |
| **Save tidak pulih**                  | Pastikan IndexedDB tidak dibersihkan (jangan hapus data situs di DevTools).                                 |
| **AI tidak merespons**                | Cek Settings → Test Connection. Pastikan server AI berjalan di endpoint yang benar. Fallback mode aktif otomatis jika AI offline. |

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
