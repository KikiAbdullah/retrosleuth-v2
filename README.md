# 🕵️ RetroSleuth: Case Files Detective

**RetroSleuth** adalah game investigasi kriminal imersif yang berjalan sepenuhnya di browser modern.  
Anda adalah detektif di era 1970-an, duduk di depan terminal komputer hijau berpendar, menganalisis bukti, dan menginterogasi tersangka dengan kecerdasan buatan (AI) lokal.

Alih-alih memilih dialog dari daftar, Anda **mengetik pertanyaan sendiri**. Setiap tersangka memiliki ingatan, kepribadian, dan rahasia—yang bisa berbohong, marah, atau akhirnya mengaku jika dihadapkan pada bukti yang tepat.

> 🎮 **Live Demo**: [https://USERNAME.github.io/retrosleuth](https://USERNAME.github.io/retrosleuth)
>
> 📄 **Dokumentasi Lengkap**: [PRD.md](docs/PRD.md)

---

## ✨ Fitur Utama

| Fitur                              | Deskripsi                                                                                                                        |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 🕵️ **Interogasi AI Open-Ended**    | Bukan pohon dialog. Anda mengetik pertanyaan bebas ke tersangka, dan AI merespons secara dinamis sesuai kepribadian karakter.    |
| 🖥️ **Estetika CRT Autentik**       | Monitor hijau retro dengan efek _scanline_, _flicker_, _glow_, dan font monospace `VT323`. Bisa dimatikan jika mengganggu.       |
| 📝 **Data-Driven & Modding-First** | Semua konten (kasus, karakter, bukti) disimpan dalam file JSON dan Markdown. Buat kasus sendiri tanpa menyentuh kode!            |
| ⏱️ **Investigasi Real-Time**       | Bukti, laporan lab, dan panggilan telepon muncul sesuai waktu nyata. Deadline 2 jam memberi tekanan psikologis yang menegangkan. |
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
git clone https://github.com/USERNAME/retrosleuth.git
cd retrosleuth

# Jalankan dengan static server (misal: Live Server VS Code, atau npx serve)
npx serve .
# Buka http://localhost:3000
```

Atau cukup **double-click** `index.html` di file explorer (beberapa browser mungkin memblokir CORS file lokal, gunakan static server untuk pengalaman terbaik).

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

1. **📁 Case Files** — Pilih kasus yang ingin diselidiki.
2. **📋 Briefing** — Baca laporan polisi pembuka untuk memahami konteks.
3. **🔍 Evidence** — Kumpulkan dan baca bukti. Klik bukti untuk melihat detail.
4. **🗣️ Interrogation** — Tanya tersangka. Ketik pertanyaan bebas, AI akan merespons.
   - _Tips_: Sodorkan bukti fisik untuk mendapatkan pengakuan.
   - Perhatikan **Emotion Bars** (Trust, Stress, Fear, Anger) sebagai indikator kejujuran.
5. **⏱️ Timeline** — Lihat kronologi kejadian. Klik peristiwa untuk membuka bukti terkait.
6. **📝 Notes** — Catat teori dan kontradiksi Anda (auto-save).
7. **⚖️ Accusation** — Jika sudah yakin, ajukan tuduhan dengan pelaku, motif, dan bukti yang cukup.
8. **🎉 Solved!** — Jika tuduhan benar, kasus selesai dan epilog akan muncul.

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

📖 **Panduan Lengkap**: [MODDING_GUIDE.md](docs/MODDING_GUIDE.md)  
✍️ **Tips Menulis Konten**: [CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)

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
│   │   ├── settings.css            # UI pengaturan
│   │   └── responsive.css          # Media queries
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
│   │   │   └── TimelineEngine.js   # Manajemen timeline
│   │   ├── ai/                     # Kecerdasan Buatan
│   │   │   ├── AIClient.js         # HTTP client ke LLM
│   │   │   ├── PromptBuilder.js    # System prompt builder
│   │   │   ├── TrustSystem.js      # Kalkulasi emosi
│   │   │   └── FallbackMode.js     # Respons offline
│   │   ├── modules/                # Modul UI spesifik
│   │   │   ├── CaseHub.js
│   │   │   ├── CaseBriefing.js
│   │   │   ├── EvidenceViewer.js
│   │   │   ├── CharacterDossier.js
│   │   │   ├── InterrogationRoom.js
│   │   │   ├── AccusationForm.js
│   │   │   ├── NotesApp.js
│   │   │   ├── TimelineViewer.js
│   │   │   └── SettingsWindow.js
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
└── docs/                           # Dokumentasi
    ├── PRD.md                      # Product Requirements Document
    ├── MODDING_GUIDE.md            # Panduan modding
    └── CONTENT_GUIDE.md            # Panduan konten naratif
```

---

## 🐛 Troubleshooting

| Masalah                               | Solusi                                                                                                      |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| **Game tidak termuat (blank)**        | Pastikan Anda menggunakan static server (Live Server, `npx serve`). Jangan buka langsung `file://`.         |
| **CORS error saat interogasi**        | Jalankan server AI dengan flag `--cors`. Atau akses game via `localhost`, bukan IP.                         |
| **`EventBus.once is not a function`** | Pastikan `EventBus.js` sudah memiliki method `once`. Update ke versi terbaru.                               |
| **Suara tidak keluar**                | Klik di mana saja pada halaman untuk mengaktifkan AudioContext (kebijakan browser). Cek volume di Settings. |
| **Save tidak pulih**                  | Pastikan IndexedDB tidak dibersihkan (jangan hapus data situs di DevTools).                                 |

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
  <sub>Dibuat dengan 🕵️ dan ☕ oleh Tim RetroSleuth</sub>
</div>
