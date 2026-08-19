# PROMPT IMPLEMENTASI — BARCODE MASTER BARANG SI GAPLEK

Baca terlebih dahulu seluruh blueprint/MD SI GAPLEK yang sudah diberikan sebelumnya. Jangan membuat struktur baru yang bertentangan dengan database dan workflow existing.

Saya ingin menambahkan fitur **BARCODE pada Master Barang**.

## 1. BARCODE SETIAP BARANG

Setiap material/barang yang dibuat pada menu **Master Barang** wajib memiliki barcode unik.

Saat user melakukan:

```text
Master Barang
→ Tambah Barang
→ Isi data barang
→ Simpan
```

sistem otomatis:

```text
Generate kode barang
→ Generate barcode
→ Simpan barcode ke database
→ Tampilkan barcode pada halaman detail barang
```

Barcode harus dibuat oleh backend, bukan hanya frontend.

## 2. FORMAT IDENTITAS

Tetap pertahankan:

```text
id       = BIGINT internal
uuid     = UUID
code     = kode barang manusiawi
barcode  = identifier barcode
```

Jangan mengganti UUID atau kode barang dengan barcode.

Barcode merupakan identifier tambahan.

Contoh:

```text
Nama       : Pipa HDPE 4 Inch
Kode       : MAT-PIPA-004
UUID       : 550e8400-e29b-41d4-a716-446655440000
Barcode    : MAT-PIPA-004
```

Jika barcode menggunakan kode barang sebagai nilai encoded, pastikan nilai barcode tetap UNIQUE.

## 3. DATABASE

Tambahkan field pada tabel `materials` jika belum tersedia:

```sql
barcode VARCHAR UNIQUE NOT NULL
```

Jika database existing sudah memiliki field yang setara, gunakan field existing dan jangan membuat kolom duplikat.

Tambahkan index:

```sql
CREATE UNIQUE INDEX idx_materials_barcode
ON materials(barcode);
```

Barcode tidak boleh duplicate.

Jika proses generate barcode menghasilkan collision, backend harus melakukan retry/generate ulang.

## 4. GENERATE BARCODE

Gunakan barcode standar yang umum dan stabil untuk kebutuhan internal, misalnya:

```text
Code 128
```

Barcode harus dapat dibaca oleh scanner barcode biasa.

Jangan menggunakan QR Code untuk fitur ini.

**Bedakan:**

```text
BARCODE → identitas MASTER BARANG
QR CODE  → identitas TRANSAKSI BARANG KELUAR
```

Jangan mencampurkan kedua fungsi tersebut.

## 5. FORM TAMBAH BARANG

Pada form:

```text
Tambah Barang
```

user tidak perlu mengetik barcode secara manual.

Field barcode:

```text
Barcode
[ AUTO GENERATED ]
```

atau setelah barang disimpan:

```text
Barcode
MAT-PIPA-004
```

Field tersebut read-only.

User tetap mengisi:

```text
Kode Barang
Nama Barang
Kategori
Satuan
Minimum Stok
Lokasi Rak
Tracking Type
Status
```

Sesuai struktur Master Barang existing.

## 6. DETAIL BARANG

Pada halaman detail barang tampilkan:

```text
Pipa HDPE 4 Inch

Kode Barang
MAT-PIPA-004

Barcode
[ gambar barcode ]

Nilai Barcode
MAT-PIPA-004
```

Tambahkan tombol:

```text
Print Barcode
Download Barcode
```

Jika memungkinkan tambahkan:

```text
Print Label
```

Label minimal berisi:

```text
Nama Barang
Kode Barang
Barcode
```

Jangan menampilkan UUID mentah pada label kecuali memang diperlukan.

## 7. DAFTAR MASTER BARANG

Pada tabel:

```text
Master Barang
```

tambahkan kolom:

```text
Barcode
```

Contoh:

| Kode | Nama Barang | Kategori | Satuan | Stok | Barcode | Status |
|---|---|---|---|---:|---|---|
| MAT-PIPA-004 | Pipa HDPE 4 Inch | Pipa | Batang | 120 | [barcode] | Aktif |
| MAT-VALVE-001 | Valve 4 Inch | Valve | Pcs | 20 | [barcode] | Aktif |

Barcode pada tabel harus berupa gambar barcode yang dapat dipindai.

Namun jangan membuat ukuran gambar terlalu besar sehingga tabel berat.

Gunakan thumbnail barcode pada list dan ukuran penuh pada detail/print.

## 8. SCAN BARCODE

Siapkan struktur agar barcode barang nantinya dapat digunakan untuk pencarian cepat.

Tambahkan fitur:

```text
Scan Barcode
```

yang dapat:

```text
Scan barcode
→ cari material berdasarkan barcode
→ tampilkan detail material
```

Minimal hasil pencarian:

```text
Nama Barang
Kode Barang
Kategori
Satuan
Stok
Lokasi
Tracking Type
Status
```

Jangan langsung mengubah stok hanya karena barcode di-scan.

Scan barcode hanya melakukan identifikasi barang.

## 9. BARCODE DI TRANSAKSI GUDANG

Pada transaksi Material Masuk dan transaksi lain yang memilih material, sediakan opsi pencarian:

```text
Cari berdasarkan:
- Nama
- Kode Barang
- Barcode
```

Jika scanner barcode digunakan:

```text
Scan Barcode
→ Backend mencari material
→ Material otomatis terpilih
```

Pastikan tetap ada validasi backend.

## 10. HUBUNGAN DENGAN QR BARANG KELUAR

Jangan mengubah konsep QR yang sudah ada.

Tetap:

```text
BARANG MASTER
    ↓
BARCODE
    ↓
identitas material
```

sedangkan:

```text
BARANG KELUAR
    ↓
TRANSAKSI
    ↓
QR CODE
    ↓
Cabang scan untuk penerimaan
```

Contoh:

```text
Pipa HDPE 4 Inch
Barcode:
[ BARCODE MATERIAL ]

Barang Keluar:
BK-20260819-0001

QR:
[ QR TRANSAKSI ]

Cabang:
Scan QR transaksi
→ Konfirmasi penerimaan
```

Barcode tidak menggantikan QR transaksi.

## 11. VALIDASI BACKEND

Backend wajib memastikan:

```text
barcode tidak kosong
barcode unique
material aktif
material belum terhapus
uuid valid
```

Tidak boleh hanya mengandalkan validasi frontend.

Jika barcode tidak ditemukan:

```text
Barang dengan barcode tersebut tidak ditemukan.
```

Jika barcode inactive:

```text
Barang tidak aktif dan tidak dapat digunakan untuk transaksi.
```

## 12. DATA LAMA

Jika tabel `materials` sudah memiliki data sebelum fitur barcode dibuat:

Jangan membuat barcode secara sembarangan di frontend.

Buat migration/backfill resmi:

```text
Data lama
→ generate barcode unik
→ simpan ke database
→ validasi uniqueness
→ selesai
```

Setelah seluruh data lama memiliki barcode, field dapat dibuat `NOT NULL`.

Jangan menghapus data existing.

## 13. PERFORMANCE

Daftar barang tidak boleh melakukan generate barcode setiap kali halaman dibuka.

Barcode image harus:

```text
generated once
→ stored/reference
→ rendered
```

Jika barcode image tidak disimpan sebagai file, gunakan generator yang deterministic dari nilai barcode.

Tetap jadikan nilai barcode di database sebagai source of truth.

Gunakan pagination pada daftar Master Barang.

## 14. AUDIT

Generate barcode pertama kali dianggap bagian dari pembuatan master barang.

Audit minimal:

```text
MATERIAL_CREATED
BARCODE_GENERATED
MATERIAL_UPDATED
MATERIAL_DEACTIVATED
```

Jangan izinkan user mengganti barcode secara sembarangan setelah material sudah digunakan dalam transaksi.

Jika memang membutuhkan perubahan barcode:

```text
request change
→ permission check
→ audit
→ generate/validate barcode baru
```

## 15. ACCEPTANCE TEST

### Test 1 — Barang Baru

```text
Tambah Pipa HDPE
→ Simpan
→ barcode otomatis dibuat
→ barcode tampil
→ barcode dapat dipindai
```

### Test 2 — Duplicate

```text
Buat material
→ barcode sama
→ backend menolak
```

### Test 3 — Daftar Barang

```text
Master Barang
→ barcode tampil di setiap row
```

### Test 4 — Detail

```text
Klik barang
→ barcode tampil
→ Print Barcode
→ Download Barcode
```

### Test 5 — Scanner

```text
Scan barcode
→ material ditemukan
→ detail material tampil
```

### Test 6 — Transaksi

```text
Scan barcode pada pemilihan material
→ material otomatis terpilih
→ quantity diinput
→ transaksi berjalan normal
```

### Test 7 — Perbedaan Barcode dan QR

Pastikan:

```text
Barcode material ≠ QR transaksi
```

Barcode mengidentifikasi **barang/material**.

QR mengidentifikasi **transaksi Barang Keluar**.

## 16. ATURAN FUNDAMENTAL

Jangan mengubah arsitektur existing hanya untuk menambahkan barcode.

Prioritas:

```text
Database existing
        ↓
Backend validation
        ↓
Master Material
        ↓
Barcode
        ↓
Transaksi
        ↓
QR transaksi
```

Jangan:

- membuat barcode duplicate;
- membuat barcode hanya di frontend;
- mengganti UUID dengan barcode;
- mengganti QR transaksi menjadi barcode;
- membuat tabel material baru jika `materials` sudah tersedia;
- mengubah workflow Cabang/SPI yang tidak berkaitan;
- hardcode daftar material;
- menyimpan barcode berbeda antara frontend dan database.

Setelah implementasi selesai, lakukan pengecekan seluruh flow:

```text
Tambah Barang
→ Barcode
→ Master Barang
→ Scan Barcode
→ Material Masuk
→ Stok
→ Barang Keluar
→ QR Transaksi
→ Cabang
```

Pastikan seluruh tombol yang ditambahkan benar-benar berfungsi dan terhubung ke backend/database, bukan sekadar UI/mockup.