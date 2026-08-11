# SI GAPLEK — BLUEPRINT TERPADU FINAL
## Modul Gudang, Cabang, SPI, Material Tracking, UUID, GIS/PostGIS, Allocation & Audit

> STATUS: FINAL IMPLEMENTATION BLUEPRINT
>
> Dokumen ini menjadi sumber kebenaran utama untuk implementasi SI GAPLEK. Coding agent wajib membaca dokumen ini terlebih dahulu, melakukan audit terhadap sistem existing, lalu mengimplementasikan tanpa mengubah modul yang tidak terkait.

---

# 0. TUJUAN

SI GAPLEK adalah sistem logistik/material tracking yang menghubungkan:

```text
Gudang
  ↓
Barang Keluar
  ↓
QR (hanya transaksi/material yang TRACKED)
  ↓
Cabang menerima
  ↓
Material dipasang di lapangan
  ↓
Kamera website + GPS + watermark
  ↓
Evidence
  ↓
SPI memeriksa
  ↓
Terverifikasi
  ↓
GIS hanya menampilkan lokasi pemasangan terverifikasi
```

Sistem harus mampu membuktikan perjalanan material dari gudang sampai lokasi pemasangan.

Contoh utama:

```text
Gudang mengeluarkan Pipa = 3 batang

Cabang:
  Titik A = 2 batang
  Titik B = 1 batang

SPI harus dapat melihat:
- total keluar = 3
- total terpasang = 3
- sisa = 0
- titik A = 2
- titik B = 1
- foto/GPS tiap titik
- status verifikasi
- apakah lokasi aktual berbeda dari rencana
```

---

# 1. PRINSIP FUNDAMENTAL

1. Database adalah source of truth.
2. Jangan hardcode data dashboard/laporan.
3. Semua timestamp resmi menggunakan server timestamp.
4. Semua perubahan status divalidasi backend.
5. Frontend hiding bukan security.
6. Semua endpoint wajib authorization.
7. Barang tidak boleh keluar melebihi stok.
8. Tracking selalu terhubung ke transaksi/item barang keluar.
9. Tidak semua material wajib tracking.
10. Material TRACKED menggunakan QR dan evidence pemasangan.
11. Material NON_TRACKED seperti ATK tidak wajib scan QR, GPS, foto pemasangan, atau verifikasi SPI.
12. GIS hanya menampilkan lokasi pemasangan, bukan lokasi penerimaan.
13. GIS resmi hanya menampilkan evidence yang sudah TERVERIFIKASI SPI.
14. Evidence pending/ditolak tidak boleh menjadi titik GIS resmi.
15. Evidence lama tidak boleh dihapus/overwrite.
16. Tidak boleh membuat koordinat palsu.
17. Tidak boleh menggunakan data dummy sebagai data produksi.
18. Semua aksi penting masuk audit trail.
19. Audit event penting immutable di database.
20. Gunakan UUID untuk identitas eksternal.
21. Gunakan idempotency key untuk operasi yang dapat di-retry.
22. Gunakan transaction/row lock untuk operasi stok, penerimaan QR, dan allocation.
23. Semua tombol yang tampil harus benar-benar berfungsi.
24. Jangan membuat mockup tombol yang tidak memiliki backend.
25. Jangan mengubah UI/modul lain yang tidak terkait tanpa alasan dan tanpa menjaga kompatibilitas.

---

# 2. ROLE

| Role | Fungsi |
|---|---|
| GUDANG | Master material, stok, material masuk, barang keluar, QR |
| CABANG | Terima barang jika transaksi tracked, dokumentasi pemasangan |
| SPI | Monitoring, audit, GIS, SLA, verifikasi |
| ADMIN | Administrasi sistem sesuai permission |

Gudang tidak dapat melakukan verifikasi SPI.

Cabang tidak dapat memverifikasi evidence miliknya sendiri.

SPI tidak melakukan transaksi stok gudang.

---

# 3. TRACKED VS NON_TRACKED

## 3.1 TRACKED

Material yang harus dapat dipertanggungjawabkan pemasangannya.

Contoh:
- pipa
- valve
- meter
- material jaringan
- material teknis yang ditentukan kebijakan perusahaan

Untuk TRACKED:

```text
Barang Keluar
→ QR
→ penerimaan cabang
→ pemasangan
→ foto + GPS
→ SPI verification
→ GIS
```

## 3.2 NON_TRACKED

Material operasional yang tidak perlu dilacak sampai titik pemasangan.

Contoh:
- ATK
- perlengkapan kantor
- material konsumsi yang ditetapkan sebagai non-tracked

Untuk NON_TRACKED:

```text
Barang Keluar
→ proses gudang biasa
```

Tidak wajib:
- scan QR cabang
- kamera pemasangan
- GPS pemasangan
- GIS
- verifikasi SPI

**Jangan memaksa seluruh barang menggunakan QR tracking.**

Kategori tracking harus configurable dari master material, misalnya:

```text
tracking_type = TRACKED | NON_TRACKED
```

---

# 4. ALUR END-TO-END

## TRACKED

```text
Material masuk
↓
Stok gudang
↓
Barang Keluar
↓
QR generated
↓
Cabang scan QR
↓
Konfirmasi penerimaan
↓
Material tracking aktif
↓
Cabang membuat allocation pemasangan
↓
Kamera website
↓
GPS
↓
Foto watermark
↓
Evidence
↓
SPI review
↓
VERIFIED
↓
GIS
```

## NON_TRACKED

```text
Material masuk
↓
Stok
↓
Barang Keluar
↓
Selesai sebagai transaksi gudang
```

---

# 5. MODUL GUDANG

## Sidebar

```text
Dashboard

Persediaan
├── Stok Material
├── Material Masuk
└── Kartu Stok

Transaksi
├── Permintaan Material
├── Barang Keluar
└── Histori Transaksi

Tracking
└── Tracking Material

Laporan
├── Stok
├── Material Masuk
├── Barang Keluar
├── Transaksi per Cabang
└── Kartu Stok

Pengaturan
└── Profil
```

## Dashboard

Data dari database:
- total jenis material
- total stok
- material masuk
- barang keluar
- permintaan pending
- stok menipis
- tracked vs non-tracked

## Master Material

Field minimal:

```text
id
uuid
code
name
category_id
unit
tracking_type
minimum_stock
rack_location
status
created_at
updated_at
```

Kategori tidak boleh hardcode di source code.

---

# 6. STOK

Status:

```text
AMAN
MENIPIS
HABIS
```

Kartu stok:

```text
Saldo Awal
+ Material Masuk
- Barang Keluar
+/- Penyesuaian
= Saldo Akhir
```

Saldo tidak boleh diedit tanpa transaction/history.

Barang keluar wajib menggunakan transaction database.

---

# 7. BARANG KELUAR

Flow:

```text
Buat Barang Keluar
→ pilih cabang
→ pilih material
→ quantity
→ validasi stok
→ konfirmasi
→ stok berkurang
→ nomor transaksi
→ jika ada TRACKED item: generate QR
```

Satu transaksi dapat berisi banyak item.

Contoh:

```text
BK-20260811-0025

Pipa HDPE 4" = 3
Valve 4"     = 1
ATK           = 5
```

Tracking hanya dibuat untuk item TRACKED.

---

# 8. QR CODE

QR dibuat untuk transaksi yang memiliki material TRACKED.

QR:
- satu per transaction header
- tidak berisi data sensitif
- menggunakan UUID/token acak
- token UNIQUE
- divalidasi backend

Nomor transaksi manusiawi:

```text
BK-20260811-0025
```

tidak boleh menjadi satu-satunya secret/token.

QR tidak boleh dipakai dua kali untuk receipt yang sama.

---

# 9. MODUL CABANG

Sidebar mobile-first:

```text
Terima Barang
Pemasangan
Tracking Saya
```

## 9.1 Terima Barang

Hanya diperlukan untuk transaksi TRACKED.

```text
Scan QR
→ backend validasi
→ tampil detail transaksi
→ konfirmasi
→ received
```

Validasi:
- token valid
- transaksi aktif
- cabang sesuai
- belum diterima
- permission benar
- tidak duplicate

Lokasi scan QR boleh dicatat sebagai metadata audit jika diperlukan, tetapi **TIDAK menjadi titik GIS pemasangan**.

## 9.2 Camera Only

Evidence pemasangan wajib menggunakan kamera website:

```text
navigator.mediaDevices.getUserMedia()
```

Tidak boleh menyediakan upload galeri pada flow evidence.

Jika kamera ditolak:

> Kamera wajib diizinkan untuk melanjutkan dokumentasi pemasangan.

## 9.3 GPS

Gunakan:

```text
navigator.geolocation
```

Simpan:
- latitude
- longitude
- accuracy
- capture timestamp

GPS tidak boleh dipalsukan/diisi placeholder.

Jika accuracy melewati threshold configurable, minta pengguna mengambil ulang.

---

# 10. WATERMARK

Foto evidence wajib memiliki:

- nama sistem
- nama instansi
- tanggal/waktu resmi
- user
- cabang
- latitude
- longitude
- accuracy
- material
- transaction number/ID yang relevan

Simpan:
- original photo
- watermarked photo
- checksum SHA-256
- metadata evidence

Server timestamp adalah waktu resmi sistem.

---

# 11. MATERIAL TRACKING PER ITEM

`material_tracking` wajib mengacu ke:

```text
warehouse_transaction_items
```

bukan hanya transaction header.

Karena satu transaksi dapat berisi beberapa material.

Contoh:

```text
Transaction
 ├── Pipa 3 batang → tracking
 ├── Valve 1       → tracking
 └── ATK 5         → non-tracked
```

---

# 12. INSTALLATION ALLOCATION — WAJIB UNTUK MULTI-LOKASI

Satu tracked item dapat dipasang di lebih dari satu lokasi.

Contoh:

```text
Pipa = 3 batang

Allocation A:
  lokasi A
  quantity = 2

Allocation B:
  lokasi B
  quantity = 1
```

Total:

```text
total_quantity = 3
installed_quantity = 2 + 1 = 3
remaining_quantity = 0
```

## Aturan keras

`installed_quantity` **BUKAN field manual**.

Nilainya harus derived:

```sql
SUM(installation_allocations.quantity)
```

Backend wajib menolak:

```text
SUM(allocation.quantity) > quantity transaksi
```

Gunakan database transaction dan row lock agar dua user tidak dapat membuat allocation yang melebihi quantity secara bersamaan.

---

# 13. RELASI EVIDENCE KE ALLOCATION

Ini WAJIB.

Evidence harus tahu allocation mana yang dibuktikan.

Struktur:

```text
material_tracking
    ↓
installation_allocations
    ↓
installation_evidence
```

`installation_evidence` minimal memiliki:

```text
allocation_id FK
```

`tracking_id` dapat disimpan juga sebagai relasi cepat/denormalisasi yang harus konsisten.

Tujuan:

```text
Allocation A = 2 pipa
  └── Foto A + GPS A

Allocation B = 1 pipa
  └── Foto B + GPS B
```

SPI dapat membuktikan quantity per titik.

---

# 14. PLANNED LOCATION VS ACTUAL LOCATION

Tiga konsep harus dipisahkan:

```text
planned_geom
    = lokasi rencana

installation_evidence.geom
    = lokasi aktual saat foto pemasangan

verified_geom
    = snapshot lokasi evidence yang dipilih dan diverifikasi SPI
```

`installation_evidence.geom` berasal dari GPS aktual.

`verified_geom` tidak boleh diedit manual.

Saat SPI melakukan verifikasi:

```text
verified_geom = verified evidence.geom
```

---

# 15. LOCATION MISMATCH

Sistem menghitung:

```text
distance = ST_Distance(planned_geom, actual_geom)
```

Simpan:

```text
location_mismatch
location_deviation_meters
mismatch_threshold_meters
```

Jika:

```text
deviation > threshold
```

maka:

```text
LOCATION_MISMATCH = TRUE
```

Tetapi:

**LOCATION_MISMATCH TIDAK BOLEH AUTO-REJECT.**

SPI yang menentukan valid/tidak valid.

Contoh:

```text
Rencana
   ●

       38.7 m

             ● Aktual

⚠ LOCATION MISMATCH
```

SPI dapat:

```text
VERIFIKASI
atau
TOLAK
```

Jika ditolak, alasan wajib.

---

# 16. GIS — ATURAN FINAL

## GIS TIDAK MENAMPILKAN

- titik scan QR
- titik penerimaan barang
- evidence pending
- evidence ditolak

## GIS MENAMPILKAN

Hanya lokasi material yang sudah terpasang dan diverifikasi.

Sumber resmi:

```text
installation_evidence
WHERE status = TERVERIFIKASI
```

atau menggunakan `verified_geom` sebagai snapshot/cache yang tetap menunjuk ke evidence terverifikasi.

Jika ada:

```text
Evidence 1 = DITOLAK
Evidence 2 = PENDING
Evidence 3 = TERVERIFIKASI
```

GIS hanya mengambil Evidence 3.

---

# 17. GIS MULTI-TITIK

Jika 3 pipa dipasang:

```text
Titik A = 2
Titik B = 1
```

GIS menampilkan dua titik:

```text
● Titik A
  Pipa 2 batang

● Titik B
  Pipa 1 batang
```

Satu material tracking dapat memiliki banyak marker.

Popup GIS menampilkan:
- material
- quantity pada titik
- transaction number
- cabang
- tanggal pemasangan
- status
- SLA
- user
- koordinat
- deviation dari rencana jika ada
- status mismatch

Gunakan marker clustering untuk data banyak.

---

# 18. SLA 7 HARI

SLA dimulai dari:

```text
released_at
```

bukan dari waktu diterima.

Contoh:

```text
Barang keluar:
10-08-2026 09:00

Deadline:
17-08-2026 09:00
```

SLA tidak reset ketika barang diterima.

Status:

```text
NORMAL
WARNING      <= 2 hari
KRITIS       <= 24 jam
OVERDUE      lewat deadline dan belum memenuhi pemasangan
```

SLA configurable melalui satu konfigurasi, bukan angka 7 yang tersebar di source code.

---

# 19. STATUS STATE MACHINE

## Header

```text
DRAFT
→ DIPROSES
→ DIKIRIM
→ DIBATALKAN
```

## Tracking

```text
BARANG_KELUAR
→ MENUNGGU_DITERIMA
→ DITERIMA_CABANG
→ MENUNGGU_PEMASANGAN
→ TERPASANG
→ MENUNGGU_VERIFIKASI
→ TERVERIFIKASI
```

Penolakan:

```text
MENUNGGU_VERIFIKASI
→ DITOLAK
→ MENUNGGU_PEMASANGAN
```

Tidak boleh lompat:

```text
BARANG_KELUAR → TERVERIFIKASI
```

SPI satu-satunya pihak yang dapat membuat status TERVERIFIKASI.

## Flag Turunan: Terpasang Sebagian

`material_tracking.status` tidak menambah status baru untuk kondisi "baru
terpasang sebagian" — mengikuti prinsip yang sama dengan OVERDUE (dihitung,
bukan disimpan). Selama status masih `MENUNGGU_PEMASANGAN`, backend menghitung:

```text
installed_quantity = SUM(installation_allocations.quantity)
is_partial = 0 < installed_quantity < total_quantity
```

`is_partial = true` ditampilkan sebagai badge "Terpasang Sebagian" di dashboard
SPI dan detail tracking, tanpa mengubah nilai `status`. Status baru berubah
menjadi `TERPASANG` ketika `installed_quantity = total_quantity`
(`remaining_quantity = 0`).

---

# 20. UUID

Strategi hybrid:

```sql
id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY
uuid UUID UNIQUE NOT NULL
```

Jika database mendukung, gunakan UUID v7.

UUID digunakan untuk:
- API
- URL
- QR
- audit reference
- GIS/GeoJSON
- integrasi eksternal

Nomor transaksi manusiawi tetap tersedia.

---

# 21. DATABASE MODEL FINAL

```text
warehouses
  id
  uuid
  name
  address
  geom
  status

branches
  id
  uuid
  name
  address
  geom
  status

users
  id
  uuid
  name
  email
  password_hash
  role
  branch_id
  status

material_categories
  id
  name
  description
  status

materials
  id
  uuid
  code
  name
  category_id
  unit
  tracking_type
  minimum_stock
  rack_location
  status

stock_balances
  id
  material_id
  warehouse_id
  quantity
  updated_at

stock_movements
  id
  material_id
  warehouse_id
  transaction_type
  reference_id
  quantity_in
  quantity_out
  balance_after
  user_id
  created_at

warehouse_receipts
  id
  receipt_number
  warehouse_id
  source
  document_number
  receipt_date
  created_by
  created_at

warehouse_receipt_items
  id
  receipt_id
  material_id
  quantity
  unit

warehouse_transactions
  id
  uuid
  transaction_number
  warehouse_id
  destination_branch_id
  qr_token
  status
  released_at
  created_by
  created_at

warehouse_transaction_items
  id
  uuid
  transaction_id
  material_id
  quantity
  unit

material_tracking
  id
  uuid
  transaction_item_id
  branch_id
  status
  sla_start_at
  sla_deadline_at
  received_at
  received_by
  installed_at
  installed_by
  verified_at
  verified_by
  created_at
  updated_at

material_receipts
  id
  uuid
  transaction_id
  qr_token
  received_at
  received_by
  branch_id
  created_at

Catatan: `material_receipts` TIDAK memiliki kolom lokasi (geom/lat/long). Lokasi
penerimaan tidak pernah dicatat sebagai titik GIS — selaras dengan Bagian 14/16/36.

installation_allocations
  id
  uuid
  tracking_id
  quantity
  planned_geom
  planned_latitude
  planned_longitude
  status
  created_by
  created_at
  updated_at

installation_evidence
  id
  uuid
  allocation_id
  tracking_id
  attempt_number
  photo_url
  original_photo_url
  photo_checksum
  geom
  latitude
  longitude
  gps_accuracy
  client_capture_time
  server_received_at
  captured_by
  branch_id
  status
  rejection_reason
  location_mismatch
  location_deviation_meters
  mismatch_threshold_meters
  created_at

material_verifications
  id
  uuid
  tracking_id
  evidence_id
  verified_by
  verified_at
  verified_geom
  status
  notes

material_tracking_events
  id
  uuid
  tracking_id
  event_type
  event_time
  user_id
  metadata JSONB
  created_at

audit_logs
  id
  uuid
  table_name
  record_uuid
  action
  old_value JSONB
  new_value JSONB
  performed_by
  performed_at

spi_findings
  id
  uuid
  branch_id
  related_tracking_id
  finding_type
  description
  status
  reported_by
  reported_at
  resolved_at
```

---

# 22. POSTGIS

Gunakan PostgreSQL + PostGIS.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Titik:

```sql
geom GEOMETRY(Point, 4326)
```

Index:

```sql
CREATE INDEX idx_installation_evidence_geom
ON installation_evidence USING GIST (geom);
```

Index spatial wajib pada kolom geometry yang digunakan untuk query peta.

QGIS dapat:
1. koneksi langsung via VPN/private network, atau
2. menggunakan REST GeoJSON.

Jangan expose database PostgreSQL ke internet publik.

Endpoint GeoJSON contoh:

```text
GET /api/gis/material-locations
```

Hanya mengembalikan data yang berhak dilihat dan lokasi evidence terverifikasi.

---

# 23. PERMISSION MATRIX

| Fitur | Gudang | Cabang | SPI |
|---|---:|---:|---:|
| Master Material | CRUD | View | View |
| Stok | CRUD | - | View |
| Material Masuk | CRUD | - | View |
| Barang Keluar | CRUD | View | View |
| Scan QR | - | TRACKED | View |
| Pemasangan | - | TRACKED | View |
| GIS | Terbatas | Terbatas | ✓ |
| SLA | View | Miliknya | ✓ |
| Verifikasi | - | - | ✓ |
| Audit Trail | Terbatas | Terbatas | ✓ |
| Laporan Gudang | ✓ | - | View |
| Laporan SPI | - | - | ✓ |

Permission wajib diperiksa backend.

---

# 24. AUDIT TRAIL

Event:

```text
WAREHOUSE_RELEASED
BRANCH_RECEIVED
INSTALLATION_STARTED
INSTALLATION_COMPLETED
VERIFICATION_PENDING
VERIFIED
REJECTED
OVERDUE
ALLOCATION_CREATED
ALLOCATION_UPDATED
LOCATION_MISMATCH_FLAGGED
```

Audit penting immutable.

Role aplikasi biasa tidak boleh UPDATE/DELETE audit event.

Gunakan:
- privilege database
- trigger
- append-only pattern

sesuai kemampuan stack.

---

# 25. EVIDENCE INTEGRITY

Setiap evidence:
- checksum SHA-256
- original file
- watermarked version
- metadata
- server timestamp

Storage tidak boleh publik.

Cabang hanya boleh mengakses evidence yang menjadi haknya.

SPI dapat mengakses sesuai permission.

Jangan gunakan URL file publik permanen jika dapat dihindari; gunakan backend authorization/signed URL.

---

# 26. IDEMPOTENCY

Wajib untuk:
- konfirmasi penerimaan QR
- submit evidence
- operasi allocation yang berpotensi retry

Client mengirim:

```text
idempotency_key
```

Retry dengan key yang sama harus menghasilkan satu operasi logis, bukan duplicate.

---

# 27. RACE CONDITION

Operasi berikut wajib transaction + row lock:

1. barang keluar dan pengurangan stok
2. penerimaan QR
3. allocation quantity
4. perubahan status yang bersaing

Contoh allocation:

```text
quantity transaksi = 3

User A memasang 2
User B memasang 2
```

Backend harus menolak salah satu karena:

```text
2 + 2 > 3
```

---

# 28. RATE LIMIT

Rate limit:
- scan QR
- endpoint lookup QR
- login
- submit evidence
- API sensitif

Tujuannya mencegah brute force token dan spam.

---

# 29. UI/UX

Mobile-first untuk Cabang.

Desktop dashboard untuk Gudang/SPI.

Setiap tombol harus:
- memiliki handler
- memiliki API/backend
- memiliki loading state
- success state
- error state
- empty state
- permission state

Jangan menampilkan tombol yang belum diimplementasikan.

Jika fitur belum tersedia, jangan pura-pura berhasil.

---

# 30. DATA DUMMY / SEEDING

Data dummy hanya boleh digunakan untuk development/testing.

Gunakan penanda:

```text
DEMO
DUMMY
TEST
```

Jangan campurkan data dummy dengan production.

Seed harus realistis tetapi tidak mengklaim koordinat sebagai lokasi nyata.

Untuk test GIS gunakan koordinat fixture yang jelas ditandai sebagai TEST.

---

# 31. LAPORAN

Semua laporan berasal dari query database.

Gudang:
- stok
- material masuk
- barang keluar
- kartu stok
- transaksi cabang

SPI:
- material keluar tracked
- diterima
- belum dipasang
- terpasang
- overdue
- verifikasi
- SLA
- lokasi GIS
- mismatch
- performa cabang

Filter:
- tanggal
- cabang
- gudang
- material
- kategori
- tracking type
- status
- SLA
- verification
- mismatch

---

# 32. DASHBOARD SPI

Card:
- Total tracked material keluar
- Menunggu diterima
- Diterima
- Belum terpasang
- Terpasang sebagian (is_partial = true, lihat Bagian 19)
- Terpasang
- Menunggu verifikasi
- Terverifikasi
- Overdue
- Location mismatch

Grafik:
- status material
- SLA compliance
- performa cabang
- pemasangan per periode
- material per lokasi

Semua dinamis dari database.

---

# 33. MATERIAL JOURNEY

Detail tracking menampilkan:

```text
● BARANG KELUAR
     ↓
● DITERIMA CABANG
     ↓
● ALOKASI PEMASANGAN
     ↓
● TERPASANG
     ↓
● VERIFIKASI SPI
     ↓
● TERVERIFIKASI
```

Tampilkan quantity di setiap allocation.

Contoh:

```text
Pipa 3 batang

Titik A
2 batang
✓ Terverifikasi

Titik B
1 batang
✓ Terverifikasi
```

---

# 34. VERIFIKASI SPI

SPI dapat melihat:

- transaksi
- material
- quantity keluar
- allocation
- quantity per titik
- foto
- watermark
- GPS
- accuracy
- actual vs planned
- deviation meter
- mismatch flag
- SLA
- histori evidence
- audit trail

SPI dapat:

```text
VERIFIKASI
TOLAK
```

Penolakan wajib memiliki alasan.

Evidence yang ditolak tidak dihapus.

---

# 35. ATURAN VERIFIED_GEOM

`verified_geom` adalah snapshot dari:

```text
installation_evidence.geom
```

pada evidence yang dipilih SPI dan diverifikasi.

Tidak boleh:
- diedit manual
- diisi oleh cabang
- diisi dengan koordinat perkiraan

Jika evidence baru diverifikasi setelah evidence lama ditolak, GIS mengikuti evidence terbaru yang TERVERIFIKASI.

---

# 36. GIS SOURCE OF TRUTH

GIS resmi harus menggunakan:

```text
TERVERIFIKASI evidence
```

Bukan:
- receipt
- QR scan
- planned location
- pending evidence
- rejected evidence

Jika menggunakan `verified_geom` sebagai cache/snapshot, tetap simpan `evidence_id` sebagai sumber audit.

---

# 37. FASE IMPLEMENTASI

```text
FASE 1  Audit existing database & code
FASE 2  Role + permission
FASE 3  Master material + tracking_type
FASE 4  Stok + material masuk
FASE 5  Barang keluar + QR
FASE 6  Cabang receipt
FASE 7  Material tracking
FASE 8  Installation allocation
FASE 9  Camera + GPS + watermark
FASE 10 Evidence + checksum
FASE 11 State machine
FASE 12 SLA
FASE 13 SPI dashboard
FASE 14 Verification
FASE 15 PostGIS
FASE 16 GIS
FASE 17 Audit/security
FASE 18 Reports
FASE 19 Performance
FASE 20 E2E testing
```

Jangan lanjut jika fase fundamental rusak.

---

# 38. SECURITY CHECKLIST

Sebelum production:

- [ ] authorization backend
- [ ] role/permission test
- [ ] UUID tidak menjadi pengganti authorization
- [ ] QR token tidak dapat ditebak
- [ ] QR rate limit
- [ ] idempotency
- [ ] row locking
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection jika relevan
- [ ] secure password hashing
- [ ] session/token expiration
- [ ] file MIME/type validation
- [ ] file size limit
- [ ] storage access control
- [ ] audit immutable
- [ ] no public DB port
- [ ] HTTPS
- [ ] server-side validation
- [ ] pagination
- [ ] logging tanpa membocorkan data sensitif

---

# 39. END-TO-END TEST

## Test utama

```text
1. Buat material TRACKED.
2. Tambah stok.
3. Buat barang keluar 3 pipa.
4. Sistem mengurangi stok.
5. Sistem membuat tracking.
6. Sistem membuat QR.
7. Cabang yang benar scan QR.
8. Receipt berhasil.
9. Cabang membuat allocation:
   A = 2
   B = 1
10. Sistem menerima total = 3.
11. Cabang ambil foto A via kamera + GPS.
12. Cabang ambil foto B via kamera + GPS.
13. Evidence tersimpan.
14. SPI melihat 2 titik.
15. SPI memverifikasi keduanya.
16. GIS menampilkan 2 titik terverifikasi.
```

## Test invalid

```text
allocation 2 + 2 untuk quantity 3
→ REJECT

Cabang lain scan QR
→ REJECT

QR dipakai ulang
→ REJECT/IDEMPOTENT sesuai konteks

kamera ditolak
→ tidak bisa submit

GPS ditolak
→ tidak bisa submit

evidence ditolak
→ tidak menghapus evidence lama

evidence pending
→ tidak muncul GIS

LOCATION_MISMATCH
→ FLAG, bukan auto reject

user cabang A membuka evidence cabang B
→ FORBIDDEN

user mencoba mengubah status menjadi TERVERIFIKASI
→ FORBIDDEN kecuali SPI

attempt update audit log
→ REJECT DB
```

---

# 40. INSTRUKSI UNTUK AI CODING AGENT

Sebelum coding:

```text
1. Baca seluruh SI_GAPLEK_BLUEPRINT_TERPADU_FINAL.md.
2. Audit repository dan database existing.
3. Identifikasi tabel, endpoint, role, dan komponen yang sudah ada.
4. Jangan membuat tabel/fitur duplikat jika padanannya sudah ada.
5. Buat migration yang aman dan reversible.
6. Implementasikan backend validation lebih dahulu.
7. Implementasikan frontend setelah API stabil.
8. Jalankan test setiap fase.
9. Jangan hardcode data dashboard.
10. Jangan membuat tombol palsu.
11. Jangan menghapus data produksi.
12. Jangan mengubah modul yang tidak terkait.
13. Jika struktur existing berbeda dari blueprint, pertahankan data existing dan buat migration/adapter yang aman.
14. Dokumentasikan setiap keputusan yang berbeda dari blueprint.
```

AI coding agent **tidak boleh hanya membuat UI/mockup**.

Target akhir adalah sistem benar-benar berfungsi dari database sampai frontend.

---

# 41. DEFINITION OF DONE

Fitur dianggap selesai hanya jika:

```text
[✓] Database
[✓] Migration
[✓] Backend API
[✓] Authorization
[✓] Validation
[✓] Transaction handling
[✓] Error handling
[✓] Frontend
[✓] Loading state
[✓] Empty state
[✓] Permission state
[✓] Audit log
[✓] Test case
```

Tidak boleh menyatakan fitur selesai hanya karena halaman UI sudah terlihat.

---

# 42. HASIL AKHIR

SI GAPLEK harus dapat menjawab:

> Material apa yang keluar?

> Berapa quantity yang keluar?

> Dari gudang mana?

> Ke cabang mana?

> Kapan keluar?

> Kapan diterima?

> Berapa quantity yang dipasang?

> Dipasang di titik mana saja?

> Foto buktinya apa?

> GPS aktualnya di mana?

> Apakah berbeda dari rencana?

> Siapa yang memasang?

> Kapan dipasang?

> Apakah memenuhi SLA 7 hari?

> Siapa SPI yang memverifikasi?

> Kapan diverifikasi?

> Titik mana yang resmi muncul di GIS?

Untuk contoh 3 pipa:

```text
3 pipa keluar
↓
2 pipa terpasang di Titik A
1 pipa terpasang di Titik B
↓
3 pipa terpasang
0 sisa
↓
Evidence A + Evidence B
↓
SPI verifikasi
↓
GIS:
  Titik A = 2
  Titik B = 1
```

Inilah sumber kebenaran implementasi SI GAPLEK.
