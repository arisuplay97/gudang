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
import {
  IconCekStok,
  IconTerimaBarang,
  IconLacakKiriman,
  IconScanBarcode,
  IconCatatPasang,
  IconReturMaterial,
  IconTimTeknisi,
  IconPetaGis,
  IconBantuanCS,
} from "@/components/mobile/mobile-feature-icons";

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
      {/* ── 1. CLEAN GROUNDED APP HEADER (Zero Gradient AI Slop) ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-5 pt-5 pb-5 space-y-4">
        {/* Top Identity Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-200/80 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-blue-700 dark:text-blue-400 shadow-2xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  SIMONA CABANG
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                  {branchName}
                </span>
              </div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                {firstName}
              </h1>
            </div>
          </div>

          {/* Clean Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/cabang/stok-material")}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              title="Cari Material"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
            <div className="[&_button]:w-10 [&_button]:h-10 [&_button]:rounded-2xl [&_button]:bg-slate-100 dark:[&_button]:bg-slate-800 [&_button]:border [&_button]:border-slate-200/80 dark:[&_button]:border-slate-700 [&_button]:text-slate-600 dark:[&_button]:text-slate-300">
              <NotificationCenter />
            </div>
          </div>
        </div>

        {/* Solid Executive Physical Stock Card */}
        <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-3xl p-5 shadow-xs border border-slate-800/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Stok Aksesoris Tersedia</span>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 dark:bg-slate-700/80 text-slate-300 font-mono text-[11px] font-semibold border border-slate-700/60">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span>{branchName}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {formatNumber(stockStats.totalUnits)}
            </span>
            <span className="text-xs text-slate-400 font-medium">Unit Fisik di Cabang</span>
          </div>

          {/* Micro metrics bar */}
          <div className="pt-3 border-t border-slate-800/80 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{stockStats.safeCount} Item Aman ({stockStats.safePercent}%)</span>
            </div>
            {stockStats.lowCount > 0 ? (
              <span className="text-amber-400 font-semibold">⚠ {stockStats.lowCount} Menipis</span>
            ) : (
              <span className="text-slate-400 font-normal">Stok Terjaga</span>
            )}
            <span className="text-sky-400 font-medium">{pendingShipments.length} SJ Aktif</span>
          </div>
        </div>
      </div>

      {/* ── 2. FEATURE SHORTCUTS GRID (3x3 Squircle Cards matching reference image) ── */}
      <div className="px-5 space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            LAYANAN UTAMA
          </p>
          <span className="text-[11px] font-medium text-slate-400">9 Modul</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* 1. Cek Stok */}
          <button
            onClick={() => navigate("/cabang/stok-material")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconCekStok className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Cek Stok
            </span>
          </button>

          {/* 2. Terima SJ */}
          <button
            onClick={() => navigate("/cabang/receive")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconTerimaBarang className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Terima SJ
            </span>
          </button>

          {/* 3. Lacak Kiriman */}
          <button
            onClick={() => navigate("/cabang/tracking")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconLacakKiriman className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Lacak Kiriman
            </span>
          </button>

          {/* 4. Scan Barcode */}
          <button
            onClick={() => setCameraOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconScanBarcode className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Scan Barcode
            </span>
          </button>

          {/* 5. Catat Pasang */}
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconCatatPasang className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Catat Pasang
            </span>
          </button>

          {/* 6. Retur Material */}
          <button
            onClick={() => navigate("/transaksi/retur")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconReturMaterial className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Retur Material
            </span>
          </button>

          {/* 7. Tim Petugas */}
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconTimTeknisi className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Tim Petugas
            </span>
          </button>

          {/* 8. Titik GIS */}
          <button
            onClick={() => navigate("/cabang/tracking")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconPetaGis className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              Titik GIS
            </span>
          </button>

          {/* 9. SOP & Laporan */}
          <button
            onClick={() => navigate("/laporan/pemasangan-aksesoris")}
            className="flex flex-col items-center justify-center p-3 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-blue-400 active:scale-95 transition-all aspect-square text-center group"
          >
            <div className="w-13 h-13 rounded-full bg-[#FFF3E8] dark:bg-slate-800 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105">
              <IconBantuanCS className="w-10 h-10" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              SOP & Laporan
            </span>
          </button>
        </div>
      </div>

      {/* ── 3. MONTHLY USAGE PROGRESS (Clean Solid Bar) ── */}
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

          {/* Progress Bar (Clean Solid Emerald Bar) */}
          <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
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
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm text-slate-800 dark:text-slate-100 shadow-2xs">
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
