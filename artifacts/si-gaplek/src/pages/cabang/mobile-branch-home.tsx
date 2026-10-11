import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import {
  Boxes,
  PackageCheck,
  ShieldAlert,
  Wrench,
  ScanBarcode,
  Clock,
  ChevronRight,
  Search,
  Bell,
  Camera,
  RotateCcw,
  Truck,
  Plus,
  ArrowUpRight,
  Layers,
  MapPin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import NotificationCenter from "@/components/notification-center";
import { MobileCameraModal } from "@/components/mobile/mobile-camera-modal";

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
  minimumStock: number;
  maximumStock?: number;
  usage30d?: number;
  dailyBurnRate?: number;
  runoutDays?: number | null;
  updatedAt: string;
}

interface DashboardStats {
  branchId: number | null;
  branchName: string;
  activeShipmentsCount: number;
  pendingUnitsCount: number;
  receivedUnitsCount: number;
  installedUnitsCount: number;
  verifiedUnitsCount: number;
}

interface Shipment {
  id: number;
  referenceNo: string;
  transactionDate: string;
  totalUnits: number;
  receivedUnits: number;
  receiptStatus: "PENDING" | "PARTIAL" | "COMPLETED";
}

export function MobileBranchHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [cameraOpen, setCameraOpen] = useState(false);

  // Queries
  const { data: branchStocksData } = useQuery<{ data: BranchStockRow[] } | BranchStockRow[]>({
    queryKey: ["branch-stocks", user?.branchId],
    queryFn: () => {
      const url = user?.branchId
        ? `/api/branch-stocks?branchId=${user.branchId}`
        : "/api/branch-stocks";
      return apiFetch<{ data: BranchStockRow[] } | BranchStockRow[]>(url);
    },
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery<DashboardStats>({
    queryKey: ["branch-dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/branch/dashboard-stats"),
  });

  const { data: shipmentsData } = useQuery<{ data: Shipment[] } | Shipment[]>({
    queryKey: ["branch-shipments"],
    queryFn: () => apiFetch<{ data: Shipment[] } | Shipment[]>("/api/branch/shipments"),
  });

  const allStocks: BranchStockRow[] = useMemo(() => {
    if (Array.isArray(branchStocksData)) return branchStocksData;
    return branchStocksData?.data || [];
  }, [branchStocksData]);

  const shipments: Shipment[] = useMemo(() => {
    if (Array.isArray(shipmentsData)) return shipmentsData;
    return shipmentsData?.data || [];
  }, [shipmentsData]);

  // Statistics
  const stockStats = useMemo(() => {
    let totalUnits = 0;
    let safeCount = 0;
    let lowCount = 0;
    let outCount = 0;

    for (const item of allStocks) {
      totalUnits += item.quantity;
      const minStock = item.minimumStock ?? 5;
      if (item.quantity <= 0) outCount++;
      else if (item.quantity <= minStock) lowCount++;
      else safeCount++;
    }

    const totalItems = allStocks.length || 1;
    const safePercent = Math.round((safeCount / totalItems) * 100);

    return { totalUnits, safeCount, lowCount, outCount, totalItems: allStocks.length, safePercent };
  }, [allStocks]);

  const pendingShipments = shipments.filter((s) => s.receiptStatus !== "COMPLETED");

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CB";

  const firstName = user?.fullName?.split(" ")[0] || "Petugas";
  const branchName = user?.branchName || "Cabang Praya";

  // Mock field technician team for the "Recipient" avatar row
  const technicians = [
    { name: "Ahmad", role: "Teknisi Senior", avatar: "A" },
    { name: "Supardi", role: "Pemasangan", avatar: "S" },
    { name: "Hadi", role: "Pipa Distribusi", avatar: "H" },
    { name: "Yudi", role: "Meter Air", avatar: "Y" },
    { name: "Fauzi", role: "Lapangan", avatar: "F" },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* ── 1. HERO GRADIENT HEADER (ala Fintech App Image 2) ── */}
      <div className="relative bg-gradient-to-b from-blue-700 via-indigo-600 to-sky-500 text-white rounded-b-[36px] pt-4 pb-7 px-5 shadow-xl overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

        {/* Top User Greeting Row */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-sm shadow-inner text-white">
              {initials}
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/80 leading-none">
                Selamat Datang,
              </p>
              <h1 className="text-lg font-extrabold text-white tracking-tight leading-snug mt-0.5">
                {firstName}
              </h1>
            </div>
          </div>

          {/* Right Action Icons (Frosted Glass circles ala Image 2) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/cabang/stok-material")}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-xs"
              title="Cari Material"
            >
              <Search className="w-4 h-4" />
            </button>
            <div className="text-white [&_button]:bg-white/15 [&_button]:backdrop-blur-md [&_button]:border-white/20 [&_button]:text-white [&_button]:hover:bg-white/25 [&_button]:w-10 [&_button]:h-10 [&_button]:rounded-full [&_button]:shadow-xs">
              <NotificationCenter />
            </div>
          </div>
        </div>

        {/* Total Balance / Stock Card (Frosted Glass ala Image 2) */}
        <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/90 tracking-wide">
              Total Stok Fisik Cabang
            </span>
            {/* Currency/Branch Pill (ala USD pill in Image 2) */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-semibold text-white shadow-xs">
              <MapPin className="w-3 h-3 text-sky-200" />
              <span className="truncate max-w-[120px]">{branchName}</span>
              <span className="text-[9px] opacity-75">▾</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xs">
              {formatNumber(stockStats.totalUnits)}
            </span>
            <span className="text-sm font-semibold text-white/80">Unit Fisik</span>
          </div>

          {/* Stock Health Micro Status */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{stockStats.safeCount} Item Stok Aman ({stockStats.safePercent}%)</span>
            </div>
            {stockStats.lowCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 text-[10px] font-bold border border-amber-300/40">
                {stockStats.lowCount} Menipis
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. NEW CLEAN QUICK SHORTCUTS (Clean Fintech ala Image 2) ── */}
      <div className="px-5">
        <div className="grid grid-cols-4 gap-2.5">
          {/* Cek Stok */}
          <button
            onClick={() => navigate("/cabang/stok-material")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">
              Cek Stok
            </span>
          </button>

          {/* Terima Barang */}
          <button
            onClick={() => navigate("/cabang/receive")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">
              Terima SJ
            </span>
          </button>

          {/* Lacak Kiriman */}
          <button
            onClick={() => navigate("/cabang/tracking")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">
              Lacak
            </span>
          </button>

          {/* Scan Barcode */}
          <button
            onClick={() => setCameraOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">
              Scan QR
            </span>
          </button>
        </div>

        {/* Secondary Action Row: Catat Pasang & Retur */}
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">Catat Pasang</p>
              <p className="text-[10px] text-muted-foreground truncate">Lapor meter teknisi</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/transaksi/retur")}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">Retur Material</p>
              <p className="text-[10px] text-muted-foreground truncate">Kembalikan ke pusat</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── 3. MONTHLY USAGE PROGRESS (ala "Spent this month" Image 2) ── */}
      <div className="px-5">
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Pemakaian Aksesoris Bulan Ini
            </span>
            <span className="font-mono font-bold text-foreground">
              {statsData?.installedUnitsCount ?? 0} Unit Terpasang
            </span>
          </div>

          {/* Progress Bar (ala Image 2 green bar) */}
          <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  Math.round(((statsData?.installedUnitsCount ?? 12) / 100) * 100),
                  100
                )}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {Math.min(
                Math.round(((statsData?.installedUnitsCount ?? 12) / 100) * 100),
                100
              )}% dari target alokasi bulanan
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">100% Target</span>
          </div>
        </div>
      </div>

      {/* ── 4. TIM LAPANGAN CABANG (ala "Recipient" Image 2) ── */}
      <div className="px-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">Tim Lapangan Cabang</p>
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {/* Add Installation Action Button */}
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          >
            <div className="w-13 h-13 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/30">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Pasang</span>
          </button>

          {/* Technician Avatars */}
          {technicians.map((t) => (
            <div
              key={t.name}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-border/80 flex items-center justify-center font-bold text-sm text-foreground shadow-xs">
                {t.avatar}
              </div>
              <span className="text-[10px] font-semibold text-foreground max-w-[56px] truncate text-center">
                {t.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. AKTIVITAS & PENGIRIMAN TERKINI (ala "Transaction" Image 2) ── */}
      <div className="px-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">Pengiriman & Mutasi</p>
          {pendingShipments.length > 0 && (
            <button
              onClick={() => navigate("/cabang/tracking")}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {shipments.length === 0 ? (
          <div className="p-6 rounded-3xl bg-card border border-border/70 text-center space-y-1.5">
            <Clock className="w-6 h-6 mx-auto text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">Tidak Ada Mutasi Baru</p>
            <p className="text-[11px] text-muted-foreground">Semua surat jalan telah diterima.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shipments.slice(0, 4).map((s) => {
              const isDone = s.receiptStatus === "COMPLETED";
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/cabang/receive?shipment=${s.referenceNo}`)}
                  className="w-full text-left p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center gap-3 hover:border-primary/40 active:scale-[0.99] transition-all"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isDone
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Truck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-bold text-foreground truncate">
                      {s.referenceNo}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.transactionDate ? formatDate(s.transactionDate) : "Hari ini"} • Gudang Utama
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-xs font-mono font-bold leading-tight",
                        isDone ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                      )}
                    >
                      +{s.totalUnits} Unit
                    </p>
                    <span
                      className={cn(
                        "inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-0.5",
                        isDone
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      )}
                    >
                      {isDone ? "Diterima" : "Dalam Pengiriman"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 6. OFFICIAL FOOTER BRANDING (Requested text change) ── */}
      <div className="text-center pt-3 pb-2 space-y-1 px-5">
        <p className="text-[11px] text-muted-foreground font-medium">
          Aplikasi Monitoring Aksesoris · Perumdam Tirta Ardhia Rinjani
        </p>
        <p className="text-[12px] font-bold text-foreground">
          Inovasi Digital - Tim IT Sekretariat
        </p>
      </div>

      {/* Universal Camera Scanner Modal */}
      <MobileCameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}
