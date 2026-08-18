import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  DollarSign,
  BarChart3,
  ChevronRight,
  ShieldCheck,
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
  Legend,
  BarChart,
  Bar,
} from "recharts";

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

/* ── Helpers ── */
const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const dayLabel = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("id-ID", { weekday: "short" });
};

/* ── Donut colors ── */
const DONUT_COLORS = ["#5b7553", "#a3b899", "#e8c468", "#d4a55a", "#c27c5a", "#8b6b4a"];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiFetch<Summary>("/api/dashboard/summary"),
  });
  const { data: recentTx, isLoading: loadingTx } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: () => apiFetch<RecentTx[]>("/api/dashboard/recent-transactions"),
  });
  const { data: lowStock, isLoading: loadingLow } = useQuery({
    queryKey: ["dashboard-lowstock"],
    queryFn: () => apiFetch<LowStockItem[]>("/api/dashboard/low-stock"),
  });
  const { data: movement, isLoading: loadingMove } = useQuery({
    queryKey: ["dashboard-movement"],
    queryFn: () => apiFetch<Movement[]>("/api/dashboard/stock-movement"),
  });

  const isLoading = loadingSummary || loadingTx || loadingLow || loadingMove;

  /* Computed values */
  const totalMovement = (movement ?? []).reduce((s, m) => s + m.stockIn + m.stockOut, 0);
  const inventoryValue = summary?.inventoryValue ?? 0;

  /* Donut data for tracked vs non-tracked */
  const compositionData = [
    { name: "Tracked", value: summary?.trackedItems ?? 0 },
    { name: "Non-Tracked", value: summary?.nonTrackedItems ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div style={{ background: "#f7f6f3" }} className="min-h-screen">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-sm" style={{ color: "#8a8a7a" }}>
              Selamat datang kembali,
            </p>
            <h1 className="text-2xl font-semibold" style={{ color: "#2d2d2a" }}>
              {user?.fullName ?? "Dashboard"}
            </h1>
          </div>
          <p className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#eae8e0", color: "#6b6b5e" }}>
            {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── Row 1: Hero + Side Stats ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* Hero card — Inventory Value + Area Chart */}
          <div className="xl:col-span-8 rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-sm font-medium" style={{ color: "#8a8a7a" }}>Nilai Inventaris</p>
                {isLoading ? (
                  <Skeleton className="h-10 w-48 mt-1" />
                ) : (
                  <p className="text-4xl font-bold tracking-tight mt-1" style={{ color: "#2d2d2a" }}>
                    {formatCurrency(inventoryValue)}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#5b7553", color: "#fff" }}>
                  7h
                </button>
                <button className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#f0efe9", color: "#6b6b5e" }}>
                  30h
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#e8f5e3", color: "#4a7c3f" }}>
                <TrendingUp className="w-3 h-3" />
                {formatNumber(summary?.todayStockIn ?? 0)} masuk hari ini
              </span>
              <span className="text-xs" style={{ color: "#8a8a7a" }}>•</span>
              <span className="text-xs" style={{ color: "#8a8a7a" }}>
                {formatNumber(totalMovement)} total pergerakan 7 hari
              </span>
            </div>
            <div className="flex gap-4 text-xs mb-3" style={{ color: "#8a8a7a" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5b7553" }} /> Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#e8c468" }} /> Keluar
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#eae8e0" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 11, fill: "#8a8a7a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a8a7a" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #eae8e0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", fontSize: 12 }}
                    labelFormatter={formatDate}
                  />
                  <Area type="monotone" dataKey="stockIn" name="Masuk" stroke="#5b7553" strokeWidth={2} fill="url(#gradIn)" />
                  <Area type="monotone" dataKey="stockOut" name="Keluar" stroke="#e8c468" strokeWidth={2} fill="url(#gradOut)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Side stat cards */}
          <div className="xl:col-span-4 grid grid-cols-2 xl:grid-cols-1 gap-4">
            {/* Total Income = Total Masuk */}
            <div className="rounded-2xl p-5" style={{ background: "#5b7553", color: "#fff" }}>
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

            {/* Total Expenses = Total Keluar */}
            <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: "#8a8a7a" }}>Total Keluar</p>
                <PackageMinus className="w-4 h-4" style={{ color: "#c27c5a" }} />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold" style={{ color: "#2d2d2a" }}>{formatNumber(summary?.totalStockOut)}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#fff0e6", color: "#c27c5a" }}>
                      <ArrowDownRight className="w-3 h-3" />
                      -{summary?.todayStockOut ?? 0}
                    </span>
                    <span className="text-xs" style={{ color: "#8a8a7a" }}>hari ini</span>
                  </div>
                </>
              )}
            </div>

            {/* Saved = Stok Menipis */}
            <div className="rounded-2xl p-5 col-span-2 xl:col-span-1" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: "#8a8a7a" }}>Stok Menipis</p>
                <AlertTriangle className="w-4 h-4" style={{ color: "#d4a55a" }} />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-3xl font-bold" style={{ color: summary?.lowStockCount ? "#c27c5a" : "#2d2d2a" }}>
                    {formatNumber(summary?.lowStockCount)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#8a8a7a" }}>barang di bawah minimum</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2: Progress bar + Tips ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kapasitas Gudang — styled like "Monthly spending limit" */}
          <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2d2d2a" }}>Kapasitas Stok Material</p>
                <p className="text-xs" style={{ color: "#8a8a7a" }}>Proporsi tracked vs non-tracked</p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-full rounded-full" />
            ) : (
              <>
                <div className="w-full h-4 rounded-full overflow-hidden flex" style={{ background: "#f0efe9" }}>
                  {(summary?.totalItems ?? 0) > 0 && (
                    <>
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${((summary?.trackedItems ?? 0) / (summary?.totalItems ?? 1)) * 100}%`,
                          background: "#5b7553",
                          borderRadius: "9999px 0 0 9999px",
                        }}
                      />
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${((summary?.nonTrackedItems ?? 0) / (summary?.totalItems ?? 1)) * 100}%`,
                          background: "#e8c468",
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-3">
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "#5b7553" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "#5b7553" }} />
                    Tracked: {summary?.trackedItems ?? 0}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "#d4a55a" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "#e8c468" }} />
                    Non-Tracked: {summary?.nonTrackedItems ?? 0}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#2d2d2a" }}>
                    Total: {summary?.totalItems ?? 0}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick Stats — styled like "Quick Tips" */}
          <div className="rounded-2xl p-6" style={{ background: "#fffdf5", border: "1px solid #eae8e0" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "#2d2d2a" }}>Ringkasan Sistem Hari Ini</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#e8f5e3" }}>
                  <PackagePlus className="w-4 h-4" style={{ color: "#5b7553" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#2d2d2a" }}>{summary?.todayStockIn ?? 0} barang masuk hari ini</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fff0e6" }}>
                  <Truck className="w-4 h-4" style={{ color: "#c27c5a" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#2d2d2a" }}>{summary?.todayStockOut ?? 0} distribusi keluar hari ini</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f5f0e0" }}>
                  <Package className="w-4 h-4" style={{ color: "#8b6b4a" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#2d2d2a" }}>{summary?.pendingTransactions ?? 0} transaksi pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#e8f5e3" }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: "#5b7553" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#2d2d2a" }}>{summary?.trackedItems ?? 0} material dalam pelacakan</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Charts + Low Stock + Transaction History ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Distribusi Stok — Donut chart like "Cost Analysis" */}
          <div className="lg:col-span-4 rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2d2d2a" }}>Komposisi Material</p>
                <p className="text-xs" style={{ color: "#8a8a7a" }}>Tracked vs Non-Tracked</p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : compositionData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#8a8a7a" }}>
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    strokeWidth={3}
                    stroke="#fff"
                  >
                    {compositionData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eae8e0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2 mt-2">
              {compositionData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span style={{ color: "#6b6b5e" }}>{d.name}</span>
                  </span>
                  <span className="font-semibold" style={{ color: "#2d2d2a" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stok Menipis — Goal tracker style */}
          <div className="lg:col-span-4 rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#2d2d2a" }}>Stok Menipis</p>
                <p className="text-xs" style={{ color: "#8a8a7a" }}>Di bawah batas minimum</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: summary?.lowStockCount ? "#fff0e6" : "#e8f5e3", color: summary?.lowStockCount ? "#c27c5a" : "#5b7553" }}>
                {summary?.lowStockCount ?? 0} item
              </span>
            </div>
            {loadingLow ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : (lowStock ?? []).length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center" style={{ color: "#8a8a7a" }}>
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
                        <p className="text-xs font-medium truncate pr-2" style={{ color: "#2d2d2a", maxWidth: "70%" }}>{item.name}</p>
                        <p className="text-xs font-semibold" style={{ color: isZero ? "#c27c5a" : "#8a8a7a" }}>
                          {item.currentStock}/{item.minimumStock}
                        </p>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "#f0efe9" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: pct < 30 ? "#c27c5a" : pct < 60 ? "#e8c468" : "#5b7553",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction History — like right column in ACRU */}
          <div className="lg:col-span-4 rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #eae8e0" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: "#2d2d2a" }}>Riwayat Transaksi</p>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "#f0efe9", color: "#6b6b5e" }}>
                7h
              </span>
            </div>
            {loadingTx ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : (recentTx ?? []).length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center" style={{ color: "#8a8a7a" }}>
                <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {(recentTx ?? []).slice(0, 10).map((t) => {
                  const isIn = t.type === "stock_in";
                  return (
                    <div key={`${t.type}-${t.id}`} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "#f0efe9" }}>
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isIn ? "#e8f5e3" : "#fff0e6" }}
                      >
                        {isIn
                          ? <PackagePlus className="w-4 h-4" style={{ color: "#5b7553" }} />
                          : <PackageMinus className="w-4 h-4" style={{ color: "#c27c5a" }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#2d2d2a" }}>
                          {isIn ? "Barang Masuk" : "Distribusi Keluar"}
                        </p>
                        <p className="text-xs" style={{ color: "#8a8a7a" }}>
                          {formatDate(t.createdAt)}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{ color: isIn ? "#5b7553" : "#c27c5a" }}
                      >
                        {t.referenceNo}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
