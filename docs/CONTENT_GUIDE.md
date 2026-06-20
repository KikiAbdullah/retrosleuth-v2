# 📝 CONTENT GUIDE — RetroSleuth: Case Files Detective

**Version:** 1.0.0  
**Last Updated:** 2026-06-19

Selamat datang di panduan konten RetroSleuth! Panduan ini dirancang untuk membantu Anda menulis **cerita detektif yang imersif, karakter yang hidup, dan bukti yang menceritakan kisahnya sendiri**. Tidak seperti panduan teknis ([MODDING_GUIDE.md](MODDING_GUIDE.md)), panduan ini fokus pada **seni bercerita** dan **desain misteri**—bagaimana membuat pemain merasa seperti detektif sungguhan.

---

## 📖 Daftar Isi

1. [Filosofi Dasar](#1-filosofi-dasar)
2. [Struktur Misteri](#2-struktur-misteri)
3. [Desain Karakter](#3-desain-karakter)
4. [Desain Bukti](#4-desain-bukti)
5. [Desain Kronologi & Timeline](#5-desain-kronologi-timeline)
6. [Desain TKP Interaktif](#6-desain-tkp-interaktif)
7. [Pacing & Real-Time Events](#7-pacing--real-time-events)
8. [Penulisan Dialog AI](#8-penulisan-dialog-ai)
9. [Menulis Solusi & Epilog](#9-menulis-solusi--epilog)
10. [Keseimbangan Kesulitan](#10-keseimbangan-kesulitan)
11. [Checklist Final](#11-checklist-final)
12. [Contoh Kasus Lengkap](#12-contoh-kasus-lengkap)
13. [Tips & Trik Lanjutan](#13-tips--trik-lanjutan)

---

## 1. Filosofi Dasar

Sebelum menulis, pahami tiga pilar utama desain konten RetroSleuth:

### 🧠 Pilar 1: Deduksi, Bukan Tebakan

> _"Kemenangan harus merupakan hasil dari penalaran logis yang menghubungkan bukti, motif, dan kesaksian."_

**Implikasi untuk penulis:**

- Setiap petunjuk harus **saling terhubung** secara logis.
- Pemain tidak boleh bisa menang hanya dengan **menebak** atau mencoba semua kombinasi.
- `secondary_evidence` (minimal 4 item) memaksa pemain untuk **benar-benar memahami** kasus, bukan sekadar menebak pelaku.

### 👑 Pilar 2: Bukti adalah Raja

> _"Interogasi adalah alat, tetapi bukti adalah segalanya."_

**Implikasi untuk penulis:**

- **Semua tuduhan harus didukung oleh bukti fisik atau dokumen.**
- AI boleh mengaku, tapi **sistem hanya memvalidasi kemenangan berdasarkan bukti yang dikumpulkan**.
- Bukti forensik (sidik jari, serpihan kaca) lebih kuat daripada kesaksian.

### 🎭 Pilar 3: Orang Berbohong

> _"Karakter adalah entitas yang memiliki agenda bertahan hidup. Mereka akan berbohong, memelintir fakta, atau menyalahkan orang lain."_

**Implikasi untuk penulis:**

- Setiap karakter harus memiliki **rahasia bertingkat**.
- Karakter tidak boleh mengaku secara sukarela—pemain harus **menekan** dengan bukti.
- Kebohongan harus **konsisten** dengan alibi dan pernyataan sebelumnya.

---

## 2. Struktur Misteri

### 2.1. Tiga Lapis Kebenaran

Setiap kasus harus memiliki tiga lapis kebenaran:

| Lapis                    | Deskripsi                                   | Contoh                                        |
| :----------------------- | :------------------------------------------ | :-------------------------------------------- |
| **Lapis 1: Permukaan**   | Apa yang terlihat oleh semua orang.         | "Haryanto ditemukan tewas di ruang kerjanya." |
| **Lapis 2: Tersembunyi** | Fakta yang tidak terlihat di permukaan.     | "Ada sidik jari di bagian dalam gelas."       |
| **Lapis 3: Kebenaran**   | Kebenaran utuh yang harus ditemukan pemain. | "Sari meracuni Haryanto karena wasiat."       |

### 2.2. Struktur Naratif 5 Babak

| Babak                   | Durasi (menit) | Tujuan Pemain                                         |
| :---------------------- | :------------- | :---------------------------------------------------- |
| **Babak 1: Pengenalan** | 0-15           | Baca briefing, kenali tersangka, dapatkan bukti awal. |
| **Babak 2: Eksplorasi** | 15-40          | Jelajahi TKP, kumpulkan bukti fisik.                  |
| **Babak 3: Interogasi** | 40-70          | Interogasi tersangka, temukan kontradiksi.            |
| **Babak 4: Analisis**   | 70-100         | Hubungkan bukti, temukan motif, perkuat teori.        |
| **Babak 5: Penutupan**  | 100-120        | Ajukan tuduhan, selesaikan kasus.                     |

### 2.3. Komponen Wajib

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

---

## 3. Desain Karakter

### 3.1. Tiga Fungsi Karakter

| Fungsi          | Deskripsi                                             | Contoh                          |
| :-------------- | :---------------------------------------------------- | :------------------------------ |
| **Pelaku**      | Karakter yang benar-benar melakukan pembunuhan.       | Sari (istri)                    |
| **Red Herring** | Karakter yang terlihat bersalah tapi tidak.           | Rahmat (keponakan dengan utang) |
| **Saksi**       | Karakter yang melihat sesuatu tapi menyembunyikannya. | Budi (pelayan yang dendam)      |

### 3.2. Anatomi Karakter yang Baik

#### A. Latar Belakang (Background)

Ceritakan kehidupan karakter **sebelum** pembunuhan. Ini membentuk motif dan kepribadian.

> ❌ **Buruk:** _"Rahmat adalah keponakan Haryanto."_
>
> ✅ **Baik:** _"Rahmat adalah keponakan Haryanto yang dibesarkan sejak kecil. Ia bekerja sebagai akuntan pribadi, tetapi telah menggelapkan uang perusahaan untuk berjudi. Terlilit utang Rp 497 juta ke rentenir, ia putus asa."_

#### B. Kepribadian (Personality)

Bagaimana karakter bersikap? Ini memengaruhi gaya bicara AI.

> ❌ **Buruk:** _"Rahmat gugup."_
>
> ✅ **Baik:** _"Rahmat gugup, defensif, mudah panik, tapi jujur dan naif. Ia tidak cukup berani untuk membunuh, tetapi cukup bodoh untuk mencuri."_

#### C. Gaya Bicara (Voice Style)

Berikan petunjuk spesifik tentang bagaimana AI harus berbicara.

> ❌ **Buruk:** _"Rahmat bicara dengan gugup."_
>
> ✅ **Baik:** _"Bicara cepat dan terbata-bata saat tertekan. Sering mengulang kata-kata seperti 'Saya... saya tidak tahu.' Jika ditekan, suaranya meninggi dan mulai merengek."_

#### D. Rahasia Bertingkat (Secrets)

Setiap karakter harus punya **4 tingkat rahasia**, dari yang paling kecil hingga paling besar.

| Tingkat | Kondisi Pemicu                          | Isi Rahasia                                |
| :------ | :-------------------------------------- | :----------------------------------------- |
| **1**   | Ditanya tentang topik sensitif          | Mengaku kesepian dan punya teman dekat.    |
| **2**   | Ditunjukkan bukti tertentu              | Akui tahu Haryanto akan mengubah wasiat.   |
| **3**   | Ditunjukkan bukti yang lebih kuat       | Akui membeli sianida, tapi untuk "teater". |
| **4**   | Ditunjukkan bukti kunci (serpihan kaca) | Mengaku menuangkan racun (jika pelaku).    |

### 3.3. Contoh Profil Karakter Lengkap

**Sari Wijaya — Pelaku**

```json
{
  "id": "char_002",
  "name": "Sari Wijaya",
  "age": 29,
  "role": "Istri korban",
  "occupation": "Mantan aktris teater",
  "relationship_to_victim": "Istri kedua (menikah 1976)",
  "background": "Mantan aktris teater yang menikah dengan Haryanto demi uang. Pernikahan tidak bahagia. Haryanto posesif dan merendahkannya. Sari berselingkuh dengan Rendy, instruktur berkuda.",
  "personality": "Manipulator ulung, dramatis, narsis. Berganti-ganti topeng sesuai lawan bicara. Pandai berpura-pura menjadi korban.",
  "voice_style": "Teatrikal dan puitis. Sering menggunakan kalimat pasif untuk menghindari pengakuan. Jika terpojok, suaranya meninggi lalu berubah menjadi isak tangis.",
  "alibi": "Mengaku di kamar tidur sayap barat sejak pukul 21.00, minum obat tidur, dan membaca novel.",
  "secrets": [
    {
      "id": "secret_001",
      "trigger_condition": "Jika detektif bertanya tentang hubungan dengan Haryanto.",
      "detail": "Mengaku kesepian dan memiliki teman dekat (Rendy).",
      "reveal_condition": "Trust > 30"
    },
    {
      "id": "secret_002",
      "trigger_condition": "Jika detektif menunjukkan bukti 'Surat Wasiat'.",
      "detail": "Akui tahu Haryanto akan mengubah wasiat, mengurangi bagian Sari.",
      "reveal_condition": "Bukti evi_011"
    },
    {
      "id": "secret_003",
      "trigger_condition": "Jika detektif menunjukkan bukti 'Nota Apotek'.",
      "detail": "Akui membeli sianida, tapi untuk properti teater.",
      "reveal_condition": "Bukti evi_010"
    },
    {
      "id": "secret_004",
      "trigger_condition": "Jika detektif menunjukkan 'Serpihan Kaca' dan menyebut sidik jari.",
      "detail": "Mengaku menuangkan racun ke gelas brandy Haryanto.",
      "reveal_condition": "Bukti evi_012 dan Trust > 60"
    }
  ]
}
```

### 3.4. Tips Menulis Red Herring (Petunjuk Palsu)

Red herring adalah karakter atau bukti yang terlihat bersalah tapi tidak.

**Cara membuat red herring efektif:**

1. **Motif yang jelas** — Beri motif yang sangat kuat (utang, dendam).
2. **Bukti yang memberatkan** — Letakkan bukti yang mengarah ke karakter ini.
3. **Alibi yang lemah** — Buat alibi yang mudah diragukan.
4. **Tetapi...** — Beri alasan mengapa karakter ini **tidak mungkin** menjadi pelaku (tidak ada kesempatan, bukti bertentangan).

**Contoh Red Herring — Rahmat:**

- ✅ Motif: Utang judi Rp 497 juta.
- ✅ Bukti: Ketahuan mencuri buku besar, kabur lewat jendela.
- ✅ Alibi: Mengaku di kamar, tapi ketahuan di taman.
- ❌ Kenapa bukan pelaku: Tidak membeli sianida, tidak tahu tentang racun, masuk setelah Haryanto sekarat.

---

## 4. Desain Bukti

### 4.1. Jenis-Jenis Bukti

| Jenis         | Contoh                    | Kekuatan                     | Cara Ditemukan      |
| :------------ | :------------------------ | :--------------------------- | :------------------ |
| **Forensik**  | Laporan otopsi            | Menentukan penyebab kematian | Initial / Real-Time |
| **Fisik**     | Sidik jari, serpihan kaca | Membuktikan kehadiran pelaku | TKP                 |
| **Dokumen**   | Nota, surat wasiat        | Membuktikan motif            | TKP / Real-Time     |
| **Kesaksian** | Laporan saksi             | Membuktikan kontradiksi      | Real-Time / TKP     |
| **Log**       | CCTV, buku tamu           | Membuktikan pergerakan       | Real-Time / TKP     |

### 4.2. Hierarki Bukti

Susun bukti dari yang paling **umum** ke yang paling **spesifik**:

| Lapis                     | Jenis Bukti               | Contoh                                   |
| :------------------------ | :------------------------ | :--------------------------------------- |
| **Lapis 1: Fakta Dasar**  | Laporan otopsi, kronologi | "Korban meninggal karena sianida."       |
| **Lapis 2: Motif**        | Surat wasiat, nota apotek | "Sari membeli sianida."                  |
| **Lapis 3: Keterlibatan** | Sidik jari, CCTV          | "Sari ada di TKP malam itu."             |
| **Lapis 4: Konfirmasi**   | Serpihan kaca, pengakuan  | "Sidik jari Sari di bagian dalam gelas." |

### 4.3. Menulis Bukti yang Menceritakan Kisah

Setiap bukti harus **menceritakan bagian dari cerita** dan **terlihat otentik**.

#### Contoh: Laporan Otopsi (`evi_001.md`)

```markdown
# LAPORAN AUTOPSI FORENSIK

## BIDANG KEDOKTERAN FORENSIK — KEPOLISIAN RESOR PUNCAK

**No. Autopsi:** AF/14/VI/1979/PKR
**Tanggal Pemeriksaan:** 14 Juni 1979
**Dokter Forensik:** dr. Surya Dharma, Sp.F

---

## I. IDENTITAS KORBAN

| Parameter     | Data            |
| ------------- | --------------- |
| Nama          | Haryanto Wijaya |
| Usia          | 62 tahun        |
| Jenis Kelamin | Laki-laki       |
| Berat Badan   | 72 kg           |
| Tinggi Badan  | 168 cm          |

---

## II. PEMERIKSAAN LUAR

- **Warna kulit:** Pucat kebiruan (sianosis) pada bibir dan ujung jari.
- **Luka:** Tidak ditemukan luka tusuk atau benda tajam.
- **Tanda kekerasan:** Memar kecil di pergelangan tangan kanan.

---

## III. PEMERIKSAAN DALAM

- **Lambung:** Mengandung residu cairan berwarna kuning, berbau pahit seperti amandel.
- **Darah:** Warna merah cerah (khas keracunan sianida).

---

## IV. ANALISIS TOKSIKOLOGI

| Zat           | Kadar    | Ambang Fatal |
| ------------- | -------- | ------------ |
| Sianida (CN⁻) | 3.2 mg/L | > 0.5 mg/L   |

---

## V. SEBAB KEMATIAN

**Keracunan akut Kalium Sianida (KCN)**

> _"Kadar sianida dalam darah mencapai 3.2 mg/L, jauh di atas ambang fatal. Kematian terjadi sekitar 15-20 menit setelah konsumsi."_

---

## VI. KESIMPULAN

Korban meninggal akibat keracunan sianida yang dikonsumsi melalui minuman.

**Dokter Forensik,**

**dr. Surya Dharma, Sp.F**
```

#### Contoh: Nota Apotek (`evi_010.md`)

```markdown
# NOTA PEMBELIAN — APOTEK SUMBER WARAS

**Alamat:** Jl. Puncak Raya No. 17, Puncak
**Tanggal:** 13 Juni 1979
**Kasir:** Marni

---

## DAFTAR PEMBELIAN

| Nama Barang                  | Qty     | Harga      |
| ---------------------------- | ------- | ---------- |
| Kalium Sianida (KCN) 10 gram | 1 botol | Rp 125.000 |

---

## METODE PEMBAYARAN

Tunai

---

## PEMBELI

**Nama:** Ny. S
**Alamat:** Wisma Angker, Puncak

---

**Catatan:** Pembeli terlihat gelisah. Memakai kerudung dan kacamata hitam meskipun malam hari.
```

### 4.4. Tips Menulis Bukti

1. **Gunakan format dokumen resmi** — Kop surat, tabel, tanda tangan.
2. **Sertakan detail kecil** — Waktu, nomor, inisial yang menjadi petunjuk.
3. **Ciptakan konsistensi** — Tanggal di nota harus cocok dengan timeline.
4. **Jangan terlalu jelas** — Biarkan pemain menghubungkan titik-titik.
5. **Variasi format** — Laporan, surat, kliping koran, catatan tangan.

---

## 5. Desain Kronologi & Timeline

### 5.1. Struktur Timeline

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

### 5.2. Tips Menulis Timeline

1. **Mulai dari malam kejadian** — Bukan hari-hari sebelumnya (kecuali penting).
2. **Setiap peristiwa harus relevan** — Jangan tambahkan detail yang tidak berguna.
3. **Gunakan `evidence_links`** — Hubungkan peristiwa dengan bukti.
4. **Buat kontradiksi** — Timeline harus mengungkap alibi yang bertentangan.
5. **Jangan beri jawaban** — Timeline adalah alat bantu, bukan solusi.

### 5.3. Timeline dengan Evidence Links

Untuk versi yang lebih canggih, tambahkan `evidence_links`:

```json
{
  "time": "21.30",
  "description": "Sari membeli sianida di Apotek Sumber Waras.",
  "evidence_links": ["evi_010"]
},
{
  "time": "22.30",
  "description": "Saksi mendengar suara gelas pecah.",
  "evidence_links": ["evi_005", "evi_012"]
}
```

---

## 6. Desain TKP Interaktif

### 6.1. Prinsip Desain TKP

1. **Setiap area harus memiliki tujuan** — Jangan buat area yang tidak mengandung petunjuk.
2. **Bukti harus ditemukan secara logis** — Jangan sembunyikan bukti di tempat yang tidak masuk akal.
3. **Gunakan locked items** — Ciptakan dependensi (butuh kunci untuk membuka laci).
4. **Red herring di TKP** — Letakkan petunjuk palsu untuk membuat pemain berpikir.

### 6.2. Contoh TKP 6 Area

| Area                | Objek Penting    | Jenis    | Membuka                 |
| :------------------ | :--------------- | :------- | :---------------------- |
| **Meja Kerja**      | Laci Utama       | evidence | evi_002 (Buku Besar)    |
|                     | Laci Tersembunyi | locked   | butuh evi_009           |
| **Jendela**         | Sobekan Log      | evidence | evi_003 (Log Keamanan)  |
| **Lemari Arsip**    | Laci Terbuka     | evidence | evi_004 (Surat Ancaman) |
|                     | Laci Terkunci    | locked   | butuh evi_009           |
| **Pintu Masuk**     | Bicara Marni     | evidence | evi_005 (Saksi)         |
| **Rak Buku**        | Buku Harian      | evidence | evi_006 (Catatan Racun) |
| **Lantai & Karpet** | Serpihan Kaca    | evidence | evi_012 (Bukti Kunci)   |
|                     | Kunci Jatuh      | evidence | evi_009 (Kunci)         |
|                     | Nota Apotek      | evidence | evi_010 (Nota)          |

### 6.3. Mekanika Locked Items

Gunakan `type: "locked"` untuk membuat pemain harus menemukan kunci terlebih dahulu.

```json
{
  "id": "obj_005",
  "label": "🔒 Laci tersembunyi (perlu kunci)",
  "type": "locked",
  "required_item": "evi_009",
  "narrative": "Laci kecil di belakang meja, terkunci rapat dengan gembok kuningan."
}
```

Kunci (`evi_009`) bisa ditemukan di area lain:

```json
{
  "id": "obj_023",
  "label": "🔑 Kunci jatuh di lantai",
  "type": "evidence",
  "evidence_unlock": "evi_009",
  "narrative": "Sebuah kunci kecil berkarat tergeletak di bawah meja."
}
```

### 6.4. Tips Menulis Narrasi Objek

Setiap objek di TKP harus memiliki `narrative` yang memberikan informasi, baik berupa petunjuk nyata atau suasana.

**Contoh Narrasi Efektif:**

```json
{
  "id": "obj_001",
  "label": "📄 Buka laci utama",
  "type": "evidence",
  "evidence_unlock": "evi_002",
  "narrative": "Laci kayu jati terbuka dengan sedikit derit. Di dalamnya, terselip sebuah buku besar berdebu dengan sampul kulit coklat. Saat dibuka, terlihat catatan keuangan yang tampaknya disembunyikan—banyak angka yang dicoret dan tulisan 'UTANG' di pinggirnya."
}
```

**Contoh Red Herring:**

```json
{
  "id": "obj_003",
  "label": "📁 Map Kuning",
  "type": "red_herring",
  "narrative": "Map berisi kliping koran lama tentang PHK massal di pabrik tekstil Haryanto. Ada tulisan tangan: 'Korban berikutnya?'—tapi tidak ada hubungannya dengan racun."
}
```

---

## 7. Pacing & Real-Time Events

### 7.1. Prinsip Pacing

1. **Jangan beri semua bukti di awal** — Sebarkan selama 90-120 menit.
2. **Buat momen "Aha!"** — Event tertentu harus menjadi titik balik.
3. **Gunakan deadline** — Tekanan waktu membuat keputusan terasa penting.
4. **Variasi event** — Jangan hanya unlock evidence, tambahkan pesan karakter, notifikasi, dll.

### 7.2. Pola Event yang Efektif

| Fase Waktu        | Jenis Event | Contoh                                 |
| :---------------- | :---------- | :------------------------------------- |
| **0-15 menit**    | Pengantar   | Laporan otopsi, saksi awal             |
| **15-30 menit**   | Eksplorasi  | TKP dibuka, petunjuk pertama           |
| **30-45 menit**   | Motif       | Nota, surat, catatan keuangan          |
| **45-60 menit**   | Kontradiksi | CCTV, log, kesaksian baru              |
| **60-75 menit**   | Bukti fisik | Sidik jari, serpihan kaca              |
| **75-90 menit**   | Konfrontasi | Pesan dari karakter, interogasi intens |
| **90-105 menit**  | Pengakuan   | Karakter mulai mengaku                 |
| **105-120 menit** | Deadline    | Peringatan, game over                  |

### 7.3. Contoh Real-Time Events (120 menit)

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
  },
  {
    "id": "rte_004",
    "trigger": { "type": "relative", "minutes": 30 },
    "action": "send_message_from_character",
    "payload": {
      "character_id": "char_003",
      "message": "🔔 Budi: 'Tuan Detektif, saya ingin bicara. Ada sesuatu yang harus saya katakan.'",
      "auto_open_chat": false,
      "show_notification": true,
      "play_sound": "ring"
    }
  },
  {
    "id": "rte_011",
    "trigger": { "type": "relative", "minutes": 100 },
    "action": "notification",
    "payload": {
      "message": "⏰ WARNING! Deadline dalam 20 menit!",
      "play_sound": "alarm",
      "show_notification": true
    }
  },
  {
    "id": "rte_012",
    "trigger": { "type": "relative", "minutes": 120 },
    "action": "deadline_reached",
    "payload": {
      "message": "⏰ WAKTU HABIS! Kasus gagal. Kembali ke Case Hub.",
      "game_over": true
    }
  }
]
```

### 7.4. Tips Menulis Event

1. **Setiap event harus memiliki tujuan** — Jangan tambahkan event yang tidak memberikan informasi baru.
2. **Gunakan sound effects** — `unlock` untuk bukti baru, `ring` untuk telepon, `alarm` untuk peringatan.
3. **Pesan dari karakter** — Buat pemain merasa tersangka "hidup" dan punya inisiatif.
4. **Jangan terlalu padat** — Beri jeda antar event agar pemain bisa menyerap informasi.

---

## 8. Penulisan Dialog AI

### 8.1. Prinsip Dialog AI

1. **Karakter harus konsisten** — Gaya bicara, pilihan kata, dan emosi harus sama sepanjang interogasi.
2. **Bohong dengan cerdas** — Kebohongan harus masuk akal dan konsisten dengan alibi.
3. **Emosi tercermin dalam dialog** — Stress tinggi → bicara terbata-bata, Anger tinggi → agresif.
4. **Reaksi terhadap bukti** — Setiap bukti harus memicu respons spesifik.

### 8.2. Struktur `reactions_to_evidence`

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

### 8.3. Contoh Fase Interogasi

**Fase 1 — Penyangkalan (Awal Interogasi)**

> "Saya tidak melakukan apa-apa! Saya di kamar sepanjang malam. Saya tidak tahu apa yang terjadi pada Haryanto."

**Fase 2 — Defensif (Setelah beberapa tekanan)**

> "Ya, kami bertengkar. Suami istri bertengkar itu biasa. Itu tidak berarti saya membunuhnya! Saya mencintainya!"

**Fase 3 — Rasionalisasi (Setelah bukti memberatkan)**

> "Saya membeli sianida untuk properti teater! Saya aktris! Saya butuh properti untuk drama. Saya tidak tahu racun itu akan digunakan... untuk Haryanto."

**Fase 4 — Pengakuan (Setelah bukti kunci)**

> "(Hening panjang. Suara berubah dingin.) Jadi Anda sudah tahu. Ya. Saya yang menuangkannya. 10 gram. Cukup untuk membunuhnya dua kali. Dia meminumnya dengan lahap, seperti dia meminum habis hidup saya."

### 8.4. Tips Menulis Dialog AI

1. **Tulis seperti novel** — Dialog harus dramatis dan emosional.
2. **Gunakan petunjuk non-verbal** — `(menangis)`, `(suara bergetar)`, `(tertawa sinis)`.
3. **Konsisten dengan kepribadian** — Karakter manipulatif bicara berbeda dengan karakter polos.
4. **Jangan terlalu panjang** — 3-4 kalimat per respons sudah cukup.
5. **Buat progresi** — Dari penyangkalan → defensif → rasionalisasi → pengakuan.

---

## 9. Menulis Solusi & Epilog

### 9.1. Struktur Solution.md

| Bagian                                  | Konten                                        |
| :-------------------------------------- | :-------------------------------------------- |
| **Rekonstruksi**                        | Kronologi lengkap pembunuhan menit-per-menit. |
| **Pelaku & Motif**                      | Siapa pelaku dan mengapa.                     |
| **Bukti Kunci**                         | Daftar bukti yang membuktikan pelaku.         |
| **Mengapa Tersangka Lain Bukan Pelaku** | Penjelasan untuk setiap red herring.          |
| **Epilog**                              | Apa yang terjadi setelah penangkapan.         |

### 9.2. Contoh Solution.md

```markdown
# REKONSTRUKSI PEMBUNUHAN — MALAM DI WISMA ANGKER

## Kronologi Lengkap

**13 Juni 1979, Wisma Angker, Puncak**

| Waktu | Peristiwa                                                   |
| ----- | ----------------------------------------------------------- |
| 21.30 | Sari membeli 10 gram Kalium Sianida di Apotek Sumber Waras. |
| 22.05 | Sari menuangkan sianida ke gelas brandy Haryanto.           |
| 22.25 | Haryanto kejang-kejang setelah meminum brandy.              |
| 22.30 | Suara gelas pecah terdengar dari ruang kerja.               |
| 22.45 | Rahmat melihat Sari keluar ruang kerja dengan botol kecil.  |
| 23.15 | Mobil Sari keluar Wisma.                                    |
| 00.15 | Budi menemukan tubuh Haryanto.                              |

---

## Pelaku: Sari Wijaya

### Motif

1. **Perselingkuhan Haryanto** — Haryanto berselingkuh dengan Rina, sekretarisnya. Sari merasa dikhianati.
2. **Revisi Wasiat** — Haryanto akan mengubah wasiat, mengurangi bagian Sari dari 80% menjadi 20%.
3. **Dendam Pribadi** — Haryanto sering merendahkan Sari di depan umum.

### Cara Pembunuhan

Sari membeli sianida 10 gram dari Apotek Sumber Waras. Malam itu, ia menuangkan racun ke dalam gelas brandy Haryanto. Haryanto meminumnya dan meninggal dalam waktu 15-20 menit.

---

## Bukti Kunci

| Bukti                    | Peran                                  |
| ------------------------ | -------------------------------------- |
| Laporan Otopsi (evi_001) | Membuktikan racun sianida.             |
| Nota Apotek (evi_010)    | Membuktikan Sari membeli sianida.      |
| Serpihan Kaca (evi_012)  | Sidik jari Sari di bagian dalam gelas. |
| Surat Wasiat (evi_011)   | Motif—wasiat akan direvisi.            |
| Catatan Racun (evi_006)  | Tulisan tangan Sari tentang dosis.     |
| Log Keamanan (evi_003)   | Membuktikan Sari keluar malam itu.     |

---

## Mengapa Tersangka Lain Bukan Pelaku?

### Rahmat (char_001)

Rahmat masuk melalui jendela hanya untuk mencuri buku besar. Ia melihat Haryanto sudah sekarat. Ia tidak memiliki akses ke sianida.

### Budi (char_003)

Budi memiliki dendam, tetapi ia hanya saksi. Ia melihat Sari meracuni, tetapi tidak bertindak karena dendamnya. Ia tidak memiliki sianida.

---

## Epilog

Sari Wijaya ditangkap dan diadili atas pembunuhan berencana. Pengadilan menjatuhkan hukuman 20 tahun penjara.

Rahmat dihukum ringan karena kesaksiannya. Budi dihukum karena tidak melapor.

Kasus ini menjadi salah satu misteri paling terkenal di kalangan detektif amatir.
```

### 9.3. Tips Menulis Solution

1. **Jelaskan semua kontradiksi** — Mengapa alibi tersangka lain tidak valid.
2. **Tunjukkan rantai bukti** — Bagaimana setiap bukti terhubung.
3. **Buat epilog memuaskan** — Beri resolusi untuk semua karakter.
4. **Jangan terlalu pendek** — Pemain layak mendapatkan penjelasan yang lengkap.

---

## 10. Keseimbangan Kesulitan

### 10.1. Tiga Tingkat Kesulitan

| Tingkat            | Bukti Sekunder | TKP Area | Items Terkunci | Real-Time Events |
| :----------------- | :------------- | :------- | :------------- | :--------------- |
| **Amateur Sleuth** | 4-5            | 3-4      | 1-2            | 5-6              |
| **Detective**      | 5-7            | 4-5      | 3-4            | 7-9              |
| **Expert**         | 7-12           | 5-6      | 5+             | 10-12            |

### 10.2. Tips Menyeimbangkan Kasus

1. **Mulai dari Amateur Sleuth** — Jangan langsung membuat Expert untuk kasus pertama.
2. **Uji kasus sendiri** — Bisakah Anda memecahkan kasus hanya dari bukti?
3. **Minta teman menguji** — Apakah mereka bingung? Terlalu mudah? Terlalu sulit?
4. **Pastikan semua bukti ditemukan** — Jangan sembunyikan bukti kunci di tempat yang tidak masuk akal.

---

## 11. Checklist Final

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

---

## 12. Contoh Kasus Lengkap

### Ringkasan: "Malam di Wisma Angker"

| Komponen             | Detail                                           |
| :------------------- | :----------------------------------------------- |
| **Judul**            | Malam di Wisma Angker                            |
| **Tingkat**          | Expert                                           |
| **Durasi**           | 90-120 menit                                     |
| **Korban**           | Haryanto Wijaya (62), pengusaha tekstil          |
| **Penyebab**         | Keracunan Kalium Sianida                         |
| **Tersangka**        | Sari (istri), Rahmat (keponakan), Budi (pelayan) |
| **Pelaku**           | Sari Wijaya                                      |
| **Motif**            | Wasiat, perselingkuhan, dendam                   |
| **Bukti**            | 12 item (otopsi, nota, serpihan kaca, dll)       |
| **TKP**              | 6 area, 24 objek                                 |
| **Real-Time Events** | 12 event (0-120 menit)                           |
| **Objectives**       | 9 tugas                                          |

### Alur Investigasi Ideal

1. **0-15 menit:** Baca briefing dan laporan otopsi.
2. **15-30 menit:** Terima laporan saksi, jelajahi TKP, temukan buku besar.
3. **30-60 menit:** Interogasi Rahmat, temukan log keamanan dan nota apotek.
4. **60-90 menit:** Interogasi Sari dengan bukti, temukan serpihan kaca dan wasiat.
5. **90-120 menit:** Ajukan tuduhan, selesaikan kasus.

---

## 13. Tips & Trik Lanjutan

### 13.1. Menciptakan Kontradiksi Alibi

Cara paling efektif untuk membuat kasus menarik adalah menciptakan kontradiksi antara alibi dan bukti.

**Contoh:**

- **Alibi Rahmat:** "Saya di kamar tamu sepanjang malam."
- **Bukti:** Log keamanan menunjukkan Rahmat di taman pada pukul 22.45.

### 13.2. Menggunakan Bukti Bersarang

Buat pemain harus menemukan bukti A untuk menemukan bukti B.

**Contoh:**

1. Temukan Kunci (`evi_009`) di lantai.
2. Gunakan Kunci untuk membuka Laci Tersembunyi (`obj_005`).
3. Temukan Surat Wasiat (`evi_011`) di dalam laci.

### 13.3. Red Herring yang Efektif

1. **Karakter dengan motif kuat** — Tapi tidak punya kesempatan.
2. **Karakter dengan kesempatan** — Tapi tidak punya motif.
3. **Bukti yang terlihat penting** — Tapi tidak relevan dengan kasus.

### 13.4. Membuat Pemain Empati dengan Karakter

Bahkan pelaku pun harus memiliki sisi manusiawi. Buat pemain mengerti **mengapa** mereka melakukan kejahatan.

> _"Sari bukanlah monster. Ia adalah wanita yang terperangkap dalam pernikahan yang kejam, dihina dan direndahkan setiap hari. Ketika Haryanto mengancam akan mengambil satu-satunya hal yang tersisa—harapan akan masa depan yang layak—ia mengambil keputusan putus asa."_

### 13.5. Menggunakan Real-Time Events untuk Menciptakan Urgensi

- **Jangan beri semua bukti di awal** — Sebarkan selama 90-120 menit.
- **Buat momen "Aha!"** — Event tertentu harus menjadi titik balik.
- **Gunakan deadline** — Tekanan waktu membuat keputusan terasa penting.

---

**Selamat menulis! 📝**

Dengan panduan ini, Anda siap menciptakan kasus detektif yang imersif, menantang, dan memuaskan. Jangan ragu untuk bereksperimen dan berbagi karya Anda dengan komunitas RetroSleuth!
