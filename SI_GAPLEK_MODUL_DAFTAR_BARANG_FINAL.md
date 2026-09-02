# SI GAPLEK — MODUL DAFTAR BARANG / MASTER MATERIAL
## Feature Specification — Premium Clean shadcn/ui

> Dokumen ini KHUSUS untuk fitur **Daftar Barang / Master Material**.
> Jangan mengubah workflow Barang Keluar, QR Transaksi, Material Tracking, SPI, GIS, atau business logic lain yang tidak diperlukan.

---

# 1. TUJUAN

Halaman **Daftar Barang** menjadi pusat pengelolaan dan pencarian seluruh material/barang.

User harus dapat:

```text
Melihat daftar
→ mencari
→ filter
→ sort
→ melihat stok
→ melihat lokasi
→ melihat tracking type
→ melihat barcode/QR material
→ membuka detail
→ melihat foto barang
→ melihat histori
→ melakukan aksi sesuai permission
```

---

# 2. UI FOUNDATION

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

Komponen utama:

```text
Card
Button
Badge
Input
Select
Combobox
Command
Popover
Sheet
Dialog
Dropdown Menu
Table / Data Table
Pagination
Skeleton
Tooltip
Tabs
AlertDialog
Sonner
```

Jangan membuat komponen custom jika shadcn/ui sudah memiliki komponen yang sesuai.

---

# 3. LAYOUT HALAMAN

Header:

```text
Master Barang

Kelola material, stok, lokasi, barcode, dan status barang.

[ Scan QR ] [ + Tambah Barang ]
```

Di bawah header:

```text
KPI
↓
Search + Filter
↓
Data Table
```

Gunakan spacing yang lega dan hierarchy yang jelas.

---

# 4. KPI BARANG

Tampilkan card:

```text
Total Barang
Stok Aman
Stok Menipis
Stok Habis
Tracked
Non-Tracked
```

Semua berasal dari database.

Gunakan count-up animation ringan ketika nilai pertama kali dimuat.

---

# 5. SEARCH

Search utama:

```text
[ 🔍 Cari nama barang, kode, barcode... ]
```

Dukungan:

```text
Nama Barang
Kode Barang
Barcode
```

Gunakan server-side search + debounce 250–400ms.

---

# 6. FILTER

Filter:

```text
[ Kategori ]
[ Satuan ]
[ Tracking Type ]
[ Status ]
[ Lokasi ]
[ Stok ]
[ More Filters ]
```

Tracking:

```text
TRACKED
NON_TRACKED
```

Status:

```text
AMAN
MENIPIS
HABIS
INACTIVE
```

Lokasi contoh:

```text
Bidang Sekretariat
Bidang Keuangan
Bidang SDM
Bidang IT
Bidang Teknik
Bidang Hublang
Bidang SPI
Gudang Pusat
Cabang Praya
Cabang Kopang
Cabang Pujut
Cabang Janapria
```

Lokasi production harus berasal dari master database, bukan hardcode frontend.

---

# 7. DATA TABLE

Gunakan shadcn Data Table + TanStack Table.

Kolom:

```text
Checkbox
Foto
Kode
Nama Barang
Kategori
Lokasi
Satuan
Stok
Tracking
Barcode
Status
Aksi
```

Contoh:

| | Foto | Kode | Nama | Kategori | Lokasi | Stok | Tracking | Barcode | Status | Aksi |
|---|---|---|---|---|---|---:|---|---|---|---|
| □ | 🖼 | MAT-001 | Pipa HDPE 4" | Pipa | Gudang Pusat | 120 | TRACKED | barcode | AMAN | ⋯ |
| □ | 🖼 | MAT-002 | Kertas A4 | ATK | Sekretariat | 25 | NON_TRACKED | barcode | MENIPIS | ⋯ |

---

# 8. FOTO BARANG

Setiap material dapat memiliki foto utama.

Gunakan field/storage existing, misalnya:

```text
materials.photo_url
```

atau image table existing.

Jika tidak ada:

```text
[Package Icon]
No Image
```

Jangan menggunakan random stock photo untuk production.

---

# 9. LOKASI BARANG

Daftar barang wajib menampilkan lokasi material.

Struktur dapat berupa:

```text
Unit / Departemen
Lokasi
Sub Lokasi
```

Contoh:

```text
Bidang Sekretariat
Gudang Sekretariat
Rak A-03
```

atau:

```text
Cabang Praya
Gudang Cabang Praya
Rak B-02
```

Jangan hardcode daftar lokasi pada component.

---

# 10. TRACKING BADGE

Gunakan:

```text
TRACKED
NON_TRACKED
```

Teks wajib terlihat; jangan hanya mengandalkan warna.

---

# 11. STOCK STATUS

Gunakan:

```text
AMAN
MENIPIS
HABIS
```

Contoh:

```text
120 / 20 minimum
AMAN
```

Klik status dapat membuka Stok dengan filter material terkait.

---

# 12. SORT & PAGINATION

Sort:

```text
Nama
Kode
Stok
Tanggal dibuat
Tanggal update
Lokasi
Status
```

Gunakan server-side sorting untuk dataset besar.

Pagination:

```text
1–25 dari 128 barang
```

Pilihan:

```text
25
50
100
```

---

# 13. COLUMN VISIBILITY

Tambahkan:

```text
Columns
```

User dapat memilih visibilitas:

```text
Foto
Kode
Kategori
Lokasi
Satuan
Stok
Tracking
Barcode
Status
```

---

# 14. BULK ACTION

Gunakan checkbox.

Saat ada selection:

```text
3 barang dipilih

[ Print Barcode/QR ]
[ Export ]
[ Nonaktifkan ]
```

Jangan hard delete material yang sudah memiliki histori transaksi.

Gunakan soft delete/inactive.

---

# 15. BARCODE / QR MATERIAL DI LIST

Setiap material memiliki identifier visual pada list.

Gunakan **QR Code material** sebagai standar SI GAPLEK bila sistem utama menggunakan QR.

Tampilkan thumbnail:

```text
[ QR MATERIAL ]
MAT-PIPA-004
```

QR harus berasal dari database dan persistent.

Jangan membuat ulang QR pada setiap render jika tidak diperlukan.

Jika sistem existing masih memiliki barcode legacy, jangan otomatis menghapusnya; pertahankan compatibility tanpa mencampurkan fungsi QR transaksi.

---

# 16. DETAIL BARANG

Klik row atau:

```text
Lihat Detail
```

Buka Sheet untuk quick view atau Detail Page untuk informasi penuh.

Header:

```text
Pipa HDPE 4"

MAT-PIPA-004

[ TRACKED ] [ AMAN ]

[ Edit ] [ More ]
```

---

# 17. DETAIL BARANG — FOTO

Foto harus tampil jelas.

Gunakan:

```text
object-fit: cover
aspect-ratio
rounded-md
```

Klik foto → preview besar melalui Dialog/Lightbox ringan.

---

# 18. DETAIL BARANG — INFORMASI

Tampilkan:

```text
Kode
Nama
Kategori
Satuan
Tracking Type
Unit/Departemen
Lokasi
Sub Lokasi
Stok
Minimum Stock
Status
QR Material
```

---

# 19. DETAIL BARANG — TABS

Gunakan:

```text
Overview
Stok
Histori
Distribusi
Tracking
```

### Overview

Data utama + foto + QR material.

### Stok

```text
On Hand
Reserved
Available
Minimum
```

### Histori

```text
Tanggal
Transaksi
Masuk
Keluar
Saldo
User
```

### Distribusi

Semua transaksi Barang Keluar yang menggunakan material.

### Tracking

Hanya untuk:

```text
tracking_type = TRACKED
```

---

# 20. MATERIAL LIFECYCLE

Jika material TRACKED dan memiliki histori, tampilkan lifecycle singkat:

```text
Material dibuat
↓
Material masuk
↓
Stok
↓
Distribusi
↓
Cabang menerima
↓
Pemasangan
↓
Verifikasi
```

Data berasal dari database/event, bukan teks statis.

---

# 21. DETAIL — UMUR MATERIAL

Jika material mempunyai timestamp lifecycle, tampilkan:

```text
Umur stok
Umur sejak distribusi
Lama menuju penerimaan
Lama menuju pemasangan
```

Contoh:

```text
Keluar: 14 Mei 2025
Umur sejak keluar: 1 Tahun 3 Bulan 12 Hari
```

Umur dihitung dari timestamp aktual dan tidak disimpan sebagai angka statis.

---

# 22. ADD MATERIAL

Tombol:

```text
+ Tambah Barang
```

Form:

```text
Nama Barang
Kode
Kategori
Satuan
Tracking Type
Minimum Stock
Unit/Departemen
Lokasi
Sub Lokasi
Foto
Status
```

QR Material dibuat otomatis oleh backend.

User tidak mengetik identifier QR manual kecuali ada business rule khusus.

---

# 23. EDIT MATERIAL

User dengan permission dapat mengubah field yang diperbolehkan.

Jika material sudah memiliki histori:

```text
Jangan mengubah:
- UUID
- histori transaksi
- identity QR secara bebas
```

Perubahan sensitif wajib diaudit.

---

# 24. DELETE / INACTIVE

Material yang sudah digunakan dalam transaksi tidak boleh hard delete.

Gunakan:

```text
INACTIVE
```

atau soft delete.

Gunakan AlertDialog untuk aksi destructive.

---

# 25. SCAN MATERIAL DARI MASTER BARANG

Tambahkan:

```text
[ Scan QR Material ]
```

Flow:

```text
Klik Scan
↓
Kamera aktif
↓
Scan QR material
↓
Backend lookup
↓
Detail Material dibuka
```

Scan tidak mengubah stok.

Catatan: QR yang dimaksud di sini adalah **QR Master Material**, bukan QR transaksi Barang Keluar.

---

# 26. ANIMASI HALAMAN

Saat halaman dibuka:

```text
Header
↓
KPI
↓
Search/Filter
↓
Table
```

Gunakan:

```text
opacity 0 → 1
translateY 6px → 0
```

Durasi 200–300ms.

---

# 27. ANIMASI TABLE

Loading:

```text
Skeleton
↓
Table fade-in
```

Filter berubah:

```text
Loading state
↓
Data baru
```

Stok berubah:

```text
120
↓
117
```

Gunakan number transition/count-up singkat bila sesuai.

---

# 28. ANIMASI BARIS

Saat item baru ditambahkan ke draft transaksi:

```text
row baru
→ highlight ringan
→ fade ke state normal
```

Saat item dihapus:

```text
collapse/fade
```

Jangan gunakan bounce besar.

---

# 29. ANIMASI STATUS

Saat status berubah, badge dapat melakukan pulse singkat.

Jangan gunakan infinite animation.

---

# 30. PREMIUM CLEAN COLOR SYSTEM

Gunakan semantic color:

```text
Primary
Success
Warning
Destructive
Info
Muted
```

Contoh:

```text
TRACKED      → primary/success
NON_TRACKED  → muted/info
AMAN         → success
MENIPIS      → warning
HABIS        → destructive
INACTIVE     → muted
```

Warna tidak boleh menjadi satu-satunya pembeda status.

---

# 31. LOADING / EMPTY / ERROR

### Loading

Gunakan Skeleton shadcn.

### Empty

```text
Belum ada material.

[ + Tambah Barang ]
```

Filter kosong:

```text
Tidak ada material yang cocok.

[ Reset Filter ]
```

### Error

```text
Gagal memuat daftar barang.

[Coba Lagi]
```

Jangan tampilkan stack trace.

---

# 32. DETAIL DRAWER

Untuk membuka detail dari tabel, prefer Sheet/Drawer agar user tidak kehilangan konteks halaman.

Drawer harus memiliki:

```text
Foto
Nama
Kode
Lokasi
Stok
Tracking
QR
Aksi
```

Tombol:

```text
Lihat Detail Lengkap
```

---

# 33. SEARCH & FILTER PERFORMANCE

Gunakan:

```text
server-side search
server-side filtering
server-side sorting
server-side pagination
debounce
lazy image loading
```

Jangan:

```text
load seluruh database
→ filter di browser
```

---

# 34. GLOBAL SEARCH

Global Search topbar dapat menemukan:

```text
Material
Kode
QR/identifier material
Transaksi
Tracking
Cabang
Gudang
Supplier
```

Tetap permission-aware.

Master Barang Search hanya fokus filtering material.

---

# 35. SIDEBAR CLEANUP

Jangan tampilkan judul grup dua kali.

Benar:

```text
Dashboard

Master                 ˅
  Material
  Kategori
  Satuan
  Supplier
  Cabang & Gudang
  Lokasi Gudang
  Departemen

Persediaan             ˃
Transaksi              ˃
Tracking               ˃
Audit / SPI            ˃
Laporan                ˃

Pengguna
```

Salah:

```text
MASTER
MASTER
Material
```

dan:

```text
LAPORAN
LAPORAN
```

---

# 36. TOPBAR

Gunakan global topbar:

```text
[☰] Master Barang / Material
       [🔍 Search...] [🔔] [🌙] [Avatar]
```

Topbar global tidak digantikan oleh search lokal.

---

# 37. ACCESSIBILITY

Wajib:

- keyboard navigation;
- focus state;
- aria-label untuk icon-only button;
- tooltip icon-only action;
- form label jelas;
- contrast cukup;
- tidak mengandalkan warna saja;
- dialog title/description.

---

# 38. SECURITY

- backend authorization;
- backend validation;
- identifier QR/UUID bukan pengganti authentication;
- jangan expose data yang tidak menjadi hak user;
- jangan hardcode lokasi production;
- jangan hardcode stok;
- jangan membuat fake detail;
- jangan membuat fake QR/identifier;
- perubahan sensitif diaudit.

---

# 39. ACCEPTANCE TEST

## List

```text
Buka Master Barang
→ foto tampil
→ lokasi tampil
→ stok tampil
→ tracking tampil
→ QR tampil
```

## Search

```text
Cari nama
→ cocok

Cari kode
→ cocok

Cari identifier QR
→ cocok
```

## Filter

```text
TRACKED
→ hanya tracked

Lokasi = Cabang Praya
→ hanya lokasi tersebut
```

## Detail

```text
Klik material
→ foto
→ informasi
→ lokasi
→ stok
→ QR
→ histori
→ distribusi
→ tracking jika tracked
```

## Create

```text
Tambah Barang
→ save
→ QR otomatis dibuat
→ list tampil
```

## Scanner

```text
Scan QR Material
→ kamera aktif
→ material ditemukan
→ detail terbuka
```

## Bulk

```text
Pilih 3
→ Print QR/Label
→ 3 label
```

## Responsive

```text
Desktop
Tablet
Mobile
```

semua tetap usable.

---

# 40. DEFINITION OF DONE

```text
[✓] Master Barang modern
[✓] Search
[✓] Filter
[✓] Sort
[✓] Pagination
[✓] Column visibility
[✓] Bulk action
[✓] Foto material
[✓] Lokasi material
[✓] Tracking type
[✓] Stok
[✓] QR Material
[✓] QR di list
[✓] QR di detail
[✓] Print QR/label
[✓] Detail material
[✓] Detail tabs
[✓] Histori
[✓] Distribusi
[✓] Tracking
[✓] Umur material
[✓] shadcn/ui
[✓] Premium clean UI
[✓] Semantic colors
[✓] Micro animation
[✓] Skeleton
[✓] Empty state
[✓] Error state
[✓] Responsive
[✓] Dark mode
[✓] Global search
[✓] Notification
[✓] Topbar
[✓] Sidebar tidak double heading
```

---

# 41. INSTRUKSI FINAL UNTUK AI CODING AGENT

Sebelum implementasi:

1. Audit halaman Master Barang existing.
2. Audit tabel `materials`, category, unit, location, dan image data.
3. Reuse component existing.
4. Jangan membuat tabel/module duplicate.
5. Jangan menghapus business logic existing.
6. Jangan mengubah QR transaction workflow.
7. Jangan mengubah Material Tracking/SPI/GIS.
8. Gunakan migration jika database perlu field baru.
9. Gunakan data API/database nyata.
10. Gunakan shadcn/ui secara konsisten.
11. Gunakan Lucide icons.
12. Gunakan micro-animation yang ringan.
13. Jangan menambahkan animation hanya sebagai dekorasi.
14. Pastikan topbar/search/notification/dark mode benar-benar berfungsi.
15. Pastikan location berasal dari master/database.
16. Pastikan foto berasal dari storage/database.
17. Pastikan QR Material berbeda fungsi dengan QR Transaksi.
18. Jalankan build/lint/type-check/test setelah perubahan.
19. Jangan menyatakan selesai jika masih ada mock/fake data.
20. Pastikan sidebar tidak menampilkan heading group dua kali.

---

# 42. FINAL USER EXPERIENCE

User membuka:

```text
Master Barang
```

melihat:

```text
[ 🔍 Cari material... ]
[ Filter ] [ Scan QR ] [ + Tambah Barang ]
```

kemudian tabel:

```text
Foto | Nama | Kode | Lokasi | Stok | Tracking | QR | Status
```

Klik barang:

```text
Detail Barang
├── Foto
├── Informasi
├── Lokasi
├── Stok
├── QR Material
├── Histori
├── Distribusi
└── Tracking
```

Seluruh interaksi harus cepat, informatif, konsisten, dan terlihat seperti aplikasi warehouse enterprise modern.

Prinsip:

> **Clean, premium, modern, colorful but semantic, and operationally efficient.**

> **Animate to explain change, not to decorate.**

> **QR Material menjawab: “barang/material apa ini?”**

> **QR Transaksi menjawab: “pengiriman/transaksi yang mana ini?”**
