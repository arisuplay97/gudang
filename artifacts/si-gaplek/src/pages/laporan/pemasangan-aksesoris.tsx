import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Search,
  RotateCcw,
  Building2,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  exportLaporanPemasanganAksesorisExcel,
  AksesorisReportGroup,
} from "@/lib/export-aksesoris-excel";

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

export default function LaporanPemasanganAksesorisPage() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

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

  // Fetch report data
  const { data: reportResponse, isLoading } = useQuery({
    queryKey: ["reports/pemasangan-aksesoris", branchFilter, monthFilter, yearFilter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchFilter !== "all") params.set("branchId", branchFilter);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      return apiFetch<{ data: AksesorisReportGroup[] }>(`/api/reports/pemasangan-aksesoris?${params.toString()}`);
    },
  });

  const reportData: AksesorisReportGroup[] = useMemo(() => {
    if (Array.isArray(reportResponse?.data)) return reportResponse.data;
    if (Array.isArray(reportResponse)) return reportResponse as any;
    return [];
  }, [reportResponse]);

  const hasActiveFilters =
    searchTerm !== "" ||
    branchFilter !== "all" ||
    monthFilter !== "all" ||
    yearFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setBranchFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data pemasangan yang dapat diexport.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportLaporanPemasanganAksesorisExcel(reportData, `LAPORAN_PEMASANGAN_AKSESORIS_${Date.now()}`);
      toast({
        title: "Export Excel Berhasil",
        description: "File LAPORAN_PEMASANGAN_AKSESORIS.xlsx berhasil diunduh.",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Export",
        description: err.message || "Terjadi kesalahan saat mengekspor ke Excel.",
        variant: "destructive",
      });
    }
  };

  const totalItemsCount = useMemo(() => {
    return reportData.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);
  }, [reportData]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Laporan Pemasangan Aksesoris
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Rekapitulasi resmi pemakaian & pemasangan aksesoris, pipa, dan valve fisik PDAM Lombok Tengah.
          </p>
        </div>

        <Button
          onClick={handleExportExcel}
          disabled={isLoading || reportData.length === 0}
          className="gap-2 shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel (.xlsx)
        </Button>
      </motion.div>

      {/* ── Filters (Bulan, Tahun, Cabang, Pencarian) ── */}
      <div className="bg-card p-3 rounded-xl border border-border/80 shadow-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-center">
          {/* 1. Pencarian */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari aksesoris, lokasi, petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background h-8 text-xs font-normal"
            />
          </div>

          {/* 2. Filter Cabang */}
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

          {/* 3. Filter Bulan */}
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

          {/* 4. Filter Tahun + Reset */}
          <div className="flex items-center gap-1.5">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="bg-background h-8 text-xs flex-1">
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

      {/* ── Table Sheet Preview (Exactly Matching User's Image Format) ── */}
      <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
        {/* Document Header Title inside the sheet preview */}
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-perumdam.png" alt="Logo Perumdam" className="h-12 w-auto object-contain shrink-0" />
            <div>
              <h2 className="text-xl font-bold tracking-wide text-zinc-900 dark:text-zinc-100 font-sans uppercase leading-tight">
                LAPORAN PEMASANGAN AKSESORIS
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                PERUMDAM TIRTA ARDHIA RINJANI KABUPATEN LOMBOK TENGAH
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {reportData.length} Pekerjaan / SPK
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {totalItemsCount} Aksesoris Terpasang
            </Badge>
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-sky-100/70 dark:bg-sky-950/50 hover:bg-sky-100/70 border-b border-border text-foreground">
                <TableHead className="w-12 text-center font-bold text-xs uppercase text-foreground border-r border-border/60">
                  NO
                </TableHead>
                <TableHead className="w-32 text-center font-bold text-xs uppercase text-foreground border-r border-border/60">
                  TANGGAL AMBIL
                </TableHead>
                <TableHead className="min-w-[200px] font-bold text-xs uppercase text-foreground border-r border-border/60">
                  NAMA AKSESORIS
                </TableHead>
                <TableHead className="w-28 text-center font-bold text-xs uppercase text-foreground border-r border-border/60">
                  JUMLAH
                </TableHead>
                <TableHead className="min-w-[160px] font-bold text-xs uppercase text-foreground border-r border-border/60">
                  LOKASI TERPASANG
                </TableHead>
                <TableHead className="w-36 text-center font-bold text-xs uppercase text-foreground border-r border-border/60">
                  TITIK KOORDINAT
                </TableHead>
                <TableHead className="min-w-[150px] font-bold text-xs uppercase text-foreground border-r border-border/60">
                  PETUGAS
                </TableHead>
                <TableHead className="w-32 text-center font-bold text-xs uppercase text-foreground border-r border-border/60">
                  TANGGAL TERPASANG
                </TableHead>
                <TableHead className="min-w-[220px] font-bold text-xs uppercase text-foreground">
                  KETERANGAN
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                    Tidak ada data pemasangan aksesoris untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((group) => {
                  const petugasList = Array.isArray(group.petugas)
                    ? group.petugas
                    : typeof group.petugas === "string"
                    ? group.petugas.split(",").map((s) => s.trim())
                    : ["-"];

                  const maxSubRows = Math.max(group.items?.length || 1, petugasList.length);

                  return Array.from({ length: maxSubRows }).map((_, subIndex) => {
                    const item = group.items?.[subIndex];
                    const petugasName = petugasList[subIndex] || "";
                    const isFirst = subIndex === 0;
                    const isLast = subIndex === maxSubRows - 1;

                    const jumlahStr = item
                      ? typeof item.jumlah === "number"
                        ? `${item.jumlah} ${item.satuan || "buah"}`
                        : item.jumlah
                      : "";

                    return (
                      <TableRow
                        key={`${group.id || group.no}-${subIndex}`}
                        className={`text-xs hover:bg-muted/30 transition-colors ${
                          isLast ? "border-b-2 border-border/80" : "border-b border-border/30"
                        }`}
                      >
                        {/* NO (only on first row) */}
                        <TableCell className="text-center font-mono border-r border-border/60 py-2">
                          {isFirst ? group.no : ""}
                        </TableCell>

                        {/* TANGGAL AMBIL (only on first row) */}
                        <TableCell className="text-center font-mono border-r border-border/60 py-2">
                          {isFirst ? group.tanggalAmbil : ""}
                        </TableCell>

                        {/* NAMA AKSESORIS */}
                        <TableCell className="border-r border-border/60 font-medium py-2">
                          {item ? item.namaAksesoris : ""}
                        </TableCell>

                        {/* JUMLAH */}
                        <TableCell className="border-r border-border/60 font-mono text-center py-2">
                          {jumlahStr}
                        </TableCell>

                        {/* LOKASI TERPASANG (only on first row) */}
                        <TableCell className="border-r border-border/60 py-2">
                          {isFirst ? (
                            <div>
                              <span className="font-semibold text-foreground">{group.lokasiTerpasang}</span>
                              {group.branchName && (
                                <span className="block text-[10px] text-muted-foreground font-mono">
                                  {group.branchName}
                                </span>
                              )}
                            </div>
                          ) : (
                            ""
                          )}
                        </TableCell>

                        {/* TITIK KOORDINAT */}
                        <TableCell className="border-r border-border/60 font-mono text-center text-[11px] py-2 text-muted-foreground">
                          {isFirst ? group.titikKoordinat || "-" : ""}
                        </TableCell>

                        {/* PETUGAS */}
                        <TableCell className="border-r border-border/60 py-2 font-medium">
                          {petugasName}
                        </TableCell>

                        {/* TANGGAL TERPASANG */}
                        <TableCell className="text-center font-mono border-r border-border/60 py-2">
                          {isFirst ? group.tanggalTerpasang : ""}
                        </TableCell>

                        {/* KETERANGAN */}
                        <TableCell className="py-2 text-muted-foreground font-medium">
                          {isFirst ? group.keterangan : ""}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
