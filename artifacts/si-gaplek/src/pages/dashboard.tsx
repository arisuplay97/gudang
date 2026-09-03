import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  BarChart3,
  ShieldCheck,
  Timer,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Eye,
  Archive,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useLocation } from "wouter";

/* ── Types ── */
interface Summary {
  totalItems: number;
  totalStockIn: number;
  totalStockOut: number;
  lowStockCount: number;
  inventoryValue: number;
  todayStockIn: number;
  todayStockOut: number;
  pendingTransactions: number;
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
interface LowStockItem {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  minimumStock: number;
}
interface Movement {
  date: string;
  stockIn: number;
  stockOut: number;
}
interface StockHealth {
  aman: number;
  menipis: number;
  kritis: number;
  habis: number;
  overstock: number;
}
interface AgingData {
  "0-30": number;
  "31-90": number;
  "91-180": number;
  "181-365": number;
  ">365": number;
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
interface ActivityItem {
  id: number;
  action: string;
  entity: string;
  createdAt: string;
}

/* ── Helpers ── */
const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const dayLabel = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { weekday: "short" });
};
const timeLabel = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const DONUT_COLORS = ["#5b7553", "#a3b899", "#e8c468", "#d4a55a", "#c27c5a", "#8b6b4a"];

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
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<"7" | "30">("7");

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch<Summary>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });
  const { data: recentTx, isLoading: loadingTx } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: () => apiFetch<RecentTx[]>("/api/dashboard/recent-transactions"),
    refetchInterval: 30_000,
  });
  const { data: lowStock, isLoading: loadingLow } = useQuery({
    queryKey: ["dashboard-lowstock"],
    queryFn: () => apiFetch<LowStockItem[]>("/api/dashboard/low-stock"),
    refetchInterval: 30_000,
  });
  const { data: movement, isLoading: loadingMove } = useQuery({
    queryKey: ["dashboard-movement", period],
    queryFn: () => apiFetch<Movement[]>(`/api/dashboard/stock-movement?days=${period}`),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
  const { data: stockHealth } = useQuery({
    queryKey: ["dashboard-stock-health"],
    queryFn: () => apiFetch<StockHealth>("/api/dashboard/stock-health"),
  });
  const { data: aging } = useQuery({
    queryKey: ["dashboard-aging"],
    queryFn: () => apiFetch<AgingData>("/api/dashboard/aging"),
  });
  const { data: topBranches, isLoading: loadingBranches } = useQuery({
    queryKey: ["dashboard-top-branches"],
    queryFn: () => apiFetch<TopBranch[]>("/api/dashboard/top-branches"),
  });
  const { data: topOutgoing } = useQuery({
    queryKey: ["dashboard-top-outgoing"],
    queryFn: () => apiFetch<TopOutgoing[]>("/api/dashboard/top-outgoing"),
  });
  const { data: activityFeed } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiFetch<ActivityItem[]>("/api/dashboard/activity"),
  });

  const isLoading = loadingSummary || loadingTx || loadingLow;

  const totalMovement = (movement ?? []).reduce((s, m) => s + m.stockIn + m.stockOut, 0);
  const inventoryValue = summary?.inventoryValue ?? 0;

  const compositionData = [
    { name: "Tracked", value: summary?.trackedItems ?? 0 },
    { name: "Non-Tracked", value: summary?.nonTrackedItems ?? 0 },
  ].filter(d => d.value > 0);

  /* ── Stock Health items (for clickable list) ── */
  const healthItems = stockHealth ? [
    { label: "Aman", count: stockHealth.aman, color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
    { label: "Menipis", count: stockHealth.menipis, color: "bg-amber-500", textColor: "text-amber-700 dark:text-amber-400" },
    { label: "Kritis", count: stockHealth.kritis, color: "bg-red-500", textColor: "text-red-700 dark:text-red-400" },
    { label: "Habis", count: stockHealth.habis, color: "bg-red-800", textColor: "text-red-800 dark:text-red-300" },
    { label: "Overstock", count: stockHealth.overstock, color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400" },
  ] : [];

  /* ── Aging items ── */
  const agingItems = aging ? [
    { label: "0–30 Hari", count: aging["0-30"] },
    { label: "31–90 Hari", count: aging["31-90"] },
    { label: "3–6 Bulan", count: aging["91-180"] },
    { label: "6–12 Bulan", count: aging["181-365"] },
    { label: "> 1 Tahun", count: aging[">365"] },
  ] : [];


  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-background transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-5">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-sm text-[#8a8a7a] dark:text-muted-foreground">
              Selamat datang kembali,
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#2d2d2a] dark:text-foreground">
              {user?.fullName ?? "Dashboard"}
            </h1>
          </div>
          <p className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#eae8e0] text-[#6b6b5e] dark:bg-muted dark:text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* ── Row 1: Hero + Side Stats ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* Hero card — Inventory Value + Area Chart */}
          <DashCard className="xl:col-span-8 p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Nilai Inventaris</p>
                {isLoading ? (
                  <Skeleton className="h-10 w-48 mt-1" />
                ) : (
                  <p className="text-4xl font-bold tracking-tight mt-1 text-[#2d2d2a] dark:text-foreground">
                    {formatCurrency(inventoryValue)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 bg-[#eae8e0] dark:bg-muted p-0.5 rounded-full">
                <button
                  type="button"
                  onClick={() => setPeriod("7")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    period === "7"
                      ? "bg-[#5b7553] text-white shadow-xs"
                      : "text-[#6b6b5e] hover:text-[#2d2d2a] dark:text-muted-foreground dark:hover:text-foreground"
                  }`}
                >
                  7h
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("30")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    period === "30"
                      ? "bg-[#5b7553] text-white shadow-xs"
                      : "text-[#6b6b5e] hover:text-[#2d2d2a] dark:text-muted-foreground dark:hover:text-foreground"
                  }`}
                >
                  30h
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-[#e8f5e3] text-[#4a7c3f] dark:bg-green-950 dark:text-green-400">
                <TrendingUp className="w-3 h-3" />
                {formatNumber(summary?.todayStockIn ?? 0)} masuk hari ini
              </span>
              <span className="text-xs text-[#8a8a7a] dark:text-muted-foreground">•</span>
              <span className="text-xs text-[#8a8a7a] dark:text-muted-foreground">
                {formatNumber(totalMovement)} total pergerakan {period} hari
              </span>
            </div>
            <div className="flex gap-4 text-xs mb-3 text-[#8a8a7a] dark:text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5b7553]" /> Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e8c468]" /> Keluar
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-44 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={movement ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5b7553" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5b7553" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e8c468" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e8c468" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eae8e0" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => {
                      const dt = new Date(d);
                      if (period === "30") {
                        return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                      }
                      return dt.toLocaleDateString("id-ID", { weekday: "short" });
                    }}
                    interval={period === "30" ? 4 : 0}
                    tick={{ fontSize: 11, fill: "#8a8a7a" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#8a8a7a" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #eae8e0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", fontSize: 12, backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    labelFormatter={formatDate}
                  />
                  <Area type="monotone" dataKey="stockIn" name="Masuk" stroke="#5b7553" strokeWidth={2} fill="url(#gradIn)" />
                  <Area type="monotone" dataKey="stockOut" name="Keluar" stroke="#e8c468" strokeWidth={2} fill="url(#gradOut)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </DashCard>

          {/* Side stat cards */}
          <div className="xl:col-span-4 grid grid-cols-2 xl:grid-cols-1 gap-4">
            {/* Total Masuk */}
            <div className="rounded-2xl p-5 bg-[#5b7553] text-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium opacity-80">Total Masuk</p>
                <PackagePlus className="w-4 h-4 opacity-60" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-white/20" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{formatNumber(summary?.totalStockIn)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                      <ArrowUpRight className="w-3 h-3" />
                      +{summary?.todayStockIn ?? 0}
                    </span>
                    <span className="text-xs opacity-60">hari ini</span>
                  </div>
                </>
              )}
            </div>

            {/* Total Keluar */}
            <DashCard>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Total Keluar</p>
                <PackageMinus className="w-4 h-4 text-[#c27c5a] dark:text-red-400" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-[#2d2d2a] dark:text-foreground">{formatNumber(summary?.totalStockOut)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-[#fff0e6] dark:bg-red-950/50 text-[#c27c5a] dark:text-red-400">
                      <ArrowDownRight className="w-3 h-3" />
                      -{summary?.todayStockOut ?? 0}
                    </span>
                    <span className="text-xs text-[#8a8a7a] dark:text-muted-foreground">hari ini</span>
                  </div>
                </>
              )}
            </DashCard>

            {/* Stok Menipis */}
            <DashCard className="col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Stok Menipis</p>
                <AlertTriangle className="w-4 h-4 text-[#d4a55a] dark:text-yellow-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className={`text-3xl font-bold ${summary?.lowStockCount ? "text-[#c27c5a] dark:text-red-500" : "text-[#2d2d2a] dark:text-foreground"}`}>
                    {formatNumber(summary?.lowStockCount)}
                  </p>
                  <p className="text-xs mt-1 text-[#8a8a7a] dark:text-muted-foreground">barang di bawah minimum</p>
                </>
              )}
            </DashCard>
          </div>
        </motion.div>

        {/* ── Row 2: Stock Health + Aging + Cabang Material Terbanyak ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Stock Health (Section 15) */}
          <DashCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Stock Health</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Status persediaan</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
            </div>
            {!stockHealth ? (
              <div className="space-y-2.5">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-7 w-full rounded" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {healthItems.map(item => (
                  <button
                    key={item.label}
                    onClick={() => navigate("/laporan/stok")}
                    className="w-full flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground group-hover:text-foreground">{item.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                  </button>
                ))}
              </div>
            )}
          </DashCard>

          {/* Aging Material (Section 16) */}
          <DashCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Aging Material</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Umur stok di gudang</p>
              </div>
              <Timer className="w-4 h-4 text-[#d4a55a] dark:text-yellow-500" />
            </div>
            {!aging ? (
              <div className="space-y-2.5">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-7 w-full rounded" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {agingItems.map((item, idx) => {
                  const total = agingItems.reduce((s, a) => s + a.count, 0);
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-[#6b6b5e] dark:text-muted-foreground w-20 shrink-0">{item.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: idx <= 1 ? "#5b7553" : idx === 2 ? "#e8c468" : "#c27c5a",
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#2d2d2a] dark:text-foreground w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Cabang Material Terbanyak (Menggantikan Exception Center) */}
          <DashCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Cabang Material Terbanyak</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Distribusi volume material cabang</p>
              </div>
              <MapPin className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
            </div>
            {loadingBranches || !topBranches ? (
              <div className="space-y-2.5">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-7 w-full rounded" />)}</div>
            ) : topBranches.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-[#8a8a7a] dark:text-muted-foreground">
                <Package className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada distribusi cabang</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topBranches.map((b, idx) => {
                  const maxQty = Math.max(...topBranches.map(t => t.totalQty), 1);
                  const pct = b.totalQty > 0 ? Math.max(12, Math.round((b.totalQty / maxQty) * 100)) : 0;
                  const barGradients = [
                    "bg-[#5b7553]",
                    "bg-[#5b7553]/85",
                    "bg-[#e8c468]",
                    "bg-[#e8c468]/85",
                    "bg-[#c27c5a]",
                  ];
                  return (
                    <div
                      key={b.branchId}
                      onClick={() => navigate("/cabang/tracking")}
                      className="cursor-pointer group hover:bg-muted/40 p-1 rounded-lg transition-colors"
                      title="Klik untuk melihat tracking material cabang"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[#2d2d2a] dark:text-foreground truncate max-w-[68%] flex items-center gap-1.5 group-hover:text-primary transition-colors">
                          <span className="w-4 h-4 rounded-full bg-[#eae8e0] dark:bg-muted text-[10px] flex items-center justify-center font-bold text-[#6b6b5e] dark:text-muted-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{b.branchName}</span>
                        </span>
                        <span className="font-bold text-[#2d2d2a] dark:text-foreground text-right shrink-0">
                          {formatNumber(b.totalQty)}{" "}
                          <span className="text-[10px] font-normal text-[#8a8a7a] dark:text-muted-foreground">unit</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barGradients[idx % barGradients.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        </motion.div>

        {/* ── Row 3: Capacity + Quick Stats ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kapasitas Gudang */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Kapasitas Stok Material</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Proporsi tracked vs non-tracked</p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-full rounded-full" />
            ) : (
              <>
                <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#f0efe9] dark:bg-muted">
                  {(summary?.totalItems ?? 0) > 0 && (
                    <>
                      <div className="h-full transition-all duration-700 bg-[#5b7553]"
                        style={{ width: `${((summary?.trackedItems ?? 0) / (summary?.totalItems ?? 1)) * 100}%`, borderRadius: "9999px 0 0 9999px" }} />
                      <div className="h-full transition-all duration-700 bg-[#e8c468]"
                        style={{ width: `${((summary?.nonTrackedItems ?? 0) / (summary?.totalItems ?? 1)) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-[#5b7553] dark:text-green-500">
                    <span className="w-2 h-2 rounded-full bg-[#5b7553] dark:bg-green-500" /> Tracked: {summary?.trackedItems ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#d4a55a] dark:text-yellow-500">
                    <span className="w-2 h-2 rounded-full bg-[#e8c468] dark:bg-yellow-500" /> Non-Tracked: {summary?.nonTrackedItems ?? 0}
                  </span>
                  <span className="text-xs font-semibold text-[#2d2d2a] dark:text-foreground">Total: {summary?.totalItems ?? 0}</span>
                </div>
              </>
            )}
          </DashCard>

          {/* Ringkasan Sistem Hari Ini */}
          <DashCard className="p-6 bg-[#fffdf5] dark:bg-card">
            <p className="text-sm font-semibold mb-3 text-[#2d2d2a] dark:text-foreground">Ringkasan Sistem Hari Ini</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#e8f5e3] dark:bg-green-950/50">
                  <PackagePlus className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                </div>
                <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">{summary?.todayStockIn ?? 0} barang masuk hari ini</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#fff0e6] dark:bg-orange-950/50">
                  <Truck className="w-4 h-4 text-[#c27c5a] dark:text-orange-500" />
                </div>
                <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">{summary?.todayStockOut ?? 0} distribusi keluar hari ini</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f5f0e0] dark:bg-yellow-950/50">
                  <Package className="w-4 h-4 text-[#8b6b4a] dark:text-yellow-500" />
                </div>
                <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">{summary?.pendingTransactions ?? 0} transaksi pending</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#e8f5e3] dark:bg-green-950/50">
                  <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                </div>
                <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">{summary?.trackedItems ?? 0} material dalam pelacakan</p>
              </div>
            </div>
          </DashCard>
        </motion.div>

        {/* ── Row 4: Donut + Low Stock + Top Material + Activity ── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Komposisi Material */}
          <DashCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Komposisi Material</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Tracked vs Non-Tracked</p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : compositionData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-[#8a8a7a] dark:text-muted-foreground">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={compositionData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={45} outerRadius={65} strokeWidth={3} stroke="var(--color-card)">
                    {compositionData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: 'hsl(var(--foreground))', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2 mt-2">
              {compositionData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-[#6b6b5e] dark:text-muted-foreground">{d.name}</span>
                  </span>
                  <span className="font-semibold text-[#2d2d2a] dark:text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </DashCard>

          {/* Low Stock */}
          <DashCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Stok Menipis</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Di bawah batas minimum</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${summary?.lowStockCount ? "bg-[#fff0e6] text-[#c27c5a] dark:bg-red-950/50 dark:text-red-400" : "bg-[#e8f5e3] text-[#5b7553] dark:bg-green-950/50 dark:text-green-500"}`}>
                {summary?.lowStockCount ?? 0} item
              </span>
            </div>
            {loadingLow ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : (lowStock ?? []).length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[#8a8a7a] dark:text-muted-foreground">
                <Package className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Semua stok aman</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {(lowStock ?? []).slice(0, 8).map(item => {
                  const pct = item.minimumStock > 0 ? Math.min(100, (item.currentStock / item.minimumStock) * 100) : 0;
                  const isZero = item.currentStock === 0;
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium truncate pr-2 text-[#2d2d2a] dark:text-foreground max-w-[70%]">{item.name}</p>
                        <p className={`text-xs font-semibold ${isZero ? "text-[#c27c5a] dark:text-red-500" : "text-[#8a8a7a] dark:text-muted-foreground"}`}>
                          {item.currentStock}/{item.minimumStock}
                        </p>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#f0efe9] dark:bg-muted">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: pct < 30 ? "#c27c5a" : pct < 60 ? "#e8c468" : "#5b7553" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Top Material Keluar (Section 20) */}
          <DashCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Top Material Keluar</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Paling banyak didistribusi</p>
              </div>
              <BarChart3 className="w-4 h-4 text-[#8a8a7a] dark:text-muted-foreground" />
            </div>
            {!topOutgoing ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}</div>
            ) : topOutgoing.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[#8a8a7a] dark:text-muted-foreground">
                <PackageMinus className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada distribusi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topOutgoing.map((item, idx) => {
                  const maxQty = topOutgoing[0]?.totalQty || 1;
                  const pct = (item.totalQty / maxQty) * 100;
                  return (
                    <div key={item.itemId}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium truncate pr-2 text-[#2d2d2a] dark:text-foreground max-w-[70%]">
                          <span className="text-[#8a8a7a] dark:text-muted-foreground">{idx + 1}.</span> {item.itemName}
                        </p>
                        <span className="text-xs font-bold text-[#5b7553] dark:text-green-500">{item.totalQty}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#f0efe9] dark:bg-muted">
                        <div className="h-full rounded-full transition-all duration-500 bg-[#5b7553]"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Aktivitas Terbaru (Section 19) + Recent Transactions */}
          <DashCard className="lg:col-span-3 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Riwayat Transaksi</p>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f0efe9] text-[#6b6b5e] dark:bg-muted dark:text-muted-foreground">7h</span>
            </div>
            {loadingTx ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : (recentTx ?? []).length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[#8a8a7a] dark:text-muted-foreground">
                <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {(recentTx ?? []).slice(0, 10).map((t) => {
                  const isIn = t.type === "stock_in";
                  return (
                    <div key={`${t.type}-${t.id}`} className="flex items-center gap-3 py-2.5 border-b border-[#f0efe9] dark:border-border">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? "bg-[#e8f5e3] dark:bg-green-950/50" : "bg-[#fff0e6] dark:bg-orange-950/50"}`}>
                        {isIn ? <PackagePlus className="w-4 h-4 text-[#5b7553] dark:text-green-500" /> : <PackageMinus className="w-4 h-4 text-[#c27c5a] dark:text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#2d2d2a] dark:text-foreground">
                          {isIn ? "Barang Masuk" : "Distribusi Keluar"}
                        </p>
                        <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">{formatDate(t.createdAt)}</p>
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${isIn ? "text-[#5b7553] dark:text-green-500" : "text-[#c27c5a] dark:text-red-500"}`}>
                        {t.referenceNo}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        </motion.div>
      </div>
    </div>
  );
}
