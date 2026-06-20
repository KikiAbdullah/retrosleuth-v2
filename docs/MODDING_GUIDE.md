# 🛠️ MODDING GUIDE — RetroSleuth: Case Files Detective

**Version:** 1.0.0  
**Last Updated:** 2026-06-19

Selamat datang di panduan modding RetroSleuth! Dengan panduan ini, Anda dapat membuat kasus detektif baru **tanpa menyentuh satu baris pun kode JavaScript**. Semua konten game didorong oleh data (data-driven). Yang Anda butuhkan hanyalah editor teks (seperti VS Code, Notepad++, atau Sublime Text) dan pemahaman dasar tentang JSON dan Markdown.

---

## 📁 1. Struktur Folder Dasar

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

---

## 2. Registri Global (`cases/index.json`)

File ini adalah "daftar isi" utama. Engine membaca file ini pertama kali untuk menampilkan daftar kasus di Case Hub.

**Lokasi:** `cases/index.json`

```json
{
  "engine_version": "3.0.0",
  "total_cases": 1,
  "cases_list": [
    {
      "id": "case_001",
      "folder": "case_001",
      "title": "Malam di Wisma Angker",
      "year": 1979,
      "difficulty": "EXPERT",
      "estimated_playtime_minutes": 90,
      "estimated_playtime_max_minutes": 120,
      "is_active": true,
      "description_short": "Sinopsis singkat kasus (max 150 karakter).",
      "meta": {
        "suspect_count": 3,
        "evidence_count": 12,
        "crime_scene_areas": 6,
        "objectives_count": 9,
        "has_real_time_events": true,
        "tags": ["pembunuhan", "racun", "ruang-terkunci"],
        "author": "Nama Anda",
        "version": "1.0"
      }
    }
  ]
}
```

**Field Penting:**

| Field                     | Tipe    | Keterangan                                                      |
| :------------------------ | :------ | :-------------------------------------------------------------- |
| `engine_version`          | string  | Versi engine yang dibutuhkan. Gunakan `"3.0.0"`.                |
| `total_cases`             | integer | Jumlah kasus dalam array `cases_list`.                          |
| `cases_list[].id`         | string  | ID unik kasus (contoh: `"case_001"`).                           |
| `cases_list[].folder`     | string  | Nama folder kasus (contoh: `"case_001"`).                       |
| `cases_list[].difficulty` | string  | `"AMATEUR_SLEUTH"`, `"DETECTIVE"`, atau `"EXPERT"`.             |
| `cases_list[].is_active`  | boolean | Jika `false`, kasus tidak muncul di daftar (untuk development). |

---

## 3. Manifest Kasus (`case.json`)

Ini adalah **file terpenting**. Engine menggunakannya untuk memahami seluruh struktur kasus.

**Lokasi:** `cases/case_001/case.json`

### 3.1. Struktur Root

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

### 3.2. `meta` — Metadata Kasus

| Field                        | Tipe    | Contoh                    | Keterangan              |
| :--------------------------- | :------ | :------------------------ | :---------------------- |
| `title`                      | string  | `"Malam di Wisma Angker"` | Judul kasus.            |
| `author`                     | string  | `"Tim RetroSleuth"`       | Nama pembuat.           |
| `version`                    | string  | `"1.0"`                   | Versi konten.           |
| `difficulty`                 | string  | `"Expert"`                | Tingkat kesulitan.      |
| `estimated_playtime_minutes` | integer | `90`                      | Estimasi waktu minimum. |
| `year`                       | integer | `1979`                    | Tahun kejadian.         |
| `description`                | string  | `"Deskripsi lengkap..."`  | Narasi detail kasus.    |

```json
"meta": {
  "title": "Malam di Wisma Angker",
  "author": "Tim RetroSleuth",
  "version": "3.0",
  "difficulty": "Expert",
  "estimated_playtime_minutes": 90,
  "year": 1979,
  "description": "Seorang pengusaha tekstil ditemukan tewas di ruang kerjanya yang terkunci..."
}
```

### 3.3. `victim` — Data Korban

| Field            | Tipe    | Contoh                       |
| :--------------- | :------ | :--------------------------- |
| `name`           | string  | `"Haryanto Wijaya"`          |
| `age`            | integer | `62`                         |
| `occupation`     | string  | `"Pengusaha Tekstil"`        |
| `cause_of_death` | string  | `"Keracunan Kalium Sianida"` |
| `time_of_death`  | string  | `"Antara 22.30 - 23.30"`     |
| `location`       | string  | `"Ruang Kerja, Lantai 2"`    |

```json
"victim": {
  "name": "Haryanto Wijaya",
  "age": 62,
  "occupation": "Pengusaha Tekstil",
  "cause_of_death": "Keracunan Kalium Sianida (KCN)",
  "time_of_death": "Antara pukul 22.30 dan 23.30",
  "location": "Ruang kerja di lantai 2 Wisma Angker"
}
```

### 3.4. `assets` — Path Folder

Menentukan di mana engine mencari file terkait.

```json
"assets": {
  "briefing_file": "briefing.md",
  "evidence_directory": "evidence",
  "character_directory": "characters",
  "images_directory": "images"
}
```

### 3.5. `evidence_registry` — Daftar Semua Bukti

Array berisi semua bukti yang ada di kasus (termasuk yang terkunci). Setiap item **wajib** memiliki:

| Field               | Tipe   | Contoh                | Keterangan                        |
| :------------------ | :----- | :-------------------- | :-------------------------------- |
| `id`                | string | `"evi_001"`           | ID unik. Format `evi_` + 3 digit. |
| `title`             | string | `"Laporan Otopsi"`    | Judul yang ditampilkan di UI.     |
| `file`              | string | `"evi_001.md"`        | Nama file di folder `evidence/`.  |
| `icon`              | string | `"📄"`                | Emoji ikon.                       |
| `description_short` | string | `"Hasil forensik..."` | Tooltip singkat saat hover.       |

```json
"evidence_registry": [
  {
    "id": "evi_001",
    "title": "Laporan Otopsi Resmi",
    "file": "evi_001.md",
    "icon": "📄",
    "description_short": "Hasil forensik lengkap korban."
  },
  {
    "id": "evi_002",
    "title": "Buku Besar Keuangan Rahasia",
    "file": "evi_002.md",
    "icon": "📒",
    "description_short": "Catatan keuangan mencurigakan."
  }
]
```

### 3.6. `evidence_structure` — Folder Virtual (File Manager)

Mengelompokkan bukti ke dalam folder di Evidence File Manager. Ini murni untuk organisasi UI.

```json
"evidence_structure": {
  "Dokumen Resmi": ["evi_001", "evi_005", "evi_003"],
  "Surat & Catatan": ["evi_004", "evi_006", "evi_011"],
  "Bukti Fisik": ["evi_002", "evi_009", "evi_010", "evi_012"],
  "Log Kunjungan": ["evi_007"]
}
```

### 3.7. `characters` — Referensi Karakter

Array referensi ke file karakter. Engine akan memuat file-file ini secara paralel.

| Field   | Tipe   | Contoh                  |
| :------ | :----- | :---------------------- |
| `id`    | string | `"char_001"`            |
| `name`  | string | `"Rahmat"`              |
| `role`  | string | `"Keponakan / Akuntan"` |
| `file`  | string | `"char_001.json"`       |
| `photo` | string | `"images/char_001.png"` |

```json
"characters": [
  {
    "id": "char_001",
    "name": "Rahmat",
    "role": "Keponakan / Akuntan Pribadi",
    "file": "char_001.json",
    "photo": "images/char_001.png"
  }
]
```

### 3.8. `solution_matrix` — 🏆 Solusi Kasus

Ini adalah **jantung validasi tuduhan**. Pemain menang jika memenuhi semua kondisi di sini.

| Field                            | Tipe   | Contoh                   | Keterangan                                      |
| :------------------------------- | :----- | :----------------------- | :---------------------------------------------- |
| `culprit_id`                     | string | `"char_002"`             | ID karakter pelaku sebenarnya.                  |
| `motive`                         | string | `"Balas dendam..."`      | Motif pembunuhan (untuk validasi kata kunci).   |
| `primary_evidence`               | string | `"evi_001"`              | Bukti utama yang WAJIB dipilih.                 |
| `secondary_evidence`             | array  | `["evi_006", "evi_010"]` | Bukti sekunder yang WAJIB dipilih (minimal 4).  |
| `explanation_file`               | string | `"solution.md"`          | File epilog.                                    |
| `alternative_suspect_misdirects` | object | `{"char_001": "..."}`    | Penjelasan mengapa tersangka lain bukan pelaku. |

```json
"solution_matrix": {
  "culprit_id": "char_002",
  "motive": "Balas dendam karena perselingkuhan dan upaya Haryanto mengubah wasiat.",
  "primary_evidence": "evi_001",
  "secondary_evidence": [
    "evi_006",
    "evi_010",
    "evi_011",
    "evi_004",
    "evi_012",
    "evi_003"
  ],
  "explanation_file": "solution.md",
  "alternative_suspect_misdirects": {
    "char_001": "Rahmat mencuri buku besar untuk menutupi utangnya, tetapi ia bukan pembunuh.",
    "char_003": "Budi melihat kejadian namun sengaja terlambat karena dendam lama."
  }
}
```

> **⚠️ Catatan:** Pemain harus memilih **SEMUA** bukti di `secondary_evidence`. Ini memaksa pemain untuk benar-benar memahami kasus, bukan sekadar menebak.

### 3.9. `initial_evidence` — Bukti Awal

Array ID bukti yang langsung terbuka saat kasus dimulai. Biasanya hanya berisi laporan otopsi.

```json
"initial_evidence": ["evi_001"]
```

### 3.10. `timeline` — Kronologi

Array kronologi kejadian. Setiap item memiliki `time` (format `"HH.MM"`) dan `description`.

```json
"timeline": [
  { "time": "20.00", "description": "Haryanto dan Sari makan malam bersama." },
  { "time": "21.15", "description": "Rahmat tiba di Wisma." },
  { "time": "22.30", "description": "Saksi mendengar suara gelas pecah." }
]
```

### 3.11. `objectives` — Tugas Investigasi

Membantu pemain tetap pada jalur. **Prefix ID adalah `goal_`** (bukan `obj_`).

```json
"objectives": [
  {
    "id": "goal_001",
    "text": "Baca laporan briefing dan otopsi awal",
    "hint": "Buka Case Files, baca briefing."
  },
  {
    "id": "goal_002",
    "text": "Temukan Buku Besar Keuangan di TKP",
    "hint": "Periksa laci meja kerja."
  }
]
```

### 3.12. `crime_scene` — Tempat Kejadian Perkara (TKP)

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

```json
"crime_scene": {
  "description": "Ruang kerja mewah dengan meja kayu jati dan rak buku tinggi.",
  "areas": [
    {
      "id": "area_001",
      "name": "Meja Kerja",
      "short_desc": "Meja kayu jati besar dengan laci-laci.",
      "objects": [
        {
          "id": "obj_001",
          "label": "🔓 Buka laci utama",
          "type": "evidence",
          "evidence_unlock": "evi_002",
          "narrative": "Di dalam laci, terselip sebuah buku besar berdebu..."
        },
        {
          "id": "obj_005",
          "label": "🔒 Laci tersembunyi (terkunci)",
          "type": "locked",
          "required_item": "evi_009",
          "narrative": "Laci kecil di belakang meja, terkunci rapat."
        }
      ]
    }
  ]
}
```

### 3.13. `real_time_events` — Event Waktu Nyata

Event yang terpicu berdasarkan waktu (menit dari mulai kasus). Menciptakan pacing investigasi yang natural.

| Field                       | Tipe    | Contoh                  | Keterangan                                         |
| :-------------------------- | :------ | :---------------------- | :------------------------------------------------- |
| `id`                        | string  | `"rte_001"`             | Format `rte_` + 3 digit.                           |
| `trigger.type`              | string  | `"relative"`            | `"relative"` (menit) atau `"clock"` (jam dinding). |
| `trigger.minutes`           | integer | `0`                     | Menit ke berapa event terpicu.                     |
| `action`                    | string  | `"unlock_evidence"`     | Jenis aksi.                                        |
| `payload.evidence_id`       | string  | `"evi_001"`             | ID bukti yang di-unlock.                           |
| `payload.message`           | string  | `"📨 Amplop coklat..."` | Pesan notifikasi.                                  |
| `payload.show_notification` | boolean | `true`                  | Tampilkan toast atau tidak.                        |

```json
"real_time_events": [
  {
    "id": "rte_001",
    "trigger": { "type": "relative", "minutes": 0 },
    "action": "unlock_evidence",
    "payload": {
      "evidence_id": "evi_001",
      "message": "📨 Amplop coklat mendarat di meja Anda...",
      "show_notification": true,
      "play_sound": "unlock"
    }
  },
  {
    "id": "rte_012",
    "trigger": { "type": "relative", "minutes": 120 },
    "action": "deadline_reached",
    "payload": {
      "message": "⏰ Waktu habis! Kasus gagal.",
      "game_over": true
    }
  }
]
```

---

## 4. Data Karakter (`char_*.json`)

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

---

## 5. File Markdown (Bukti, Briefing, Solution)

Semua konten naratif ditulis dalam format Markdown (`.md`). Engine merendernya menjadi HTML.

### 5.1. Bukti (`evi_*.md`)

Gunakan struktur dokumen otentik: kop surat, tabel, dan tanda tangan.

```markdown
# LAPORAN AUTOPSI FORENSIK

## BIDANG KEDOKTERAN FORENSIK — KEPOLISIAN RESOR PUNCAK

**No. Autopsi:** AF/14/VI/1979/PKR

---

## I. PEMERIKSAAN LUAR

| Parameter    | Temuan                    |
| ------------ | ------------------------- |
| Tinggi badan | 168 cm                    |
| Berat badan  | 72 kg                     |
| Warna kulit  | Pucat kebiruan (sianosis) |

---

## V. SEBAB KEMATIAN

**Keracunan akut Kalium Sianida (KCN)**

> _"Kadar sianida dalam darah mencapai 3.2 mg/L, jauh di atas ambang fatal (0.5 mg/L)."_

---

**Dokter Forensik,**
**dr. Surya Dharma, Sp.F**
```

### 5.2. Briefing (`briefing.md`)

Laporan polisi pembuka. Harus memberikan konteks dan memperkenalkan tersangka.

```markdown
# LAPORAN KEJADIAN — MALAM DI WISMA ANGKER

**Kepolisian Resor Puncak**
**Tanggal:** 14 Juni 1979

---

Pada tanggal 13 Juni 1979, pukul 00.15, **Budi** (kepala pelayan) menemukan **Haryanto Wijaya** (62) tewas di ruang kerjanya yang terkunci.

**Korban:** Haryanto Wijaya, pengusaha tekstil kaya raya.
**Lokasi:** Ruang kerja, Wisma Angker, Puncak.
**Penyebab:** Keracunan Kalium Sianida.

---

## DAFTAR TERSANGKA

| Nama        | Peran               | Motif                   |
| ----------- | ------------------- | ----------------------- |
| Sari Wijaya | Istri korban        | Perselingkuhan, warisan |
| Rahmat      | Keponakan / Akuntan | Utang judi              |
| Budi        | Kepala Pelayan      | Dendam pribadi          |

---

**Instruksi:** Selidiki TKP, kumpulkan bukti, dan interogasi para tersangka.
```

### 5.3. Solution (`solution.md`)

Epilog yang ditampilkan setelah kasus terpecahkan.

```markdown
# REKONSTRUKSI PEMBUNUHAN

## Pelaku: Sari Wijaya

### Motif

Sari meracuni Haryanto karena:

1. Haryanto berselingkuh dengan Rina.
2. Haryanto akan mengubah wasiat, mengurangi bagian Sari.

### Kronologi

1. Sari membeli sianida di apotek.
2. Malam itu, ia menuangkan racun ke gelas brandy.
3. Haryanto meminumnya dan meninggal.

### Bukti Kunci

- Nota Apotek (evi_010)
- Serpihan Kaca dengan sidik jari (evi_012)
- Draf Surat Wasiat (evi_011)

**Kasus selesai. Sari ditangkap.**
```

---

## 6. ✅ Checklist Validasi

Sebelum menguji kasus, periksa hal-hal berikut:

- [ ] **index.json** valid dan `total_cases` sesuai dengan jumlah array.
- [ ] **case.json** memiliki semua field wajib (`id`, `meta`, `victim`, `evidence_registry`, `solution_matrix`).
- [ ] Semua ID di `evidence_structure` merujuk ke ID yang ada di `evidence_registry`.
- [ ] Semua ID di `solution_matrix.culprit_id` merujuk ke karakter yang ada di `characters`.
- [ ] Semua `evidence_unlock` di `crime_scene` merujuk ke ID di `evidence_registry`.
- [ ] `initial_evidence` hanya berisi ID yang ada di `evidence_registry`.
- [ ] Semua file `.json` tidak memiliki error sintaks (gunakan validator JSON online).
- [ ] Semua file `.md` dapat dibaca dan tidak kosong.

---

## 7. 🎯 Best Practices & Tips

### Red Herring (Petunjuk Palsu)

- Buat karakter yang terlihat sangat bersalah (motif kuat) tapi **tidak punya kesempatan**.
- Letakkan bukti yang mengarah ke tersangka yang salah (misal: surat ancaman dari buruh).

### Keseimbangan Kesulitan

- **Amateur Sleuth:** 4-6 bukti sekunder, TKP sederhana (3 area).
- **Detective:** 6-8 bukti sekunder, TKP sedang (4-5 area), beberapa item terkunci.
- **Expert:** 8-12 bukti sekunder, TKP kompleks (6+ area), banyak item terkunci dan real-time events.

### Real-Time Events

- Jangan beri semua bukti di awal. Sebarkan selama 90-120 menit.
- Event di menit 0-30: Bukti pengantar (otopsi, saksi awal).
- Event di menit 30-60: Bukti motif (nota, surat).
- Event di menit 60-90: Bukti fisik (sidik jari, serpihan kaca).

### Penulisan Karakter

- Setiap karakter harus punya **setidaknya 3 rahasia** (meskipun bukan pelaku).
- Gunakan `reactions_to_evidence` untuk membuat interogasi terasa hidup.
- Karakter pelaku harus memiliki **4 fase interogasi**, dengan pengakuan di fase 4.

### Penamaan Objek TKP

- Gunakan ID `obj_001` sampai `obj_999` secara **global increment** di seluruh area. Jangan reset per area.

---

## 8. 🚀 Testing Kasus

Setelah selesai menulis semua file:

1. Jalankan RetroSleuth (buka `index.html` dengan Live Server).
2. Buka **Case Files** → kasus baru Anda harus muncul di daftar.
3. Pilih kasus → **Briefing** terbuka.
4. Periksa **Evidence** → bukti awal muncul.
5. Periksa **Crime Scene** → semua area dan objek bisa diklik.
6. Periksa **Dossier** → karakter muncul dengan profil.
7. **Ajukan tuduhan** dengan solusi yang benar → pastikan kasus terpecahkan.

---

## 9. ❗ Troubleshooting Common Errors

| Error di Console                                             | Penyebab                                    | Solusi                                                  |
| :----------------------------------------------------------- | :------------------------------------------ | :------------------------------------------------------ |
| `Case not found in index.json`                               | Nama folder tidak cocok.                    | Periksa `folder` di `index.json` vs nama folder.        |
| `Bukti 'evi_XXX' tidak terdaftar`                            | ID bukti tidak ada di `evidence_registry`.  | Tambahkan ID ke `evidence_registry`.                    |
| `Karakter 'char_XXX' tidak ditemukan`                        | ID karakter tidak ada di `characters`.      | Periksa daftar `characters` di `case.json`.             |
| `Cannot read properties of undefined (reading 'culprit_id')` | `solution_matrix` tidak lengkap.            | Pastikan `solution_matrix` ada dan berisi `culprit_id`. |
| `Failed to fetch case.json`                                  | File tidak ditemukan atau JSON tidak valid. | Periksa lokasi file dan validasi JSON.                  |

---

Selamat membuat kasus! 🕵️‍♂️ Jangan ragu untuk bereksperimen dengan alur cerita yang unik. Jika ada pertanyaan, buka issue di repository atau hubungi komunitas.
