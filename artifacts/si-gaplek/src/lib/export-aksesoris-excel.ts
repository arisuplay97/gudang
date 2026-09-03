import * as XLSX from "xlsx";

export interface AksesorisReportItem {
  namaAksesoris: string;
  jumlah: number | string;
  satuan?: string;
}

export interface AksesorisReportGroup {
  id?: string | number;
  no: number;
  referenceNo?: string;
  tanggalAmbil: string;
  branchName?: string;
  lokasiTerpasang: string;
  titikKoordinat?: string;
  petugas: string[] | string;
  tanggalTerpasang: string;
  keterangan: string;
  items: AksesorisReportItem[];
}

export function exportLaporanPemasanganAksesorisExcel(
  data: AksesorisReportGroup[],
  filename = `LAPORAN_PEMASANGAN_AKSESORIS_${Date.now()}`
) {
  const wb = XLSX.utils.book_new();

  // Create worksheet rows
  const rows: any[][] = [];

  // Row 1: Empty
  rows.push([]);

  // Row 2: Title exactly matching the image: LAPORAN PEMASANGAN AKSESORIS
  rows.push(["LAPORAN PEMASANGAN AKSESORIS"]);

  // Row 3: Empty spacing
  rows.push([]);

  // Row 4: Column Headers exactly matching image
  rows.push([
    "NO",
    "TANGGAL AMBIL",
    "NAMA AKSESORIS",
    "JUMLAH",
    "LOKASI TERPASANG",
    "TITIK KOORDINAT",
    "PETUGAS",
    "TANGGAL TERPASANG",
    "KETERANGAN",
  ]);

  // Rows 5+: Grouped data exactly like the official document
  data.forEach((group) => {
    const petugasList = Array.isArray(group.petugas)
      ? group.petugas
      : typeof group.petugas === "string"
      ? group.petugas.split(",").map((s) => s.trim())
      : ["-"];

    const maxSubRows = Math.max(group.items.length, petugasList.length);

    for (let i = 0; i < maxSubRows; i++) {
      const item = group.items[i];
      const petugasName = petugasList[i] || "";

      const jumlahStr = item
        ? typeof item.jumlah === "number"
          ? `${item.jumlah} ${item.satuan || "Buah"}`
          : item.jumlah
        : "";

      if (i === 0) {
        rows.push([
          group.no,
          group.tanggalAmbil,
          item ? item.namaAksesoris : "",
          jumlahStr,
          group.lokasiTerpasang,
          group.titikKoordinat || "",
          petugasName,
          group.tanggalTerpasang,
          group.keterangan,
        ]);
      } else {
        rows.push([
          "",
          "",
          item ? item.namaAksesoris : "",
          jumlahStr,
          "",
          "",
          petugasName,
          "",
          "",
        ]);
      }
    }

    // Row separator between work orders
    rows.push(["", "", "", "", "", "", "", "", ""]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths for professional readability
  ws["!cols"] = [
    { wch: 6 },  // NO
    { wch: 16 }, // TANGGAL AMBIL
    { wch: 30 }, // NAMA AKSESORIS
    { wch: 14 }, // JUMLAH
    { wch: 26 }, // LOKASI TERPASANG
    { wch: 22 }, // TITIK KOORDINAT
    { wch: 22 }, // PETUGAS
    { wch: 18 }, // TANGGAL TERPASANG
    { wch: 44 }, // KETERANGAN
  ];

  // Merge Title Row across columns A to I (index 0 to 8)
  ws["!merges"] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Pemasangan Aksesoris");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
