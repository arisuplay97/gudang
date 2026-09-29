import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Wrench,
  Layers,
} from "lucide-react";

interface TechnicianLeaderboard {
  name: string;
  count: number;
  totalUnits: number;
  branchName: string;
  verifiedCount: number;
}

interface EvidenceRecord {
  id: number;
  uuid: string;
  referenceNo: string | null;
  technicianNames: string | null;
  capturedByName: string | null;
  branchName: string | null;
  itemName: string | null;
  itemCode: string | null;
  quantity: number | null;
  status: string;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
}

interface TechnicianReportResponse {
  summary: {
    totalInstallations: number;
    totalUnitsInstalled: number;
    totalTechnicians: number;
  };
  leaderboard: TechnicianLeaderboard[];
  records: EvidenceRecord[];
}

export default function LaporanTeknisiPage() {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch branches for filter
  const { data: branchesData } = useQuery<{ id: number; name: string }[] | { data: { id: number; name: string }[] }>({
    queryKey: ["branches-list"],
    queryFn: () => apiFetch<{ id: number; name: string }[]>("/api/branches"),
  });
  const branches: { id: number; name: string }[] = Array.isArray(branchesData)
    ? branchesData
    : ((branchesData as any)?.data as { id: number; name: string }[]) || [];

  // Fetch technician report
  const queryParams = new URLSearchParams();
  if (branchFilter && branchFilter !== "all") queryParams.append("branchId", branchFilter);
  if (search) queryParams.append("search", search);
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  const { data, isLoading } = useQuery<TechnicianReportResponse>({
    queryKey: ["report-technicians", branchFilter, search, startDate, endDate],
    queryFn: () => apiFetch<TechnicianReportResponse>(`/api/reports/technicians?${queryParams.toString()}`),
  });

  const summary = data?.summary || { totalInstallations: 0, totalUnitsInstalled: 0, totalTechnicians: 0 };
  const leaderboard = data?.leaderboard || [];
  const records = data?.records || [];

  const handleExportCsv = () => {
    if (leaderboard.length === 0) return;
    const header = "No,Nama Petugas / Teknisi,Cabang,Titik Pemasangan,Total Material Terpasang (Pcs),Terverifikasi SPI\n";
    const rows = leaderboard
      .map((t, idx) => `"${idx + 1}","${t.name}","${t.branchName}","${t.count}","${t.totalUnits}","${t.verifiedCount}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `laporan-teknisi-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-[#5b7553]" />
            Laporan Produktivitas Teknisi
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Audit rekap pekerjaan pemasangan material di lapangan berdasarkan nama petugas pelaksana.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2 shrink-0">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5b7553]/10 flex items-center justify-center text-[#5b7553] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Teknisi Bertugas</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{summary.totalTechnicians}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Titik Pemasangan Selesai</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{summary.totalInstallations}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Aksesoris Terpasang</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{summary.totalUnitsInstalled} <span className="text-xs font-normal text-muted-foreground">unit</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama petugas / cabang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map((b: { id: number; name: string }) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Dari Tanggal"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9"
            />

            <Input
              type="date"
              placeholder="Sampai Tanggal"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="rekap" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="rekap" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Rekap Performa Teknisi
          </TabsTrigger>
          <TabsTrigger value="detail" className="text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Riwayat Pemasangan Rinci
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Rekap Performa Teknisi */}
        <TabsContent value="rekap">
          <Card className="border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                    <TableHead className="text-xs font-semibold">Nama Petugas / Teknisi</TableHead>
                    <TableHead className="text-xs font-semibold">Cabang</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Titik Pemasangan</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Total Material Terpasang</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Terverifikasi SPI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        Memuat data laporan teknisi...
                      </TableCell>
                    </TableRow>
                  ) : leaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        Belum ada data pemasangan oleh teknisi pada filter yang dipilih.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboard.map((tech, idx) => (
                      <TableRow key={idx} className="text-xs hover:bg-muted/20">
                        <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#5b7553]/15 text-[#5b7553] font-bold text-[10px] flex items-center justify-center">
                              {tech.name.charAt(0).toUpperCase()}
                            </div>
                            {tech.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {tech.branchName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{tech.count} titik</TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {tech.totalUnits} <span className="font-normal text-muted-foreground text-[10px]">pcs</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {tech.verifiedCount} terverifikasi
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Riwayat Pemasangan Rinci */}
        <TabsContent value="detail">
          <Card className="border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12 text-center text-xs font-semibold">No</TableHead>
                    <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                    <TableHead className="text-xs font-semibold">Surat Jalan / BPB</TableHead>
                    <TableHead className="text-xs font-semibold">Petugas yang Mengerjakan</TableHead>
                    <TableHead className="text-xs font-semibold">Material Terpasang</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Jumlah</TableHead>
                    <TableHead className="text-xs font-semibold">Cabang</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Status SPI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                        Memuat riwayat pemasangan...
                      </TableCell>
                    </TableRow>
                  ) : records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                        Tidak ada riwayat pemasangan yang ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((rec, idx) => (
                      <TableRow key={rec.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(rec.createdAt)}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-foreground">
                          {rec.referenceNo || "-"}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {rec.technicianNames || rec.capturedByName || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{rec.itemName || "-"}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{rec.itemCode || ""}</div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {rec.quantity || 1}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rec.branchName || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {rec.status === "TERVERIFIKASI" ? (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Terverifikasi</Badge>
                          ) : rec.status === "DITOLAK" ? (
                            <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
