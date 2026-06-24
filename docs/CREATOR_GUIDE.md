# 📝 CREATOR GUIDE — RetroSleuth: Case Files Detective

**Version:** 1.0.0  
**Last Updated:** 2026-06-19

Panduan lengkap untuk membuat kasus detektif baru di RetroSleuth. Gabungan dari aspek teknis (modding) dan naratif (konten) untuk membantu Anda membuat kasus yang imersif dan menantang.

---

## 📚 DAFTAR ISI

**PART 1: TECHNICAL SETUP**
1. [Folder Structure](#1-struktur-folder-dasar)
2. [JSON Schemas](#2-manifest-kasus-casejson)
3. [File Naming Conventions](#3-penamaan-file-dan-id)
4. [API Reference](#4-real-time-events-dan-objectives)

**PART 2: NARRATIVE DESIGN**
5. [Mystery Structure](#5-struktur-misteri)
6. [Character Design](#6-desain-karakter)
7. [Evidence Design](#7-desain-bukti)
8. [Timeline & Pacing](#8-desain-kronologi-timeline-dan-pacing)
9. [Writing Dialog AI](#9-penulisan-dialog-ai)

**PART 3: TESTING & CHECKLIST**
10. [Testing Your Case](#10-testing-kasus)
11. [Final Checklist](#11-checklist-final)
12. [Troubleshooting](#12-troubleshooting-common-errors)

---

# PART 1: TECHNICAL SETUP
## 1. STRUKTUR FOLDER DASAR

Setiap kasus hidup dalam folder terpisah di dalam direktori `cases/`. Struktur folder wajib mengikuti format berikut:

```
cases/
├── index.json                         # <-- DAFTAR SEMUA KASUS (wajib)
└── case_001/                          # <-- FOLDER KASUS (ID increment)
    ├── case.json                      # <-- MANIFEST UTAMA (wajib)
    ├── briefing.md                    # <-- LAPORAN PEMBUKA (wajib)
    ├── solution.md                    # <-- EPILOG SOLUSI (wajib)
    ├── characters/                    # <-- FOLDER KARAKTER (wajib)
    │   ├── char_001.json
    │   ├── char_002.json
    │   └── char_003.json
    └── evidence/                      # <-- FOLDER BUKTI (wajib)
        ├── evi_001.md
        ├── evi_002.md
        └── ...
```

> **💡 Tip Penamaan:** Gunakan `case_` diikuti 3 digit angka (`case_001`, `case_002`, ...). Ini adalah konvensi ID increment yang memudahkan generator konten dan mencegah bentrok.

## 2. MANIFEST KASUS (`case.json`)

Ini adalah **file terpenting**. Engine menggunakannya untuk memahami seluruh struktur kasus.

**Lokasi:** `cases/case_001/case.json`

### 2.1. Struktur Root

```json
{
  "id": "case_001",
  "meta": { ... },
  "victim": { ... },
  "assets": { ... },
  "evidence_registry": [ ... ],
  "evidence_structure": { ... },
  "characters": [ ... ],
  "solution_matrix": { ... },
  "initial_evidence": [ ... ],
  "timeline": [ ... ],
  "objectives": [ ... ],
  "crime_scene": { ... },
  "real_time_events": [ ... ]
}
```

### 2.2. `meta` — Metadata Kasus

| Field                        | Tipe    | Contoh                    | Keterangan              |
| :--------------------------- | :------ | :------------------------ | :---------------------- |
| `title`                      | string  | `"Malam di Wisma Angker"` | Judul kasus.            |
| `author`                     | string  | `"Tim RetroSleuth"`       | Nama pembuat.           |
| `version`                    | string  | `"1.0"`                   | Versi konten.           |
| `difficulty`                 | string  | `"Expert"`                | Tingkat kesulitan.      |
| `estimated_playtime_minutes` | integer | `90`                      | Estimasi waktu minimum. |
| `year`                       | integer | `1979`                    | Tahun kejadian.         |
| `description`                | string  | `"Deskripsi lengkap..."`  | Narasi detail kasus.    |

### 2.3. `victim` — Data Korban

| Field            | Tipe    | Contoh                       |
| :--------------- | :------ | :--------------------------- |
| `name`           | string  | `"Haryanto Wijaya"`          |
| `age`            | integer | `62`                         |
| `occupation`     | string  | `"Pengusaha Tekstil"`        |
| `cause_of_death` | string  | `"Keracunan Kalium Sianida"` |
| `time_of_death`  | string  | `"Antara 22.30 - 23.30"`     |
| `location`       | string  | `"Ruang Kerja, Lantai 2"`    |

### 2.4. `assets` — Path Folder

Menentukan di mana engine mencari file terkait.

```json
"assets": {
  "briefing_file": "briefing.md",
  "evidence_directory": "evidence",
  "character_directory": "characters",
  "images_directory": "images"
}
```

### 2.5. `evidence_registry` — Daftar Semua Bukti

Array berisi semua bukti yang ada di kasus (termasuk yang terkunci). Setiap item **wajib** memiliki:

| Field               | Tipe   | Contob                | Keterangan                        |
| :------------------ | :----- | :-------------------- | :-------------------------------- |
| `id`                | string | `"evi_001"`           | ID unik. Format `evi_` + 3 digit. |
| `title             | string | `"Laporan Otopsi"`    | Judul yang ditampilkan di UI.     |
| `file`              | string | `"evi_001.md"`        | Nama file di folder `evidence/`.  |
| `icon`              | string | `"📄"`                | Emoji ikon.                       |
| `description_short` | string | `"Hasil forensik..."` | Tooltip singkat saat hover.       |

### 2.6. `evidence_structure` — Folder Virtual (File Manager)

Mengelompokkan bukti ke dalam folder di Evidence File Manager. Ini murni untuk organisasi UI.

```json
"evidence_structure": {
  "Dokumen Resmi": ["evi_001", "evi_005", "evi_003"],
  "Surat & Catatan": ["evi_004", "evi_006", "evi_011"],
  "Bukti Fisik": ["evi_002", "evi_009", "evi_010", "evi_012"],
  "Log Kunjungan": ["evi_007"]
}
```

### 2.7. `characters` — Referensi Karakter

Array referensi ke file karakter. Engine akan memuat file-file ini secara paralel.

| Field   | Tipe   | Contoh                  |
| :------ | :----- | :---------------------- |
| `id`    | string | `"char_001"`            |
| `name`  | string | `"Rahmat"`              |
| `role`  | string | `"Keponakan / Akuntan"` |
| `file`  | string | `"char_001.json"`       |
| `photo` | string | `"images/char_001.png"` |

### 2.8. `solution_matrix` — 🏆 Solusi Kasus

Ini adalah **jantung validasi tuduhan**. Pemain menang jika memenuhi semua kondisi di sini.

| Field                            | Tipe   | Contob                   | Keterangan                                      |
| :------------------------------- | :----- | :----------------------- | :---------------------------------------------- |
| `culprit_id`                     | string | `"char_002"`             | ID karakter pelaku sebenarnya.                  |
| `motive`                         | string | `"Balas dendam..."`      | Motif pembunuhan (untuk validasi kata kunci).   |
| `primary_evidence`               | string | `"evi_001"`              | Bukti utama yang WAJIB dipilih.                 |
| `secondary_evidence`             | array  | `["evi_006", "evi_010"]` | Bukti sekunder yang WAJIB dipilih (minimal 4).  |
| `explanation_file`               | string | `"solution.md"`          | File epilog.                                    |
| `alternative_suspect_misdirects` | object | `{"char_001": "..."}`    | Penjelasan mengapa tersangka lain bukan pelaku. |

> **⚠️ Catatan:** Pemain harus memilih **SEMUA** bukti di `secondary_evidence`. Ini memaksa pemain untuk benar-benar memahami kasus, bukan sekadar menebak.

### 2.9. `initial_evidence` — Bukti Awal

Array ID bukti yang langsung terbuka saat kasus dimulai. Biasanya hanya berisi laporan otopsi.

```json
"initial_evidence": ["evi_001"]
```

### 2.10. `objectives` — Tugas Investigasi

Membantu pemain tetap pada jalur. **Prefix ID adalah `goal_`** (bukan `obj_`).

### 2.11. `crime_scene` — Tempat Kejadian Perkara (TKP)

Ini adalah area interaktif tempat pemain menemukan bukti.

**Struktur:**
- `description`: Narasi ruangan.
- `areas`: Array area (minimal 1).

**Setiap `area` memiliki:**
- `id`: Format `area_` + 3 digit.
- `name`: Nama area (misal: "Meja Kerja").
- `short_desc`: Deskripsi singkat.
- `objects`: Array objek interaktif.

**Setiap `object` memiliki:**
- `id`: Format `obj_` + 3 digit (global increment).
- `label`: Teks tombol (misal: "🔓 Buka laci utama").
- `type`: `"evidence"`, `"clue"`, `"red_herring"`, atau `"locked"`.
- `evidence_unlock`: (Jika `type="evidence"`) ID bukti yang dibuka.
- `required_item`: (Jika `type="locked"`) ID bukti yang dibutuhkan untuk membuka.
- `narrative`: Teks yang muncul saat diklik.

### 2.12. `real_time_events` — Event Waktu Nyata

Event yang terpicu berdasarkan waktu (menit dari mulai kasus). Menciptakan pacing investigasi yang natural.

| Field                       | Tipe    | Contob                  | Keterangan                                         |
| :-------------------------- | :------ | :---------------------- | :------------------------------------------------- |
| `id`                        | string  | `"rte_001"`             | Format `rte_` + 3 digit.                           |
| `trigger.type`              | string  | `"relative"`            | `"relative"` (menit) atau `"clock"` (jam dinding). |
| `trigger.minutes`           | integer | `0`                     | Menit ke berapa event terpicu.                     |
| `action`                    | string  | `"unlock_evidence"`     | Jenis aksi.                                        |
| `payload.evidence_id`       | string  | `"evi_001"`             | ID bukti yang di-unlock.                           |
| `payload.message`           | string  | `"📨 Amplop coklat..."` | Pesan notifikasi.                                  |
| `payload.show_notification` | boolean | `true`                  | Tampilkan toast atau tidak.                        |

## 3. PEENAMAN FILE DAN ID

- Gunakan `case_` diikuti 3 digit angka untuk folder kasus (`case_001`, `case_002`, ...)
- Gunakan `char_` diikuti 3 digit angka untuk ID karakter (`char_001`, `char_002`, ...)
- Gunakan `evi_` diikuti 3 digit angka untuk ID bukti (`evi_001`, `evi_002`, ...)
- Gunakan `area_` diikuti 3 digit angka untuk ID area TKP (`area_001`, `area_002`, ...)
- Gunakan `obj_` diikuti 3 digit angka untuk ID objek TKP (global increment)
- Gunakan `rte_` diikuti 3 digit angka untuk ID real-time event (`rte_001`, `rte_002`, ...)
- Gunakan `goal_` diikuti 3 digit angka untuk ID objective (`goal_001`, `goal_002`, ...)

## 4. DATA KARAKTER (`char_*.json`)

Setiap karakter didefinisikan dalam file JSON terpisah di folder `characters/`.

**Lokasi:** `cases/case_001/characters/char_001.json`

### Struktur Lengkap

```json
{
  "id": "char_001",
  "name": "Rahmat",
  "age": 34,
  "role": "Keponakan / Akuntan Pribadi",
  "occupation": "Akuntan (diberhentikan) / Penjudi",
  "relationship_to_victim": "Keponakan satu-satunya",
  "background": "Rahmat adalah keponakan Haryanto yang dibesarkan sejak kecil...",
  "personality": "Gugup, defensif, mudah panik, tapi jujur dan naif.",
  "voice_style": "Bicara cepat dan terbata-bata saat tertekan. Sering mengulang kata.",
  "alibi": "Mengaku di kamar tamu sepanjang malam.",
  "known_facts": [
    "Saya memiliki utang judi besar.",
    "Saya mengambil buku besar dari ruang kerja malam itu."
  ],
  "truths": [
    "Saya melihat Sari keluar ruang kerja dengan botol kecil.",
    "Saya masuk melalui jendela setelah Haryanto sekarat."
  ],
  "secrets": [
    {
      "id": "secret_001",
      "trigger_condition": "Jika detektif bertanya tentang uang atau buku besar.",
      "detail": "Saya menggelapkan uang perusahaan untuk berjudi. Total 497 juta.",
      "reveal_condition": "Trust > 40 atau bukti evi_002",
      "post_reveal_emotion": { "stress": 60, "fear": 70, "trust": 40 }
    }
  ],
  "reactions_to_evidence": {
    "evi_001": "Saya... saya tidak tahu tentang racun. Saya hanya melihat botol kecil.",
    "evi_002": "(Membaca buku besar) Itu... itu catatan utang saya. Saya malu.",
    "evi_010": "Nota apotek? Saya tidak pernah membeli racun. Itu pasti Sari!"
  },
  "interrogation_phases": [
    {
      "phase": 1,
      "label": "Penyangkalan Panik",
      "behavior": "Menyangkal semua tuduhan dengan gugup.",
      "sample_response": "Saya tidak melakukan apa-apa!"
    },
    {
      "phase": 2,
      "label": "Setengah Mengaku",
      "behavior": "Mengakui utang dan pencurian, tapi tetap menyangkal pembunuhan."
    },
    {
      "phase": 3,
      "label": "Pencuri Ketakutan",
      "behavior": "Mengakui masuk melalui jendela dan melihat Sari."
    },
    {
      "phase": 4,
      "label": "Saksi Kunci",
      "behavior": "Bersaksi bahwa Sari adalah pelaku. Meminta perlindungan."
    }
  ],
  "emotional_state": {
    "stress": 45,
    "trust": 15,
    "fear": 70,
    "anger": 10
  },
  "emotional_volatility": "Sangat fluktuatif. Mudah panik.",
  "can_be_culprit": false,
  "reveals_evidence": ["evi_002"],
  "red_herring_note": "Terlihat bersalah karena utang dan pencurian, tapi sebenarnya hanya saksi."
}
```

### Penjelasan Field Kunci

| Field                   | Keterangan                                                                               |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| `secrets`               | Rahasia bertingkat. AI hanya mengungkapkannya jika kondisi `reveal_condition` terpenuhi. |
| `reactions_to_evidence` | Respons spesifik karakter terhadap setiap bukti. Kunci adalah ID bukti (`evi_001`).      |
| `interrogation_phases`  | 4 fase interogasi. Fase naik saat rahasia terungkap atau emosi mencapai threshold.       |
| `emotional_state`       | Nilai awal emosi (0-100). Akan berubah selama interogasi.                                |
| `can_be_culprit`        | Jika `true`, karakter bisa menjadi pelaku (validasi solusi).                             |
| `reveals_evidence`      | Bukti yang otomatis terbuka saat interogasi pertama (jika pemain bertanya dengan benar). |

## 5. FILE MARKDOWN (BUKTI, BRIEFING, SOLUTION)

Semua konten naratif ditulis dalam format Markdown (`.md`). Engine merendernya menjadi HTML.

### 5.1. Bukti (`evi_*.md`)

Gunakan struktur dokumen otentik: kop surat, tabel, dan tanda tangan.

### 5.2. Briefing (`briefing.md`)

Laporan polisi pembuka. Harus memberikan konteks dan memperkenalkan tersangka.

### 5.3. Solution (`solution.md`)

Epilog yang ditampilkan setelah kasus terpecahkan.

---

# PART 2: NARRATIVE DESIGN
## 5. STRUKTUR MISTERI

### 5.1. Tiga Lapis Kebenaran

Setiap kasus harus memiliki tiga lapis kebenaran:

| Lapis                    | Deskripsi                                   | Contoh                                        |
| :----------------------- | :------------------------------------------ | :-------------------------------------------- |
| **Lapis 1: Permukaan**   | Apa yang terlihat oleh semua orang.         | "Haryanto ditemukan tewas di ruang kerjanya." |
| **Lapis 2: Tersembunyi** | Fakta yang tidak terlihat di permukaan.     | "Ada sidik jari di bagian dalam gelas."       |
| **Lapis 3: Kebenaran**   | Kebenaran utuh yang harus ditemukan pemain. | "Sari meracuni Haryanto karena wasiat."       |

### 5.2. Struktur Naratif 5 Babak

| Babak                   | Durasi (menit) | Tujuan Pemain                                         |
| :---------------------- | :------------- | :---------------------------------------------------- |
| **Babak 1: Pengenalan** | 0-15           | Baca briefing, kenali tersangka, dapatkan bukti awal. |
| **Babak 2: Eksplorasi** | 15-40          | Jelajahi TKP, kumpulkan bukti fisik.                  |
| **Babak 3: Interogasi** | 40-70          | Interogasi tersangka, temukan kontradiksi.            |
| **Babak 4: Analisis**   | 70-100         | Hubungkan bukti, temukan motif, perkuat teori.        |
| **Babak 5: Penutupan**  | 100-120        | Ajukan tuduhan, selesaikan kasus.                     |

### 5.3. Komponen Wajib

Setiap kasus harus memiliki:

| Komponen          | Deskripsi                           | Minimal |
| :---------------- | :---------------------------------- | :------ |
| **Korban**        | Karakter yang mati.                 | 1       |
| **Tersangka**     | Karakter yang bisa menjadi pelaku.  | 3       |
| **Motif**         | Alasan pembunuhan.                  | 1       |
| **Bukti Fisik**   | Sidik jari, senjata, serpihan.      | 3       |
| **Bukti Dokumen** | Surat, nota, laporan.               | 3       |
| **Kontradiksi**   | Ketidaksesuaian alibi dengan bukti. | 2       |
| **Red Herring**   | Petunjuk yang menyesatkan.          | 1       |

## 6. DESAIN KARAKTER

### 6.1. Tiga Fungsi Karakter

| Fungsi          | Deskripsi                                             | Contoh                          |
| :-------------- | :---------------------------------------------------- | :------------------------------ |
| **Pelaku**      | Karakter yang benar-benar melakukan pembunuhan.       | Sari (istri)                    |
| **Red Herring** | Karakter yang terlihat bersalah tapi tidak.           | Rahmat (keponakan dengan utang) |
| **Saksi**       | Karakter yang melihat sesuatu tapi menyembunyikannya. | Budi (pelayan yang dendam)      |

### 6.2. Anatomi Karakter yang Baik

#### A. Latar Belakang (Background)

Ceritakan kehidupan karakter **sebelum** pembunuhan. Ini membentuk motif dan kepribadian.

> ❌ **Buruk:** _"Rahmat adalah keponakan Haryanto."_
> 
> > ✅ **Baik:** _"Rahmat adalah keponakan Haryanto yang dibesarkan sejak kecil. Ia bekerja sebagai akuntan pribadi, tetapi telah menggelapkan uang perusahaan untuk berjudi. Terlilit utang Rp 497 juta ke rentenir, ia putus asa."_

#### B. Kepribadian (Personality)

Bagaimana karakter bersikap? Ini memengaruhi gaya bicara AI.

> ❌ **Buruk:** _"Rahmat gugup."_
> 
> > ✅ **Baik:** _"Rahmat gugup, defensif, mudah panik, tapi jujur dan naif. Ia tidak cukup berani untuk membunuh, tetapi cukup bodoh untuk mencuri."_

#### C. Gaya Bicara (Voice Style)

Berikan petunjuk spesifik tentang bagaimana AI harus berbicara.

> ❌ **Buruk:** _"Rahmat bicara dengan gugup."_
> 
> > ✅ **Baik:** _"Bicara cepat dan terbata-bata saat tertekan. Sering mengulang kata-kata seperti 'Saya... saya tidak tahu.' Jika diteken, suaranya meninggi dan mulai merengek."_

#### D. Rahasia Bertingkat (Secrets)

Setiap karakter harus punya **4 tingkat rahasia**, dari yang paling kecil hingga paling besar.

| Tingkat | Kondisi Pemicu                          | Isi Rahasia                                |
| :------ | :-------------------------------------- | :----------------------------------------- |
| **1**   | Ditanya tentang topik sensitif          | Mengaku kesepian dan punya teman dekat.    |
| **2**   | Ditunjukkan bukti tertentu              | Akui tahu Haryanto akan mengubah wasiat.   |
| **3**   | Ditunjukkan bukti yang lebih kuat       | Akui membeli sianida, tapi untuk "teater". |
| **4**   | Ditunjukkan bukti kunci (serpihan kaca) | Mengaku menuangkan racun (jika pelaku).    |

### 6.3. Tips Menulis Red Herring (Petunjuk Palsu)

Red herring adalah karakter atau bukti yang terlihat bersalah tapi tidak.

**Cara membuat red herring efektif:**

1. **Motif yang jelas** — Beri motif yang sangat kuat (utang, dendam).
2. **Bukti yang memberatkan** — Letakkan bukti yang mengarah ke karakter ini.
3. **Alibi yang lemah** — Buat alibi yang mudah diragukan.
4. **Tetapi...** — Beri alasan mengapa karakter ini **tidak mungkin** menjadi pelaku (tidak ada kesempatan, bukti bertentangan).

## 7. DESAIN BUKTI

### 7.1. Jenis-Jenis Bukti

| Jenis         | Contob                    | Kekuatan                     | Cara Ditemukan      |
| :------------ | :------------------------ | :--------------------------- | :------------------ |
| **Forensik**  | Laporan otopsi            | Menentukan penyebab kematian | Initial / Real-Time |
| **Fisik**     | Sidik jari, serpihan kaca | Membuktikan kehadiran pelaku | TKP                 |
| **Dokumen**   | Nota, surat wasiat        | Membuktikan motif            | TKP / Real-Time     |
| **Kesaksian** | Laporan saksi             | Membuktikan kontradiksi      | Real-Time / TKP     |
| **Log**       | CCTV, buku tamu           | Membuktikan pergerakan       | Real-Time / TKP     |

### 7.2. Hierarki Bukti

Susun bukti dari yang paling **umum** ke yang paling **spesifik**:

| Lapis                     | Jenis Bukti               | Contob                                   |
| :------------------------ | :------------------------ | :--------------------------------------- |
| **Lapis 1: Fakta Dasar**  | Laporan otopsi, kronologi | "Korban meninggal karena sianida."       |
| **Lapis 2: Motif**        | Surat wasiat, nota apotek | "Sari membeli sianida."                  |
| **Lapis 3: Keterlibatan** | Sidik jari, CCTV          | "Sari ada di TKP malam itu."             |
| **Lapis 4: Konfirmasi**   | Serpihan kaca, pengakuan  | "Sidik jari Sari di bagian dalam gelas." |

### 7.3. Menulis Bukti yang Menceritakan Kisah

Setiap bukti harus **menceritakan bagian dari cerita** dan **terlihat otentik**.

**Tips Menulis Bukti:**

1. **Gunakan format dokumen resmi** — Kop surat, tabel, tanda tangan.
2. **Sertakan detail kecil** — Waktu, nomor, inisial yang menjadi petunjuk.
3. **Ciptakan konsistensi** — Tanggal di nota harus cocok dengan timeline.
4. **Jangan terlalu jelas** — Biarkan pemain menghubungkan titik-titik.
5. **Variasi format** — Laporan, surat, kliping koran, catatan tangan.

## 8. DESAIN KRONOLOGI, TIMELINE & PACING

### 8.1. Struktur Timeline

Timeline harus **mendukung narasi** dan **membantu pemain memahami urutan kejadian**.

```json
"timeline": [
  { "time": "20.00", "description": "Haryanto dan Sari makan malam bersama, terlihat tegang." },
  { "time": "21.15", "description": "Rahmat tiba di Wisma dan langsung menuju ruang kerja." },
  { "time": "21.30", "description": "Sari membeli sianida di Apotek Sumber Waras." },
  { "time": "22.05", "description": "Sari menuangkan sianida ke gelas brandy Haryanto." },
  { "time": "22.30", "description": "Saksi mendengar suara gelas pecah dari ruang kerja." },
  { "time": "22.45", "description": "Rahmat terlihat berlari ke taman belakang." },
  { "time": "23.00", "description": "Lampu ruang kerja padam." },
  { "time": "23.15", "description": "Mobil Sari keluar Wisma." },
  { "time": "00.15", "description": "Budi menemukan tubuh Haryanto." }
]
```

### 8.2. Tips Menulis Timeline

1. **Mulai dari malam kejadian** — Bukan hari-hari sebelumnya (kecuali penting).
2. **Setiap peristiwa harus relevan** — Jangan tambahkan detail yang tidak berguna.
3. **Gunakan `evidence_links`** — Hubungkan peristiwa dengan bukti.
4. **Buat kontradiksi** — Timeline harus mengungkap alibi yang bertentangan.
5. **Jangan beri jawaban** — Timeline adalah alat bantu, bukan solusi.

### 8.3. Pacing & Real-Time Events

#### Prinsip Pacing

1. **Jangan beri semua bukti di awal** — Sebarkan selama 90-120 menit.
2. **Buat momen "Aha!"** — Event tertentu harus menjadi titik balik.
3. **Gunakan deadline** — Tekanan waktu membuat keputusan terasa penting.
4. **Variasi event** — Jangan hanya unlock evidence, tambahkan pesan karakter, notifikasi, dll.

#### Pola Event yang Efektif

| Fase Waktu        | Jenis Event | Contob                                 |
| :---------------- | :---------- | :------------------------------------- |
| **0-15 menit**    | Pengantar   | Laporan otopsi, saksi awal             |
| **15-30 menit**   | Eksplorasi  | TKP dibuka, petunjuk pertama           |
| **30-45 menit**   | Motif       | Nota, surat, catatan keuangan          |
| **45-60 menit**   | Kontradiksi | CCTV, log, kesaksian baru              |
| **60-75 menit**   | Bukti fisik | Sidik jari, serpihan kaca              |
| **75-90 menit**   | Konfrontasi | Pesan dari karakter, interogasi intens |
| **90-105 menit**  | Pengakuan   | Karakter mulai mengaku                 |
| **105-120 menit** | Deadline    | Peringatan, game over                  |

### 8.4. Contoh Real-Time Events (120 menit)

```json
"real_time_events": [
  {
    "id": "rte_001",
    "trigger": { "type": "relative", "minutes": 0 },
    "action": "unlock_evidence",
    "payload": {
      "evidence_id": "evi_001",
      "message": "📨 Amplop coklat mendarat di meja Anda. Laporan otopsi resmi baru saja tiba dari lab forensik.",
      "show_notification": true,
      "play_sound": "unlock"
    }
  },
  {
    "id": "rte_002",
    "trigger": { "type": "relative", "minutes": 10 },
    "action": "unlock_evidence",
    "payload": {
      "evidence_id": "evi_005",
      "message": "📞 Telepon berdering. Laporan saksi Marni telah dikirim.",
      "show_notification": true,
      "play_sound": "ring"
    }
  },
  {
    "id": "rte_003",
    "trigger": { "type": "relative", "minutes": 20 },
    "action": "update_objective",
    "payload": {
      "unlock_crime_scene": true,
      "message": "🏚️ TKP telah dibuka untuk eksplorasi.",
      "show_notification": true
    }
  }
]
```

## 9. PENULISAN DIALOG AI

### 9.1. Prinsip Dialog AI

1. **Karakter harus konsisten** — Gaya bicara, pilihan kata, dan emosi harus sama sepanjang interogasi.
2. **Bohong dengan cerdas** — Kebohongan harus masuk akal dan konsisten dengan alibi.
3. **Emosi tercermin dalam dialog** — Stress tinggi → bicara terbata-bata, Anger tinggi → agresif.
4. **Reaksi terhadap bukti** — Setiap bukti harus memicu respons spesifik.

### 9.2. Struktur `reactions_to_evidence`

Setiap karakter harus punya respons terhadap setiap bukti (atau minimal bukti kunci).

```json
"reactions_to_evidence": {
  "evi_001": "Saya... saya tidak tahu tentang racun. Saya tidak pernah melihat botol itu sebelumnya.",
  "evi_002": "(Membaca buku besar) Itu... itu catatan utang saya. Saya malu. Saya tidak bermaksud mencuri.",
  "evi_003": "Log keamanan? Ya, saya keluar lewat jendela. Saya tidak mau ketahuan.",
  "evi_010": "Nota apotek? Saya tidak pernah membeli racun. Itu pasti Sari!",
  "evi_011": "Wasiat? Saya tidak tahu tentang wasiat. Haryanto tidak pernah memberi tahu saya.",
  "evi_012": "Serpihan kaca? Saya tidak memegang gelas itu. Saya hanya melihat Sari membawa botol kecil."
}
```

### 9.3. Contoh Fase Interogasi

**Fase 1 — Penyangkalan (Awal Interogasi)**

> "Saya tidak melakukan apa-apa! Saya di kamar sepanjang malam. Saya tidak tahu apa yang terjadi pada Haryanto."

**Fase 2 — Defensif (Setelah beberapa tekanan)**

> "Ya, kami bertengkar. Suami istri bertengkar itu biasa. Itu tidak berarti saya membunuhnya! Saya mencintainya!"

**Fase 3 — Rasionalisasi (Setelah bukti memberatkan)**

> "Saya membeli sianida untuk properti teater! Saya aktris! Saya butuh properti untuk drama. Saya tidak tahu racun itu akan digunakan... untuk Haryanto."

**Fase 4 — Pengakuan (Setelah bukti kunci)**

> "(Hening panjang. Suara berubah dingin.) Jadi Anda sudah tahu. Ya. Saya yang menuangkannya. 10 gram. Cukup untuk membunuhnya dua kali. Dia meminumnya dengan lahap, seperti dia meminum habis hidup saya."

### 9.4. Tips Menulis Dialog AI

1. **Tulis seperti novel** — Dialog harus dramatis dan emosional.
2. **Gunakan petunjuk non-verbal** — `(menangis)`, `(suara bergetar)`, `(tertawa sinis)`.
3. **Konsisten dengan kepribadian** — Karakter manipulatif bicara berbeda dengan karakter polos.
4. **Jangan terlalu panjang** — 3-4 kalimat per respons sudah cukup.
5. **Buat progresi** — Dari penyangkalan → defensif → rasionalisasi → pengakuan.

---

# PART 3: TESTING & CHECKLIST

## 10. TESTING KASUS

Setelah selesai menulis semua file:

1. Jalankan RetroSleuth (buka `index.html` dengan Live Server).
2. Buka **Case Files** → kasus baru Anda harus muncul di daftar.
3. Pilih kasus → **Briefing** terbuka.
4. Periksa **Evidence** → bukti awal muncul.
5. Periksa **Crime Scene** → semua area dan objek bisa diklik.
6. Periksa **Dossier** → karakter muncul dengan profil.
7. **Ajukan tuduhan** dengan solusi yang benar → pastikan kasus terpecahkan.

## 11. CHECKLIST FINAL

### ✅ Sebelum Rilis

- [ ] Semua file JSON valid (gunakan validator online).
- [ ] Semua ID di `evidence_structure` ada di `evidence_registry`.
- [ ] Semua ID di `solution_matrix.culprit_id` ada di `characters`.
- [ ] `initial_evidence` hanya berisi ID yang valid.
- [ ] Semua file `.md` dapat dibaca dan tidak kosong.
- [ ] Setidaknya 3 karakter dengan profil lengkap.
- [ ] Setidaknya 8 bukti dengan konten Markdown.
- [ ] Timeline dengan minimal 5 peristiwa.
- [ ] Objectives dengan minimal 5 tugas.
- [ ] Crime Scene dengan minimal 4 area.
- [ ] Real-Time Events dengan minimal 5 event.
- [ ] Kasus dapat diselesaikan (uji coba sendiri).

### ✅ Pengalaman Pemain

- [ ] Pemain bisa memahami kasus hanya dari briefing.
- [ ] Pemain bisa menemukan semua bukti tanpa bantuan eksternal.
- [ ] Pemain bisa menghubungkan bukti dengan motif.
- [ ] Pemain bisa mengidentifikasi red herring.
- [ ] Tuduhan yang benar menghasilkan solusi.
- [ ] Tuduhan yang salah memberikan hint yang membantu.

## 12. TROUBLESHOOTING COMMON ERRORS

| Error di Console                                             | Penyebab                                    | Solusi                                                  |
| :----------------------------------------------------------- | :------------------------------------------ | :------------------------------------------------------ |
| `Case not found in index.json`                               | Nama folder tidak cocok.                    | Periksa `folder` di `index.json` vs nama folder.        |
| `Bukti 'evi_XXX' tidak terdaftar`                            | ID bukti tidak ada di `evidence_registry`.  | Tambahkan ID ke `evidence_registry`.                    |
| `Karakter 'char_XXX' tidak ditemukan`                        | ID karakter tidak ada di `characters`.      | Periksa daftar `characters` di `case.json`.             |
| `Cannot read properties of undefined (reading 'culprit_id')` | `solution_matrix` tidak lengkap.            | Pastikan `solution_matrix` ada dan berisi `culprit_id`. |
| `Failed to fetch case.json`                                  | File tidak ditemukan atau JSON tidak valid. | Periksa lokasi file dan validasi JSON.                  |

---

Selamat membuat kasus! 🕵️‍♂️ Jangan ragu untuk bereksperimen dengan alur cerita yang unik. Jika ada pertanyaan, buka issue di repository atau hubungi komunitas.