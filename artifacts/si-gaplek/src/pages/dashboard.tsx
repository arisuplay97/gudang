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
  Users,
  RotateCcw,
  Trophy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Medal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
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
  pendingBranchAcceptance?: number;
  installedThisMonth?: number;
  needsAttentionCount?: number;
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

interface StockMovementData {
  days: number;
  chartData: {
    date: string;
    label: string;
    dayName: string;
    stockOut: number;
    quantity: number;
  }[];
  summary: {
    totalTransactions: number;
    totalQuantity: number;
    avgPerDay: number;
    peakDate: string;
    peakQuantity: number;
  };
}

interface BranchRanking {
  rank: number;
  branchId: number;
  branchName: string;
  branchCode: string;
  totalAssigned: number;
  totalInstalled: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
  avgDurationHours: number | null;
  avgDurationText: string;
  score: number;
}

/* ── Premium Card Container ── */
function DashCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 bg-card text-card-foreground border border-border/80 shadow-xs dark:shadow-none transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Minimalist Custom Tooltip for Chart ── */
function ChartCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl p-3 bg-card/95 backdrop-blur-md border border-border shadow-xl text-card-foreground text-xs space-y-1.5 min-w-[150px]">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <span className="font-semibold text-foreground">{data.dayName}, {data.label}</span>
        <span className="text-[10px] text-muted-foreground">{data.date}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Volume Keluar:
        </span>
        <span className="font-mono font-bold text-foreground">
          {formatNumber(data.quantity)} unit
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>Surat Jalan:</span>
        <span className="font-mono font-medium text-foreground">{data.stockOut} transaksi</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "CABANG") {
    return <CabangDashboardPage />;
  }

  const [, navigate] = useLocation();
  const [chartDays, setChartDays] = useState<7 | 30>(7);

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

  // 3. Stock Movement Chart Query (7 or 30 days)
  const { data: movementData, isLoading: loadingMovement } = useQuery<StockMovementData>({
    queryKey: ["dashboard-stock-movement", chartDays],
    queryFn: () => apiFetch<StockMovementData>(`/api/dashboard/stock-movement?days=${chartDays}`),
    refetchInterval: 30_000,
  });

  // 4. Branch Installation On-Time Ranking
  const { data: branchRankingsData, isLoading: loadingRankings } = useQuery<BranchRanking[]>({
    queryKey: ["dashboard-branch-rankings"],
    queryFn: () => apiFetch<BranchRanking[]>("/api/dashboard/branch-installation-ranking"),
    refetchInterval: 30_000,
  });

  const branchRankings: BranchRanking[] = useMemo(() => {
    if (Array.isArray(branchRankingsData)) return branchRankingsData;
    return (branchRankingsData as any)?.data || [];
  }, [branchRankingsData]);

  // 5. Branch Stocks for executive summary
  const { data: branchStocksData, isLoading: loadingBranchStocks } = useQuery({
    queryKey: ["branch-stocks", "preview-summary"],
    queryFn: () => apiFetch<{ data: BranchStockRow[] }>("/api/branch-stocks"),
    refetchInterval: 30_000,
  });

  // 6. Top Branches
  const { data: topBranches, isLoading: loadingBranches } = useQuery<TopBranch[]>({
    queryKey: ["dashboard-top-branches"],
    queryFn: () => apiFetch<TopBranch[]>("/api/dashboard/top-branches"),
  });

  // 7. Top Outgoing Accessories
  const { data: topOutgoing, isLoading: loadingOutgoing } = useQuery<TopOutgoing[]>({
    queryKey: ["dashboard-top-outgoing"],
    queryFn: () => apiFetch<TopOutgoing[]>("/api/dashboard/top-outgoing"),
  });

  // 8. Recent Stock Out Transactions
  const { data: recentTx, isLoading: loadingTx } = useQuery<RecentTx[]>({
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

  const allBranchStockRows: BranchStockRow[] = useMemo(() => {
    if (Array.isArray(branchStocksData)) return branchStocksData;
    return branchStocksData?.data || [];
  }, [branchStocksData]);

  // Executive summary for branch stocks
  const branchStockSummary = useMemo(() => {
    const totalQty = allBranchStockRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
    const uniqueItems = new Set(allBranchStockRows.map((r) => r.itemId)).size;
    const lowCount = allBranchStockRows.filter((r) => r.quantity <= 10).length;

    // Aggregate by branch
    const branchMap = new Map<number, { name: string; qty: number; count: number }>();
    for (const row of allBranchStockRows) {
      const existing = branchMap.get(row.branchId) || { name: row.branchName, qty: 0, count: 0 };
      existing.qty += row.quantity;
      existing.count += 1;
      branchMap.set(row.branchId, existing);
    }

    const topBranchesList = Array.from(branchMap.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    return {
      totalQty,
      uniqueItems,
      lowCount,
      topBranches: topBranchesList,
    };
  }, [allBranchStockRows]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Portal Logistik & Distribusi Aksesoris
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Selamat Datang, {user?.fullName ?? "Administrator"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitoring distribusi material, ketepatan waktu instalasi cabang, dan stok real-time
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/laporan/teknisi")}
              className="gap-2 text-xs h-9 bg-card border-border hover:bg-muted font-medium"
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Laporan Teknisi
            </Button>
            <div className="text-xs font-medium px-3.5 py-2 rounded-xl bg-card border border-border text-muted-foreground shadow-2xs">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Row 1: 5 Executive KPI Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
        >
          {/* Card 1: Total Sisa Stok Cabang */}
          <DashCard className="group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Total Sisa Stok</p>
              <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {formatNumber(summary?.totalBranchStocks ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unit tersimpan di cabang
                </p>
              </div>
            )}
          </DashCard>

          {/* Card 2: Distribusi Keluar */}
          <DashCard className="group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Distribusi Keluar</p>
              <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center">
                <PackageMinus className="w-4 h-4" />
              </div>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {formatNumber(summary?.totalStockOut ?? 0)}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/80 text-foreground font-semibold text-[10px]">
                    +{summary?.todayStockOut ?? 0} hari ini
                  </span>
                  <span>ke cabang</span>
                </div>
              </div>
            )}
          </DashCard>

          {/* Card 3: Menunggu ACC Cabang */}
          <DashCard className="group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Menunggu ACC Cabang</p>
              <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {formatNumber(summary?.pendingBranchAcceptance ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Surat Jalan / item dlm perjalanan
                </p>
              </div>
            )}
          </DashCard>

          {/* Card 4: Terpasang Bulan Ini */}
          <DashCard className="group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Terpasang Bulan Ini</p>
              <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {formatNumber(summary?.installedThisMonth ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Realisasi pasang aksesoris
                </p>
              </div>
            )}
          </DashCard>

          {/* Card 5: Perlu Perhatian */}
          <DashCard className="group relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Perlu Perhatian</p>
              <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            {loadingSummary ? (
              <Skeleton className="h-8 w-16 rounded-lg" />
            ) : (
              <div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
                  {formatNumber(summary?.needsAttentionCount ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Melewati batas SLA / kendala
                </p>
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Row 2: Analytics Row (Stock Out Movement Chart & Branch Installation Ranking) ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
        >
          {/* Item 2: Minimalist Stock-Out Chart Card (7D / 30D) */}
          <DashCard className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Header & Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Tren Pengeluaran Aksesoris
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Volume pergerakan distribusi material ke cabang wilayah
                    </p>
                  </div>
                </div>

                {/* Period Selector Toggle */}
                <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartDays(7)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      chartDays === 7
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartDays(30)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      chartDays === 30
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    30 Hari
                  </button>
                </div>
              </div>

              {/* Stat Highlights Strip */}
              <div className="grid grid-cols-3 gap-3 my-4 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Total Terdistribusi</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {loadingMovement ? "..." : formatNumber(movementData?.summary?.totalQuantity ?? 0)}
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">unit</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Rata-rata Harian</span>
                  <span className="text-base font-bold font-mono text-foreground">
                    {loadingMovement ? "..." : movementData?.summary?.avgPerDay ?? 0}
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">unit/hr</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Puncak Volume</span>
                  <span className="text-base font-bold font-mono text-foreground truncate block">
                    {loadingMovement ? "..." : `${movementData?.summary?.peakQuantity ?? 0} unit`}
                  </span>
                </div>
              </div>

              {/* Minimalist Area Chart */}
              <div className="h-[230px] w-full pt-2">
                {loadingMovement ? (
                  <div className="h-full flex items-center justify-center">
                    <Skeleton className="h-[200px] w-full rounded-xl" />
                  </div>
                ) : !movementData?.chartData || movementData.chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs">Belum ada data distribusi dalam periode ini</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={movementData.chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="stockOutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="text-border/40"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        stroke="currentColor"
                        className="text-muted-foreground"
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartCustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="quantity"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#stockOutGradient)"
                        activeDot={{
                          r: 5,
                          strokeWidth: 2,
                          stroke: "hsl(var(--card))",
                          fill: "hsl(var(--primary))",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 inline-block" />
                Data terintegrasi dari Surat Jalan Pusat (BK-*)
              </span>
              <span>Periode {chartDays} Hari Terakhir</span>
            </div>
          </DashCard>

          {/* Item 3: Branch Installation On-Time Ranking */}
          <DashCard className="lg:col-span-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                    <Medal className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Peringkat Ketepatan Pemasangan
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Kinerja cabang menyelesaikan pasang sesuai SLA
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-muted/80 text-muted-foreground border-0 font-medium">
                  SLA Evaluasi
                </Badge>
              </div>

              {/* Leaderboard List */}
              <div className="mt-3.5 space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                {loadingRankings ? (
                  Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))
                ) : branchRankings.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-muted-foreground">
                    <Award className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs">Belum ada data evaluasi instalasi cabang</p>
                  </div>
                ) : (
                  branchRankings.slice(0, 6).map((item) => {
                    const isTop1 = item.rank === 1;

                    return (
                      <div
                        key={item.branchId}
                        className="p-2.5 rounded-xl border border-border/60 bg-muted/15 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Rank badge + Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isTop1
                                  ? "bg-foreground text-background font-bold shadow-2xs"
                                  : "bg-muted text-muted-foreground font-semibold"
                              }`}
                            >
                              {item.rank}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {item.branchName}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>Terpasang: <b className="text-foreground">{item.totalInstalled}</b></span>
                                <span>•</span>
                                <span>Rata-rata: <b className="text-foreground">{item.avgDurationText}</b></span>
                              </div>
                            </div>
                          </div>

                          {/* On-Time Rate Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted/70 text-foreground border border-border/60"
                            >
                              {item.totalInstalled > 0 ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                                  {item.onTimeRate}% Tepat
                                </>
                              ) : (
                                "Belum Ada Pasang"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Progress line */}
                        {item.totalInstalled > 0 && (
                          <div className="mt-2 w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/80 transition-all duration-500"
                              style={{ width: `${Math.max(item.onTimeRate, 5)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Target SLA standar: 48 Jam
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/material-tracking")}
                className="h-6 text-[11px] p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                Cek Pelacakan <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </DashCard>
        </motion.div>

        {/* ── Row 3: Ringkasan Sisa Stok Aksesoris Cabang (Executive Preview) ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <DashCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-border/80">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">
                    Sisa Stok Aksesoris di Cabang
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ikhtisar persediaan fisik material & aksesoris yang tersisa dan siap digunakan di seluruh cabang
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/cabang/stok-material")}
                  className="h-9 text-xs gap-1.5 shadow-xs font-medium"
                >
                  Buka Modul Inventaris Cabang <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>

            {/* Quick Metrics & Distribution Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Metric Cards */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-xs text-muted-foreground font-medium block">Total Sisa Stok Unit</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold font-mono text-foreground">
                      {formatNumber(branchStockSummary.totalQty)}
                    </span>
                    <span className="text-xs text-muted-foreground">unit material</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tersedia di {branchStockSummary.topBranches.length} cabang operasional
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[11px] text-muted-foreground block">Variasi Item</span>
                    <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                      {branchStockSummary.uniqueItems} <span className="text-xs font-normal text-muted-foreground">jenis</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[11px] text-muted-foreground block">Stok Menipis</span>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {branchStockSummary.lowCount} <span className="text-xs font-normal text-muted-foreground">item</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Top Branches Distribution Meters */}
              <div className="lg:col-span-2 rounded-xl bg-muted/20 border border-border/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      Distribusi Sisa Stok per Cabang
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Proporsi unit aktif
                    </span>
                  </div>

                  {branchStockSummary.topBranches.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada data persediaan cabang tercatat
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {branchStockSummary.topBranches.map((b) => {
                        const percent = branchStockSummary.totalQty > 0
                          ? Math.round((b.qty / branchStockSummary.totalQty) * 100)
                          : 0;
                        return (
                          <div key={b.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                {b.name}
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {formatNumber(b.qty)}{" "}
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  unit ({percent}%)
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(4, percent)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Data real-time tersinkronisasi otomatis</span>
                  <button
                    onClick={() => navigate("/cabang/stok-material")}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Buka tabel lengkap & filter <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </DashCard>
        </motion.div>

        {/* ── Row 4: Distribusi Terbanyak + Top Material Keluar + Transaksi Terakhir ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Cabang Distribusi Terbanyak */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Volume Distribusi Cabang</p>
                <p className="text-xs text-muted-foreground">Cabang penerima material terbanyak</p>
              </div>
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>

            {loadingBranches || !safeTopBranches ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
            ) : safeTopBranches.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-muted-foreground">
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
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                            {idx + 1}
                          </span>
                          {b.branchName}
                        </span>
                        <span className="font-bold font-mono text-foreground">
                          {formatNumber(b.totalQty)} <span className="text-[10px] font-normal text-muted-foreground">unit</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/80 transition-all duration-500" style={{ width: `${pct}%` }} />
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
                <p className="text-sm font-semibold text-foreground">Top Aksesoris Keluar</p>
                <p className="text-xs text-muted-foreground">Aksesoris paling sering didistribusikan</p>
              </div>
              <PackageMinus className="w-4 h-4 text-muted-foreground" />
            </div>

            {loadingOutgoing || !safeTopOutgoing ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
            ) : safeTopOutgoing.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-muted-foreground">
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
                        <p className="font-medium text-foreground truncate max-w-[70%]">
                          <span className="text-muted-foreground mr-1">{idx + 1}.</span> {item.itemName}
                        </p>
                        <span className="font-bold font-mono text-foreground">
                          {formatNumber(item.totalQty)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/80 transition-all duration-500" style={{ width: `${pct}%` }} />
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
                <p className="text-sm font-semibold text-foreground">Riwayat Distribusi Keluar</p>
                <p className="text-xs text-muted-foreground">Pengiriman surat jalan logistik terbaru</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/transaksi/keluar")}
                className="h-7 text-xs text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
              >
                Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {loadingTx ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
            ) : safeRecentTx.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-7 h-7 mb-1.5 opacity-30" />
                <p className="text-xs">Belum ada surat jalan keluar</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {safeRecentTx.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/80">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-mono font-bold text-foreground truncate">{t.referenceNo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.createdAt ? formatDate(t.createdAt) : "-"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-0 shrink-0 font-medium">
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
