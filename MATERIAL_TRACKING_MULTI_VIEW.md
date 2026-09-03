# PRD — SI GAPLEK MATERIAL TRACKING MULTI-VIEW

## 1. Tujuan
Ubah halaman Material Tracking yang saat ini berupa card vertikal panjang menjadi halaman monitoring dengan 4 mode tampilan:
- List View
- Table View
- Board/Kanban View
- Map View

Semua mode menggunakan **satu sumber data dari database/API**. View hanya mengubah cara data ditampilkan, bukan business logic atau status.

## 2. View Switcher
Header:
`[List] [Table] [Board] [Map]`

Default: **List**.

Gunakan shadcn/ui Toggle Group/Tabs sesuai kebutuhan.

## 3. Filter Global
Semua view memakai filter yang sama:
- Search material/kode/nomor transaksi/nomor tracking
- Status
- Cabang
- Gudang
- SLA
- Tracking Type
- Date Range
- More Filters

Filter harus permission-aware dan server-side untuk dataset besar.

## 4. KPI
Di atas view tampilkan:
- Total Tracking
- Menunggu Diterima
- Terpasang
- Menunggu Verifikasi
- Overdue

KPI dapat diklik untuk mengaktifkan filter.

## 5. LIST VIEW — DEFAULT
List menggantikan card vertikal saat ini.

Setiap material berupa **horizontal card/row**, misalnya:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Meter Air DN25mm   MTR-003 · BK-20260818-0008       DITERIMA CABANG       │
│                                                                             │
│ Progress 0/5    ███░░░░░░░     Cabang Praya   SLA 2 Sep   ⚠ Overdue      │
│ Diterima 27 Agu                                             Detail Journey │
└─────────────────────────────────────────────────────────────────────────────┘
```

Wajib menampilkan:
- nama material
- kode
- nomor transaksi
- cabang
- qty keluar
- qty terpasang
- qty tersisa
- progress
- status
- SLA
- tanggal keluar
- tanggal diterima
- tahapan terakhir
- action/detail

Partial installation harus terlihat jelas:
`3 dikirim | 2 terpasang | 1 tersisa`.

Animasi:
- data masuk: fade + translateY 6px, 200–300ms
- update row: highlight 300–500ms
- tidak boleh infinite animation

## 6. TABLE VIEW
Gunakan shadcn Data Table + TanStack Table.

Kolom:
```text
Material | Kode | Ref Transaksi | Cabang | Qty | Terpasang | Sisa |
Status | SLA | Tanggal Keluar | Tahapan | Action
```

Fitur:
- sorting
- server-side pagination
- column visibility
- row selection
- filter
- sticky header
- export

Klik row → detail journey.

## 7. BOARD / KANBAN VIEW
Tujuan: melihat material berdasarkan tahap lifecycle.

Contoh kolom:
```text
BARANG KELUAR | DITERIMA CABANG | PEMASANGAN | VERIFIKASI
```

Card menampilkan:
- material
- kode
- cabang
- qty
- progress
- SLA
- status

**Drag & drop tidak boleh langsung mengubah status.**
Jika nanti diaktifkan, wajib melalui:
```text
drag → permission → backend validation → state machine → audit log
```

Animasi card ringan, tidak bounce berlebihan.

## 8. MAP VIEW
Tujuan: menampilkan lokasi pemasangan.

GIS hanya menampilkan lokasi yang memenuhi aturan GIS utama, yaitu evidence pemasangan yang sudah **TERVERIFIKASI** / `verified_geom`.

Tidak boleh menampilkan:
- lokasi scan QR
- lokasi penerimaan
- evidence pending
- evidence ditolak

Marker menampilkan:
- material
- qty
- cabang
- status
- SLA

Klik marker → Sheet/Popup berisi detail allocation, foto evidence, GPS, quantity, verification dan journey.

Gunakan marker clustering untuk data banyak.

Animasi marker:
`opacity 0→1` + `scale .95→1`, hanya ketika data muncul/berubah.

## 9. DETAIL JOURNEY
Klik item dari List/Table/Board/Map harus membuka detail yang sama.

Tampilkan:
- Material
- kode
- transaksi
- cabang
- qty keluar
- qty diterima
- qty dialokasikan
- qty terpasang
- qty terverifikasi
- qty tersisa
- SLA
- timeline
- allocation
- evidence
- GPS
- verification

## 10. ALLOCATION
Satu material dapat mempunyai beberapa allocation.

Contoh:
```text
Pipa 3 batang
Allocation A = 2 batang, Titik A
Allocation B = 1 batang, Titik B
```

Semua view harus menampilkan angka yang sama.

`installed_quantity` tidak boleh menjadi angka manual yang dapat berbeda dari detail allocation.

## 11. SLA
SLA tracked material:
- dimulai dari `released_at`
- default 7 hari
- tidak reset saat diterima
- status: NORMAL, WARNING, KRITIS, OVERDUE

Filter SLA berlaku untuk semua view.

## 12. EXCEPTION FILTER
Quick filters:
```text
Semua
Overdue
Partial Installation
Location Mismatch
Menunggu Verifikasi
Ditolak
```

Semua view harus berubah sesuai filter.

## 13. VIEW PERSISTENCE
Simpan preferensi mode terakhir:
```text
material_tracking_view = list|table|board|map
```
Boleh memakai localStorage/user preference. Jangan menyimpan data transaksi sebagai source of truth di localStorage.

## 14. RESPONSIVE
Desktop:
- List
- Table
- Board
- Map

Tablet:
- List
- Table
- Map
- Board horizontal scroll

Mobile:
- List sebagai default
- Table menjadi compact responsive list
- Board horizontal scroll
- Map fullscreen

## 15. LOADING / EMPTY / ERROR
Setiap view wajib punya state sendiri.

Loading:
- List skeleton
- Table skeleton
- Board skeleton
- Map skeleton

Empty:
`Belum ada material tracking.`

No result:
`Tidak ada material yang sesuai filter.` + Reset Filter

Error:
`Gagal memuat material tracking.` + Coba Lagi

Jangan membiarkan halaman kosong atau crash.

## 16. UI FOUNDATION
Gunakan:
- shadcn/ui
- Tailwind CSS
- Lucide Icons
- TanStack Table
- TanStack Query

Komponen:
Card, Badge, Toggle Group/Tabs, Button, Dropdown, Sheet, Dialog, Tooltip, Skeleton, Progress, Data Table.

Style:
- premium
- clean
- modern
- enterprise
- whitespace cukup
- subtle border
- soft shadow
- radius moderat

Hindari gradient/glassmorphism/animasi berlebihan.

## 17. TOPBAR
Tetap gunakan global topbar:
```text
[☰] Material Tracking / Breadcrumb
[ Global Search ] [ Notification ] [ Dark Mode ] [ Avatar ]
```

## 18. MICRO-INTERACTION
Gunakan animasi untuk menjelaskan perubahan:
- card fade/slide
- count/progress transition
- status pulse singkat
- row highlight
- sheet/dialog smooth transition
- marker fade/scale

Default 150–300ms.
Jangan animasi terus-menerus.

## 19. PERFORMANCE
Wajib:
- server-side filtering
- server-side sorting
- server-side pagination
- debounce search
- query caching
- lazy loading
- map clustering
- virtualization bila tabel sangat besar

Map sebaiknya mengambil data sesuai filter/viewport jika dataset besar.

## 20. SECURITY / PERMISSION
- Semua view permission-aware.
- Cabang hanya melihat data miliknya.
- SPI melihat sesuai kewenangan.
- Jangan hide-only di frontend; backend tetap validasi.
- Board tidak boleh bypass state machine.
- Map tidak boleh menampilkan evidence yang belum terverifikasi.

## 21. ACCEPTANCE TEST
1. Buka Material Tracking → List default.
2. Pindah ke Table → data sama.
3. Pindah Board → data sama, dikelompokkan berdasarkan status.
4. Pindah Map → hanya titik pemasangan yang memenuhi aturan GIS.
5. Filter Overdue → semua view konsisten.
6. Search → hasil konsisten.
7. Klik item dari semua view → detail journey sama.
8. 3 pipa, 2 terpasang → semua view: `3 keluar, 2 terpasang, 1 sisa`.
9. Planned vs actual berbeda → tampil mismatch, bukan auto-reject.
10. Evidence pending/rejected → tidak masuk GIS resmi.
11. Evidence verified → masuk GIS.
12. Refresh → data tetap berasal dari server.
13. Desktop/tablet/mobile tetap usable.
14. Loading/empty/error state berjalan.
15. Tidak ada mock/fake data.

## 22. DEFINITION OF DONE
```text
[✓] List View
[✓] Table View
[✓] Board View
[✓] Map View
[✓] View Switcher
[✓] Global Filters
[✓] Search
[✓] KPI
[✓] Material Journey
[✓] Allocation
[✓] Partial Installation
[✓] SLA
[✓] Exception Filter
[✓] GIS verified-only
[✓] Skeleton
[✓] Empty State
[✓] Error State
[✓] Responsive
[✓] shadcn/ui
[✓] Micro Animation
[✓] Permission-aware
[✓] Backend validation
[✓] No mock/fake flow
```

## 23. INSTRUKSI UNTUK AI CODING AGENT
Baca blueprint SI GAPLEK utama terlebih dahulu.

Kemudian:
1. Audit halaman Material Tracking existing.
2. Reuse route/API/database existing.
3. Jangan membuat halaman tracking kedua jika route existing dapat diperluas.
4. Gunakan satu query/source data untuk semua view.
5. Jangan hardcode status/angka.
6. Jangan mengubah status hanya karena UI.
7. Jangan bypass state machine.
8. Jangan menggunakan receipt location sebagai GIS installation point.
9. Map hanya verified installation.
10. Gunakan shadcn/ui.
11. Jangan menambah animation library jika tidak diperlukan.
12. Jalankan build, lint, type-check, dan test.
13. Jangan menyatakan selesai jika masih mock/fake.

## 24. HASIL AKHIR
Material Tracking berubah dari:
```text
Card 1
Card 2
Card 3
Card 4
```

menjadi:
```text
[List] [Table] [Board] [Map]
```

Semua mode menampilkan **data yang sama**, hanya cara visualisasinya berbeda.

Tujuan:
> Material Tracking harus cepat dipantau, mudah dibandingkan, mudah difilter, mudah diaudit, dan konsisten di seluruh mode tampilan.
