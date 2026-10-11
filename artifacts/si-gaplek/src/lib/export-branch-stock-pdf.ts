import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./utils";

export interface BranchStockPdfRow {
  branchName: string;
  itemCode: string;
  itemName: string;
  categoryName: string | null;
  unitName: string | null;
  quantity: number;
  minimumStock: number;
  updatedAt?: string;
}

export interface BranchLedgerPdfRow {
  movementDate: string;
  movementType: string;
  direction: "in" | "out";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceNo?: string | null;
  userName?: string | null;
  notes?: string | null;
}

// ── Palette Warna Resmi Perumdam ──
const NAVY: [number, number, number] = [15, 62, 104];
const TEAL: [number, number, number] = [2, 132, 199];
const TEXT_DARK: [number, number, number] = [30, 41, 59];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];

/**
 * 1. Cetak Berita Acara Rekapitulasi Sisa Stok Material Cabang
 */
export function exportBeritaAcaraStokCabangPdf(params: {
  branchName: string;
  rows: BranchStockPdfRow[];
  printedBy?: string;
}) {
  const { branchName, rows, printedBy = "Petugas Logistik Cabang" } = params;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const year = now.getFullYear();
  const docNumber = `BA-STOK/${branchName.toUpperCase().replace(/\s+/g, "-")}/${year}/${String(now.getTime()).slice(-5)}`;

  // ── KOP SURAT RESMI ──
  doc.setFillColor(...NAVY);
  doc.rect(14, 12, 182, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("PERUMDAM TIRTA ARDHIA RINJANI", 14, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("KABUPATEN LOMBOK TENGAH - PROVINSI NUSA TENGGARA BARAT", 14, 26);
  doc.text("Sistem Informasi Pergudangan & Pelacakan Aksesoris (SI GAPLEK)", 14, 30);

  // Garis Pemisah Kop
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.2);
  doc.line(14, 33, 50, 33);

  // ── JUDUL BERITA ACARA ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text("BERITA ACARA REKAPITULASI SISA STOK MATERIAL CABANG", 105, 41, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`Nomor Registrasi: ${docNumber}`, 105, 46, { align: "center" });

  // ── METADATA KOTAK RINGKASAN ──
  const totalUnits = rows.reduce((acc, r) => acc + (r.quantity || 0), 0);
  const criticalItems = rows.filter((r) => r.quantity <= (r.minimumStock || 5)).length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 51, 182, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("UNIT KERJA / CABANG:", 18, 57);
  doc.text("TANGGAL PENGECEKAN:", 18, 64);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  doc.text(branchName, 60, 57);
  doc.text(`${dateStr} pukul ${timeStr} WITA`, 60, 64);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("TOTAL MATERIAL:", 125, 57);
  doc.text("TOTAL FISIK & KRITIS:", 125, 64);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_DARK);
  doc.text(`${rows.length} jenis aksesoris`, 165, 57);
  doc.text(`${totalUnits} unit (${criticalItems} menipis)`, 165, 64);

  // ── TABEL DATA STOK ──
  const tableBody = rows.map((r, idx) => {
    const isSafe = r.quantity > (r.minimumStock || 5);
    const isLow = r.quantity > 0 && r.quantity <= (r.minimumStock || 5);
    const statusLabel = isSafe ? "AMAN" : isLow ? "MENIPIS" : "HABIS";

    return [
      idx + 1,
      r.itemCode,
      r.itemName,
      r.categoryName || "-",
      r.quantity,
      r.unitName || "pcs",
      r.minimumStock || 5,
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY: 73,
    margin: { left: 14, right: 14 },
    head: [
      [
        "NO",
        "KODE",
        "NAMA MATERIAL AKSESORIS",
        "KATEGORI",
        "SISA FISIK",
        "SATUAN",
        "MIN STOK",
        "STATUS",
      ],
    ],
    body: tableBody,
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.8,
      textColor: TEXT_DARK,
      valign: "middle",
      lineColor: BORDER_COLOR,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 24, fontStyle: "bold" },
      2: { cellWidth: 55 },
      3: { cellWidth: 26 },
      4: { halign: "right", cellWidth: 20, fontStyle: "bold" },
      5: { halign: "center", cellWidth: 16 },
      6: { halign: "right", cellWidth: 16 },
      7: { halign: "center", cellWidth: 15, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text === "AMAN") {
          data.cell.styles.textColor = [22, 101, 52];
        } else if (text === "MENIPIS") {
          data.cell.styles.textColor = [194, 65, 12];
        } else {
          data.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
  });

  // ── BLOK PENGESAHAN & TANDA TANGAN ──
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let signY = finalY + 12;

  // Jika terlalu mepet ke footer (A4 tinggi 297mm), buat halaman baru
  if (signY > 230) {
    doc.addPage();
    signY = 25;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    `Demikian Berita Acara Rekapitulasi Sisa Stok ini dibuat dengan sebenar-benarnya berdasarkan pemeriksaan fisik di ${branchName}.`,
    14,
    signY
  );

  const signBoxY = signY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  // Kiri: Petugas Pembuat
  doc.text("Dihitung & Dibuat Oleh:", 25, signBoxY);
  doc.text("Petugas Logistik / Admin Cabang,", 25, signBoxY + 5);

  doc.setFont("helvetica", "bold");
  doc.text(`(  ${printedBy}  )`, 25, signBoxY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Petugas Pelaksana Cabang", 25, signBoxY + 32);

  // Kanan: Mengetahui Kepala Cabang
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Lombok Tengah, ${dateStr}`, 130, signBoxY);
  doc.text("Mengetahui & Menyetujui,", 130, signBoxY + 5);
  doc.text(`Kepala Cabang ${branchName},`, 130, signBoxY + 9);

  doc.setFont("helvetica", "bold");
  doc.text("( .................................................... )", 130, signBoxY + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("NIP. ............................................", 130, signBoxY + 32);

  // ── FOOTER RESMI DI SETIAP HALAMAN ──
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.4);
    doc.line(14, 285, 196, 285);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      "Dokumen resmi SI GAPLEK • Perumdam Tirta Ardhia Rinjani",
      14,
      290
    );
    doc.text(`Halaman ${i} dari ${pageCount}`, 196, 290, { align: "right" });
  }

  const filename = `BERITA_ACARA_STOK_${branchName.toUpperCase().replace(/\s+/g, "_")}_${now.toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}

/**
 * 2. Cetak Kartu Riwayat Mutasi (Ledger) per Satuan Material
 */
export function exportKartuStokMaterialPdf(params: {
  branchName: string;
  itemCode: string;
  itemName: string;
  categoryName?: string | null;
  unitName?: string | null;
  currentStock: number;
  minimumStock: number;
  movements: BranchLedgerPdfRow[];
  printedBy?: string;
}) {
  const {
    branchName,
    itemCode,
    itemName,
    categoryName = "Umum",
    unitName = "pcs",
    currentStock,
    minimumStock,
    movements,
    printedBy = "Petugas Logistik Cabang",
  } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // ── KOP SURAT ──
  doc.setFillColor(...NAVY);
  doc.rect(14, 12, 182, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("PERUMDAM TIRTA ARDHIA RINJANI", 14, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("KABUPATEN LOMBOK TENGAH - PROVINSI NUSA TENGGARA BARAT", 14, 26);
  doc.text("KARTU KENDALI SISA PERSEDIAAN & RIWAYAT MUTASI CABANG", 14, 30);

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1.2);
  doc.line(14, 33, 50, 33);

  // ── INFO ITEM BOX ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(14, 38, 182, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("NAMA AKSESORIS:", 18, 45);
  doc.text("KODE MATERIAL:", 18, 51);
  doc.text("CABANG PENYIMPAN:", 18, 57);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`${itemName} (${categoryName})`, 55, 45);
  doc.text(`${itemCode} [Satuan: ${unitName}]`, 55, 51);
  doc.text(branchName, 55, 57);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("SALDO SAAT INI:", 130, 45);
  doc.text("BATAS MINIMUM:", 130, 51);
  doc.text("STATUS AMAN:", 130, 57);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(currentStock <= minimumStock ? 185 : 22, currentStock <= minimumStock ? 28 : 101, currentStock <= minimumStock ? 28 : 52);
  doc.text(`${currentStock} ${unitName}`, 165, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`${minimumStock} ${unitName}`, 165, 51);
  doc.text(currentStock > minimumStock ? "Aman" : currentStock > 0 ? "Menipis" : "Habis", 165, 57);

  // ── TABEL MUTASI (LEDGER) ──
  const tableData = movements.map((m, idx) => {
    const isMasuk = m.direction === "in";
    const typeLabel =
      m.movementType === "RECEIPT"
        ? "Penerimaan Surat Jalan"
        : m.movementType === "INSTALLATION"
        ? "Pemasangan Fisik"
        : m.movementType === "RETURN"
        ? "Retur ke Gudang Pusat"
        : m.movementType === "REJECTION_ROLLBACK"
        ? "Rollback (Ditolak SPI)"
        : m.movementType;

    const tgl = m.movementDate ? formatDate(m.movementDate) : "-";

    return [
      idx + 1,
      tgl,
      typeLabel,
      m.referenceNo || "-",
      isMasuk ? `+${m.quantity}` : "-",
      !isMasuk ? `-${m.quantity}` : "-",
      `${m.balanceAfter} ${unitName}`,
      m.userName || "-",
    ];
  });

  autoTable(doc, {
    startY: 68,
    margin: { left: 14, right: 14 },
    head: [
      [
        "NO",
        "TANGGAL",
        "JENIS TRANSAKSI",
        "NO. REFERENSI / SPK",
        "MASUK",
        "KELUAR",
        "SALDO AKHIR",
        "PETUGAS",
      ],
    ],
    body: tableData.length > 0 ? tableData : [["-", "-", "Belum ada riwayat mutasi tercatat", "-", "-", "-", `${currentStock} ${unitName}`, "-"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: TEXT_DARK,
      valign: "middle",
      lineColor: BORDER_COLOR,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 26 },
      2: { cellWidth: 42, fontStyle: "bold" },
      3: { cellWidth: 32 },
      4: { halign: "right", cellWidth: 16, textColor: [22, 101, 52], fontStyle: "bold" },
      5: { halign: "right", cellWidth: 16, textColor: [185, 28, 28], fontStyle: "bold" },
      6: { halign: "right", cellWidth: 20, fontStyle: "bold" },
      7: { cellWidth: 20 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let signY = finalY + 12;
  if (signY > 240) {
    doc.addPage();
    signY = 25;
  }

  // Tanda Tangan
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(`Dicetak pada ${dateStr} ${timeStr} WITA oleh ${printedBy}`, 14, signY);

  const signBoxY = signY + 6;
  doc.text("Petugas Logistik Cabang,", 25, signBoxY);
  doc.text(`(  ${printedBy}  )`, 25, signBoxY + 22);

  doc.text("Pengawas / Verifikator Lapangan,", 130, signBoxY);
  doc.text("( .................................................... )", 130, signBoxY + 22);

  // Footer di setiap halaman
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.4);
    doc.line(14, 285, 196, 285);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Kartu Kendali Mutasi Stok • SI GAPLEK Perumdam", 14, 290);
    doc.text(`Halaman ${i} dari ${pageCount}`, 196, 290, { align: "right" });
  }

  const filename = `KARTU_STOK_${itemCode}_${branchName.toUpperCase().replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
