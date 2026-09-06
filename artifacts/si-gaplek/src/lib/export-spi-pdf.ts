import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SpiAuditReportRow } from "./export-spi-excel";

export function exportLaporanAuditSpiPdf(
  data: SpiAuditReportRow[],
  filename = `LAPORAN_AUDIT_SPI_${Date.now()}`
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN AUDIT & VERIFIKASI LAPANGAN (SPI)", 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH", 14, 26);

  const tableData = data.map((row, index) => {
    let anomalyStatus = "ZONA VALID";
    if (row.isCrossDistrict) anomalyStatus = "LINTAS WILAYAH";
    else if (row.locationDeviationMeters && parseFloat(String(row.locationDeviationMeters)) > 50) {
      anomalyStatus = "DEVIASI TINGGI";
    }

    const tglAudit = row.verifiedAt
      ? new Date(row.verifiedAt).toLocaleDateString("id-ID")
      : "-";

    return [
      index + 1,
      row.referenceNo,
      row.branchName,
      row.detectedDistrict || "-",
      row.itemName,
      row.quantity,
      anomalyStatus,
      row.locationDeviationMeters ? parseFloat(String(row.locationDeviationMeters)).toFixed(2) : "-",
      row.verificationStatus || row.evidenceStatus || "PENDING",
      row.verificationNotes || "-",
      tglAudit,
      row.auditorName || "-",
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [
      [
        "NO",
        "NO. SPK",
        "CABANG ASAL",
        "KEC. FISIK",
        "NAMA AKSESORIS",
        "JUMLAH",
        "STATUS ANOMALI",
        "DEVIASI (M)",
        "KEPUTUSAN",
        "CATATAN",
        "TGL AUDIT",
        "AUDITOR",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [12, 74, 110], // sky-900
      textColor: 255,
      fontSize: 7,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 35 },
      5: { halign: "center", cellWidth: 15 },
      6: { cellWidth: 25 },
      7: { halign: "center", cellWidth: 15 },
      8: { halign: "center", cellWidth: 20 },
      9: { cellWidth: 40 },
      10: { halign: "center", cellWidth: 20 },
      11: { cellWidth: 25 },
    },
    styles: {
      overflow: "linebreak",
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
  });

  doc.save(`${filename}.pdf`);
}
