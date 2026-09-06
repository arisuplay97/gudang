import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Search,
  RotateCcw,
  ClipboardList,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportLaporanAuditSpiExcel, SpiAuditReportRow } from "@/lib/export-spi-excel";
import { exportLaporanAuditSpiPdf } from "@/lib/export-spi-pdf";

const MONTHS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const YEARS = [
  { value: "all", label: "Semua Tahun" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

const ANOMALY_STATUSES = [
  { value: "all", label: "Semua Anomali" },
  { value: "ZONA_VALID", label: "Zona Valid (Aman)" },
  { value: "LINTAS_WILAYAH", label: "Lintas Wilayah" },
  { value: "DEVIASI_TINGGI", label: "Deviasi Tinggi (>50m)" },
  { value: "ANOMALI", label: "Hanya Yang Anomali" },
];

const AUDIT_STATUSES = [
  { value: "all", label: "Semua Status Audit" },
  { value: "TERVERIFIKASI", label: "Disetujui (Terverifikasi)" },
  { value: "DITOLAK", label: "Ditolak SPI" },
  { value: "PENDING", label: "Belum Diaudit (Pending)" },
];

export default function LaporanAuditSpiPage() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");

  // Fetch branches
  const { data: branchesResponse } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Array<{ id: number; name: string }> }>("/api/branches"),
  });

  const branchList = useMemo(() => {
    if (Array.isArray(branchesResponse)) return branchesResponse;
    if (branchesResponse && typeof branchesResponse === "object" && Array.isArray((branchesResponse as any).data)) {
      return (branchesResponse as any).data;
    }
    return [];
  }, [branchesResponse]);

  // Fetch audit report data
  const { data: reportResponse, isLoading } = useQuery({
    queryKey: ["reports/audit", branchFilter, monthFilter, yearFilter, searchTerm, anomalyFilter, auditStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchFilter !== "all") params.set("branchId", branchFilter);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (anomalyFilter !== "all") params.set("anomalyStatus", anomalyFilter);
      if (auditStatusFilter !== "all") params.set("auditStatus", auditStatusFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      return apiFetch<{ data: SpiAuditReportRow[] }>(`/api/spi/reports/audit?${params.toString()}`);
    },
  });

  const reportData: SpiAuditReportRow[] = useMemo(() => {
    return reportResponse?.data || [];
  }, [reportResponse]);

  const hasActiveFilters =
    searchTerm !== "" ||
    branchFilter !== "all" ||
    monthFilter !== "all" ||
    yearFilter !== "all" ||
    anomalyFilter !== "all" ||
    auditStatusFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setBranchFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setAnomalyFilter("all");
    setAuditStatusFilter("all");
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data audit yang dapat diexport.",
        variant: "destructive",
      });
      return;
    }
    try {
      exportLaporanAuditSpiExcel(reportData);
      toast({
        title: "Export Excel Berhasil",
        description: "File berhasil diunduh.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Export",
        description: err.message || "Terjadi kesalahan saat mengekspor ke Excel.",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = () => {
    if (!reportData || reportData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data audit yang dapat diexport.",
        variant: "destructive",
      });
      return;
    }
    try {
      exportLaporanAuditSpiPdf(reportData);
      toast({
        title: "Export PDF Berhasil",
        description: "File PDF berhasil diunduh.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Export",
        description: err.message || "Terjadi kesalahan saat mengekspor ke PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Laporan Audit & Verifikasi SPI
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Riwayat lengkap pemeriksaan anomali lokasi dan hasil audit pemasangan aksesoris.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportPdf}
            disabled={isLoading || reportData.length === 0}
            variant="outline"
            className="gap-2 shadow-sm text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={isLoading || reportData.length === 0}
            className="gap-2 shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" />
            <Input
              placeholder="Cari SPK atau Nama Aksesoris..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background h-8 text-xs font-normal"
            />
          </div>

          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branchList.map((b: any) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Status Anomali" />
            </SelectTrigger>
            <SelectContent>
              {ANOMALY_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Select value={auditStatusFilter} onValueChange={setAuditStatusFilter}>
              <SelectTrigger className="bg-background h-8 text-xs flex-1">
                <SelectValue placeholder="Status Audit" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_STATUSES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={resetFilters}
                title="Reset Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table Sheet Preview ── */}
      <Card className="border border-border shadow-sm overflow-hidden bg-card">
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-perumdam.png" alt="Logo Perumdam" className="h-10 w-auto object-contain shrink-0" />
            <div>
              <h2 className="text-lg font-bold tracking-wide text-zinc-900 dark:text-zinc-100 font-sans uppercase leading-tight">
                LAPORAN AUDIT & VERIFIKASI LAPANGAN (SPI)
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-background">
              {reportData.length} Hasil Audit
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-900 border-b border-border text-foreground">
                <TableHead className="w-12 text-center font-semibold text-[11px] uppercase border-r border-border/50">NO</TableHead>
                <TableHead className="w-32 font-semibold text-[11px] uppercase border-r border-border/50">NO. SPK</TableHead>
                <TableHead className="w-32 font-semibold text-[11px] uppercase border-r border-border/50">CABANG ASAL</TableHead>
                <TableHead className="w-32 font-semibold text-[11px] uppercase border-r border-border/50">KEC. FISIK (GPS)</TableHead>
                <TableHead className="min-w-[180px] font-semibold text-[11px] uppercase border-r border-border/50">NAMA AKSESORIS</TableHead>
                <TableHead className="w-16 text-center font-semibold text-[11px] uppercase border-r border-border/50">JML</TableHead>
                <TableHead className="w-32 text-center font-semibold text-[11px] uppercase border-r border-border/50">STATUS ANOMALI</TableHead>
                <TableHead className="w-24 text-center font-semibold text-[11px] uppercase border-r border-border/50">DEVIASI</TableHead>
                <TableHead className="w-28 text-center font-semibold text-[11px] uppercase border-r border-border/50">KEPUTUSAN</TableHead>
                <TableHead className="min-w-[180px] font-semibold text-[11px] uppercase border-r border-border/50">CATATAN</TableHead>
                <TableHead className="w-28 text-center font-semibold text-[11px] uppercase border-r border-border/50">TGL AUDIT</TableHead>
                <TableHead className="w-28 font-semibold text-[11px] uppercase">AUDITOR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center text-xs text-muted-foreground">
                    Tidak ada data audit yang ditemukan untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row, idx) => {
                  let anomalyStatus = "ZONA VALID";
                  let anomalyColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
                  if (row.isCrossDistrict) {
                    anomalyStatus = "LINTAS WILAYAH";
                    anomalyColor = "text-red-600 bg-red-50 dark:bg-red-950/30";
                  } else if (row.locationDeviationMeters && parseFloat(String(row.locationDeviationMeters)) > 50) {
                    anomalyStatus = "DEVIASI TINGGI";
                    anomalyColor = "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
                  }

                  let kepStatus = row.verificationStatus || row.evidenceStatus || "PENDING";
                  let kepColor = "bg-slate-100 text-slate-600";
                  if (kepStatus === "TERVERIFIKASI") kepColor = "bg-emerald-100 text-emerald-700 font-medium";
                  if (kepStatus === "DITOLAK") kepColor = "bg-red-100 text-red-700 font-medium";

                  const tglAudit = row.verifiedAt ? new Date(row.verifiedAt).toLocaleDateString("id-ID") : "-";

                  return (
                    <TableRow key={row.evidenceId} className="text-[11px] hover:bg-muted/30 transition-colors border-b border-border/40">
                      <TableCell className="text-center font-mono border-r border-border/40 py-2.5">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-muted-foreground border-r border-border/40 py-2.5">{row.referenceNo}</TableCell>
                      <TableCell className="font-medium border-r border-border/40 py-2.5">{row.branchName}</TableCell>
                      <TableCell className="border-r border-border/40 py-2.5">{row.detectedDistrict || "-"}</TableCell>
                      <TableCell className="font-medium border-r border-border/40 py-2.5">{row.itemName}</TableCell>
                      <TableCell className="text-center font-mono border-r border-border/40 py-2.5">{row.quantity}</TableCell>
                      
                      <TableCell className="text-center border-r border-border/40 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${anomalyColor}`}>
                          {anomalyStatus}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono border-r border-border/40 py-2.5">
                        {row.locationDeviationMeters ? `${parseFloat(String(row.locationDeviationMeters)).toFixed(1)}m` : "-"}
                      </TableCell>

                      <TableCell className="text-center border-r border-border/40 py-2.5">
                         <span className={`px-2 py-0.5 rounded-sm text-[10px] whitespace-nowrap ${kepColor}`}>
                          {kepStatus}
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground border-r border-border/40 py-2.5 truncate max-w-[180px]" title={row.verificationNotes || ""}>
                        {row.verificationNotes || "-"}
                      </TableCell>
                      
                      <TableCell className="text-center font-mono border-r border-border/40 py-2.5">{tglAudit}</TableCell>
                      <TableCell className="text-muted-foreground py-2.5 truncate max-w-[120px]">{row.auditorName || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
