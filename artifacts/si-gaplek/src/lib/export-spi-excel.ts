import * as XLSX from "xlsx";

export interface SpiAuditReportRow {
  evidenceId: number;
  referenceNo: string;
  branchName: string;
  detectedDistrict: string;
  targetDistrict: string;
  isCrossDistrict: boolean;
  locationDeviationMeters: string | number;
  evidenceStatus: string;
  verificationStatus?: string;
  verificationNotes?: string;
  verifiedAt?: string;
  auditorName?: string;
  itemName: string;
  quantity: string | number;
  createdAt: string;
}

export function exportLaporanAuditSpiExcel(
  data: SpiAuditReportRow[],
  filename = `LAPORAN_AUDIT_SPI_${Date.now()}`
) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [];

  rows.push([]);
  rows.push(["LAPORAN AUDIT & VERIFIKASI LAPANGAN (SPI)"]);
  rows.push([]);

  rows.push([
    "NO",
    "NO. SPK",
    "CABANG ASAL",
    "KECAMATAN FISIK (GPS)",
    "NAMA AKSESORIS",
    "JUMLAH",
    "STATUS ANOMALI",
    "DEVIASI (METER)",
    "KEPUTUSAN SPI",
    "CATATAN AUDITOR",
    "TANGGAL AUDIT",
    "AUDITOR",
  ]);

  data.forEach((row, index) => {
    let anomalyStatus = "ZONA VALID";
    if (row.isCrossDistrict) anomalyStatus = "LINTAS WILAYAH";
    else if (row.locationDeviationMeters && parseFloat(String(row.locationDeviationMeters)) > 50) {
      anomalyStatus = "DEVIASI TINGGI";
    }

    const tglAudit = row.verifiedAt
      ? new Date(row.verifiedAt).toLocaleDateString("id-ID")
      : "-";

    rows.push([
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
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 5 }, // NO
    { wch: 20 }, // SPK
    { wch: 18 }, // CABANG
    { wch: 25 }, // KECAMATAN
    { wch: 30 }, // NAMA AKSESORIS
    { wch: 10 }, // JUMLAH
    { wch: 18 }, // ANOMALI
    { wch: 15 }, // DEVIASI
    { wch: 15 }, // KEPUTUSAN
    { wch: 35 }, // CATATAN
    { wch: 15 }, // TGL AUDIT
    { wch: 20 }, // AUDITOR
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Laporan_SPI");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
