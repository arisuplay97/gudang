# SI GAPLEK — BLUEPRINT UI/UX & DASHBOARD TERPADU FINAL
## Premium Clean shadcn/ui + Global Search + Topbar + Dashboard Gudang + Dashboard SPI

> Modul ini melengkapi blueprint SI GAPLEK utama. Fokusnya adalah UI/UX premium, topbar, global search, notifikasi, dark mode, dashboard, exception center, aging, tracking/SLA, GIS preview, barcode/QR interaction, responsive design, accessibility, dan micro-animation.
>
> Jangan mengubah business logic, database, permission, UUID, PostGIS, state machine, tracking, atau workflow yang sudah ditetapkan blueprint utama.

---

# 1. DESIGN PRINCIPLES

Target visual:

- clean
- premium
- professional
- enterprise
- fast
- informative
- restrained

Hindari:
- gradient berlebihan
- glassmorphism berlebihan
- shadow besar
- border tebal
- rounded berlebihan
- animasi dekoratif
- layout template dashboard generik

Prioritas:

```text
Readability
→ Information hierarchy
→ Fast interaction
→ Data clarity
→ Consistency
→ Micro-interaction
```

---

# 2. UI STACK

Gunakan:

```text
shadcn/ui
Tailwind CSS
Lucide Icons
TanStack Table
TanStack Query
React Hook Form
Zod
```

Gunakan komponen shadcn/ui untuk:

```text
Button
Card
Badge
Alert
Dialog
AlertDialog
Drawer
Sheet
Dropdown Menu
Command
Popover
Tooltip
Tabs
Table / Data Table
Pagination
Calendar
Date Picker
Select
Combobox
Input
Textarea
Checkbox
Switch
Progress
Skeleton
Separator
Breadcrumb
Sidebar
Avatar
Scroll Area
Toast / Sonner
```

Jangan membuat ulang komponen yang sudah tersedia di shadcn/ui tanpa alasan.

---

# 3. GLOBAL LAYOUT

```text
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR │ TOPBAR                                              │
│         ├─────────────────────────────────────────────────────┤
│         │                                                     │
│         │                     CONTENT                         │
│         │                                                     │
└─────────┴─────────────────────────────────────────────────────┘
```

Sidebar:
- sticky/fixed
- collapsible
- active state jelas
- icon + label
- submenu expand/collapse

Content:
- responsive grid
- whitespace cukup
- konsisten spacing
- tidak terlalu padat

---

# 4. TOPBAR FINAL

Topbar harus menjadi pusat kontrol aplikasi.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [☰] Dashboard / Breadcrumb   [🔍 Cari...]   [🔔] [🌙] [Avatar ▼]     │
└──────────────────────────────────────────────────────────────────────┘
```

## Elemen

Kiri:
- sidebar toggle
- breadcrumb
- page title bila diperlukan

Tengah:
- global search
- keyboard shortcut Ctrl+K / Cmd+K

Kanan:
- notification
- dark mode
- user avatar
- user menu

Tanggal tidak perlu menjadi elemen utama topbar. Jika dibutuhkan, tampilkan sebagai date chip kecil di dashboard.

---

# 5. GLOBAL SEARCH

Placeholder:

```text
Cari material, transaksi, barcode, tracking...
```

Shortcut:

```text
Ctrl + K
Cmd + K
```

Gunakan shadcn Command.

Kelompok hasil:

```text
MATERIAL
TRANSAKSI
TRACKING
CABANG
GUDANG
SUPPLIER
```

Search harus mendukung:

```text
Nama Material
Kode Material
Barcode
Nomor Transaksi
Nomor Tracking
Nama Cabang
Nama Gudang
Supplier
```

Search harus server-side dan permission-aware.

Jangan mengambil seluruh database lalu menyaring di frontend.

Gunakan debounce dan mulai query setelah karakter minimum yang wajar, misalnya 2–3 karakter.

---

# 6. GLOBAL SEARCH — QUICK ACTION

Command palette juga dapat memiliki aksi:

```text
Cari Material
Cari Transaksi
Scan Barcode
Buat Barang Keluar
Buka Tracking
Buka Verifikasi
Buka GIS
Buka Stock Opname
```

Semua action mengikuti permission user.

---

# 7. NOTIFICATION CENTER

Topbar memiliki:

```text
🔔
```

Tampilkan unread badge jika ada.

Kategori:

```text
SLA
PENERIMAAN
PEMASANGAN
VERIFIKASI
STOCK
RETUR
AUDIT
SYSTEM
```

Contoh:

```text
● SLA WARNING
  Material BK-2026-0025
  deadline 2 hari lagi

● PENERIMAAN
  Cabang Praya menerima BK-2026-0024

● STOCK
  Pipa HDPE 4" stok kritis

● VERIFIKASI
  3 evidence menunggu pemeriksaan SPI
```

Aksi:
- tandai dibaca
- tandai semua dibaca
- buka detail

Notification harus berasal dari database, bukan hanya toast sementara.

---

# 8. DARK MODE

Topbar memiliki toggle:

```text
☀ / 🌙
```

Mode:

```text
Light
Dark
System
```

Gunakan semantic design tokens:

```text
background
foreground
muted
card
border
primary
secondary
success
warning
destructive
```

Dark mode:
- kontras harus baik
- chart tetap readable
- badge status tetap terbaca
- map tetap usable
- tidak membalik warna secara brutal

Preferensi theme harus persistent.

---

# 9. USER MENU

Avatar:

```text
[AM]
Administrator
```

Dropdown:

```text
Profil
Pengaturan
Preferensi
Keyboard Shortcuts
Logout
```

Tampilkan role aktif bila berguna.

---

# 10. BREADCRUMB

Gunakan breadcrumb untuk halaman bertingkat.

Contoh:

```text
Gudang / Distribusi / BK-20260826-0025
```

Tidak perlu breadcrumb untuk halaman single-level.

---

# 11. SIDEBAR GUDANG

Rekomendasi:

```text
Dashboard

MASTER
├── Material
├── Kategori
├── Satuan
├── Supplier
├── Cabang & Gudang
└── Lokasi Gudang

PERSEDIAAN
├── Stok
├── Kartu Stok
├── Stock Opname
├── Adjustment
├── Retur
└── Reservation

TRANSAKSI
├── Material Masuk
├── Distribusi (Keluar)
├── Permintaan
└── Histori Transaksi

TRACKING
├── Material Tracking
├── SLA
└── Exception

AUDIT / SPI
├── Dashboard Audit
├── Verifikasi
├── Temuan
└── Peta Material

LAPORAN
├── Stok
├── Material Masuk
├── Distribusi
├── Aging Material
├── SLA
├── Verifikasi
├── Retur
└── Rekap Cabang

PENGGUNA
```

Submenu dapat collapsed.

---

# 12. DASHBOARD GUDANG — EXISTING + UPGRADE

Dashboard existing sudah memiliki:

- Nilai Inventaris
- Total Masuk
- Total Keluar
- Stok Menipis
- Kapasitas Stok Material
- Ringkasan Sistem Hari Ini
- Komposisi Material
- Stok Menipis
- Riwayat Transaksi

**Pertahankan dasar visual existing.**

Tambahkan:

```text
Stock Health
Aging Material
Material Tracking
Exception Center
Top Material Keluar
Aktivitas Terbaru
```

Jangan menghapus widget yang sudah ada hanya demi redesign.

---

# 13. DASHBOARD GUDANG — KPI

Baris atas:

```text
Nilai Inventaris
Total Masuk
Total Distribusi
Stok Menipis
```

Tambahkan small comparison:

```text
+8% bulan ini
-3% minggu ini
0 hari ini
```

Semua angka dari database.

---

# 14. NILAI INVENTARIS / PERGERAKAN STOK

Gunakan area chart besar.

Tabs:

```text
Nilai Inventaris
Pergerakan Stok
Distribusi
```

Range:

```text
7 Hari
30 Hari
3 Bulan
1 Tahun
Custom
```

Chart harus ringan dan readable.

---

# 15. STOCK HEALTH

Widget:

```text
Aman        82
Menipis     14
Kritis       5
Habis        3
Overstock    7
```

Klik status → membuka daftar terfilter.

---

# 16. AGING MATERIAL

Widget:

```text
0–30 Hari        42
31–90 Hari       25
3–6 Bulan        14
6–12 Bulan        8
> 1 Tahun         3
```

Umur tidak disimpan sebagai angka statis.

Contoh:

```text
Umur = reference_date - released_at
```

Untuk stok yang masih berada di gudang dapat digunakan:

```text
reference_date - received_at
```

---

# 17. MATERIAL TRACKING WIDGET

```text
Normal       78
Warning      24
Kritis       12
Overdue      10
```

Hanya material TRACKED.

Klik → Monitoring Material.

---

# 18. EXCEPTION CENTER

Prioritaskan masalah yang membutuhkan tindakan:

```text
🔴 12 Overdue
🟠 4 Location Mismatch
🟠 7 Partial Installation
🟠 3 Receiving Shortage
🟡 5 Evidence Rejected
🔵 6 Waiting Verification
🟡 3 Stock Critical
```

Klik row membuka halaman/filter terkait.

Gunakan semantic status, bukan warna saja.

---

# 19. AKTIVITAS TERBARU

Timeline:

```text
09:42
✓ Cabang Praya menerima
  BK-2026-0082
  Pipa HDPE 4" × 3

09:31
✓ Material dipasang
  Pipa HDPE 4"
  Lokasi A

09:15
⚠ SLA Warning
  Valve 4"
  sisa 1 hari

08:56
✓ Barang Keluar
  BK-2026-0081
```

Aktivitas baru dapat menggunakan fade/slide ringan.

---

# 20. TOP MATERIAL KELUAR

```text
1. Pipa HDPE 4"    128
2. Valve 4"         72
3. Fitting HDPE     65
4. Water Meter      43
5. Clamp Saddle     39
```

Filter periode.

---

# 21. DASHBOARD SPI / AUDIT

Buat dashboard terpisah dari dashboard Gudang.

Fokus:

```text
Tracking
SLA
Overdue
Partial Installation
Location Mismatch
Verification
GIS
Cabang Performance
```

---

# 22. DASHBOARD SPI — KPI

```text
Tracked Material Keluar
Diterima Cabang
Terpasang
Menunggu Verifikasi
Overdue
```

Baris berikut:

```text
Partial Installation
Location Mismatch
Evidence Rejected
SLA Compliance
```

---

# 23. SLA OVERVIEW

Tampilkan:

```text
NORMAL
WARNING
KRITIS
OVERDUE
```

dan:

```text
SLA Compliance
92%
```

Semua dinamis dari database.

---

# 24. SLA CABANG

Contoh:

```text
Cabang Praya      98%
Cabang Kopang     94%
Cabang Pujut      89%
Cabang Janapria   82%
```

Filter:

```text
7 Hari
30 Hari
Bulan Ini
Tahun Ini
Custom
```

Klik → detail cabang.

---

# 25. PARTIAL INSTALLATION

Tampilkan:

```text
Pipa HDPE 4"
Keluar: 3
Terpasang: 2
Sisa: 1
```

Klik → Material Journey.

---

# 26. LOCATION MISMATCH

Tampilkan:

```text
Pipa HDPE 4"
Deviation: 184 m
Cabang Praya

Valve 4"
Deviation: 72 m
Cabang Kopang
```

Klik → Verifikasi.

Mismatch adalah flag, bukan auto-reject.

---

# 27. GIS PREVIEW

Dashboard SPI dapat menampilkan mini map.

Marker preview:

```text
● VERIFIED
⚠ MISMATCH
```

Klik:

```text
Buka Peta Material
```

Peta penuh berada di menu GIS.

---

# 28. MATERIAL JOURNEY

Gunakan timeline:

```text
● Barang Keluar
│
│ 26 Aug 09:00
│ Gudang Pusat
│
● Diterima Cabang
│
│ 27 Aug 10:30
│ Cabang Praya
│
● Pemasangan
│
│ 28 Aug 14:20
│ 2/3 terpasang
│
◉ Verifikasi
```

Titik aktif boleh menggunakan pulse ringan.

Animasi jangan terus-menerus jika tidak memiliki fungsi.

---

# 29. TABLE / DATA TABLE

Gunakan TanStack Table + shadcn Data Table.

Fitur:

```text
Search
Filter
Sort
Pagination
Column Visibility
Date Range
Bulk Selection
Bulk Action
Export
```

Contoh:

```text
□ | No | Material | Qty | Gudang | Cabang | Tanggal | Age | Status | SLA | Action
```

Sticky header untuk tabel panjang.

---

# 30. GLOBAL FILTER BAR

```text
[ Search ]
[ Status ]
[ Cabang ]
[ Gudang ]
[ Tracking Type ]
[ Date Range ]
[ More Filters ]
```

More Filters membuka Sheet/Popover.

Jangan memenuhi tabel dengan terlalu banyak input.

---

# 31. BARCODE UX

Master Material:

```text
Material
↓
Barcode
↓
Print Label
```

Barang Keluar:

```text
[Scan Barcode]
↓
Camera
↓
Material Detected
↓
Success Animation
↓
Material masuk daftar
```

Scanner:
- kamera belakang mobile;
- scanning line;
- success checkmark;
- cooldown untuk duplicate;
- tidak request backend setiap frame.

Barcode dan QR transaksi tetap berbeda.

---

# 32. QR TRANSACTION UX

Setelah Barang Keluar TRACKED selesai:

```text
Transaction Created
↓
QR Generated
↓
Display QR
↓
Print / Download
```

Gunakan success animation ringan.

---

# 33. MICRO-INTERACTION

Animasi hanya untuk perubahan state.

### Card

fade + translateY

### Number

count-up

### Progress

animate width

### Status

short pulse

### Table update

row highlight singkat

### Activity

slide/fade

### Dialog / Drawer

smooth fade + scale / slide

Default duration:

```text
150–300 ms
```

Scanner success:

```text
200–500 ms
```

Jangan menghambat input.

---

# 34. SCANNER ANIMATION

Saat scanner dibuka:

```text
Camera Preview
+
Scanning Frame
+
Scanning Line
```

Scanning line bergerak vertikal dengan loop ringan.

Saat barcode terbaca:

```text
scan
→ frame success
→ checkmark
→ material card
```

Tidak boleh ada animasi lebih dari yang dibutuhkan.

---

# 35. SKELETON LOADING

Gunakan shadcn Skeleton:

```text
Card skeleton
Table skeleton
Map skeleton
Detail skeleton
```

Hindari hanya menampilkan "Loading..." di tengah layar.

---

# 36. EMPTY STATE

Contoh:

```text
Belum ada transaksi hari ini.

[Buat Barang Keluar]
```

SPI:

```text
Tidak ada material overdue.
Semua material masih dalam SLA.
```

Gunakan icon + copy yang jelas.

---

# 37. ERROR STATE

```text
Data gagal dimuat.

Terjadi gangguan saat mengambil data dari server.

[Coba Lagi]
```

Jangan menampilkan stack trace.

---

# 38. TOAST / SONNER

Contoh:

```text
✓ Barang berhasil disimpan.
✓ Barcode berhasil dibuat.
✓ Barang Keluar berhasil diproses.
✓ QR transaksi berhasil dibuat.
✓ Evidence berhasil dikirim.
```

Error:

```text
✕ Stok tidak mencukupi.
✕ Kamera tidak tersedia.
✕ Gagal menyimpan.
```

Toast tidak menggantikan audit log/notification center.

---

# 39. FORM UX

Gunakan:

```text
React Hook Form
+
Zod
+
shadcn Form
```

Inline validation.

Saat submit:

```text
Menyimpan...
```

Button disabled.

Jangan melakukan submit ganda.

---

# 40. CONFIRMATION

Gunakan shadcn AlertDialog untuk:

```text
Delete
Cancel
Void
Approve
Reject
Return
Adjustment
Stock Opname
```

Contoh:

```text
Batalkan transaksi?

Transaksi sudah memengaruhi stok.
Pembatalan akan membuat reversal dan tercatat dalam audit.

[ Kembali ] [ Batalkan ]
```

Jangan gunakan browser confirm.

---

# 41. DETAIL DRAWER

Gunakan Sheet/Drawer untuk quick view:

```text
klik row
→ drawer kanan
→ ringkasan
→ lihat detail lengkap
```

Mempercepat operasional tanpa berpindah halaman terlalu sering.

---

# 42. RESPONSIVE

Desktop:
- sidebar + topbar.

Tablet:
- sidebar collapse.

Mobile Cabang:
- camera first
- large touch targets
- mobile navigation
- scanner fullscreen
- evidence form mobile-first

GIS dan dashboard tetap responsif.

---

# 43. ACCESSIBILITY

Wajib:

- keyboard navigation;
- focus state;
- aria-label untuk icon-only button;
- tooltip icon-only control;
- contrast yang cukup;
- tidak mengandalkan warna saja;
- label form jelas;
- dialog memiliki title/description.

---

# 44. DARK MODE TOKENS

Gunakan semantic tokens:

```text
--background
--foreground
--card
--border
--primary
--secondary
--success
--warning
--destructive
--muted
```

Jangan hardcode warna di setiap komponen.

---

# 45. PERFORMANCE UI

Target:

```text
No unnecessary rerender
No duplicate request
No infinite request
No giant payload
No blocking animation
```

Gunakan:

```text
TanStack Query
Server-side pagination
Debounced search
Lazy loading
Virtualization untuk tabel sangat besar bila perlu
```

---

# 46. TOPBAR FINAL ACCEPTANCE

Topbar harus memiliki minimal:

```text
[Sidebar Toggle]
[Breadcrumb / Page Context]
[Global Search]
[Notification]
[Dark Mode]
[User Avatar / Menu]
```

Semua harus benar-benar berfungsi.

---

# 47. DEFINITION OF DONE

```text
[✓] shadcn/ui konsisten
[✓] Topbar
[✓] Global Search
[✓] Notification Center
[✓] Dark Mode
[✓] User Menu
[✓] Breadcrumb
[✓] Responsive Sidebar
[✓] Dashboard Gudang
[✓] Dashboard SPI
[✓] Stock Health
[✓] Aging
[✓] Tracking
[✓] SLA
[✓] Exception Center
[✓] GIS Preview
[✓] Material Journey
[✓] Barcode Scanner UI
[✓] QR Transaction UI
[✓] Skeleton
[✓] Empty State
[✓] Error State
[✓] Toast
[✓] Confirmation Dialog
[✓] Micro Animation
[✓] Accessibility
[✓] Mobile Responsive
```

---

# 48. INSTRUKSI UNTUK AI CODING AGENT

Sebelum implementasi:

1. Audit UI existing.
2. Pertahankan business logic/database existing.
3. Jangan menghapus widget existing yang masih relevan.
4. Gunakan data API/database nyata.
5. Jangan hardcode dashboard.
6. Reuse shadcn/ui.
7. Jangan menambah animation library jika tidak diperlukan.
8. Pastikan topbar/search/notification/dark mode berfungsi.
9. Global search harus permission-aware.
10. Notification state harus tersimpan.
11. Dashboard harus berubah mengikuti data transaksi.
12. Scanner tidak boleh melakukan request backend setiap frame.
13. Jalankan build/lint/type-check/test setelah perubahan.
14. Jangan mengubah modul lain yang tidak berkaitan.

---

# 49. FINAL UX GOAL

SI GAPLEK harus terasa seperti:

```text
Enterprise Warehouse System
+
Material Tracking
+
Field Installation Monitoring
+
SPI Audit
+
GIS
```

dengan:

```text
Topbar
├── Global Search
├── Notification
├── Dark Mode
└── User Menu

Sidebar
├── Gudang
├── Transaksi
├── Tracking
├── Audit SPI
└── Laporan

Dashboard
├── KPI
├── Chart
├── Stock Health
├── Aging
├── Tracking
├── SLA
├── Exception
├── Activity
└── GIS Preview
```

Prinsip visual:

> Clean, premium, modern, restrained, informative.

Prinsip teknis:

> Data-first, permission-aware, fast, accessible, maintainable.

Prinsip animasi:

> Animate to explain change, not to decorate.
