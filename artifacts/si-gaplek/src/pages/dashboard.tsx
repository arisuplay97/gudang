import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Package,
  PackageMinus,
  Building2,
  Search,
  ArrowRight,
  TrendingUp,
  MapPin,
  BarChart3,
  Layers,
  Wrench,
  Users,
  RotateCcw,
} from "lucide-react";
import { useLocation } from "wouter";
import CabangDashboardPage from "./cabang/dashboard";

/* ── Types ── */
interface Summary {
  totalItems: number;
  totalStockOut: number;
  totalBranchStocks: number;
  todayStockOut: number;
  pendingTransactions: number;
  inventoryValue: number;
  trackedItems: number;
  nonTrackedItems: number;
}

interface RecentTx {
  id: number;
  referenceNo: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
}

interface TopBranch {
  branchId: number;
  branchName: string;
  totalQty: number;
  itemCount: number;
}

interface TopOutgoing {
  itemId: number;
  itemName: string;
  totalQty: number;
}

interface BranchStockRow {
  id: number;
  branchId: number;
  branchName: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  categoryName: string | null;
  unitName: string | null;
  quantity: number;
  updatedAt: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

/* ── Card Component ── */
function DashCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-white dark:bg-card border border-[#eae8e0] dark:border-border transition-colors duration-200 ${className}`}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "CABANG") {
    return <CabangDashboardPage />;
  }

  const [, navigate] = useLocation();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [searchStock, setSearchStock] = useState<string>("");

  // 1. Dashboard summary
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch<Summary>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });

  // 2. Branches list for filter
  const { data: branchesData, isLoading: loadingBranchesList } = useQuery<{ data: Branch[] } | Branch[]>({
    queryKey: ["branches-list"],
    queryFn: () => apiFetch<{ data: Branch[] } | Branch[]>("/api/branches"),
  });
  const branches: Branch[] = useMemo(() => {
    return Array.isArray(branchesData) ? branchesData : branchesData?.data || [];
  }, [branchesData]);

  // 3. Granular Branch Stocks
  const { data: branchStocksData, isLoading: loadingBranchStocks } = useQuery({
    queryKey: ["branch-stocks", selectedBranchId],
    queryFn: () => {
      const url = selectedBranchId && selectedBranchId !== "all"
        ? `/api/branch-stocks?branchId=${selectedBranchId}`
        : "/api/branch-stocks";
      return apiFetch<{ data: BranchStockRow[] }>(url);
    },
    refetchInterval: 30_000,
  });

  // 4. Top Branches
  const { data: topBranches, isLoading: loadingBranches } = useQuery({
    queryKey: ["dashboard-top-branches"],
    queryFn: () => apiFetch<TopBranch[]>("/api/dashboard/top-branches"),
  });

  // 5. Top Outgoing Accessories
  const { data: topOutgoing, isLoading: loadingOutgoing } = useQuery({
    queryKey: ["dashboard-top-outgoing"],
    queryFn: () => apiFetch<TopOutgoing[]>("/api/dashboard/top-outgoing"),
  });

  // 6. Recent Stock Out Transactions
  const { data: recentTx, isLoading: loadingTx } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: () => apiFetch<RecentTx[]>("/api/dashboard/recent-transactions"),
    refetchInterval: 30_000,
  });

  const safeTopBranches: TopBranch[] = useMemo(() => {
    if (Array.isArray(topBranches)) return topBranches;
    return (topBranches as any)?.data || [];
  }, [topBranches]);

  const safeTopOutgoing: TopOutgoing[] = useMemo(() => {
    if (Array.isArray(topOutgoing)) return topOutgoing;
    return (topOutgoing as any)?.data || [];
  }, [topOutgoing]);

  const safeRecentTx: RecentTx[] = useMemo(() => {
    if (Array.isArray(recentTx)) return recentTx;
    return (recentTx as any)?.data || [];
  }, [recentTx]);

  // Filtered branch stock table
  const allRows: BranchStockRow[] = useMemo(() => {
    if (Array.isArray(branchStocksData)) return branchStocksData;
    return branchStocksData?.data || [];
  }, [branchStocksData]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const matchBranch = selectedBranchId === "all" || row.branchId === Number(selectedBranchId);
      const matchSearch = !searchStock.trim() ||
        row.itemName.toLowerCase().includes(searchStock.toLowerCase()) ||
        row.itemCode.toLowerCase().includes(searchStock.toLowerCase()) ||
        row.branchName.toLowerCase().includes(searchStock.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [allRows, selectedBranchId, searchStock]);

  const totalFilteredQuantity = filteredRows.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-background transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm text-[#8a8a7a] dark:text-muted-foreground">
              Selamat datang kembali,
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#2d2d2a] dark:text-foreground">
              {user?.fullName ?? "Dashboard Kantor Pusat"}
            </h1>
            <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-0.5">
              Monitoring distribusi material, sisa stok cabang wilayah, dan produktivitas teknisi lapangan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/laporan/teknisi")}
              className="gap-2 text-xs bg-white dark:bg-card border-[#eae8e0]"
            >
              <Users className="w-3.5 h-3.5 text-[#5b7553]" />
              Laporan Teknisi
            </Button>
            <p className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#eae8e0] text-[#6b6b5e] dark:bg-muted dark:text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </motion.div>

        {/* ── Row 1: KPI Cards ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Sisa Stok Cabang (Solid Forest Green) */}
          <div className="rounded-2xl p-5 bg-[#5b7553] text-white shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium opacity-85">Total Sisa Stok Cabang</p>
              <Layers className="w-4 h-4 opacity-75" />
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-24 bg-white/20" />
            ) : (
              <>
                <p className="text-3xl font-bold">{formatNumber(summary?.totalBranchStocks ?? 0)}</p>
                <p className="text-xs opacity-80 mt-1">Unit aksesoris tersimpan di seluruh cabang</p>
              </>
            )}
          </div>

          {/* Card 2: Total Distribusi Keluar */}
          <DashCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Distribusi Keluar</p>
              <PackageMinus className="w-4 h-4 text-[#c27c5a] dark:text-red-400" />
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-3xl font-bold text-[#2d2d2a] dark:text-foreground">
                  {formatNumber(summary?.totalStockOut ?? 0)}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-[#8a8a7a] dark:text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#fff0e6] text-[#c27c5a] font-medium text-[11px]">
                    +{summary?.todayStockOut ?? 0} hari ini
                  </span>
                  <span>ke cabang</span>
                </div>
              </>
            )}
          </DashCard>

          {/* Card 3: Nilai Stok Cabang */}
          <DashCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Nilai Inventaris Cabang</p>
              <BarChart3 className="w-4 h-4 text-[#8b6b4a] dark:text-amber-500" />
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[#2d2d2a] dark:text-foreground">
                  {formatCurrency(summary?.inventoryValue ?? 0)}
                </p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Estimasi aset di gudang cabang</p>
              </>
            )}
          </DashCard>

          {/* Card 4: Cabang Wilayah */}
          <DashCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Cabang Wilayah</p>
              <Building2 className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
            </div>
            {loadingBranchesList ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-bold text-[#2d2d2a] dark:text-foreground">
                  {branches.length}
                </p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Kantor cabang aktif terintegrasi</p>
              </>
            )}
          </DashCard>
        </motion.div>

        {/* ── Row 2: Sisa Stok Aksesoris per Cabang (Main Feature Table) ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <DashCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#eae8e0] dark:border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#5b7553]" />
                  <h2 className="text-lg font-bold text-[#2d2d2a] dark:text-foreground">
                    Sisa Stok Aksesoris per Masing-Masing Cabang
                  </h2>
                </div>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-0.5">
                  Daftar real-time kuantitas material & aksesoris yang tersisa dan dapat digunakan di setiap cabang
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari aksesoris atau kode..."
                    value={searchStock}
                    onChange={(e) => setSearchStock(e.target.value)}
                    className="h-9 pl-8 text-xs bg-[#f7f6f3] dark:bg-muted/40 border-[#eae8e0]"
                  />
                </div>

                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-9 text-xs w-44 bg-[#f7f6f3] dark:bg-muted/40 border-[#eae8e0]">
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/transaksi/retur")}
                  className="h-9 text-xs gap-1.5 border-[#eae8e0]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#8b6b4a]" /> Retur Barang
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[#eae8e0] dark:border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f7f6f3] dark:bg-muted/40 hover:bg-[#f7f6f3]">
                    <TableHead className="text-xs font-semibold uppercase text-[#6b6b5e] pl-4">Cabang</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-[#6b6b5e]">Kode Material</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-[#6b6b5e]">Nama Aksesoris</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-[#6b6b5e]">Kategori</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase text-[#6b6b5e]">Sisa Stok Cabang</TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-[#6b6b5e]">Satuan</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase text-[#6b6b5e] pr-4">Terakhir Diperbarui</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBranchStocks ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="p-3">
                          <Skeleton className="h-9 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-[#8a8a7a]">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">Belum ada stok aksesoris tercatat di cabang</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {searchStock || selectedBranchId !== "all"
                            ? "Tidak ada item yang cocok dengan filter."
                            : "Material akan otomatis tercatat saat cabang menerima surat jalan atau menyimpan sisa pemasangan."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={`${row.branchId}-${row.itemId}`} className="hover:bg-muted/30">
                        <TableCell className="pl-4 font-medium text-xs text-[#2d2d2a] dark:text-foreground">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#e8f5e3] dark:bg-green-950/40 text-[#5b7553] dark:text-green-400 font-semibold">
                            <Building2 className="w-3 h-3" />
                            {row.branchName}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary font-medium">
                          {row.itemCode}
                        </TableCell>
                        <TableCell className="font-medium text-sm text-[#2d2d2a] dark:text-foreground">
                          {row.itemName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.categoryName || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm">
                          <span className={row.quantity <= 3 ? "text-amber-600 dark:text-amber-400" : "text-[#5b7553] dark:text-green-400"}>
                            {formatNumber(row.quantity)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.unitName || "pcs"}
                        </TableCell>
                        <TableCell className="text-right pr-4 text-xs text-muted-foreground">
                          {row.updatedAt ? formatDate(row.updatedAt) : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Table Footer info */}
            <div className="flex items-center justify-between text-xs text-[#8a8a7a] dark:text-muted-foreground mt-3 pt-2">
              <p>Menampilkan {filteredRows.length} jenis aksesoris</p>
              <p className="font-semibold text-[#2d2d2a] dark:text-foreground">
                Total Sisa Aksesoris: <span className="font-mono text-[#5b7553]">{formatNumber(totalFilteredQuantity)}</span> unit
              </p>
            </div>
          </DashCard>
        </motion.div>

        {/* ── Row 3: Distribusi Terbanyak + Top Material Keluar + Transaksi Terakhir ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Cabang Distribusi Terbanyak */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Volume Distribusi Cabang</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Cabang penerima material terbanyak</p>
              </div>
              <MapPin className="w-4 h-4 text-[#5b7553]" />
            </div>

            {loadingBranches || !safeTopBranches ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
            ) : safeTopBranches.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-[#8a8a7a]">
                <Package className="w-7 h-7 mb-1.5 opacity-30" />
                <p className="text-xs">Belum ada data distribusi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeTopBranches.slice(0, 5).map((b, idx) => {
                  const maxQty = Math.max(...safeTopBranches.map(t => t.totalQty), 1);
                  const pct = Math.max(10, Math.round((b.totalQty / maxQty) * 100));
                  return (
                    <div key={b.branchId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#2d2d2a] dark:text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-[#eae8e0] text-[10px] font-bold flex items-center justify-center text-[#6b6b5e]">
                            {idx + 1}
                          </span>
                          {b.branchName}
                        </span>
                        <span className="font-bold font-mono text-[#5b7553]">
                          {formatNumber(b.totalQty)} <span className="text-[10px] font-normal text-muted-foreground">unit</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#5b7553] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Column 2: Top Aksesoris Keluar */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Top Aksesoris Keluar</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Aksesoris paling sering didistribusikan</p>
              </div>
              <PackageMinus className="w-4 h-4 text-[#c27c5a]" />
            </div>

            {loadingOutgoing || !safeTopOutgoing ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
            ) : safeTopOutgoing.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-[#8a8a7a]">
                <PackageMinus className="w-7 h-7 mb-1.5 opacity-30" />
                <p className="text-xs">Belum ada distribusi aksesoris</p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeTopOutgoing.slice(0, 5).map((item, idx) => {
                  const maxQty = safeTopOutgoing[0]?.totalQty || 1;
                  const pct = Math.max(10, Math.round((item.totalQty / maxQty) * 100));
                  return (
                    <div key={item.itemId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <p className="font-medium text-[#2d2d2a] dark:text-foreground truncate max-w-[70%]">
                          <span className="text-[#8a8a7a] mr-1">{idx + 1}.</span> {item.itemName}
                        </p>
                        <span className="font-bold font-mono text-[#c27c5a]">
                          {formatNumber(item.totalQty)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#c27c5a] transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Column 3: Riwayat Distribusi Terakhir */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Riwayat Distribusi Keluar</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Pengiriman surat jalan logistik terbaru</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/transaksi/keluar")}
                className="h-7 text-xs text-[#5b7553] p-0 hover:bg-transparent"
              >
                Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {loadingTx ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
            ) : safeRecentTx.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-[#8a8a7a]">
                <BarChart3 className="w-7 h-7 mb-1.5 opacity-30" />
                <p className="text-xs">Belum ada surat jalan keluar</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {safeRecentTx.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-[#f7f6f3] dark:bg-muted/40 border border-[#eae8e0]/60">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-mono font-bold text-primary truncate">{t.referenceNo}</p>
                      <p className="text-[11px] text-[#8a8a7a] dark:text-muted-foreground">
                        {t.createdAt ? formatDate(t.createdAt) : "-"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-[#a3b899]/50 text-[#5b7553] bg-white shrink-0">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </DashCard>
        </motion.div>

      </div>
    </div>
  );
}
