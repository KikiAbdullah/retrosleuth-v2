# 🎨 Panduan Generasi Gambar Lengkap — RetroSleuth: Case Files Detective

_(Edisi Final · Teknik “Copy‑Paste Consistency” untuk Akurasi Visual Maksimal)_

---

## ⚙️ Konfigurasi Model & Format Prompt

### Wrapper Universal (wajib untuk semua gambar non‑ikon)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: {AR}, negative: {NEGATIVE}
```

- `{AR}` : `4:5`, `4:3`, `3:4`, `1:1`, `5:4`, `16:9`
- `{NEGATIVE}` : `modern, digital, CGI, neon, LED, smartphone, bright saturated, flat lighting, cartoon, smooth skin, clean sharp edges`

### Parameter Teknis Banana 2 (flag akhir prompt)

| Flag     | Fungsi                        | Nilai RetroSleuth                                            |
| -------- | ----------------------------- | ------------------------------------------------------------ |
| `--ar`   | Aspect ratio                  | sesuai konteks                                               |
| `--no`   | Negative prompt               | `modern, digital, cartoon, CGI, neon, flat lighting, bright` |
| `--seed` | Konsistensi antar generasi    | `1970` (karakter), `1971` (TKP), `1972` (ikon)               |
| `--s`    | Stylization (realisme tinggi) | `50`                                                         |
| `--q`    | Quality                       | `2` (maksimum)                                               |
| `--v`    | Versi model                   | `banana2`                                                    |

### Ikon (Pixel Art)

Ganti wrapper dengan `[PIXEL ART]` dan gunakan `--ar 1:1 --seed 1972`.

---

## 🎨 Palet Warna Resmi

| Kode Hex  | Nama            | Peran khas                                         |
| --------- | --------------- | -------------------------------------------------- |
| `#2d1b0e` | Dark Brown      | Kayu jati, kulit, bayangan                         |
| `#4a3728` | Medium Brown    | Kertas tua, karpet, dinding                        |
| `#8b6914` | Gold            | Aksen emas: jam, bingkai, kunci                    |
| `#c4a35a` | Light Gold      | Pantul kristal, sulam kebaya, cahaya amber sconce  |
| `#1a0f07` | Deep Shadow     | Sudut gelap, siluet                                |
| `#c4956a` | Warm Skin       | Kulit karakter Indonesia                           |
| `#f5f0e8` | Off‑white       | Kemeja, kertas                                     |
| `#0d0906` | Near‑black      | Pakaian formal, malam                              |
| `#8b2500` | Dark Red        | Karpet Persia, lipstik                             |
| `#1a4d1a` | Dark Green      | Lampu meja, CRT, cahaya lampu bankir               |
| `#f0d080` | Evidence Yellow | Marker bukti (pengecualian)                        |
| `#e8e0d0` | Aged White      | Label polisi / cat mengelupas (pengecualian)       |
| `#1e3a5f` | Dark Navy       | Kain biru tua tersangkut di jendela (pengecualian) |

---

## 🧩 TEMPLATE TEKS STANDAR (Copy‑Paste ke Setiap Prompt Terkait)

Untuk memastikan detail yang **100% identik** di semua gambar, gunakan blok teks di bawah ini secara **persis sama** di setiap prompt yang membutuhkan elemen tersebut.

### 📌 Blok Jendela Kolonial (JENDELA)

> The large colonial double‑hung window consists of two glass panels, 1.5m tall. The lower panel is raised exactly 30cm. Its brown velvet curtain #4a3728 is drawn to the right side and billows inward. On the left side of the frame, fresh pry marks expose raw wood #2d1b0e. A torn piece of dark blue fabric #1e3a5f hangs from the rusty latch on the left panel. The sill and frame show peeling white paint #e8e0d0. Cool moonlight (5500K) streams through the opening, illuminating floating dust motes. Outside, overgrown tropical garden silhouettes #0d0906 are barely visible through the darkness.

### 📌 Blok Meja Kerja & Lampu Bankir (MEJA)

> The large antique mahogany desk #2d1b0e is cluttered with papers. A green banker's lamp #1a4d1a at the left edge casts a pool of eucalyptus‑green light across the surface. On the desk: a half‑full Hennessy VSOP bottle, a silver tray with one intact brandy glass and an empty space where the second glass stood, a gold "HW" monogram fountain pen #8b6914, a black Bakelite rotary phone off its hook, an ashtray with two cigar butts, scattered papers, and a faded coffee cup ring. An open drawer reveals a dust‑free rectangular outline where a book was recently removed. Yellow evidence markers #f0d080: #1 beside the fountain pen, #2 next to the Hennessy bottle, #3 beside the intact glass, #10 beside a threatening letter.

### 📌 Blok Karpet Persia (KARPET)

> The dark red Persian rug #8b2500 with a gold silk vine pattern #c4a35a covers most of the hardwood floor #4a3728 in front of the desk. On the rug lie a shattered crystal brandy glass with an amber stain #c4a35a (diameter 20cm) and black fingerprint powder #0d0906. A high‑back leather armchair #2d1b0e is pushed back, and a chalk body outline lies near it on the rug.

### 📌 Blok Lemari Arsip (LEMARI)

> Against the right wall stands a four‑drawer institutional gray‑green metal filing cabinet. The third drawer is violently forced open, with deep gouges in the metal and a bent lock. Manila folders and documents are scattered on the floor below; one folder is clearly labeled "KEUANGAN 1975". Rust and cobwebs collect in the corners. The wall behind shows peeling cream paint #e8e0d0. A single overhead fluorescent light casts harsh, elongated shadows #1a0f07. Yellow evidence marker #8 (#f0d080) stands among the fallen papers.

### 📌 Blok Koridor Mansion (KORIDOR) — Untuk Rahmat & Budi

> The dim corridor of the colonial mansion has aged off‑white plaster walls #e8e0d0 with faint cracks and moisture stains. The stone floor reflects a faint sheen of dampness. A single wrought‑iron wall sconce with amber glass casts a narrow pool of warm light #c4a35a, leaving the rest of the space in deep shadow #1a0f07.

---

## 👤 FOTO KARAKTER (4 file, seed `1970`, AR `4:5`)

### 1. Haryanto Wijaya (Korban) — `characters/victim_haryanto.png`

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:5, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

Formal identification portrait of the victim, Indonesian man 62 years old, taken in his home office — the exact same room described in the crime scene wide shot. He sits in the high‑back leather armchair #2d1b0e on the Persian rug. Background shows dark mahogany paneling #2d1b0e with faint gold accent lines. The left portion of the frame captures [JENDELA]. On the right edge, [MEJA] — the green banker's lamp #1a4d1a casts a warm eucalyptus glow; the gold "HW" pen #8b6914 and Bakelite phone are faintly visible. The victim's face: warm skin tone #c4956a, stern expression, deep frown lines, thick silver‑gray hair slicked back. Wears crisp off‑white shirt #f5f0e8, dark brown vest #4a3728, gold pocket watch chain #8b6914. Light: tungsten fill from upper left mixed with cool moonlight rim light from the window on his right, splitting his face into light and shadow #1a0f07. Heavy film grain, medium vignette.
--ar 4:5 --no modern, digital, cartoon --seed 1970 --s 50 --q 2 --v banana2
```

### 2. Sari Wijaya (Tersangka) — `characters/char_sari.png`

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:5, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

Suspect identification photograph, Indonesian woman 29 years old, taken inside the victim's home office — the same room as the wide shot. She stands near the left side, directly beside [JENDELA]. Cool moonlight (5500K) wraps a blue‑white rim light around her right side. Behind her, dark mahogany paneling #2d1b0e and the edge of the [KARPET] are visible. From the left, outside the frame, the green banker's lamp #1a4d1a on the desk casts warm eucalyptus‑green light on the front of her face and kebaya. Sharp cheekbones, cold calculating eyes, skin #c4956a. Shoulder‑length jet‑black hair #0d0906 in 1970s waves. Wears dark burgundy kebaya #8b2500 with intricate gold embroidery #8b6914, thin gold necklace #c4a35a. Expression: controlled sorrow, faint cunning smirk. Heavy grain, medium vignette.
--ar 4:5 --no modern, digital, cartoon --seed 1970 --s 50 --q 2 --v banana2
```

### 3. Rahmat (Keponakan) — `characters/char_rahmat.png`

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:5, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

Formal identification portrait of Rahmat Wijaya, 34-year-old Indonesian man, the victim's nephew. He stands against a plain off‑white wall #e8e0d0 in a police photography room. He faces the camera directly, shoulders squared, hands at his sides. Wears a short‑sleeved brown batik shirt (parang motif, muted brown #4a3728) with top button undone, collar slightly wrinkled; tucked unevenly into light cream trousers #f5f0e8. Face: warm skin #c4956a, dark circles under eyes, black hair #0d0906 cut short, slightly unkempt. Eyes wide, brown, bloodshot, staring at lens with tense, cornered look; sweat on temples, stiff jaw. Thin lips pressed together, lower lip chapped. Single bare bulb overhead + fill light from left create split chiaroscuro — right side of face falls into shadow #1a0f07. Heavy grain, medium vignette.
--ar 4:5 --no modern, digital, cartoon --seed 1970 --s 50 --q 2 --v banana2
```

### 4. Budi (Kepala Pelayan) — `characters/char_budi.png`

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:5, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

Formal servant portrait of an elderly Indonesian man, 61 years old, head butler. He stands in [KORIDOR]. The wall sconce illuminates the left side of his face and uniform; the right side falls into complete deep shadow #1a0f07. Weathered dignified face, skin #c4956a, deep wrinkles, short neat gray hair. Wears black butler suit #0d0906 with satin lapels, stark white gloves #f5f0e8. Posture erect, hands folded neatly in front — classic butler stance. Eyes betray inner turmoil. Heavy grain, medium vignette.
--ar 4:5 --no modern, digital, cartoon --seed 1970 --s 50 --q 2 --v banana2
```

---

## 📸 FOTO TKP (8 file, seed `1971`)

### 5. TKP Wide Shot — `crimescene/tkp_overview.png` (AR `4:3`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:3, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic crime scene photograph, establishing shot of the victim's home office (mahogany paneled walls #2d1b0e, [KARPET], [JENDELA] on left, [LEMARI] on right). Kodak Tri-X 400 pushed 800, harsh flash mixed with warm green desk lamp #1a4d1a and cool moonlight (5500K) through the window. Dutch angle 5°. In center, [MEJA] with the threatening letter. Yellow evidence markers #f0d080 placed: #1 near fountain pen, #2 next to bottle, #3 beside intact glass, #4 standing in shattered glass area on rug, #5 leaning against window frame base, #6 at head of body outline, #7 on armchair, #8 among papers near cabinet. Police measuring tape runs through the scene. Heavy grain, strong vignette.
--ar 4:3 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 6. Detail Gelas Pecah (Marker #4) — `crimescene/tkp_glass_detail.png` (AR `4:3`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:3, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic close‑up of the shattered brandy glass from the victim's home office (same [KARPET]). Low‑angle macro, Kodak Tri‑X 400 pushed 1600, f/2.8. Razor‑sharp focus on a single large crystal shard (7cm) bearing a clear ulnar loop fingerprint. The shard rests on the deep red wool carpet with gold silk vine pattern #c4a35a. Around it, 8 major shards and 15+ tiny fragments radiate outward, prismatic refractions in amber #c4a35a and green #1a4d1a under raking light of the green banker's lamp #1a4d1a and forensic flash. 20cm amber brandy stain #c4a35a blooms beneath. Black fingerprint powder #0d0906 on edges. L‑shaped forensic scale ruler (aged white #e8e0d0) lies horizontally; yellow evidence marker "4" (#f0d080) stands behind. Long shadows #1a0f07 stretch across hand‑knotted fibers. Heavy grain, strong vignette.
--ar 4:3 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 7. Detail Jendela (Marker #5) — `crimescene/tkp_window.png` (AR `3:4`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 3:4, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic close‑up of the colonial double‑hung window from the victim's home office — the exact same window as in the wide shot. Medium photograph, dramatic mix of cool moonlight (5500K) and warm interior lit by the green banker's lamp #1a4d1a. [JENDELA]. Near the base, a muddy shoe print (size 42, herringbone tread) is visible on the peeling white paint #e8e0d0 of the sill. A sharp moonbeam cuts through the dusty air. Yellow evidence marker "5" (#f0d080) leans against the frame base. Heavy grain, strong vignette.
--ar 3:4 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 8. Detail Meja Kerja (Marker #1, #2, #3, #10) — `crimescene/tkp_desk.png` (AR `4:3`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:3, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic close‑up of the antique mahogany desk surface #2d1b0e in the victim's home office (the same desk as in the wide shot). [MEJA]. The threatening letter, on off‑white paper #f5f0e8, shows partially visible text "HENTIKAN REVISI WASIAT...". Heavy grain, warm shadows #1a0f07.
--ar 4:3 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 9. Detail Lemari Arsip (Marker #8) — `crimescene/tkp_cabinet.png` (AR `3:4`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 3:4, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic close‑up of the metal filing cabinet from the right wall of the victim's home office (the same cabinet as in the wide shot). [LEMARI]. Heavy grain, strong vignette, institutional neglect aesthetic.
--ar 3:4 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 10. Detail Karpet & Kunci (Marker #9) — `crimescene/tkp_carpet_key.png` (AR `4:3`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 4:3, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic extreme close‑up, macro lens, of the [KARPET] — the exact same rug in front of the desk. A white‑cotton‑gloved hand lifts the edge, revealing dusty hardwood floor #4a3728. Nestled in the dust: a small antique brass key, 4.5cm long, ornate clover bow, three teeth (third tooth worn). Brass patina #8b6914 with green oxidation spots #1a4d1a. Key rests in slight depression. Rug edge shows hand‑knotted wool fibers, gold silk border #c4a35a, a dried brandy stain nearby. Dramatic raking light from evidence flashlight casts long shadows #1a0f07. Yellow evidence marker "9" (#f0d080) stands beside the key. Extreme shallow depth of field, sharp focus on key.
--ar 4:3 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 11. Detail Sidik Jari (Marker #11) — `crimescene/tkp_fingerprint.png` (AR `1:1`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 1:1, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic extreme macro, fingerprint analysis. Kodak Tri‑X 400, harsh directional fiber optic illuminator, sepia tint. Extreme close‑up of a crystal glass shard (6cm) recovered from the shattered brandy glass on the Persian rug. Developed latent fingerprint in black carbon powder #0d0906: well‑defined ulnar loop pattern 1.5x1.5cm, ridge endings, bifurcations, sweat pores, faint smudge. 45‑degree lighting casts micro‑shadows. Yellow evidence marker "11" (#f0d080) partially visible at bottom right, forensic millimeter scale (white #e8e0d0). Heavy grain, extreme shallow depth of field.
--ar 1:1 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

### 12. Detail Surat Ancaman (Marker #10) — `crimescene/tkp_threat_letter.png` (AR `5:4`)

```
[IMAGE] style: 1970s Indonesian noir photography, camera: analog 35mm, film: Kodak Tri-X 400, lighting: dramatic chiaroscuro, color palette: sepia & amber, texture: heavy grain, aspect ratio: 5:4, negative: modern, digital, CGI, neon, bright saturated, flat lighting, cartoon

1970s forensic close‑up of the threatening letter found on the mahogany desk #2d1b0e in the victim's home office (the same desk). The green banker's lamp #1a4d1a from upper left casts eucalyptus‑green light. Letter: cut‑out newspaper letters glued onto off‑white A4 HVS paper #f5f0e8. Text reads "HENTIKAN REVISI WASIAT ATAU NYAWAMU TARUHANNYA" in varied mismatched fonts. Glue residue yellowed (#f0d080). Brown kraft envelope #4a3728 beside it, handwritten "UNTUK HARYANTO WIJAYA" in disguised shaky letters. Yellow evidence marker "10" (#f0d080) at top corner. Soft shadow of envelope falls across letter. Shallow depth of field, sharp focus on "NYAWAMU", heavy grain.
--ar 5:4 --no modern, digital, cartoon --seed 1971 --s 50 --q 2 --v banana2
```

---

## 📁 IKON DESKTOP (7 file, 64×64 px, Pixel Art, seed `1972`)

**Palet 16‑warna:** `#2d1b0e` `#4a3728` `#8b6914` `#c4a35a` `#1a0f07` `#c4956a` `#f5f0e8` `#0d0906` `#8b2500` `#1a4d1a` `#f0d080` `#e8e0d0` `#000000` `#ffffff` `#333333` `#999999`

### 13–19. Ikon (sama persis seperti sebelumnya)

---

## 🖼️ WALLPAPER & LOGO

### 20. Wallpaper Desktop — `desktop_icons/wallpaper.png`

```
[IMAGE] style: 1970s retro desktop wallpaper, extremely dark and muted, camera: none, texture: film grain, aspect ratio: 16:9, negative: bright, colorful, modern, white elements

Dark green‑black vertical gradient: top #0d1a0d, bottom #050a05. Subtle noise texture. Faint green‑bar paper grid lines (8% opacity). At center, a nearly invisible detective silhouette at a desk with green lamp #1a4d1a. CRT phosphor afterglow aesthetic. Uniform dark green hue.
--ar 16:9 --no bright, colorful, modern --seed 1970 --s 50 --q 2 --v banana2
```

### 21. Logo RetroSleuth — `logo.png`

```
[IMAGE] style: 1970s retro detective game title logo, camera: none, texture: film grain, aspect ratio: 1:1, negative: modern font, neon, bright colors, 3D, minimal

Center text "RETROSLEUTH" in bold vintage serif typewriter font. Gold fill #8b6914 with dark brown inner shadow #2d1b0e and uneven ink bleed. Letter O replaced by magnifying glass: cream lens #f5f0e8 with tiny "?" in dark brown, rim gold. Small fedora hat #4a3728 above R. Text enclosed in vintage shield‑shaped badge with scalloped edges, outlined in gold #8b6914, subtle cross‑hatching. Behind badge, faint radiating lines in dark green #1a4d1a. Near‑black background #0d0906 with subtle green CRT glow from below. Dramatic underlighting, film grain.
--ar 1:1 --no modern font, neon --seed 1970 --s 50 --q 2 --v banana2
```

---

## 📋 DAFTAR PERIKSA & URUTAN PRODUKSI

1. Logo → 2. Wallpaper → 3. Ikon (7) → 4. Karakter (4) → 5. TKP (8).  
   **Total: 21 file.**

### Pemeriksaan Mutu Akhir

- ✅ Setiap elemen ruangan menggunakan **teks template yang sama persis**.
- ✅ Palet hex selalu disebutkan.
- ✅ Konsistensi jendela, meja, karpet, lemari, koridor terjamin 100% secara tekstual.
- ✅ Tidak ada elemen modern.

Dengan teknik **Copy‑Paste Consistency** ini, Gemini Pro Nano Banana 2 akan menghasilkan gambar‑gambar yang detail dan posisinya sangat identik di setiap frame.
