# SI GAPLEK — MODUL BARCODE MASTER MATERIAL & SCAN BARANG KELUAR
## Blueprint Fitur Barcode + Camera Scanner + UX Animation

> Modul ini khusus untuk fitur BARCODE pada Master Material dan proses Barang Keluar.
> Tidak mengubah fungsi QR Code yang sudah digunakan untuk transaksi Barang Keluar dan penerimaan Cabang.

---

# 1. TUJUAN

Tambahkan barcode unik pada setiap Master Material.

Flow utama:

```text
Master Material
→ Generate Barcode
→ Barcode tersimpan
→ Barcode tampil di daftar/detail
→ Print Barcode
→ Scan Barcode via kamera
→ Material ditemukan
→ Barang Keluar
```

Prinsip:

```text
BARCODE = identitas MASTER MATERIAL
QR CODE  = identitas TRANSAKSI BARANG KELUAR
```

Jangan mencampur kedua fungsi tersebut.

---

# 2. BARCODE SETIAP MATERIAL

Saat:

```text
Master Barang
→ Tambah Barang
→ Isi data
→ Simpan
```

backend otomatis:

```text
Create Material
→ Generate Barcode
→ Check Unique
→ Save Barcode
→ Return Material
```

User tidak mengetik barcode secara manual.

Field barcode di form bersifat read-only:

```text
Barcode
[AUTO GENERATED]
```

---

# 3. DATABASE

Jika belum ada, tambahkan pada `materials`:

```sql
barcode VARCHAR UNIQUE NOT NULL
```

Index:

```sql
CREATE UNIQUE INDEX idx_materials_barcode
ON materials(barcode);
```

Jangan membuat field duplicate jika existing project sudah memiliki field yang setara.

Barcode harus persistent dan tidak dibuat ulang setiap render.

---

# 4. IDENTITAS

Gunakan:

```text
id       = internal database identity
uuid     = external identity
code     = kode barang manusiawi
barcode  = identifier barcode
```

Contoh:

```text
Kode    : MAT-PIPA-004
Barcode : MAT-PIPA-004
UUID    : ...
```

Jangan mengganti UUID dengan barcode.

---

# 5. BARCODE STANDARD

Gunakan barcode yang umum dan mudah dibaca scanner.

Default:

```text
Code 128
```

Harus bisa dibaca oleh:

- kamera smartphone
- scanner barcode USB
- scanner Bluetooth

Jangan menggunakan QR Code untuk barcode Master Material.

---

# 6. MASTER BARANG — DAFTAR

Tambahkan kolom:

```text
Kode
Nama Barang
Kategori
Satuan
Tracking Type
Stok
Barcode
Status
Aksi
```

Barcode tampil sebagai thumbnail.

Search harus mendukung:

```text
Nama
Kode
Barcode
```

Gunakan pagination dan jangan generate barcode image berulang kali pada setiap render.

---

# 7. DETAIL MATERIAL

Tampilkan:

```text
Nama Barang
Kode Barang
Kategori
Satuan
Tracking Type
Stok
Minimum Stok
Lokasi
Barcode
Status
```

Barcode dapat:

```text
Print Barcode
Download Barcode
Print Label
```

Label minimal:

```text
Nama Material
Kode Material
Barcode
```

Jangan menampilkan UUID mentah kecuali diperlukan.

---

# 8. TRACKED VS NON_TRACKED

Semua material tetap memiliki barcode.

Contoh:

```text
Pipa HDPE 4"
Barcode ✓
Tracking = TRACKED

Kertas A4
Barcode ✓
Tracking = NON_TRACKED
```

Barcode hanya mengidentifikasi material.

Workflow setelah material masuk transaksi mengikuti `tracking_type`.

TRACKED:

```text
Barang Keluar
→ QR transaksi
→ Cabang terima
→ Pemasangan
→ GPS
→ SPI
→ GIS
```

NON_TRACKED:

```text
Barang Keluar
→ proses normal
```

Jangan membuat barcode hanya untuk material TRACKED.

---

# 9. SCAN BARCODE DI MASTER BARANG

Tambahkan:

```text
[ Scan Barcode ]
```

Flow:

```text
Scan Barcode
→ Kamera aktif
→ Barcode terbaca
→ Backend lookup
→ Material ditemukan
→ Detail Material
```

Scan tidak mengubah stok.

---

# 10. SCAN BARCODE DI BARANG KELUAR

Pada halaman:

```text
Barang Keluar / Distribusi
```

tambahkan:

```text
+ Tambah Material

[ 🔍 Cari Material ]
[ 📷 Scan Barcode ]
```

Keduanya memasukkan material ke daftar transaksi yang sama.

Flow:

```text
Barang Keluar
→ Pilih Cabang
→ Scan Barcode
→ Kamera aktif
→ Barcode terbaca
→ Backend lookup
→ Material ditemukan
→ Input quantity
→ Tambahkan ke transaksi
```

---

# 11. CAMERA SCANNER

Gunakan browser camera API.

Prioritaskan kamera belakang:

```javascript
facingMode: "environment"
```

Tidak boleh menggunakan upload file untuk scanner.

Saat dibuka:

```text
Request Camera Permission
→ Camera Preview
→ Barcode Detection
```

Jika permission ditolak:

> Kamera diperlukan untuk melakukan scan barcode. Izinkan akses kamera pada browser/perangkat.

Tombol:

```text
[ Coba Lagi ]
[ Gunakan Pencarian Manual ]
```

Jika device tidak memiliki kamera:

> Kamera tidak tersedia pada perangkat ini. Gunakan pencarian material manual.

---

# 12. UI SCANNER

Buat scanner berupa modal/fullscreen yang nyaman untuk mobile.

Konsep:

```text
┌──────────────────────────────┐
│         Scan Barcode         │
│                              │
│      ┌──────────────┐        │
│      │              │        │
│      │      ╋       │        │
│      │              │        │
│      └──────────────┘        │
│                              │
│ Arahkan barcode ke frame     │
│                              │
│ [ Tutup Scanner ]            │
└──────────────────────────────┘
```

Tambahkan scanning line/laser ringan bergerak vertikal untuk menunjukkan scanner aktif.

Animasi harus profesional, cepat, dan tidak berlebihan.

---

# 13. ANIMASI SCAN

## Scanner dibuka

Animasi:

```text
opacity 0 → 1
scale 0.98 → 1
```

Camera preview tampil halus.

## Saat scanning

Scanning line bergerak perlahan:

```text
top → bottom → top
```

Tidak perlu animasi kompleks.

## Saat berhasil

```text
scanning
→ barcode terdeteksi
→ frame success
→ checkmark muncul
→ material card tampil
```

Durasi sekitar 200–500 ms.

Jangan membuat user menunggu hanya untuk animasi.

---

# 14. CONTINUOUS SCAN

Setelah barcode berhasil:

```text
Barcode terdeteksi
→ material masuk list
→ scanner siap lagi
```

Petugas dapat:

```text
Scan Pipa
→ Scan Valve
→ Scan Fitting
→ Scan Pipa lagi
```

Tambahkan cooldown sekitar 500–1000 ms agar satu barcode yang terlihat dalam banyak frame tidak menjadi duplicate scan.

---

# 15. BARCODE YANG SAMA

Jika barcode yang sama discan beberapa kali dalam satu transaksi:

```text
Scan Pipa
→ Qty 1

Scan Pipa
→ Qty 2

Scan Pipa
→ Qty 3
```

Jangan membuat tiga row.

Hasil:

```text
Pipa HDPE 4" | Qty 3
```

Gunakan `material_id/uuid` sebagai key item draft.

Quantity tetap dapat diedit manual jika permission mengizinkan.

---

# 16. MULTI MATERIAL

Satu transaksi dapat berisi beberapa material:

```text
BK-20260819-0001

Pipa HDPE 4"   3 batang
Valve 4"       2 pcs
Fitting         5 pcs
```

Semua berada dalam satu `warehouse_transaction`.

---

# 17. BACKEND LOOKUP

Frontend hanya mengirim barcode:

```json
{
  "barcode": "MAT-PIPA-004"
}
```

Backend:

```text
barcode
→ query materials
→ cek status aktif
→ cek permission
→ ambil stok aktual
→ return material
```

Jangan mempercayai data stok/nama yang dikirim balik dari client.

---

# 18. BARCODE TIDAK DITEMUKAN

Jika barcode tidak ditemukan:

```text
Barcode tidak ditemukan.

Barang belum terdaftar di Master Material.
```

Tombol:

```text
[ Scan Lagi ]
[ Tutup ]
```

Jangan otomatis membuat Master Material baru.

---

# 19. BARANG NONAKTIF

Jika barcode ditemukan tetapi material inactive:

```text
Barang tidak aktif.

Material tidak dapat digunakan untuk transaksi.
```

Jangan masukkan ke draft Barang Keluar.

---

# 20. VALIDASI STOK

Setiap material yang dipilih lewat barcode harus menggunakan stok database.

Contoh:

```text
Stok tersedia: 5
Qty keluar: 3
```

→ valid.

Jika:

```text
Stok tersedia: 2
Qty keluar: 5
```

→ backend menolak.

Pesan:

```text
Stok tidak mencukupi.
Stok tersedia: 2.
Jumlah diminta: 5.
```

Validasi frontend tidak cukup.

Backend harus validasi ulang saat transaksi final.

---

# 21. MANUAL SEARCH + SCAN

Jangan menghapus pencarian manual.

UI:

```text
Tambah Material

[ 🔍 Cari berdasarkan nama/kode ]
[ 📷 Scan Barcode ]
```

Keduanya menghasilkan object material yang sama dan masuk ke daftar transaksi yang sama.

---

# 22. FINAL SUBMIT BARANG KELUAR

Flow:

```text
Scan/Cari Material
→ Review Material
→ Input Quantity
→ Pilih Cabang
→ Review
→ Konfirmasi
→ Backend Validation
→ Database Transaction
→ Stock Movement
→ Stock Balance
→ Jika TRACKED: Material Tracking
→ Jika TRACKED: Generate QR Transaction
```

Jika proses gagal:

```text
ROLLBACK
```

Jangan sampai stok berubah tetapi transaksi gagal.

---

# 23. QR TETAP BERBEDA

Barcode:

```text
Material
↓
"Barang apa ini?"
```

QR:

```text
Transaction
↓
"Pengiriman yang mana ini?"
```

Contoh:

```text
Pipa HDPE 4"
Barcode:
[ BARCODE ]

Barang Keluar:
BK-20260819-0001

QR:
[ QR TRANSAKSI ]

Cabang:
Scan QR
→ Konfirmasi penerimaan
```

Jangan mengganti QR transaksi menjadi barcode.

---

# 24. PRINT LABEL

Buat label:

```text
┌───────────────────────────┐
│ PERUMDAM TIRTA ARDHIA     │
│ RINJANI                   │
│                           │
│ Pipa HDPE 4 Inch          │
│ MAT-PIPA-004              │
│                           │
│ |||||||||||||||||||||||   │
│ |||||||||||||||||||||||   │
│       MAT-PIPA-004        │
└───────────────────────────┘
```

Label harus cocok untuk printer label atau A4.

---

# 25. BARCODE DI DETAIL DAN LIST

Daftar Master Barang:

```text
Barcode thumbnail
```

Detail:

```text
Barcode ukuran besar
```

Jangan membuat gambar barcode beresolusi besar pada seluruh tabel.

Gunakan lazy loading atau image generation yang efisien jika diperlukan.

---

# 26. DATA LAMA

Jika material sudah ada sebelum fitur barcode:

```text
Existing Materials
→ Migration
→ Generate unique barcode
→ Validate
→ Save
```

Jangan generate ulang setiap halaman dibuka.

---

# 27. AUDIT

Catat minimal:

```text
MATERIAL_CREATED
BARCODE_GENERATED
MATERIAL_UPDATED
MATERIAL_DEACTIVATED
BARCODE_SCANNED
```

Jika barcode diganti, harus ada permission dan audit.

Jangan mengizinkan user mengganti barcode secara bebas setelah material dipakai dalam transaksi.

---

# 28. PERFORMANCE

- server-side pagination;
- backend search;
- barcode image thumbnail;
- jangan request backend setiap frame kamera;
- barcode detection dilakukan di browser;
- backend lookup hanya setelah barcode terdeteksi;
- scanner cooldown;
- debounce search;
- jangan generate barcode image berulang.

---

# 29. SECURITY

- kamera melalui HTTPS;
- backend authorization;
- barcode bukan credential;
- jangan masukkan password/token/secret ke barcode;
- barcode tidak menggantikan authentication;
- backend selalu memvalidasi material;
- permission Gudang tetap berlaku;
- user tidak boleh melihat material/data yang tidak menjadi haknya.

---

# 30. ACCEPTANCE TEST

## Test 1 — Tambah Material

```text
Tambah
→ Simpan
→ Barcode dibuat
→ Barcode unique
→ Barcode tampil
```

## Test 2 — Master List

```text
Buka Master Barang
→ barcode tampil
```

## Test 3 — Scan Master

```text
Scan barcode
→ Material ditemukan
→ Detail tampil
```

## Test 4 — Barang Keluar

```text
Buka Barang Keluar
→ Scan Barcode
→ Kamera aktif
→ Material masuk list
```

## Test 5 — Multi Scan

```text
Pipa
→ Valve
→ Fitting
```

Semua masuk satu transaksi.

## Test 6 — Barcode Sama

```text
Scan Pipa
Scan Pipa
Scan Pipa
```

Hasil:

```text
Pipa Qty = 3
```

tidak duplicate row.

## Test 7 — Unknown Barcode

```text
Scan
→ Barcode tidak ditemukan
→ tidak membuat material
```

## Test 8 — Inactive

```text
Scan
→ Material inactive
→ ditolak
```

## Test 9 — Stok Kurang

```text
Stok = 2
Qty = 5
→ backend reject
→ stok tidak berubah
```

## Test 10 — Mixed Transaction

```text
Pipa TRACKED
Valve TRACKED
Kertas NON_TRACKED
```

Hasil:

```text
Satu transaksi Barang Keluar
QR transaksi dibuat karena ada TRACKED
Material Tracking hanya untuk TRACKED
Kertas tetap NON_TRACKED
```

## Test 11 — Camera Permission

```text
Permission denied
→ error state
→ retry
→ pencarian manual tetap tersedia
```

## Test 12 — Continuous Scan

```text
Scan Pipa
→ success
→ scanner ready
→ Scan Valve
→ success
```

Tidak duplicate akibat frame kamera.

---

# 31. RULE WAJIB

1. Setiap material memiliki barcode.
2. Barcode unique.
3. Barcode dibuat backend/database.
4. Barcode persistent.
5. Barcode tampil di Master Barang.
6. Barcode tampil di Detail.
7. Barcode dapat dicetak.
8. Barcode dapat di-download.
9. Barcode dapat dicari.
10. Barcode dapat discan menggunakan kamera.
11. Scan barcode tidak langsung mengubah stok.
12. Scan barcode tidak menggantikan QR transaksi.
13. Kamera belakang diprioritaskan di mobile.
14. Tidak ada upload gambar sebagai scanner.
15. Scan barcode yang sama berkali-kali menambah quantity, bukan duplicate row.
16. Barcode boleh digunakan pada banyak transaksi berbeda.
17. Barcode tidak berisi data sensitif.
18. Backend selalu melakukan lookup berdasarkan barcode.
19. Backend selalu validasi stok sebelum Barang Keluar.
20. TRACKED dan NON_TRACKED sama-sama memiliki barcode.
21. Workflow SPI tetap hanya berlaku untuk TRACKED.
22. Animasi scanner harus ringan, profesional, dan membantu feedback.
23. Tidak ada request backend setiap frame kamera.
24. Tidak ada barcode regenerate setiap render.
25. Tidak ada fake success/mock flow.
26. Jangan merusak workflow Gudang → Cabang → SPI existing.

---

# 32. DEFINITION OF DONE

Fitur selesai hanya jika:

```text
[✓] Barcode database
[✓] Barcode unique
[✓] Generate saat create material
[✓] Barcode di list
[✓] Barcode di detail
[✓] Print
[✓] Download
[✓] Camera scanner
[✓] Kamera belakang mobile
[✓] Scan lookup backend
[✓] Scan masuk Barang Keluar
[✓] Multi-scan
[✓] Duplicate scan → quantity
[✓] Manual search
[✓] Stock validation
[✓] Backend validation
[✓] Atomic transaction
[✓] Camera error state
[✓] Success animation
[✓] Continuous scan
[✓] TRACKED/NON_TRACKED
[✓] QR transaksi tetap terpisah
[✓] Tidak ada mock flow
```

---

# 33. HASIL AKHIR

Flow Gudang:

```text
MASTER MATERIAL
      ↓
BARCODE
      ↓
PRINT LABEL
      ↓
BARANG DISIMPAN
      ↓
BARANG AKAN KELUAR
      ↓
SCAN BARCODE DENGAN KAMERA
      ↓
MATERIAL TERIDENTIFIKASI
      ↓
QUANTITY
      ↓
STOK DIVALIDASI
      ↓
BARANG KELUAR
      ↓
JIKA TRACKED
      ↓
QR TRANSAKSI
      ↓
CABANG
```

Kesimpulan:

```text
BARCODE
= "barang/material apa ini?"

QR CODE
= "transaksi pengiriman yang mana ini?"
```

Implementasikan modul ini ke struktur SI GAPLEK existing tanpa membuat tabel/module duplicate dan tanpa merusak workflow Gudang, Cabang, Material Tracking, SPI, dan GIS yang sudah ada.
