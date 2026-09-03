import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  FileUp,
  HelpCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ImportRow {
  code: string;
  name: string;
  barcode?: string;
  categoryName?: string;
  unitName?: string;
  minimumStock?: number;
  maximumStock?: number;
  currentStock?: number;
  unitPrice?: number;
  supplierName?: string;
  trackingType?: string;
  description?: string;
  _valid?: boolean;
  _error?: string;
}

interface ImportMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportMaterialDialog({ open, onClose, onSuccess }: ImportMaterialDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Download official Excel template (.xlsx)
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      const headers = [
        "Kode Barang*",
        "Nama Material*",
        "Barcode",
        "Kategori",
        "Satuan",
        "Stok Minimum",
        "Stok Maksimum",
        "Stok Awal",
        "Harga Satuan",
        "Supplier",
        "Tipe Tracking (TRACKED/NON_TRACKED)",
        "Deskripsi",
      ];

      const sampleRows = [
        [
          "PIP-HDPE-90",
          "Pipa HDPE D90 PN10 (Roll)",
          "89910010001",
          "Pipa",
          "Roll",
          10,
          100,
          25,
          1250000,
          "PT Maspion Pipa",
          "NON_TRACKED",
          "Pipa distribusi utama HDPE SNI",
        ],
        [
          "MTR-DN15-ITR",
          "Meter Air DN 15mm Kuningan",
          "89910010002",
          "Meter Air",
          "Buah",
          20,
          300,
          75,
          320000,
          "PT Itron Indonesia",
          "TRACKED",
          "Water meter pelanggan kelas B SNI",
        ],
        [
          "VLV-GATE-D63",
          "Gate Valve Cast Iron D63",
          "89910010003",
          "Valve",
          "Buah",
          5,
          50,
          12,
          650000,
          "UD Lombok Jaya",
          "TRACKED",
          "Valve isolasi pipa distribusi",
        ],
        [
          "AKS-CS-3X05",
          'Clamp Saddle 3" x 1/2"',
          "89910010004",
          "Aksesoris Pipa",
          "Buah",
          15,
          200,
          45,
          45000,
          "CV Tirta Supply",
          "NON_TRACKED",
          "Tapping saddle sambungan rumah",
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

      ws["!cols"] = [
        { wch: 18 },
        { wch: 32 },
        { wch: 16 },
        { wch: 16 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 22 },
        { wch: 24 },
        { wch: 35 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Template_Material");
      XLSX.writeFile(wb, "TEMPLATE_IMPORT_MATERIAL_PDAM.xlsx");

      toast({
        title: "Template Diunduh",
        description: "File TEMPLATE_IMPORT_MATERIAL_PDAM.xlsx berhasil diunduh.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Mengunduh Template",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // 2. Parse uploaded file (.xlsx / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];

        const rawJson: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rawJson || rawJson.length < 2) {
          throw new Error("File Excel kosong atau tidak memiliki baris data.");
        }

        // Header mapping
        const headerRow = rawJson[0].map((h) => String(h || "").toLowerCase().trim());

        const colIndex = {
          code: headerRow.findIndex((h) => h.includes("kode")),
          name: headerRow.findIndex((h) => h.includes("nama")),
          barcode: headerRow.findIndex((h) => h.includes("barcode")),
          category: headerRow.findIndex((h) => h.includes("kategori")),
          unit: headerRow.findIndex((h) => h.includes("satuan")),
          minStock: headerRow.findIndex((h) => h.includes("minimum")),
          maxStock: headerRow.findIndex((h) => h.includes("maksimum")),
          curStock: headerRow.findIndex((h) => h.includes("stok awal") || h.includes("current")),
          price: headerRow.findIndex((h) => h.includes("harga")),
          supplier: headerRow.findIndex((h) => h.includes("supplier")),
          tracking: headerRow.findIndex((h) => h.includes("tracking")),
          desc: headerRow.findIndex((h) => h.includes("deskripsi")),
        };

        const rows: ImportRow[] = [];

        for (let i = 1; i < rawJson.length; i++) {
          const r = rawJson[i];
          if (!r || r.length === 0 || (!r[colIndex.code] && !r[colIndex.name])) continue;

          const code = String(r[colIndex.code !== -1 ? colIndex.code : 0] || "").trim();
          const name = String(r[colIndex.name !== -1 ? colIndex.name : 1] || "").trim();

          const isValid = !!code && !!name;
          let error = "";
          if (!code) error = "Kode barang kosong";
          else if (!name) error = "Nama material kosong";

          rows.push({
            code,
            name,
            barcode: colIndex.barcode !== -1 && r[colIndex.barcode] ? String(r[colIndex.barcode]).trim() : code,
            categoryName: colIndex.category !== -1 ? String(r[colIndex.category] || "").trim() : "",
            unitName: colIndex.unit !== -1 ? String(r[colIndex.unit] || "Buah").trim() : "Buah",
            minimumStock: colIndex.minStock !== -1 ? parseInt(String(r[colIndex.minStock] || 0), 10) : 0,
            maximumStock: colIndex.maxStock !== -1 ? parseInt(String(r[colIndex.maxStock] || 100), 10) : 100,
            currentStock: colIndex.curStock !== -1 ? parseInt(String(r[colIndex.curStock] || 0), 10) : 0,
            unitPrice: colIndex.price !== -1 ? parseFloat(String(r[colIndex.price] || 0)) : 0,
            supplierName: colIndex.supplier !== -1 ? String(r[colIndex.supplier] || "").trim() : "",
            trackingType: colIndex.tracking !== -1 && String(r[colIndex.tracking]).toUpperCase().includes("TRACK") ? "TRACKED" : "NON_TRACKED",
            description: colIndex.desc !== -1 ? String(r[colIndex.desc] || "").trim() : "",
            _valid: isValid,
            _error: error,
          });
        }

        setParsedRows(rows);
        toast({
          title: "File Berhasil Dibaca",
          description: `${rows.length} baris material ditemukan di ${file.name}.`,
        });
      } catch (err: any) {
        toast({
          title: "Gagal Membaca File",
          description: err.message || "Pastikan format file sesuai dengan template.",
          variant: "destructive",
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // 3. Submit valid rows to backend
  const handleSaveImport = async () => {
    const validRows = parsedRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      toast({
        title: "Tidak ada baris valid",
        description: "Pastikan semua material memiliki Kode dan Nama yang valid.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<any>("/api/items/import", {
        method: "POST",
        body: JSON.stringify({ items: validRows }),
      });

      toast({
        title: "Import Material Berhasil",
        description: `${res.totalImported} material berhasil dimasukkan ke Master Material.`,
      });

      setParsedRows([]);
      setFileName("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan Import",
        description: err.message || "Terjadi kesalahan pada server saat import material.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r._valid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Import Master Material dari Excel</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unggah massal daftar material, pipa, dan aksesoris menggunakan format .xlsx atau .csv
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Template (.xlsx)
            </Button>
          </div>
        </DialogHeader>

        {/* Upload Dropzone */}
        <div className="p-5 space-y-4 bg-muted/10 border-b">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-card/60 hover:bg-card transition-colors flex flex-col items-center justify-center gap-2"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <FileUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {fileName ? fileName : "Klik untuk memilih file Excel (.xlsx / .csv)"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pastikan kolom mengikuti header standar template resmi PDAM
              </p>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validCount} Baris Siap Diimport
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    {invalidCount} Baris Tidak Lengkap
                  </span>
                )}
              </div>
              <span className="text-muted-foreground">Total: {parsedRows.length} baris terbaca</span>
            </div>
          )}
        </div>

        {/* Preview Table */}
        <div className="flex-1 overflow-y-auto p-0">
          {parsedRows.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-xs z-10">
                <TableRow className="text-xs">
                  <TableHead className="w-10 text-center">NO</TableHead>
                  <TableHead className="w-24">STATUS</TableHead>
                  <TableHead className="w-28">KODE</TableHead>
                  <TableHead className="min-w-[200px]">NAMA MATERIAL</TableHead>
                  <TableHead className="w-24">KATEGORI</TableHead>
                  <TableHead className="w-16 text-center">SATUAN</TableHead>
                  <TableHead className="w-20 text-right">STOK AWAL</TableHead>
                  <TableHead className="w-24 text-center">TRACKING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, idx) => (
                  <TableRow key={idx} className="text-xs hover:bg-muted/40">
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      {row._valid ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          {row._error || "Error"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{row.code || "-"}</TableCell>
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell>{row.categoryName || "-"}</TableCell>
                    <TableCell className="text-center">{row.unitName || "Buah"}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(row.currentStock || 0)}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted">
                        {row.trackingType}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground">
              Belum ada file yang diunggah. Silakan klik kotak unggah di atas atau unduh template terlebih dahulu.
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-card flex flex-row items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleSaveImport}
            disabled={parsedRows.length === 0 || validCount === 0 || isSubmitting}
            size="sm"
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
          >
            {isSubmitting ? "Mengimport..." : `Simpan ${validCount} Material`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
