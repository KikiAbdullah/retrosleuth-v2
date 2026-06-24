# EXAMPLE FULL CASE: "MALAM DI WISMA ANGKER"

## Sinopsis

**Malam di Wisma Angker** adalah kasus pembunuhan berlatar tahun 1979 di sebuah rumah besar bergaya kolonial di kawasan Puncak. Kasus ini dirancang sebagai pengalaman detektif imersif dengan tingkat kesulitan **Expert**, estimasi waktu bermain **90–120 menit**.

**Korban:** Haryanto Wijaya (62), pengusaha tekstil kaya raya yang ditakuti.

**TKP:** Ruang kerja pribadi di lantai 2 Wisma Angker, terkunci dari dalam, jendela sedikit terbuka.

**Penyebab Kematian:** Keracunan Kalium Sianida (KCN) yang dicampur ke dalam gelas brandy.

**Waktu Kematian:** Antara pukul 22.30–23.30 WIB, 13 Juni 1979.

**Tersangka:**

1. **Sari Wijaya (29)** — Istri korban, mantan aktris teater. Menikah demi uang, berselingkuh, terancam dicoret dari wasiat.
2. **Rahmat (34)** — Keponakan dan akuntan pribadi. Terlilit utang judi Rp 497 juta, menggelapkan uang perusahaan.
3. **Budi (61)** — Kepala pelayan senior. Setia secara lahiriah, tetapi menyimpan dendam karena Haryanto menolak biaya pengobatan anaknya yang meninggal.

**Pelaku Sebenarnya:** **Sari Wijaya** — meracuni brandy Haryanto dengan sianida yang dibeli dari apotek sehari sebelumnya. Motif: balas dendam atas perselingkuhan Haryanto dan upayanya mengubah wasiat yang akan memiskinkan Sari.

---

## Karakter & Dinamika

### Sari Wijaya (`char_002.json`) — **PELAKU**

| Aspek                      | Detail                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                     | `char_002`                                                                                                                                                                      |
| **Latar Belakang**         | Mantan aktris teater yang menikah dengan Haryanto pada 1976. Pernikahan tidak bahagia. Haryanto posesif dan merendahkannya. Sari berselingkuh dengan Rendy, instruktur berkuda. |
| **Kepribadian**            | Manipulator ulung, dramatis, narsis. Berganti-ganti topeng sesuai lawan bicara.                                                                                                 |
| **Alibi**                  | Mengaku di kamar tidur, minum obat tidur, membaca novel.                                                                                                                        |
| **Motif**                  | Haryanto akan merevisi wasiat, mengurangi bagiannya drastis. Juga perselingkuhan Haryanto dengan wanita bernama Rina.                                                           |
| **Rahasia Bertingkat**     | 1. Perselingkuhan → 2. Tahu rencana wasiat → 3. Membeli sianida → 4. Mengaku meracuni brandy.                                                                                   |
| **Fase Interogasi**        | 1. Janda Berduka → 2. Aktris Terpojok → 3. Rasionalisasi → 4. Pengakuan Dingin.                                                                                                 |
| **Emosi Awal**             | Stress: 15, Trust: 25, Fear: 30, Anger: 15                                                                                                                                      |
| **Bukti Kunci Melawannya** | `evi_012` (Serpihan Kaca — sidik jari di bagian dalam gelas), `evi_010` (Nota Apotek — pembelian oleh "Ny. S"), `evi_011` (Draf Wasiat — motif).                                |

### Rahmat (`char_001.json`) — **Red Herring**

| Aspek                   | Detail                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | `char_001`                                                                                                                 |
| **Latar Belakang**      | Keponakan yang dibesarkan Haryanto. Terjerumus judi, menggelapkan uang perusahaan, terlilit utang Rp 497 juta ke rentenir. |
| **Kepribadian**         | Gugup, defensif, mudah panik, tapi jujur dan naif. Tidak cukup berani membunuh.                                            |
| **Alibi**               | Mengaku di kamar tamu. Faktanya, menyelinap melalui jendela untuk mencuri buku besar.                                      |
| **Rahasia Bertingkat**  | 1. Utang judi → 2. Penggelapan uang → 3. Masuk melalui jendela → 4. Melihat Sari dengan botol kecil.                       |
| **Fase Interogasi**     | 1. Penyangkalan Panik → 2. Setengah Mengaku → 3. Pencuri Ketakutan → 4. Saksi Kunci.                                       |
| **Emosi Awal**          | Stress: 45, Trust: 15, Fear: 70, Anger: 10                                                                                 |
| **Yang Membebaskannya** | Tidak ada sidik jari di gelas, tidak membeli sianida, tidak tahu tentang racun. Masuk setelah Haryanto sekarat.            |

### Budi (`char_003.json`) — **Saksi Berdendam**

| Aspek                   | Detail                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | `char_003`                                                                                                                                   |
| **Latar Belakang**      | Kepala pelayan 30 tahun. Anak semata wayangnya (Anton) meninggal karena leukemia setelah Haryanto menolak memberi pinjaman biaya pengobatan. |
| **Kepribadian**         | Pendiam, formal, penuh kepahitan tersembunyi. Ahli "melihat tanpa terlihat".                                                                 |
| **Alibi**               | Ronda malam. Faktanya, sengaja tidak ronda ke lantai 2, melihat Sari meracuni, diam saja.                                                    |
| **Rahasia Bertingkat**  | 1. Dendam anak → 2. Melihat Sari meracuni → 3. Membersihkan gelas lain.                                                                      |
| **Fase Interogasi**     | 1. Pelayan Setia → 2. Saksi Enggan → 3. Dendam Terbuka → 4. Pengakuan.                                                                       |
| **Emosi Awal**          | Stress: 25, Trust: 40, Fear: 20, Anger: 45                                                                                                   |
| **Yang Membebaskannya** | Hanya pasif (tidak mencegah). Tidak membeli atau memiliki sianida.                                                                           |

---

## Bukti (18 Item)

| ID        | Nama                        | Folder          | Jenis     | Ditemukan Melalui                             | Peran Kunci                                                                              |
| --------- | --------------------------- | --------------- | --------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `evi_001` | Laporan Otopsi Resmi        | Dokumen Resmi   | Forensik  | Initial (`initial_evidence`)                  | Konfirmasi racun sianida, waktu kematian.                                                |
| `evi_002` | Buku Besar Keuangan Rahasia | Bukti Fisik     | Finansial | TKP `obj_001` (Laci Utama)                    | Menunjukkan utang Rahmat, aliran dana mencurigakan.                                      |
| `evi_003` | Log Keamanan Gerbang        | Dokumen Resmi   | Log       | TKP `obj_008` (Sobekan Log) / `rte_005`       | Mencatat mobil Sari keluar, pergerakan Rahmat.                                           |
| `evi_004` | Surat Ancaman Anonim        | Surat & Catatan | Surat     | TKP `obj_011` (Laci Terbuka) / `rte_009`      | Isinya "hentikan revisi wasiat", mengarah ke motif wasiat.                               |
| `evi_005` | Laporan Saksi Marni         | Dokumen Resmi   | Saksi     | `rte_002` (10 menit) / TKP `obj_016`          | Mendengar pertengkaran Sari-Haryanto, melihat Rahmat lari.                               |
| `evi_006` | Resep & Catatan Sianida     | Surat & Catatan | Catatan   | TKP `obj_019` (Buku Harian)                   | Tulisan tangan tentang dosis sianida, sumber pembelian.                                  |
| `evi_007` | Buku Tamu Wisma             | Log Kunjungan   | Log       | `rte_006` (50 menit)                          | Tamu misterius "Rina S." (selingkuhan Haryanto).                                         |
| `evi_008` | Kliping Koran Lama          | Surat & Catatan | Artikel   | TKP `obj_017` (Koran) / `rte_007`             | PHK massal, ancaman buruh (red herring).                                                 |
| `evi_009` | Kunci Cadangan              | Bukti Fisik     | Fisik     | TKP `obj_023` (Kunci Jatuh)                   | Membuka laci tersembunyi dan laci terkunci. Sidik jari Sari.                             |
| `evi_010` | Nota Pembelian Apotek       | Bukti Fisik     | Nota      | TKP `obj_024` (Nota) / `rte_008`              | Pembelian sianida oleh "Ny. S" pada 13 Juni.                                             |
| `evi_011` | Draf Surat Wasiat           | Surat & Catatan | Dokumen   | TKP `obj_005` (Laci Rahasia, butuh `evi_009`) | 80% untuk Sari, akan direvisi. Motif kuat.                                               |
| `evi_012` | Serpihan Gelas Brandy       | Bukti Fisik     | Fisik     | TKP `obj_022` (Serpihan Kaca)                 | **Bukti terkuat**: sidik jari Sari di bagian dalam gelas, residu sianida, bekas lipstik. |
| `evi_013` | Catatan Internal Penyidik   | Dokumen Resmi   | Laporan    | `rte_010` (85 menit)                          | Kronologi sementara, daftar tersangka, pertanyaan yang perlu dijawab.                   |
| `evi_014` | Foto TKP Ruang Kerja       | Dokumen Resmi   | Foto      | `rte_011` (100 menit)                         | Dokumentasi forensik: posisi jenazah, gelas pecah, sidik jari di kunci.                 |
| `evi_015` | Rekaman Telepon PABX        | Dokumen Resmi   | Rekaman   | `rte_012` (120 menit)                         | Transkrip panggilan: Haryanto→Rina (22:07), Sari→Haryanto (22:33), Haryanto→Budi (22:58). |
| `evi_016` | Catatan Kedatangan Rendy    | Log Kunjungan   | Log       | `rte_013` (115 menit)                         | Catatan dari Klub Elit Puncak: Rendy meninggalkan klub dalam keadaan marah pada 12 Juni. |
| `evi_017` | Surat Utang Rahmat          | Surat & Catatan | Finansial | `rte_014` (120 menit)                         | Surat utang resmi Rahmat kepada Bos Guntur sebesar Rp 497 juta.                         |
| `evi_018` | Log Penerimaan Telepon Rina | Log Kunjungan   | Log       | `rte_015` (130 menit)                         | Catatan kedatangan Rina ke Wisma pada 13 Juni, melengkapi buku tamu.                     |

---

## Crime Scene (TKP Interaktif)

TKP terdiri dari **6 area** dengan **24 objek interaktif**. Pemain harus menjelajahi setiap sudut untuk menemukan bukti.

| Area                | ID         | Objek Penting              | Tipe        | Membuka         |
| ------------------- | ---------- | -------------------------- | ----------- | --------------- |
| **Meja Kerja**      | `area_001` | `obj_001` Laci Utama       | evidence    | `evi_002`       |
|                     |            | `obj_002` Gelas Pecah      | clue        | —               |
|                     |            | `obj_003` Map Kuning       | red_herring | —               |
|                     |            | `obj_004` Amplop Foto      | clue        | —               |
|                     |            | `obj_005` Laci Tersembunyi | locked      | butuh `evi_009` |
|                     |            | `obj_006` Telepon          | clue        | —               |
| **Jendela**         | `area_002` | `obj_007` Bekas Lumpur     | clue        | —               |
|                     |            | `obj_008` Sobekan Log      | evidence    | `evi_003`       |
|                     |            | `obj_009` Kaca Retak       | clue        | —               |
|                     |            | `obj_010` Serat Kain       | clue        | —               |
| **Lemari Arsip**    | `area_003` | `obj_011` Laci Terbuka     | evidence    | `evi_004`       |
|                     |            | `obj_012` Laci Terkunci    | locked      | butuh `evi_009` |
|                     |            | `obj_013` Amplop Coklat    | clue        | —               |
|                     |            | `obj_014` Obeng Rusak      | clue        | —               |
| **Pintu Masuk**     | `area_004` | `obj_015` Lubang Kunci     | clue        | —               |
|                     |            | `obj_016` Bicara Marni     | evidence    | `evi_005`       |
|                     |            | `obj_017` Koran            | evidence    | `evi_008`       |
| **Rak Buku**        | `area_005` | `obj_018` Buku Kimia       | clue        | —               |
|                     |            | `obj_019` Buku Harian      | evidence    | `evi_006`       |
|                     |            | `obj_020` Patung           | red_herring | —               |
| **Lantai & Karpet** | `area_006` | `obj_021` Noda Karpet      | clue        | —               |
|                     |            | `obj_022` Serpihan Kaca    | evidence    | `evi_012`       |
|                     |            | `obj_023` Kunci Jatuh      | evidence    | `evi_009`       |
|                     |            | `obj_024` Nota Apotek      | evidence    | `evi_010`       |

**Mekanika Kunci:** `obj_005` (Laci Tersembunyi) membutuhkan `evi_009` (Kunci Cadangan). `obj_012` (Laci Terkunci) juga membutuhkan `evi_009`. Ini menciptakan dependensi: pemain harus menemukan kunci di karpet terlebih dahulu.

---

## Real-Time Events (12 Event)

Event memberikan bukti secara bertahap selama 120 menit, menciptakan pacing investigasi yang natural.

| ID        | Menit ke- | Action             | Detail                                               |
| --------- | --------- | ------------------ | ---------------------------------------------------- |
| `rte_001` | 0         | `unlock_evidence`  | Laporan Otopsi (`evi_001`) tiba via amplop.          |
| `rte_002` | 10        | `unlock_evidence`  | Laporan Saksi Marni (`evi_005`) via telepon.         |
| `rte_003` | 20        | `update_objective` | TKP dibuka untuk eksplorasi.                         |
| `rte_004` | 30        | `send_message`     | Budi (`char_003`) minta bicara di dapur.             |
| `rte_005` | 40        | `unlock_evidence`  | Log Keamanan (`evi_003`) dikirim satpam.             |
| `rte_006` | 50        | `unlock_evidence`  | Buku Tamu (`evi_007`) difotokopi.                    |
| `rte_007` | 60        | `unlock_evidence`  | Kliping Koran (`evi_008`) dari arsip.                |
| `rte_008` | 65        | `unlock_evidence`  | Nota Apotek (`evi_010`) diserahkan.                  |
| `rte_009` | 75        | `unlock_evidence`  | Surat Ancaman (`evi_004`) selesai analisis forensik. |
| `rte_010` | 85        | `send_message`     | Rahmat (`char_001`) minta bicara jujur.              |
| `rte_011` | 100       | `notification`     | Peringatan deadline 20 menit lagi.                   |
| `rte_012` | 120       | `deadline_reached` | Game over jika belum selesai.                        |

---

## Objectives (9 Tugas)

| ID         | Tugas                                                | Hint                                                    |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `task_001` | Baca laporan briefing dan otopsi awal                | Buka Case Files, baca briefing.                         |
| `task_002` | Temukan Buku Besar Keuangan di TKP                   | Periksa laci meja kerja.                                |
| `task_003` | Kumpulkan bukti dari Jendela dan Pintu               | Jendela punya bekas lumpur, pintu mungkin simpan jejak. |
| `task_004` | Interogasi Rahmat tentang utang dan buku besar       | Tanyakan "buku besar" atau "uang 500 juta".             |
| `task_005` | Interogasi Sari tentang ancaman dan resep racun      | Konfrontasi dengan bukti resep racun.                   |
| `task_006` | Interogasi Budi tentang apa yang sebenarnya ia lihat | Gunakan bukti serpihan kaca.                            |
| `task_007` | Hubungkan nota apotek dengan tersangka               | Nota apotek → "Ny. S".                                  |
| `task_008` | Temukan dan baca draf surat wasiat                   | Cari di lemari arsip atau laci tersembunyi.             |
| `task_009` | Ajukan tuduhan lengkap dengan bukti yang kuat        | Minimal 6 bukti termasuk bukti primer.                  |

---

## Timeline Kronologis

| Waktu | Peristiwa                                                                          |
| ----- | ---------------------------------------------------------------------------------- |
| 20.00 | Haryanto dan Sari makan malam bersama, terlihat tegang.                            |
| 21.15 | Rahmat tiba di Wisma, menuju ruang kerja minta tanda tangan cek.                   |
| 21.30 | Sari membeli 10 gram Kalium Sianida di Apotek Sumber Waras (nota `evi_010`).       |
| 21.50 | Budi mengantar kopi, melihat Sari dan Haryanto bertengkar hebat.                   |
| 22.00 | Sari keluar marah: "Kau akan menyesal!"                                            |
| 22.05 | Sari menuangkan sianida ke gelas brandy Haryanto.                                  |
| 22.25 | Haryanto kejang-kejang setelah minum brandy.                                       |
| 22.30 | Saksi mendengar suara gelas pecah dari ruang kerja.                                |
| 22.40 | Rahmat melihat Sari keluar ruang kerja dengan botol kecil.                         |
| 22.45 | Rahmat terlihat satpam berjalan cepat ke taman belakang.                           |
| 22.50 | Rahmat masuk lewat jendela, melihat Haryanto sekarat, mengambil buku besar, kabur. |
| 23.00 | Lampu ruang kerja padam.                                                           |
| 23.15 | Mobil Sari keluar Wisma (tercatat di log `evi_003`).                               |
| 23.45 | Sari kembali ke Wisma.                                                             |
| 00.15 | Budi "menemukan" tubuh Haryanto (sebenarnya sudah tahu sejak 23.00).               |
| 02.00 | Budi melapor ke polisi.                                                            |

---

## Solusi & Cara Membuktikan

**Pelaku:** Sari Wijaya (`char_002`)

**Motif:** Balas dendam atas perselingkuhan Haryanto dengan Rina, dan upaya Haryanto mengubah wasiat yang akan mengurangi bagian Sari dari 80% menjadi hanya 20%.

**Bukti yang Dibutuhkan untuk Tuduhan Sukses:**

| Jenis        | ID        | Nama                    |
| ------------ | --------- | ----------------------- |
| **Primer**   | `evi_001` | Laporan Otopsi Resmi    |
| **Sekunder** | `evi_006` | Resep & Catatan Sianida |
| **Sekunder** | `evi_010` | Nota Pembelian Apotek   |
| **Sekunder** | `evi_011` | Draf Surat Wasiat       |
| **Sekunder** | `evi_004` | Surat Ancaman Anonim    |
| **Sekunder** | `evi_012` | Serpihan Gelas Brandy   |
| **Sekunder** | `evi_003` | Log Keamanan Gerbang    |

**Rantai Pembuktian:**

1. `evi_001` membuktikan racun sianida sebagai penyebab kematian.
2. `evi_010` membuktikan Sari membeli sianida (pembeli "Ny. S").
3. `evi_006` membuktikan Sari menulis catatan dosis untuk "70 kg" (berat Haryanto).
4. `evi_012` membuktikan sidik jari Sari di **bagian dalam** gelas — dia memegang gelas dari dalam untuk menuangkan racun.
5. `evi_011` membuktikan motif: wasiat menguntungkan Sari, akan direvisi.
6. `evi_004` memperkuat motif: seseorang ingin menghentikan revisi wasiat.
7. `evi_003` membuktikan Sari melanggar alibinya (keluar malam itu).

**Kesaksian Kunci:**

- Rahmat (`char_001`) pada Fase 4: melihat Sari keluar ruang kerja dengan botol kecil.
- Budi (`char_003`) pada Fase 4: melihat Sari menuangkan sesuatu ke gelas brandy.

---

## Alur Investigasi yang Diharapkan

**Fase Awal (0–30 menit):**

1. Pemain membaca briefing dan laporan otopsi (`evi_001`).
2. Menerima laporan saksi Marni (`evi_005`) via telepon pada menit 10.
3. Menjelajahi TKP, menemukan Buku Besar (`evi_002`) dari laci meja.
4. Budi mengirim pesan pada menit 30, siap diinterogasi.

**Fase Tengah (30–75 menit):** 5. Pemain menginterogasi Rahmat, mengetahui utangnya dan pergerakannya. 6. Menerima Log Keamanan (`evi_003`) pada menit 40. 7. Menemukan Surat Ancaman (`evi_004`) di lemari arsip. 8. Menerima Buku Tamu (`evi_007`) dan Kliping Koran (`evi_008`). 9. Menerima Nota Apotek (`evi_010`) pada menit 65 — titik balik. 10. Menemukan Serpihan Kaca (`evi_012`) dan Kunci Cadangan (`evi_009`) di area Lantai & Karpet.

**Fase Akhir (75–120 menit):** 11. Menginterogasi Sari dengan bukti nota apotek dan serpihan kaca. 12. Menginterogasi Budi, mengungkap ia melihat Sari meracuni. 13. Menginterogasi Rahmat lagi (pesan menit 85), ia mengaku melihat Sari dengan botol. 14. Membuka laci rahasia dengan kunci cadangan, menemukan Wasiat (`evi_011`). 15. Menyusun tuduhan terhadap Sari dengan semua bukti.

---

## Semua File Konten (Referensi)

| File            | Path                                                   | Ukuran (approx) |
| --------------- | ------------------------------------------------------ | --------------- |
| `index.json`    | `cases/index.json`                                     | ~500 B          |
| `case.json`     | `cases/case_001_wisma_angker/case.json`                | ~15 KB          |
| `briefing.md`   | `cases/case_001_wisma_angker/briefing.md`              | ~3 KB           |
| `solution.md`   | `cases/case_001_wisma_angker/solution.md`              | ~5 KB           |
| `char_001.json` | `cases/case_001_wisma_angker/characters/char_001.json` | ~12 KB          |
| `char_002.json` | `cases/case_001_wisma_angker/characters/char_002.json` | ~13 KB          |
| `char_003.json` | `cases/case_001_wisma_angker/characters/char_003.json` | ~12 KB          |
| `char_004.json` | `cases/case_001_wisma_angker/characters/char_004.json` | ~12 KB          |
| `char_005.json` | `cases/case_001_wisma_angker/characters/char_005.json` | ~11 KB          |
| `char_006.json` | `cases/case_001_wisma_angker/characters/char_006.json` | ~11 KB          |
| `char_007.json` | `cases/case_001_wisma_angker/characters/char_007.json` | ~11 KB          |
| `char_008.json` | `cases/case_001_wisma_angker/characters/char_008.json` | ~10 KB          |
| `evi_001.md`    | `cases/case_001_wisma_angker/evidence/evi_001.md`      | ~2 KB           |
| `evi_002.md`    | `cases/case_001_wisma_angker/evidence/evi_002.md`      | ~3 KB           |
| `evi_003.md`    | `cases/case_001_wisma_angker/evidence/evi_003.md`      | ~2 KB           |
| `evi_004.md`    | `cases/case_001_wisma_angker/evidence/evi_004.md`      | ~1 KB           |
| `evi_005.md`    | `cases/case_001_wisma_angker/evidence/evi_005.md`      | ~2 KB           |
| `evi_006.md`    | `cases/case_001_wisma_angker/evidence/evi_006.md`      | ~2 KB           |
| `evi_007.md`    | `cases/case_001_wisma_angker/evidence/evi_007.md`      | ~1 KB           |
| `evi_008.md`    | `cases/case_001_wisma_angker/evidence/evi_008.md`      | ~1 KB           |
| `evi_009.md`    | `cases/case_001_wisma_angker/evidence/evi_009.md`      | ~2 KB           |
| `evi_010.md`    | `cases/case_001_wisma_angker/evidence/evi_010.md`      | ~1 KB           |
| `evi_011.md`    | `cases/case_001_wisma_angker/evidence/evi_011.md`      | ~2 KB           |
| `evi_012.md`    | `cases/case_001_wisma_angker/evidence/evi_012.md`      | ~2 KB           |
| `evi_013.md`    | `cases/case_001_wisma_angker/evidence/evi_013.md`      | ~2 KB           |
| `evi_014.md`    | `cases/case_001_wisma_angker/evidence/evi_014.md`      | ~2 KB           |
| `evi_015.md`    | `cases/case_001_wisma_angker/evidence/evi_015.md`      | ~2 KB           |
| `evi_016.md`    | `cases/case_001_wisma_angker/evidence/evi_016.md`      | ~2 KB           |
| `evi_017.md`    | `cases/case_001_wisma_angker/evidence/evi_017.md`      | ~2 KB           |
| `evi_018.md`    | `cases/case_001_wisma_angker/evidence/evi_018.md`      | ~2 KB           |

**Total file konten:** 31 file (1 index + 1 case + 1 briefing + 1 solution + 8 karakter + 18 bukti)
**Total ukuran konten:** ~110 KB (sangat ringan, mendukung deployment cepat)

---

## Mengapa Kasus Ini Dirancang Seperti Ini?

**Kompleksitas Berlapis:**

- 18 bukti menciptakan banyak jalur investigasi. Pemain bisa melewatkan bukti kunci jika tidak teliti.
- Mekanika `locked` (butuh kunci untuk laci tertentu) memaksa pemain bolak-balik antar area TKP.
- Real-time events menciptakan urgensi tanpa mengurangi kebebasan eksplorasi.
- 8 karakter dengan rahasia berbeda-beda menciptakan dinamika interogasi yang kaya.

**Tiga Tersangka Berbeda:**

- **Rahmat** terlihat sangat bersalah di awal (utang Rp 497 juta, mencuri, melarikan diri) — red herring sempurna.
- **Budi** adalah saksi yang menyembunyikan informasi — pemain harus mendapatkan kepercayaannya.
- **Sari** adalah pelaku sebenarnya, tapi sangat pandai berakting — baru mengaku jika dihadapkan bukti tak terbantahkan.

**Red Herring Bertingkat:**

- **Rina** (selingkuhan Haryanto) — hubungannya dengan Haryanto membuatnya mencurigakan.
- **Rendy** (selingkuhan Sari) — hubungannya dengan Sari membuatnya mencurigakan.
- **Bos Guntur** (rentenir) — ancamannya kepada Rahmat bisa memotivasi pembunuhan.

**Pembuktian Ganda:**

- Bukti forensik (`evi_012`) + bukti pembelian (`evi_010`) + bukti motif (`evi_011`) + kesaksian (Rahmat, Budi, Marni) membentuk rantai yang tak terpatahkan.
