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
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface DashboardSummary {
  totalItems: number;
  totalStockIn: number;
  totalStockOut: number;
  lowStockCount: number;
  inventoryValue: number;
  recentTransactions: Array<{
    id: number;
    type: string;
    referenceNumber: string;
    itemName: string;
    quantity: number;
    date: string;
  }>;
  stockMovement: Array<{
    date: string;
    stockIn: number;
    stockOut: number;
  }>;
  lowStockItems: Array<{
    id: number;
    code: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl px-4 py-3 text-sm border border-white/[0.1]">
        <p className="font-semibold text-foreground/90 mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground/70">{p.name}:</span>
            <span className="font-semibold text-foreground/90">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardSummary>("/api/dashboard"),
  });

  const stats = [
    {
      label: "Total Barang",
      value: formatNumber(data?.totalItems),
      icon: Package,
      colorIcon: "text-blue-400",
      bgIcon: "bg-blue-500/10 border-blue-500/20",
      glowClass: "stat-card-glow-blue",
      trend: null,
      desc: "jenis barang terdaftar",
      gradient: "from-blue-500/10 to-blue-500/5",
    },
    {
      label: "Barang Masuk",
      value: formatNumber(data?.totalStockIn),
      icon: PackagePlus,
      colorIcon: "text-emerald-400",
      bgIcon: "bg-emerald-500/10 border-emerald-500/20",
      glowClass: "stat-card-glow-green",
      trend: "up",
      desc: "transaksi bulan ini",
      gradient: "from-emerald-500/10 to-emerald-500/5",
    },
    {
      label: "Barang Keluar",
      value: formatNumber(data?.totalStockOut),
      icon: PackageMinus,
      colorIcon: "text-rose-400",
      bgIcon: "bg-rose-500/10 border-rose-500/20",
      glowClass: "stat-card-glow-red",
      trend: "down",
      desc: "transaksi bulan ini",
      gradient: "from-rose-500/10 to-rose-500/5",
    },
    {
      label: "Stok Rendah",
      value: formatNumber(data?.lowStockCount),
      icon: AlertTriangle,
      colorIcon: "text-amber-400",
      bgIcon: "bg-amber-500/10 border-amber-500/20",
      glowClass: "stat-card-glow-amber",
      trend: null,
      desc: "barang perlu reorder",
      gradient: "from-amber-500/10 to-amber-500/5",
    },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary/60" />
            <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/50">
              {dateStr} · {timeStr}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground/90 tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground/60 mt-0.5">
            Selamat datang kembali, <span className="text-primary/80 font-semibold">{user?.fullName}</span>. Berikut ringkasan sistem hari ini.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/[0.08] text-sm text-muted-foreground/70 hover:text-foreground/90 hover:border-white/[0.14] transition-all duration-200 shrink-0"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Low stock alert */}
      {data?.lowStockCount != null && data.lowStockCount > 0 && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/[0.20] animate-fade-in-up">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Peringatan Stok Rendah</p>
            <p className="text-sm text-amber-400/70 mt-0.5">
              Terdapat <strong className="text-amber-300">{data.lowStockCount} barang</strong> dengan stok di bawah batas minimum. Segera lakukan pengadaan.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "glass-card rounded-2xl p-5 card-hover cursor-default animate-fade-in-up",
              s.glowClass
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Gradient inner glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.gradient} opacity-40 pointer-events-none`} />

            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground/60 tracking-wide uppercase mb-2">{s.label}</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-20 bg-white/[0.06] rounded-lg" />
                ) : (
                  <p className="text-3xl font-extrabold text-foreground/90 tracking-tight">{s.value}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {s.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                  {s.trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400" />}
                  <p className="text-xs text-muted-foreground/50">{s.desc}</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0",
                s.bgIcon
              )}>
                <s.icon className={cn("w-5 h-5", s.colorIcon)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Inventory Value */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-5 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground/90">Pergerakan Stok</h2>
              <p className="text-xs text-muted-foreground/50 mt-0.5">7 Hari Terakhir</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/60">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Masuk
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground/60">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Keluar
              </span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-52 w-full bg-white/[0.04] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.stockMovement ?? []} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="stockIn" name="Masuk" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="stockOut" name="Keluar" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Value */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between animate-fade-in-up delay-300 stat-card-glow-cyan">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground/90">Nilai Inventaris</h2>
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-full bg-white/[0.04] rounded-xl" />
            ) : (
              <div>
                <p className="text-xs text-muted-foreground/50 mb-1">Total nilai stok saat ini</p>
                <p className="text-2xl font-extrabold text-gradient-primary leading-tight">
                  {formatCurrency(data?.inventoryValue ?? 0)}
                </p>
              </div>
            )}
          </div>

          {/* Mini breakdown */}
          <div className="mt-4 space-y-2.5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Masuk bulan ini
              </span>
              {isLoading
                ? <Skeleton className="h-4 w-12 bg-white/[0.04]" />
                : <span className="font-semibold text-emerald-400">{formatNumber(data?.totalStockIn)} item</span>
              }
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground/60">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Keluar bulan ini
              </span>
              {isLoading
                ? <Skeleton className="h-4 w-12 bg-white/[0.04]" />
                : <span className="font-semibold text-rose-400">{formatNumber(data?.totalStockOut)} item</span>
              }
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted-foreground/60">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Stok rendah
              </span>
              {isLoading
                ? <Skeleton className="h-4 w-12 bg-white/[0.04]" />
                : <span className="font-semibold text-amber-400">{formatNumber(data?.lowStockCount)} item</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Transaksi Terbaru */}
        <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground/90">Transaksi Terbaru</h2>
              <p className="text-xs text-muted-foreground/50 mt-0.5">Aktivitas stok terakhir</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/[0.04] rounded-xl" />
              ))}
            </div>
          ) : data?.recentTransactions?.length ? (
            <div className="space-y-1.5">
              {data.recentTransactions.slice(0, 8).map((t) => (
                <div
                  key={`${t.type}-${t.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-transparent hover:border-white/[0.06] hover:bg-white/[0.04] transition-all duration-150"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                    t.type === "stock_in"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : t.type === "stock_out"
                      ? "bg-rose-500/10 border-rose-500/20"
                      : "bg-blue-500/10 border-blue-500/20"
                  )}>
                    {t.type === "stock_in"
                      ? <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />
                      : t.type === "stock_out"
                      ? <PackageMinus className="w-3.5 h-3.5 text-rose-400" />
                      : <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/85 truncate">{t.itemName}</p>
                    <p className="text-xs text-muted-foreground/50">{t.referenceNumber}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg border",
                    t.type === "stock_in"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {t.type === "stock_in" ? "+" : "-"}{t.quantity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground/40 font-medium">Belum ada transaksi</p>
            </div>
          )}
        </div>

        {/* Stok Rendah */}
        <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-400">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground/90">Stok Rendah</h2>
              <p className="text-xs text-muted-foreground/50 mt-0.5">Barang perlu segera reorder</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/[0.04] rounded-xl" />
              ))}
            </div>
          ) : data?.lowStockItems?.length ? (
            <div className="space-y-1.5">
              {data.lowStockItems.map((item) => {
                const pct = Math.min(100, Math.round((item.currentStock / (item.minimumStock || 1)) * 100));
                return (
                  <div
                    key={item.id}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-transparent hover:border-amber-500/[0.15] hover:bg-amber-500/[0.04] transition-all duration-150"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium text-foreground/85 truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground/50 font-mono">{item.code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-rose-400">{item.currentStock} <span className="text-xs font-normal">{item.unit}</span></p>
                        <p className="text-xs text-muted-foreground/50">min: {item.minimumStock}</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/[0.15] flex items-center justify-center mx-auto mb-3">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">Semua stok aman</p>
              <p className="text-xs text-muted-foreground/40 mt-0.5">Tidak ada barang di bawah minimum</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
