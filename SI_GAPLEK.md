# SI GAPLEK — Fundamental, Dummy Data, dan Full Functionality

## Tujuan

Saya sedang mengembangkan aplikasi **SI GAPLEK – Logistik Kantor**.

Tampilan sidebar dan struktur menu sudah tersedia seperti pada screenshot yang saya lampirkan.

**JANGAN mengubah desain UI utama, layout sidebar, warna, typography, icon, maupun struktur navigasi yang sudah ada.**

Fokus utama adalah:

1. Memperbaiki fundamental/arsitektur aplikasi.
2. Membuat database dan relasi data yang benar.
3. Membuat data dummy realistis dan saling terhubung.
4. Membuat seluruh menu dan tombol benar-benar berfungsi.
5. Membuat sistem stok yang konsisten.
6. Membuat Dashboard menggunakan data database.
7. Membuat seluruh menu Laporan berfungsi.
8. Membuat aplikasi stabil, cepat, aman, dan mudah dikembangkan.
9. Menghindari hardcode data penting di frontend.
10. Menyiapkan fondasi agar aplikasi dapat digunakan dengan data besar.

---

# PHASE 1 — AUDIT EXISTING CODE

Sebelum coding, baca dan pahami seluruh source code yang sudah ada.

Identifikasi:

- framework
- frontend
- backend
- database
- ORM/query layer
- API
- authentication
- authorization
- state management
- routing
- component structure
- form handling
- validation
- error handling
- loading state
- database relationship
- cara penyimpanan stok
- cara dashboard mengambil data

Jangan membuat ulang aplikasi dari nol jika struktur yang ada masih dapat diperbaiki.

Identifikasi bagian yang:

- sudah benar
- belum lengkap
- hardcode
- hanya mockup
- tidak scalable
- berpotensi menyebabkan bug
- perlu refactor

**Perbaiki fundamental terlebih dahulu sebelum membuat banyak fitur baru.**

---

# PHASE 2 — DATABASE FUNDAMENTAL

## Database harus menjadi Source of Truth

Gunakan database sebagai satu-satunya sumber data utama.

Data berikut wajib berasal dari database:

- barang
- kategori
- satuan
- supplier
- gudang
- lokasi
- departemen
- stok
- transaksi
- user
- laporan
- nilai inventaris

Frontend hanya menampilkan data dan mengirim perubahan melalui backend/API.

---

## Struktur database

Gunakan struktur relational yang jelas.

Minimal:

```text
users

categories
units
suppliers
warehouses
locations
departments
items

stock_balances
stock_movements

goods_receipts
goods_receipt_details

goods_issues
goods_issue_details

stock_transfers
stock_transfer_details

stock_adjustments
stock_adjustment_details

stock_opnames
stock_opname_details

returns
return_details

tool_loans
tool_loan_details

consignment_items

audit_logs
```

Gunakan foreign key dan relationship yang benar.

Contoh:

```text
items
 ├── category_id
 ├── unit_id
 └── supplier_id
```

Stok harus mempertimbangkan lokasi gudang:

```text
stock_balances
 ├── item_id
 ├── warehouse_id
 └── quantity
```

Karena barang yang sama dapat memiliki stok berbeda di setiap gudang.

---

# PHASE 3 — STOCK ENGINE

## Jangan hanya menyimpan angka stok

Gunakan dua konsep:

### Stock Balance

Menyimpan stok terkini:

```text
item_id
warehouse_id
quantity
```

### Stock Movement

Menyimpan seluruh histori perubahan stok:

```text
tanggal
jenis transaksi
item
gudang
qty
arah (+/-)
referensi transaksi
user
```

Contoh:

```text
2026-08-01
Barang Masuk
Kertas A4
Gudang Pusat
+100
```

Kemudian:

```text
2026-08-03
Barang Keluar
Kertas A4
Gudang Pusat
-20
```

Stok menjadi:

```text
100 - 20 = 80
```

Harus selalu bisa dijawab:

> Kenapa stok barang ini sekarang 80?

Jawabannya harus dapat ditelusuri melalui Stock Movement.

---

# PHASE 4 — DATABASE TRANSACTION / ATOMIC OPERATION

Semua transaksi yang mempengaruhi stok harus menggunakan database transaction.

Contoh Barang Masuk:

```text
BEGIN TRANSACTION

1. Simpan header transaksi
2. Simpan detail transaksi
3. Update stock balance
4. Buat stock movement
5. Buat audit log

COMMIT
```

Jika salah satu gagal:

```text
ROLLBACK
```

Jangan sampai terjadi:

```text
Transaksi berhasil
tetapi stok tidak berubah
```

atau:

```text
Stok berubah
tetapi transaksi gagal
```

Semua harus berhasil atau semua harus dibatalkan.

---

# PHASE 5 — CEGAH DOUBLE SUBMIT

User dapat menekan tombol Simpan dua kali.

Pastikan tidak menghasilkan transaksi ganda.

Gunakan:

- loading state
- disable submit button saat proses
- unique transaction number
- backend validation
- idempotency/request protection jika diperlukan

Contoh nomor transaksi:

```text
BM-20260810-0001
BK-20260810-0001
MT-20260810-0001
```

Nomor transaksi tidak boleh duplikat.

---

# PHASE 6 — STATUS TRANSAKSI

Gunakan status transaksi.

Jangan mengubah stok hanya karena user membuat draft.

Contoh Barang Masuk:

```text
DRAFT
↓
DIAJUKAN
↓
DITERIMA
↓
STOCK BERTAMBAH
```

Contoh Barang Keluar:

```text
DRAFT
↓
DIAJUKAN
↓
DISETUJUI
↓
DIKELUARKAN
↓
STOCK BERKURANG
```

Transaksi yang sudah `POSTED/COMPLETED` tidak boleh diedit sembarangan.

---

# PHASE 7 — JANGAN HARD DELETE TRANSAKSI STOK

Transaksi yang sudah mempengaruhi stok tidak boleh dihapus permanen.

Gunakan:

```text
VOID
```

atau:

```text
DIBATALKAN
```

Jika diperlukan, buat reversal stock movement.

Tujuannya agar histori stok tetap dapat diaudit.

---

# PHASE 8 — AUDIT LOG

Catat aktivitas penting:

- CREATE
- UPDATE
- DELETE
- APPROVE
- CANCEL
- POST
- VOID
- LOGIN

Minimal simpan:

```text
user
timestamp
action
module
record_id
old_value
new_value
```

Contoh:

```text
Admin Gudang
10 Agustus 2026 10:21
Barang Keluar
BK-20260810-0031
```

Tujuan:

> Siapa yang melakukan perubahan data?

---

# PHASE 9 — BACKEND VALIDATION

Jangan hanya melakukan validation di frontend.

Backend juga harus memvalidasi.

Contoh:

```text
Stok = 10
Barang Keluar = 15
```

Backend wajib menolak transaksi.

Pesan:

```text
Stok tidak mencukupi.
Stok tersedia: 10.
Qty diminta: 15.
```

Frontend validation = UX.

Backend validation = integritas dan keamanan data.

---

# PHASE 10 — RACE CONDITION

Pastikan dua user yang melakukan transaksi bersamaan tidak menyebabkan stok negatif atau tidak konsisten.

Contoh:

```text
Stok = 10

User A mengeluarkan 7
User B mengeluarkan 6
```

Tidak boleh keduanya berhasil.

Gunakan mekanisme database yang sesuai:

- transaction
- row locking/concurrency control
- atomic update
- backend validation

---

# PHASE 11 — DATABASE INDEX

Buat index pada field yang sering digunakan.

Minimal pertimbangkan:

```text
item_id
warehouse_id
category_id
supplier_id
department_id
transaction_date
status
transaction_number
created_at
item_code
item_name
```

Jangan mengambil seluruh tabel hanya untuk menampilkan 20 data.

---

# PHASE 12 — BACKEND PAGINATION

Data besar harus menggunakan pagination dari backend.

Jangan:

```text
100.000 transaksi
↓
kirim semua ke browser
↓
frontend pagination
```

Gunakan:

```text
GET /transactions?page=1&limit=20
```

Default:

```text
20–50 records/page
```

---

# PHASE 13 — SEARCH DAN FILTER

Untuk data besar, search dilakukan melalui backend.

Contoh:

```text
User mengetik:
BM-2026

↓
Backend query database

↓
hasil relevan
```

Filter harus benar-benar mempengaruhi query.

Filter sesuai halaman:

- tanggal
- status
- gudang
- kategori
- supplier
- departemen
- jenis transaksi
- user

---

# PHASE 14 — DASHBOARD PERFORMANCE

Dashboard jangan mengambil seluruh data transaksi lalu menghitung semuanya di browser.

Gunakan query aggregation:

```text
COUNT()
SUM()
GROUP BY()
```

Jika diperlukan, buat endpoint khusus:

```text
/dashboard/summary
/dashboard/stock-alert
/dashboard/transaction-summary
/dashboard/inventory-value
```

Dashboard harus menampilkan data dinamis dari database.

---

# PHASE 15 — LAZY LOADING

Jangan memuat semua data aplikasi ketika dashboard pertama kali dibuka.

Load data sesuai kebutuhan halaman.

Hindari:

- request berulang
- infinite API request
- infinite re-render
- polling terlalu agresif
- request yang tidak diperlukan

---

# PHASE 16 — GLOBAL ERROR HANDLING

Jika API gagal, tampilkan pesan yang mudah dipahami.

Contoh:

```text
Terjadi kesalahan saat memuat data.
```

Tombol:

```text
Coba Lagi
```

Jangan menampilkan:

```text
undefined
null
NaN
500 Internal Server Error
```

kepada user biasa.

Error teknis tetap dicatat dalam log developer.

---

# PHASE 17 — LOADING STATE

Semua proses async harus memiliki:

```text
Loading
Success
Empty
Error
```

Contoh:

```text
Memuat data...
```

Submit:

```text
Menyimpan...
```

Saat proses berlangsung, tombol submit disabled.

---

# PHASE 18 — FORM VALIDATION

Semua form harus memiliki:

- required field
- format validation
- numeric validation
- validation backend
- loading state
- success notification
- error notification
- confirmation jika diperlukan

Contoh:

```text
Qty harus lebih besar dari 0.
```

```text
Stok tidak mencukupi.
```

---

# PHASE 19 — SECURITY

Pastikan:

- authentication
- authorization
- password tidak disimpan plaintext
- API memiliki permission
- backend memeriksa permission
- input validation/sanitization
- secret/API key tidak berada di frontend
- gunakan environment variables

Jika terdapat role:

```text
Super Admin
Admin Gudang
Petugas Gudang
Viewer
```

Permission harus dicek di backend.

Menyembunyikan tombol saja tidak cukup.

---

# PHASE 20 — MIGRATION DAN SEED

Database harus memiliki migration dan seed yang jelas.

Harus memungkinkan:

```text
database reset
↓
migration
↓
seed dummy
↓
aplikasi langsung berjalan
```

Jangan menyimpan dummy data hanya di frontend.

---

# PHASE 21 — DATA DUMMY REALISTIS

Buat dummy data yang saling terhubung.

## Barang

Minimal 50–100 data.

Field:

- kode barang
- nama barang
- kategori
- satuan
- stok minimum
- stok maksimum
- stok
- harga satuan
- supplier
- lokasi
- status

Contoh:

- Kertas A4 80 gsm
- Kertas F4 80 gsm
- Pulpen
- Pensil
- Spidol
- Map
- Ordner
- Tinta printer
- Toner printer
- Stapler
- Isi staples
- Lakban
- Amplop
- Flashdisk
- Kabel HDMI
- Kabel LAN
- Mouse
- Keyboard
- Baterai
- APD
- dan barang logistik kantor lainnya.

## Kategori

Minimal:

- ATK
- Elektronik
- Komputer
- Kebersihan
- Operasional
- APD
- Sparepart
- Perlengkapan Kantor

## Satuan

- pcs
- box
- rim
- unit
- set
- lusin
- meter
- liter

## Supplier

Minimal 15 supplier.

## Gudang

Minimal:

- Gudang Pusat
- Gudang Cabang Praya
- Gudang Cabang Kopang
- Gudang Cabang Pujut
- Gudang Cabang Janapria

## Lokasi

Minimal 15 lokasi penyimpanan.

## Departemen

- Sekretariat
- Keuangan
- SDM
- IT
- Teknik
- Hublang
- SPI
- Umum
- Cabang

---

# PHASE 22 — DATA TRANSAKSI DUMMY

Buat data yang saling terhubung.

## Barang Masuk

Minimal 100 transaksi.

Field:

- nomor transaksi
- tanggal
- supplier
- gudang
- barang
- qty
- satuan
- harga
- total
- nomor dokumen
- keterangan
- user
- status

Status:

- Draft
- Diajukan
- Diterima
- Dibatalkan

Barang Masuk yang diterima menambah stok.

---

## Barang Keluar

Minimal 100 transaksi.

Field:

- nomor transaksi
- tanggal
- departemen
- pemohon
- gudang
- barang
- qty
- satuan
- keperluan
- nomor dokumen
- status
- user

Barang Keluar yang selesai mengurangi stok.

Stok tidak boleh negatif.

---

## Mutasi Barang

Minimal 30 transaksi.

Field:

- nomor mutasi
- tanggal
- gudang asal
- gudang tujuan
- barang
- qty
- status
- keterangan
- user

Saat selesai:

```text
Gudang asal = stok - qty
Gudang tujuan = stok + qty
```

---

## Penyesuaian Stok

Minimal 30 data.

Formula:

```text
Selisih = Stok Fisik - Stok Sistem
```

---

## Stock Opname

Minimal 20 data.

Tambahkan detail item.

---

## Retur Barang

Minimal 20 transaksi.

Jenis:

- Retur Barang Masuk
- Retur Barang Keluar

---

## Peminjaman Tools

Minimal 20 transaksi.

Tambahkan:

- tanggal pinjam
- peminjam
- departemen
- tools
- qty
- kondisi
- rencana kembali
- tanggal kembali
- status

Status:

- Dipinjam
- Sebagian Dikembalikan
- Sudah Dikembalikan
- Terlambat

Hitung keterlambatan otomatis.

---

## Barang Titipan

Minimal 20 data.

---

# PHASE 23 — SEMUA MENU HARUS BERFUNGSI

Periksa seluruh sidebar.

## Master Data

- Dashboard
- Barang
- Kategori
- Satuan
- Supplier
- Gudang
- Lokasi
- Departemen

## Transaksi

- Barang Masuk
- Barang Keluar
- Mutasi Barang
- Penyesuaian Stok
- Stock Opname
- Retur Barang
- Peminjaman Tools
- Barang Titipan

## Laporan

- Laporan Stok
- Laporan Transaksi
- Nilai Inventaris

Tidak boleh ada tombol yang hanya menjadi dekorasi.

Setiap halaman minimal memiliki:

- View
- Search
- Filter
- Add
- Edit
- Detail
- Delete/Cancel sesuai konteks
- Pagination
- Validation
- Loading
- Error state
- Empty state

---

# PHASE 24 — DASHBOARD

Dashboard harus menggunakan database.

## Statistik

- Total Barang
- Total Stok
- Total Nilai Inventaris
- Barang Masuk Bulan Ini
- Barang Keluar Bulan Ini
- Barang Stok Menipis
- Barang Stok Habis
- Transaksi Pending

## Grafik

- Barang Masuk per bulan
- Barang Keluar per bulan
- Nilai transaksi per bulan
- Distribusi stok berdasarkan kategori
- Top 10 barang paling sering keluar

## Alert

- stok di bawah minimum
- stok habis
- peminjaman terlambat
- transaksi pending
- stock opname belum selesai

Jangan hardcode angka.

---

# PHASE 25 — LAPORAN STOK

Menu:

**Laporan → Laporan Stok**

Tampilkan:

- kode barang
- nama barang
- kategori
- satuan
- gudang
- stok
- stok minimum
- status stok
- harga satuan
- nilai stok

Status:

```text
Habis
Kritis
Normal
Berlebih
```

Filter:

- gudang
- kategori
- status
- barang

Tambahkan:

- Print
- Export Excel
- Export PDF

Hasil laporan harus mengikuti filter.

---

# PHASE 26 — LAPORAN TRANSAKSI

Tampilkan:

- Barang Masuk
- Barang Keluar
- Mutasi
- Penyesuaian
- Stock Opname
- Retur
- Peminjaman
- Barang Titipan

Filter:

- jenis transaksi
- tanggal mulai
- tanggal akhir
- gudang
- departemen
- status
- user

Tampilkan:

- total transaksi
- total barang masuk
- total barang keluar
- total nilai transaksi

Tambahkan:

- Print
- Export Excel
- Export PDF

---

# PHASE 27 — NILAI INVENTARIS

Formula:

```text
Nilai Inventaris = Stok × Harga Satuan
```

Tampilkan:

- total nilai inventaris
- nilai per gudang
- nilai per kategori
- nilai per barang

Tambahkan grafik nilai inventaris per kategori.

Jangan hardcode.

---

# PHASE 28 — DETAIL BARANG

Saat user membuka detail barang, tampilkan:

- informasi barang
- stok saat ini
- stok minimum
- harga
- nilai inventaris
- gudang
- supplier
- histori barang masuk
- histori barang keluar
- histori mutasi
- histori penyesuaian
- histori stock opname

Tambahkan grafik pergerakan stok berdasarkan tanggal.

---

# PHASE 29 — STOCK RECONCILIATION

Buat sistem untuk membandingkan:

```text
Stock Balance
vs
Total Stock Movement
```

Jika tidak sesuai, sistem harus dapat mendeteksi ketidaksesuaian.

Buat fitur:

**Stock Reconciliation**

untuk membantu admin menemukan masalah stok.

---

# PHASE 30 — BUSINESS LOGIC

Jangan meletakkan business logic secara acak di frontend.

Gunakan struktur:

```text
UI
 ↓
API
 ↓
Service / Business Logic
 ↓
Database
```

Buat satu service stok terpusat, misalnya:

```text
StockService
 ├── increaseStock()
 ├── decreaseStock()
 ├── transferStock()
 ├── adjustStock()
 └── reverseStock()
```

Semua modul transaksi yang mempengaruhi stok harus menggunakan logic yang sama.

---

# PHASE 31 — API STRUCTURE

Gunakan endpoint yang konsisten.

Contoh:

```text
/api/items
/api/categories
/api/units
/api/suppliers
/api/warehouses
/api/locations
/api/departments

/api/goods-receipts
/api/goods-issues
/api/stock-transfers
/api/stock-adjustments
/api/stock-opnames
/api/returns
/api/tool-loans
/api/consignments

/api/stock
/api/stock-movements

/api/reports/stock
/api/reports/transactions
/api/reports/inventory

/api/dashboard/summary
/api/dashboard/stock-alert
```

Sesuaikan dengan framework yang digunakan. Jangan memaksakan struktur jika arsitektur project saat ini sudah memiliki pola yang lebih baik.

---

# PHASE 32 — PERFORMANCE TARGET

Aplikasi harus tetap nyaman digunakan ketika data mencapai ribuan hingga puluhan ribu transaksi.

Pastikan:

- backend pagination
- backend search
- database index
- query efisien
- dashboard menggunakan aggregation
- lazy loading
- tidak ada request berulang
- tidak ada infinite re-render
- tidak ada infinite API request
- polling tidak terlalu agresif
- tidak mengambil data yang tidak diperlukan

---

# PHASE 33 — TESTING

Setelah implementasi selesai, lakukan test berikut.

## Test Barang Masuk

```text
Stok Kertas A4 = 100

Barang Masuk = 50

Hasil = 150
```

## Test Barang Keluar

```text
Stok = 150

Barang Keluar = 20

Hasil = 130
```

## Test Mutasi

```text
Gudang Pusat = 100
Gudang Cabang = 50

Mutasi 30

Hasil:
Pusat = 70
Cabang = 80
```

## Test stok tidak mencukupi

```text
Stok = 70
Barang Keluar = 100

HASIL:
TRANSAKSI DITOLAK
```

## Test double submit

Klik tombol simpan dua kali.

Hasil harus tetap menghasilkan satu transaksi.

## Test refresh

Setelah transaksi:

```text
Refresh browser
```

Data harus tetap ada.

## Test logout/login

Data tetap konsisten.

## Test data besar

Buat 10.000+ transaksi dummy dan cek:

- pagination
- search
- filter
- dashboard
- laporan
- detail
- performa

---

# PHASE 34 — FINAL AUDIT

Setelah semua selesai, lakukan audit seluruh menu:

```text
[ ] Dashboard

[ ] Barang
[ ] Kategori
[ ] Satuan
[ ] Supplier
[ ] Gudang
[ ] Lokasi
[ ] Departemen

[ ] Barang Masuk
[ ] Barang Keluar
[ ] Mutasi Barang
[ ] Penyesuaian Stok
[ ] Stock Opname
[ ] Retur Barang
[ ] Peminjaman Tools
[ ] Barang Titipan

[ ] Laporan Stok
[ ] Laporan Transaksi
[ ] Nilai Inventaris
```

Untuk setiap halaman test:

```text
View
Search
Filter
Add
Edit
Detail
Delete/Cancel
Pagination
Validation
Loading
Empty State
Error State
```

---

# ATURAN PALING PENTING

1. Jangan mengubah desain UI utama.
2. Jangan menghapus menu yang sudah ada.
3. Jangan membuat tombol palsu.
4. Jangan membuat halaman "Coming Soon".
5. Jangan hardcode data dashboard.
6. Jangan hardcode laporan.
7. Jangan menyimpan data penting hanya di frontend.
8. Jangan mengubah stok tanpa stock movement.
9. Jangan membuat transaksi stok tanpa database transaction.
10. Jangan mengizinkan stok negatif.
11. Jangan hard delete transaksi yang sudah mempengaruhi stok.
12. Jangan membuat business logic stok berbeda-beda di setiap halaman.
13. Gunakan satu StockService.
14. Validasi wajib dilakukan di backend.
15. Gunakan pagination untuk data besar.
16. Gunakan database index.
17. Gunakan audit log.
18. Gunakan migration dan seed.
19. Pastikan seluruh data saling terhubung.
20. Prioritaskan integritas data dan stabilitas sistem di atas tampilan.

---

# URUTAN PENGERJAAN

Kerjakan secara berurutan:

```text
PHASE 1
Audit Existing Code
        ↓
PHASE 2
Database Schema + Relationship
        ↓
PHASE 3
Migration + Seed
        ↓
PHASE 4
Stock Engine / StockService
        ↓
PHASE 5
Transaction Business Logic
        ↓
PHASE 6
API
        ↓
PHASE 7
Validation + Security
        ↓
PHASE 8
Frontend CRUD
        ↓
PHASE 9
Dashboard
        ↓
PHASE 10
Reports
        ↓
PHASE 11
Search + Filter + Pagination
        ↓
PHASE 12
Export / Print
        ↓
PHASE 13
Audit Log
        ↓
PHASE 14
Performance Optimization
        ↓
PHASE 15
Testing
        ↓
PHASE 16
Final Audit
```

**Jangan lanjut ke phase berikutnya jika fundamental phase sebelumnya masih bermasalah.**

Tujuan akhirnya:

> SI GAPLEK bukan sekadar prototype atau mockup, tetapi aplikasi logistik/gudang dengan fondasi database, business logic, stok, transaksi, laporan, keamanan, dan performance yang siap dikembangkan menjadi aplikasi production.
