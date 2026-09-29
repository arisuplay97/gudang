const fs = require('fs');
const path = require('path');
const { jsPDF } = require('./node_modules/.pnpm/jspdf@4.2.1/node_modules/jspdf/dist/jspdf.node.min.js');
const autoTablePlugin = require('./node_modules/.pnpm/jspdf-autotable@5.0.8_jspdf@4.2.1/node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.js');
const autoTable = autoTablePlugin.default || autoTablePlugin.autoTable;

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// Colors
const NAVY = [15, 62, 104];
const TEAL = [2, 132, 199];
const GOLD = [217, 119, 6];
const GREEN = [22, 101, 52];
const RED = [220, 38, 38];
const TEXT_DARK = [30, 41, 59];
const TEXT_MUTED = [100, 116, 139];
const BG_SOFT = [248, 250, 252];
const BORDER_COLOR = [226, 232, 240];

// Common Header & Footer for Pages 2 to 8
function drawHeaderFooter(pageNumber) {
  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('SOP Pemasangan Aksesoris Berbasis Aplikasi SI GAPLEK', 20, 14);
  doc.text('Perumdam Tirta Ardhia Rinjani | Revisi 01', 190, 14, { align: 'right' });
  
  // Header accent line
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(20, 17, 190, 17);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.2);
  doc.line(20, 17, 45, 17);

  // Footer
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(20, 282, 190, 282);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Bagian Teknologi Informasi & Satuan Pengawasan Intern', 20, 287);
  doc.text(`Halaman ${pageNumber}`, 190, 287, { align: 'right' });
}

// Section Title Helper
function drawSectionHeading(number, title, y) {
  doc.setFillColor(...NAVY);
  doc.roundedRect(20, y, 7, 7, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(String(number), 23.5, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(title, 30, y + 5.5);
  
  return y + 10;
}

// Subsection Title Helper
function drawSubSectionHeading(numberStr, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text(`${numberStr}  ${title}`, 20, y);
  return y + 5;
}

// Callout Box Helper
function drawCallout(x, y, w, h, title, textLines, type = 'info') {
  let borderColor = TEAL;
  let bg = [240, 249, 255];
  if (type === 'warning') {
    borderColor = GOLD;
    bg = [254, 252, 232];
  } else if (type === 'danger') {
    borderColor = RED;
    bg = [254, 242, 242];
  }

  doc.setFillColor(...bg);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  // Left thick accent border
  doc.setFillColor(...borderColor);
  doc.rect(x, y, 2.5, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(title, x + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...TEXT_DARK);
  let curY = y + 11;
  textLines.forEach(line => {
    doc.text(line, x + 6, curY);
    curY += 4.2;
  });
}

// ==========================================
// PAGE 1: COVER
// ==========================================
// Top Navy Banner
doc.setFillColor(...NAVY);
doc.rect(0, 0, 210, 142, 'F');

// Teal Accent Stripe
doc.setFillColor(...TEAL);
doc.rect(0, 142, 210, 4, 'F');

// Header Text in Banner
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.setTextColor(255, 255, 255);
doc.text('PERUMDAM TIRTA ARDHIA RINJANI', 20, 36);

doc.setFont('helvetica', 'normal');
doc.setFontSize(10.5);
doc.setTextColor(224, 231, 255);
doc.text('Kabupaten Lombok Tengah', 20, 43);

// Tag / Badge
doc.setFillColor(245, 158, 11);
doc.roundedRect(20, 64, 76, 7, 1.5, 1.5, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(255, 255, 255);
doc.text('STANDAR OPERASIONAL PROSEDUR', 23, 69);

// Main Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(23);
doc.setTextColor(255, 255, 255);
doc.text('Pemasangan Aksesoris', 20, 83);
doc.text('Berbasis Aplikasi SI GAPLEK', 20, 93);
doc.text('& Pemantauan Real-time', 20, 103);

// Subtitle / Scope items
doc.setFont('helvetica', 'bold');
doc.setFontSize(10.5);
doc.setTextColor(186, 230, 253);
doc.text('Gate Valve  •  Gibault Joint  •  Katup Udara (Air Valve)', 20, 120);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(224, 242, 254);
doc.text('Dilengkapi Ketentuan Kepatuhan SLA 7 Hari Kalender & Audit Lapangan SPI', 20, 127);

// Document Info on Bottom Half
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...NAVY);
doc.text('INFORMASI DOKUMEN', 20, 160);

doc.setDrawColor(...TEAL);
doc.setLineWidth(1.2);
doc.line(20, 163, 70, 163);

autoTable(doc, {
  startY: 168,
  margin: { left: 20, right: 20 },
  head: [],
  body: [
    ['Nomor Dokumen', 'SOP/DIST-TI/2026/001'],
    ['Tanggal Berlaku', '28 September 2026'],
    ['Revisi', '01 (Penyesuaian Sistem SI GAPLEK & SLA 7 Hari)'],
    ['Unit Penyusun', 'Bagian Teknologi Informasi & Bagian Distribusi'],
    ['Unit Pelaksana', 'Gudang Pusat, Unit Cabang Pelayanan, & Satuan Pengawasan Intern (SPI)'],
  ],
  theme: 'plain',
  styles: {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: 3.5,
    textColor: TEXT_DARK,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
  },
  columnStyles: {
    0: { fontStyle: 'bold', cellWidth: 50, textColor: NAVY, fillColor: [248, 250, 252] },
    1: { cellWidth: 120 },
  }
});

doc.setFont('helvetica', 'italic');
doc.setFontSize(8);
doc.setTextColor(...TEXT_MUTED);
doc.text('Dokumen internal resmi Perumdam Tirta Ardhia Rinjani Kabupaten Lombok Tengah.', 20, 280);

// ==========================================
// PAGE 2: DAFTAR ISI & RINGKASAN EKSEKUTIF
// ==========================================
doc.addPage();
drawHeaderFooter(2);

doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...NAVY);
doc.text('Daftar Isi', 20, 32);

doc.setDrawColor(...TEAL);
doc.setLineWidth(1.2);
doc.line(20, 35, 45, 35);

const tocItems = [
  { no: '1.', title: 'Tujuan', page: '3' },
  { no: '2.', title: 'Ruang Lingkup & Jenis Aksesoris Dipantau', page: '3' },
  { no: '3.', title: 'Definisi Istilah Operasional', page: '3' },
  { no: '4.', title: 'Peran dan Tanggung Jawab (RBAC Sistem)', page: '4' },
  { no: '5.', title: 'Peralatan dan Bahan Kerja', page: '4' },
  { no: '6.', title: 'Prosedur Operasional Terpadu', page: '4' },
  { no: '', title: '  6.1 Pengeluaran Aksesoris & Cetak QR Surat Jalan (Gudang)', page: '4' },
  { no: '', title: '  6.2 Penerimaan Aksesoris di Cabang via Scan QR', page: '4' },
  { no: '', title: '  6.3 Pembuatan Alokasi Pemasangan (Multi-Lokasi)', page: '5' },
  { no: '', title: '  6.4 Pelaksanaan Pemasangan Fisik Jaringan', page: '5' },
  { no: '', title: '  6.5 Pengambilan Bukti Pemasangan (Dual Photo & GPS Real-time)', page: '5' },
  { no: '', title: '  6.6 Ketentuan Batas Waktu Service Level Agreement (SLA) 7 Hari', page: '5' },
  { no: '', title: '  6.7 Verifikasi dan Audit Lapangan oleh Satuan Pengawasan Intern (SPI)', page: '6' },
  { no: '', title: '  6.8 Publikasi Peta GIS Resmi & Penutupan Transaksi', page: '6' },
  { no: '', title: '  6.9 Penanganan Kondisi Khusus dan Anomali Geografis', page: '6' },
  { no: '7.', title: 'Pengendalian dan Pencegahan Kecurangan (Anti-Fraud)', page: '7' },
  { no: '8.', title: 'Indikator Kinerja Utama (Key Performance Indicators)', page: '7' },
  { no: '9.', title: 'Diagram Alur Proses Terpadu', page: '7' },
  { no: '10.', title: 'Dokumen dan Regulasi Terkait', page: '8' },
  { no: '11.', title: 'Lembar Pengesahan Dokumen', page: '8' },
];

let tocY = 44;
tocItems.forEach(item => {
  doc.setFont('helvetica', item.no ? 'bold' : 'normal');
  doc.setFontSize(item.no ? 9 : 8.5);
  doc.setTextColor(...(item.no ? NAVY : TEXT_DARK));
  
  if (item.no) {
    doc.text(item.no, 20, tocY);
    doc.text(item.title, 27, tocY);
  } else {
    doc.text(item.title, 25, tocY);
  }

  // Dots
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BORDER_COLOR);
  const textWidth = doc.getTextWidth(item.title);
  const startDot = item.no ? 28 + textWidth : 26 + textWidth;
  const dotStr = '. '.repeat(Math.max(1, Math.floor((180 - startDot) / 3)));
  doc.text(dotStr, startDot + 2, tocY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(item.page, 190, tocY, { align: 'right' });

  tocY += 5.8;
});

// Ringkasan Eksekutif Box
const execSummaryLines = doc.splitTextToSize(
  'Dokumen Standar Operasional Prosedur (SOP) ini menetapkan tata cara terpadu penerimaan, alokasi multi-lokasi, pemasangan fisik, serta pelaporan digital aksesoris jaringan (Gate Valve, Gibault Joint, dan Katup Udara) di lingkungan Perumdam Tirta Ardhia Rinjani melalui aplikasi SI GAPLEK.\n\n' +
  'Prosedur ini mewajibkan kepatuhan Service Level Agreement (SLA) 7 Hari Kalender terhitung sejak barang keluar gudang pusat, validasi serah-terima fisik berbasis Scan QR Code Surat Jalan, pengambilan bukti visual ganda (Foto Before & After) langsung melalui kamera web terintegrasi GPS, serta audit independen oleh Satuan Pengawasan Intern (SPI) sebelum aset dipublikasikan pada Peta GIS resmi.',
  160
);
drawCallout(20, 182, 170, 88, 'Ringkasan Eksekutif', execSummaryLines, 'info');

// ==========================================
// PAGE 3: BAB 1, BAB 2, BAB 3
// ==========================================
doc.addPage();
drawHeaderFooter(3);

let p3Y = 26;
p3Y = drawSectionHeading(1, 'Tujuan', p3Y);

const tujuanItems = [
  '1. Menyeragamkan tata cara distribusi, penerimaan cabang, alokasi titik pasang, dan pemasangan fisik aksesoris jaringan perpipaan.',
  '2. Memastikan setiap tahapan pekerjaan tercatat secara real-time dan transparan di aplikasi SI GAPLEK (waktu server, koordinat GPS, foto bukti Sebelum & Sesudah, dan personel pelaksana).',
  '3. Menjamin kepatuhan batas waktu Service Level Agreement (SLA) maksimal 7 hari kalender terhitung sejak aksesoris keluar dari Gudang Pusat hingga tuntas diverifikasi oleh SPI.',
  '4. Mencegah potensi kecurangan, manipulasi koordinat fiktif, foto duplikat, dan kehilangan fisik aksesoris operasional perusahaan.'
];

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...TEXT_DARK);
tujuanItems.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 21, p3Y);
  p3Y += lines.length * 4.2 + 1.5;
});

p3Y += 3;
p3Y = drawSectionHeading(2, 'Ruang Lingkup', p3Y);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...TEXT_DARK);
const rkupText = 'SOP ini berlaku untuk seluruh kegiatan pengeluaran dari gudang pusat, pengiriman logistik, penerimaan cabang, alokasi titik kerja, pemasangan baru, maupun penggantian aksesoris di seluruh jaringan perpipaan Perumdam Tirta Ardhia Rinjani Kabupaten Lombok Tengah.';
const rkupLines = doc.splitTextToSize(rkupText, 168);
doc.text(rkupLines, 21, p3Y);
p3Y += rkupLines.length * 4.2 + 3;

doc.setFont('helvetica', 'bold');
doc.setFontSize(9);
doc.setTextColor(...NAVY);
doc.text('Jenis Aksesoris yang Dipantau:', 21, p3Y);
p3Y += 3;

autoTable(doc, {
  startY: p3Y,
  margin: { left: 20, right: 20 },
  head: [['No', 'Jenis Aksesoris', 'Spesifikasi & Ketentuan Pencatatan']],
  body: [
    ['1', 'Gate Valve', 'Semua ukuran/diameter. Wajib dicatat diameter, merek, kondisi fisik, dan nomor seri/kode barang pada setiap titik pemasangan.'],
    ['2', 'Gibault Joint', 'Semua ukuran sesuai diameter pipa penyambung jaringan transmisi dan distribusi utama.'],
    ['3', 'Katup Udara (Air Valve)', 'Semua tipe sesuai spesifikasi teknis pelepasan udara pada titik elevasi jaringan perpipaan.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 8, textColor: TEXT_DARK, cellPadding: 2.8 },
  columnStyles: {
    0: { halign: 'center', cellWidth: 12 },
    1: { fontStyle: 'bold', cellWidth: 45, textColor: NAVY },
    2: { cellWidth: 113 }
  }
});

p3Y = doc.lastAutoTable.finalY + 4;

const dataWajibLines = doc.splitTextToSize(
  'Data Wajib: Setiap pemasangan wajib mencatat jenis aksesoris, ukuran/diameter, kuantitas unit, nomor seri/kode material, nomor Surat Jalan (BPB), koordinat GPS titik pasang (latitude/longitude/akurasi), dan dokumentasi foto Before & After.',
  158
);
drawCallout(20, p3Y, 170, 18, 'Ketentuan Data Wajib Sistem', dataWajibLines, 'info');
p3Y += 23;

p3Y = drawSectionHeading(3, 'Definisi Istilah', p3Y);

autoTable(doc, {
  startY: p3Y,
  margin: { left: 20, right: 20 },
  head: [['Istilah', 'Definisi & Pengertian Operasional']],
  body: [
    ['SI GAPLEK', 'Sistem Informasi Gudang, Alokasi Pemasangan & Logistik Elektronik Terpadu Perumdam Tirta Ardhia Rinjani.'],
    ['Aksesoris', 'Perlengkapan operasional jaringan perpipaan (Gate Valve, Gibault Joint, Katup Udara).'],
    ['Surat Jalan / BPB', 'Dokumen pengeluaran barang resmi dari Gudang Pusat yang dilengkapi QR Token unik pengiriman.'],
    ['SLA 7 Hari', 'Batas waktu 7 hari kalender terhitung sejak barang keluar gudang (released_at) hingga terverifikasi SPI.'],
    ['Alokasi Pemasangan', 'Pemetaan kuantitas aksesoris ke titik lokasi rencana kerja sebelum pemasangan fisik dilakukan.'],
    ['Evidence (Bukti)', 'Dokumentasi visual ganda (Before & After) kamera langsung web berserta stempel GPS dan watermark resmi.'],
    ['SPI', 'Satuan Pengawasan Intern bertindak sebagai auditor independen dan verifikator tunggal evidence.'],
    ['Peta GIS Resmi', 'Peta digital sebaran aset yang hanya menampilkan titik aksesoris yang berstatus TERVERIFIKASI oleh SPI.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 7.8, textColor: TEXT_DARK, cellPadding: 2.2 },
  columnStyles: {
    0: { fontStyle: 'bold', cellWidth: 42, textColor: NAVY },
    1: { cellWidth: 128 }
  }
});

// ==========================================
// PAGE 4: BAB 4, BAB 5, BAB 6.1 - 6.2
// ==========================================
doc.addPage();
drawHeaderFooter(4);

let p4Y = 26;
p4Y = drawSectionHeading(4, 'Peran dan Tanggung Jawab', p4Y);

autoTable(doc, {
  startY: p4Y,
  margin: { left: 20, right: 20 },
  head: [['Peran (RBAC)', 'Tanggung Jawab dan Wewenang Operasional']],
  body: [
    ['Gudang Pusat', 'Menerbitkan transaksi Barang Keluar (Stock Out), mencetak Surat Jalan ber-QR Code, memotong stok fisik secara sistem, dan merekonsiliasi sisa material retur.'],
    ['Cabang / Lapangan', 'Menerima fisik barang melalui Scan QR Surat Jalan di aplikasi, membuat titik alokasi pemasangan, melaksanakan pekerjaan teknis di lapangan, dan mengunggah foto Before & After via kamera web + GPS.'],
    ['Satuan Pengawasan\nIntern (SPI)', 'Melakukan audit kepatuhan batas waktu SLA 7 Hari, memeriksa keabsahan foto bukti, mengevaluasi deviasi jarak (Location Mismatch) & batas wilayah (Cross-District), serta memutuskan status TERVERIFIKASI atau DITOLAK.'],
    ['Admin Aplikasi (TI)', 'Mengelola akun pengguna, hak akses RBAC, master data aksesoris, parameter sistem, mengawasi audit trail log, dan menjaga keandalan infrastruktur server.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 7.8, textColor: TEXT_DARK, cellPadding: 2.5 },
  columnStyles: {
    0: { fontStyle: 'bold', cellWidth: 45, textColor: NAVY },
    1: { cellWidth: 125 }
  }
});

p4Y = doc.lastAutoTable.finalY + 4;
p4Y = drawSectionHeading(5, 'Peralatan dan Bahan', p4Y);

const alatItems = [
  '• Perangkat Smartphone / Tablet petugas lapangan dengan browser web modern (akses kamera langsung dan GPS aktif).',
  '• Aksesoris sesuai Surat Jalan resmi (Gate Valve, Gibault Joint, atau Katup Udara) dalam kondisi baik.',
  '• Peralatan teknis instalasi perpipaan (kunci pipa, perlengkapan flange/joint, baut/mur, packing, seal tape).',
  '• Perlengkapan Keselamatan dan Kesehatan Kerja (K3): rompi visibilitas tinggi, sarung tangan pelindung, sepatu safety.',
  '• Salinan fisik Surat Jalan ber-QR Code resmi pengeluaran barang dari Gudang Pusat.'
];

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...TEXT_DARK);
alatItems.forEach(it => {
  doc.text(it, 22, p4Y);
  p4Y += 4.5;
});

p4Y += 3;
p4Y = drawSectionHeading(6, 'Prosedur Operasional Terpadu', p4Y);

p4Y = drawSubSectionHeading('6.1', 'Pengeluaran Aksesoris & Penerbitan QR Surat Jalan (Gudang Pusat)', p4Y);
const sop61 = [
  '1. Gudang Pusat menerima permohonan aksesoris dari Cabang atau Bagian Distribusi.',
  '2. Petugas Gudang membuat transaksi Barang Keluar (Stock Out) di aplikasi SI GAPLEK, memilih aksesoris (Gate Valve, Gibault Joint, atau Katup Udara), jumlah unit, dan cabang tujuan.',
  '3. Gudang melakukan finalisasi transaksi (finalize); sistem otomatis memotong kuantitas stok gudang, merekam waktu rilis resmi (released_at), menginisiasi perhitungan batas waktu SLA 7 Hari Kalender, dan menerbitkan QR Token Pengiriman unik.',
  '4. Surat Jalan fisik dicetak bersama QR Token untuk disertakan bersama fisik barang ke unit cabang tujuan.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_DARK);
sop61.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p4Y);
  p4Y += lines.length * 3.8 + 1.2;
});

p4Y += 2;
p4Y = drawSubSectionHeading('6.2', 'Penerimaan Aksesoris di Cabang via Scan QR Code', p4Y);
const sop62 = [
  '1. Petugas Cabang memeriksa kesesuaian fisik aksesoris yang tiba dengan dokumen Surat Jalan pengiriman.',
  '2. Petugas Cabang membuka menu "Terima Barang" di aplikasi SI GAPLEK dan melakukan pemindaian (Scan QR Code) Surat Jalan.',
  '3. Sistem memvalidasi token, cabang penerima, dan transaksi. Status aksesoris berubah dari MENUNGGU_DITERIMA menjadi DITERIMA_CABANG.',
  '4. Penerimaan barang ini TIDAK MERESET penghitung waktu SLA 7 Hari yang telah berjalan sejak barang keluar dari Gudang Pusat.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_DARK);
sop62.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p4Y);
  p4Y += lines.length * 3.8 + 1.2;
});

// ==========================================
// PAGE 5: BAB 6.3 - 6.6 (SLA 7 HARI)
// ==========================================
doc.addPage();
drawHeaderFooter(5);

let p5Y = 26;

p5Y = drawSubSectionHeading('6.3', 'Pembuatan Alokasi Pemasangan (Multi-Lokasi / Multi-Titik)', p5Y);
const sop63 = [
  '1. Aksesoris yang telah diterima (DITERIMA_CABANG) dapat dipecah ke beberapa titik pemasangan melalui fitur Alokasi Pemasangan.',
  '2. Petugas Cabang menginput kuantitas alokasi pada titik tertentu beserta titik koordinat rencana (dapat menggunakan fitur kunci GPS rencana).',
  '3. Sistem mengunci alokasi melalui transaksi database sehingga total alokasi tidak dapat melebihi kuantitas Surat Jalan (SUM(alokasi) <= total barang).'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...TEXT_DARK);
sop63.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p5Y);
  p5Y += lines.length * 3.8 + 1.2;
});

p5Y += 2;
p5Y = drawSubSectionHeading('6.4', 'Pelaksanaan Pemasangan Fisik Jaringan', p5Y);
const sop64 = [
  '1. Petugas teknis memasang aksesoris sesuai kaidah teknis perpipaan (arah panah aliran pipa, pengencangan baut flange silang, penggunaan gasket/packing presisi).',
  '2. Memastikan sambungan kokoh, tidak bocor pada tekanan uji operasional, dan fungsi mekanik aksesoris bekerja sempurna.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...TEXT_DARK);
sop64.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p5Y);
  p5Y += lines.length * 3.8 + 1.2;
});

p5Y += 2;
p5Y = drawSubSectionHeading('6.5', 'Pengambilan Bukti Pemasangan (Dual Photo & GPS Real-time)', p5Y);
const sop65 = [
  '1. Petugas membuka titik alokasi terkait pada menu Pemasangan di aplikasi SI GAPLEK.',
  '2. Wajib Foto Sebelum (BEFORE): Petugas mengambil foto kondisi jaringan perpipaan sebelum aksesoris dipasang atau saat titik galian dibuka.',
  '3. Wajib Foto Sesudah (AFTER): Petugas mengambil foto hasil akhir aksesoris yang telah terpasang sempurna memperlihatkan merek, nomor seri/kode, dan konteks lokasi.',
  '4. Foto WAJIB diambil langsung melalui kamera web aplikasi (fitur upload galeri diblokir sistem untuk mencegah kecurangan foto lama).',
  '5. Sistem merekam titik koordinat GPS aktual, akurasi sinyal, menyematkan watermark digital resmi, dan menghitung SHA-256 Checksum.',
  '6. Petugas menekan "Kirim Laporan". Status alokasi berubah menjadi MENUNGGU_VERIFIKASI.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...TEXT_DARK);
sop65.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p5Y);
  p5Y += lines.length * 3.8 + 1.2;
});

p5Y += 3;
p5Y = drawSubSectionHeading('6.6', 'Ketentuan Batas Waktu Service Level Agreement (SLA) 7 Hari Kalender', p5Y);

const slaIntroLines = doc.splitTextToSize(
  'Ketentuan Utama SLA: Setiap unit aksesoris yang dikeluarkan dari Gudang Pusat memiliki batas waktu penyelesaian maksimal 7 Hari Kalender (7 x 24 Jam) terhitung sejak barang keluar (released_at) hingga selesai dipasang dan disetujui (TERVERIFIKASI) oleh Satuan Pengawasan Intern (SPI).',
  168
);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.2);
doc.setTextColor(...TEXT_DARK);
doc.text(slaIntroLines, 22, p5Y);
p5Y += slaIntroLines.length * 4.2 + 2;

autoTable(doc, {
  startY: p5Y,
  margin: { left: 20, right: 20 },
  head: [['Status SLA', 'Rentang Waktu & Indikator', 'Kondisi & Tindakan Operasional']],
  body: [
    ['NORMAL', 'Sisa Waktu > 2 Hari', 'Material dalam rentang waktu pengerjaan normal. Cabang memproses penerimaan, alokasi, dan pemasangan fisik sesuai jadwal kerja.'],
    ['WARNING', 'Sisa Waktu <= 2 Hari', 'Peringatan kuning di dashboard. Cabang wajib memprioritaskan pemasangan dan upload foto bukti sebelum waktu kritis.'],
    ['KRITIS', 'Sisa Waktu <= 24 Jam', 'Peringatan oranye intensif. Petugas cabang wajib menyelesaikan pemasangan dan upload bukti hari itu juga.'],
    ['OVERDUE', 'Melewati 7 Hari Kalender', 'Status merah di dashboard SPI. Material dinilai melanggar SLA dan otomatis masuk dalam daftar temuan audit kepatuhan manajemen.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 7.8, textColor: TEXT_DARK, cellPadding: 2.5 },
  columnStyles: {
    0: { fontStyle: 'bold', cellWidth: 32, textColor: NAVY },
    1: { fontStyle: 'bold', cellWidth: 43 },
    2: { cellWidth: 95 }
  },
  didParseCell: function(data) {
    if (data.section === 'body' && data.column.index === 0) {
      if (data.cell.raw === 'NORMAL') data.cell.styles.textColor = GREEN;
      else if (data.cell.raw === 'WARNING') data.cell.styles.textColor = GOLD;
      else if (data.cell.raw === 'KRITIS') data.cell.styles.textColor = [194, 124, 90];
      else if (data.cell.raw === 'OVERDUE') data.cell.styles.textColor = RED;
    }
  }
});

p5Y = doc.lastAutoTable.finalY + 4;

const slaCallout = [
  '• SLA dimulai sejak released_at pada Surat Jalan di Gudang Pusat (bukan saat barang tiba atau diterima cabang).',
  '• Penerimaan fisik barang di Cabang TIDAK MERESET atau menunda timer SLA 7 hari.',
  '• Seluruh aksesoris yang melewati 7 hari kalender dan belum diverifikasi SPI otomatis dilaporkan ke jajaran Direksi.'
];
drawCallout(20, p5Y, 170, 24, 'Aturan Keras SLA 7 Hari Sistem SI GAPLEK', slaCallout, 'warning');

// ==========================================
// PAGE 6: BAB 6.7 - 6.9
// ==========================================
doc.addPage();
drawHeaderFooter(6);

let p6Y = 26;

p6Y = drawSubSectionHeading('6.7', 'Verifikasi dan Audit Lapangan oleh Satuan Pengawasan Intern (SPI)', p6Y);
const sop67 = [
  '1. SPI memantau daftar evidence yang masuk pada modul Dashboard SPI dan Laporan Audit.',
  '2. SPI memeriksa kelengkapan foto Sebelum (BEFORE) dan foto Sesudah (AFTER), kejelasan merek dan ukuran aksesoris, serta kecocokan dengan data Surat Jalan.',
  '3. Evaluasi Deviasi Jarak (Location Mismatch): Sistem otomatis menghitung deviasi jarak antara lokasi rencana dan aktual (GPS). Jika jarak > 100 meter, sistem menandai peringatan LOCATION_MISMATCH. SPI mengevaluasi alasan lapangan.',
  '4. Evaluasi Batas Wilayah (Cross-District Anomaly): Sistem memvalidasi apakah koordinat berada dalam batas kecamatan cabang tujuan. Jika di luar wilayah, sistem mencatat CROSS_DISTRICT_ANOMALY untuk audit kepatuhan.',
  '5. SPI mengambil keputusan verifikasi:',
  '   • TERVERIFIKASI: Bukti sah dan lengkap. Koordinat aktual disimpan sebagai titik resmi aset dan dipublikasikan ke Peta GIS.',
  '   • DITOLAK: Bukti tidak sesuai/kurang jelas. SPI wajib mengisi alasan penolakan. Status kembali ke Cabang untuk perbaikan foto ulang (Attempt berikutnya) dalam batas sisa waktu SLA 7 Hari.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_DARK);
sop67.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p6Y);
  p6Y += lines.length * 3.7 + 1.1;
});

p6Y += 2;
p6Y = drawSubSectionHeading('6.8', 'Publikasi Peta GIS Resmi & Penutupan Transaksi', p6Y);
const sop68 = [
  '1. HANYA aksesoris yang berstatus TERVERIFIKASI oleh SPI yang ditampilkan pada Peta GIS Resmi perusahaan.',
  '2. Titik scan penerimaan barang atau evidence yang masih berstatus PENDING/DITOLAK TIDAK BOLEH muncul pada peta GIS resmi untuk menjamin akurasi dan integritas data spasial aset perpipaan.',
  '3. Transaksi pelacakan material dinyatakan Selesai (Closed) setelah seluruh alokasi tuntas berstatus TERVERIFIKASI.',
  '4. Data riwayat terhubung ke Laporan Audit SPI dan Laporan Pemasangan Aksesoris yang dapat diunduh (PDF/Excel) sewaktu-waktu.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_DARK);
sop68.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p6Y);
  p6Y += lines.length * 3.7 + 1.1;
});

p6Y += 2;
p6Y = drawSubSectionHeading('6.9', 'Penanganan Kondisi Khusus dan Anomali Geografis', p6Y);

autoTable(doc, {
  startY: p6Y,
  margin: { left: 20, right: 20 },
  head: [['Kondisi Khusus', 'Prosedur Penanganan Standar']],
  body: [
    ['Gangguan Sinyal\n(Blank Spot)', 'Kamera aplikasi tetap digunakan di lapangan untuk merekam stempel GPS dan foto pada cache perangkat. Begitu petugas tiba di area bersinyal pada hari yang sama, data langsung disinkronkan ke server SI GAPLEK.'],
    ['Aksesoris Rusak /\nCacat Pabrik', 'DILARANG dipasang. Petugas mengambil foto cacat aksesoris, mengisi laporan anomali di aplikasi, dan mengajukan retur fisik barang ke Gudang Pusat.'],
    ['Pergeseran Titik\n(Location Mismatch)', 'Jika kondisi medan memaksa titik pasang bergeser > 100 meter dari rencana, petugas wajib mengisi catatan teknis saat upload evidence. SPI akan memeriksa justifikasi teknis sebelum memberi persetujuan.'],
    ['Sisa Aksesoris\nTidak Terpasang', 'Aksesoris yang tidak jadi dipasang wajib dikembalikan secara fisik ke Gudang Pusat disertai Berita Acara Pengembalian dan input retur di SI GAPLEK.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 7.8, textColor: TEXT_DARK, cellPadding: 2.2 },
  columnStyles: {
    0: { fontStyle: 'bold', cellWidth: 42, textColor: NAVY },
    1: { cellWidth: 128 }
  }
});

// ==========================================
// PAGE 7: BAB 7, BAB 8, BAB 9 (DIAGRAM ALUR)
// ==========================================
doc.addPage();
drawHeaderFooter(7);

let p7Y = 26;
p7Y = drawSectionHeading(7, 'Pengendalian & Pencegahan Kecurangan (Anti-Fraud)', p7Y);

const antiFraudItems = [
  '• Akun Personal Terotentikasi: Satu akun untuk satu petugas pelaksana; dilarang keras berbagi kredensial akun.',
  '• Pemblokiran Galeri: Pengambilan foto evidence wajib streaming kamera langsung (getUserMedia); sistem menolak file upload dari penyimpanan lokal/galeri ponsel.',
  '• Integritas Kriptografi (SHA-256): Setiap foto dihitung nilai hash SHA-256 saat dikirim untuk mencegah manipulasi gambar dan mendeteksi foto duplikat.',
  '• Watermarking Digital Server: Foto bukti otomatis disematkan stempel permanen berisi identitas sistem, instansi, nama petugas, cabang, koordinat GPS, dan timestamp server resmi.',
  '• Jejak Audit Tak Terhapuskan (Immutable Logs): Seluruh perubahan status, verifikasi, penolakan, dan mutasi tercatat otomatis pada log audit sistem.'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...TEXT_DARK);
antiFraudItems.forEach(it => {
  const lines = doc.splitTextToSize(it, 168);
  doc.text(lines, 22, p7Y);
  p7Y += lines.length * 3.8 + 1.2;
});

p7Y += 2;
p7Y = drawSectionHeading(8, 'Indikator Kinerja Utama (Key Performance Indicators)', p7Y);

autoTable(doc, {
  startY: p7Y,
  margin: { left: 20, right: 20 },
  head: [['No', 'Indikator Kinerja (KPI)', 'Target Standar', 'Metode Evaluasi']],
  body: [
    ['1', 'Kepatuhan Batas Waktu SLA 7 Hari', '>= 90%', 'Persentase aksesoris terverifikasi <= 7 hari kalender.'],
    ['2', 'Lolos Verifikasi SPI Pengajuan Pertama', '>= 85%', 'Persentase evidence disetujui pada Attempt #1.'],
    ['3', 'Keaslian Evidence & Akurasi GPS', '100%', 'Bebas manipulasi galeri & hash SHA-256 valid.'],
    ['4', 'Kesesuaian Titik Lokasi Rencana vs Aktual', '>= 95%', 'Deviasi jarak lapangan <= 100 meter.'],
    ['5', 'Akurasi Sinkronisasi Fisik ke Peta GIS', '100%', 'Seluruh titik terverifikasi muncul di peta GIS.'],
    ['6', 'Selisih Stok Aksesoris Gudang & Cabang', '0 (Nol)', 'Rekonsiliasi berkala stok fisik vs sistem.'],
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
  bodyStyles: { fontSize: 7.5, textColor: TEXT_DARK, cellPadding: 2 },
  columnStyles: {
    0: { halign: 'center', cellWidth: 10 },
    1: { fontStyle: 'bold', cellWidth: 65, textColor: NAVY },
    2: { halign: 'center', fontStyle: 'bold', cellWidth: 28, textColor: GREEN },
    3: { cellWidth: 67 }
  }
});

p7Y = doc.lastAutoTable.finalY + 4;
p7Y = drawSectionHeading(9, 'Diagram Alur Proses Terpadu', p7Y);

// Draw Flowchart Boxes
const flowBoxes = [
  { label: '1. GUDANG PUSAT\nStock Out & Cetak QR', sub: 'Timer SLA 7 Hari Dimulai', color: NAVY },
  { label: '2. PENGIRIMAN LOGISTIK\nFisik Aksesoris + Surat Jalan', sub: 'Dalam perjalanan ke cabang', color: [71, 85, 105] },
  { label: '3. PENERIMAAN CABANG\nScan QR Code Surat Jalan', sub: 'Status: DITERIMA_CABANG', color: TEAL },
  { label: '4. ALOKASI & PASANG\nMulti-titik & Pemasangan Fisik', sub: 'Kunci GPS rencana titik', color: [13, 148, 136] },
  { label: '5. DOKUMENTASI EVIDENCE\nDual Photo (Before/After) + GPS', sub: 'Kamera web langsung (Anti-Fraud)', color: GOLD },
  { label: '6. AUDIT & VERIFIKASI SPI\nEvaluasi Foto, Deviasi & SLA', sub: 'Keputusan: Setuju / Tolak', color: [147, 51, 234] },
  { label: '7. HASIL AKHIR RESMI\nTERVERIFIKASI -> Masuk GIS\nDITOLAK -> Perbaikan Lapangan', sub: 'Selesai / Closed Transaksi', color: GREEN },
];

let boxY = p7Y + 1;
flowBoxes.forEach((b, idx) => {
  // Box
  doc.setFillColor(...b.color);
  doc.roundedRect(25, boxY, 160, 10.5, 1.2, 1.2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text(b.label.split('\n')[0], 30, boxY + 4.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(240, 249, 255);
  doc.text(b.label.split('\n')[1] || '', 30, boxY + 8.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(254, 240, 138);
  doc.text(b.sub, 180, boxY + 6.5, { align: 'right' });

  // Arrow down (if not last)
  if (idx < flowBoxes.length - 1) {
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.8);
    doc.line(105, boxY + 10.5, 105, boxY + 13.5);
    // arrow head
    doc.setFillColor(...TEAL);
    doc.triangle(103.5, boxY + 13.5, 106.5, boxY + 13.5, 105, boxY + 15, 'F');
  }

  boxY += 15;
});

// ==========================================
// PAGE 8: BAB 10, BAB 11, PENGESAHAN
// ==========================================
doc.addPage();
drawHeaderFooter(8);

let p8Y = 26;
p8Y = drawSectionHeading(10, 'Dokumen dan Regulasi Terkait', p8Y);

const dokTerkait = [
  '1. Buku Panduan Pengguna (User Manual) Aplikasi Terpadu SI GAPLEK.',
  '2. Standar Teknis Perpipaan dan Pemasangan Aksesoris Perumdam Tirta Ardhia Rinjani.',
  '3. Standar Operasional Prosedur (SOP) Pengelolaan Persediaan dan Pergudangan.',
  '4. Keputusan Direksi tentang Pedoman Pengawasan dan Pemeriksaan Satuan Pengawasan Intern (SPI).'
];
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...TEXT_DARK);
dokTerkait.forEach(it => {
  doc.text(it, 22, p8Y);
  p8Y += 5;
});

p8Y += 4;
p8Y = drawSectionHeading(11, 'Lembar Pengesahan Dokumen', p8Y);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...TEXT_DARK);
doc.text('Dokumen Standar Operasional Prosedur ini telah ditinjau dan disahkan oleh:', 22, p8Y);
p8Y += 5;

// Signature Table
autoTable(doc, {
  startY: p8Y,
  margin: { left: 20, right: 20 },
  head: [['Disusun Oleh', 'Diperiksa Oleh', 'Disetujui Oleh']],
  body: [
    [
      'Bagian Teknologi Informasi &\nBagian Distribusi\n\n\n\n\n\n___________________________\nTanggal: 28 September 2026',
      'Kepala Bagian Teknik &\nKepala Satuan Pengawasan Intern\n\n\n\n\n\n___________________________\nTanggal: 28 September 2026',
      'Direktur Teknik /\nDirektur Utama\n\n\n\n\n\n___________________________\nTanggal: 28 September 2026',
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
  bodyStyles: { fontSize: 8.5, textColor: TEXT_DARK, cellPadding: 6, halign: 'center', valign: 'middle' },
  columnStyles: {
    0: { cellWidth: 56.6 },
    1: { cellWidth: 56.6 },
    2: { cellWidth: 56.6 },
  }
});

p8Y = doc.lastAutoTable.finalY + 12;

const penutupLines = doc.splitTextToSize(
  'Catatan Penting:\n' +
  '1. Dokumen ini menjadi pedoman operasional wajib bagi seluruh personel Bagian Gudang Pusat, Unit Cabang Pelayanan, dan Satuan Pengawasan Intern (SPI) Perumdam Tirta Ardhia Rinjani Kabupaten Lombok Tengah.\n' +
  '2. Kepatuhan batas waktu SLA 7 Hari Kalender dan integritas bukti foto kamera web (Before & After) dievaluasi secara berkala dalam rapat koordinasi bulanan perusahaan.\n' +
  '3. Setiap modifikasi parameter atau pembaruan fitur aplikasi SI GAPLEK wajib dilaporkan kepada Bagian TI untuk pemutakhiran revisi dokumen SOP ini.',
  158
);
drawCallout(20, p8Y, 170, 48, 'Ketentuan Pelaksanaan dan Evaluasi Berkala', penutupLines, 'info');

// Save PDF
const outputPath = path.resolve('d:/ari/gudang-main/gudang-main/SOP_Pemasangan_Aksesoris_Berbasis_Aplikasi_Real-time.pdf');
fs.writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')));
console.log('PDF Generated Successfully! Path:', outputPath);
console.log('File size:', fs.statSync(outputPath).size, 'bytes');
