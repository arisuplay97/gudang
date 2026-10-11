/**
 * MobileBranchHome — Home screen for CABANG PWA.
 * Clean SaaS dashboard inspired by Folio/Linear mobile.
 * NO quick-action grid (handled by tab bar), NO FAB, NO redundancy.
 */
import { useMemo } from "react";
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
  ArrowRight,
} from "lucide-react";
import { DashboardServiceGrid } from "@/components/mobile/dashboard-service-grid";

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

  return (
    <div className="space-y-4 pb-2">
      {/* ── Branch Header Context ── */}
      <div className="flex items-center justify-between pt-0.5 pb-1">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            UNIT LAYANAN CABANG
          </p>
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            {user?.branchName || "Cabang Praya (Lombok Tengah)"}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </span>
      </div>

      {/* ── MAIN SHORTCUT CARD (6 Icons ala Reference Image) ── */}
      <DashboardServiceGrid />

      {/* ── KPI Metrics: 2×2 Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Sisa Fisik */}
        <button
          onClick={() => navigate("/cabang/stok-material")}
          className="text-left p-4 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Boxes className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Total Sisa Fisik
            </p>
            <p className="font-mono text-[22px] font-bold text-foreground leading-none mt-0.5 tracking-tight">
              {formatNumber(stockStats.totalUnits)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">unit di cabang</p>
          </div>
        </button>

        {/* Stok Aman */}
        <button
          onClick={() => navigate("/cabang/stok-material")}
          className="text-left p-4 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <PackageCheck className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Stok Aman
            </p>
            <p className="font-mono text-[22px] font-bold text-foreground leading-none mt-0.5 tracking-tight">
              {stockStats.safeCount}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {stockStats.safePercent}% dari total
            </p>
          </div>
        </button>

        {/* Di Bawah Minimum */}
        <button
          onClick={() => navigate("/cabang/stok-material")}
          className="text-left p-4 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2 active:scale-[0.97] transition-transform"
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              stockStats.lowCount > 0 ? "bg-rose-500/10" : "bg-muted/60"
            )}
          >
            <ShieldAlert
              className={cn(
                "w-[18px] h-[18px]",
                stockStats.lowCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
              )}
            />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Di Bawah Minimum
            </p>
            <p
              className={cn(
                "font-mono text-[22px] font-bold leading-none mt-0.5 tracking-tight",
                stockStats.lowCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              )}
            >
              {stockStats.lowCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stockStats.lowCount > 0 ? "perlu order" : "semua aman"}
            </p>
          </div>
        </button>

        {/* Terpasang Bulan Ini */}
        <button
          onClick={() => navigate("/cabang/pemasangan")}
          className="text-left p-4 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Wrench className="w-[18px] h-[18px] text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Terpasang
            </p>
            <p className="font-mono text-[22px] font-bold text-foreground leading-none mt-0.5 tracking-tight">
              {statsData?.installedUnitsCount ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">bulan ini</p>
          </div>
        </button>
      </div>

      {/* ── Stock Health Bar ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Kesehatan Stok</p>
          <button
            onClick={() => navigate("/cabang/stok-material")}
            className="text-[11px] font-semibold text-primary flex items-center gap-0.5"
          >
            Detail <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Segmented Bar */}
        <div className="flex gap-0.5 h-2 w-full rounded-full overflow-hidden bg-muted/40">
          {stockStats.safeCount > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${(stockStats.safeCount / (stockStats.totalItems || 1)) * 100}%`,
              }}
            />
          )}
          {stockStats.lowCount > 0 && (
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{
                width: `${(stockStats.lowCount / (stockStats.totalItems || 1)) * 100}%`,
              }}
            />
          )}
          {stockStats.outCount > 0 && (
            <div
              className="h-full bg-rose-500 rounded-full transition-all"
              style={{
                width: `${(stockStats.outCount / (stockStats.totalItems || 1)) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Aman {stockStats.safeCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Menipis {stockStats.lowCount}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Habis {stockStats.outCount}
          </span>
        </div>
      </div>

      {/* ── Active Shipments ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Pengiriman Aktif</p>
          {pendingShipments.length > 0 && (
            <button
              onClick={() => navigate("/cabang/receive")}
              className="text-[11px] font-semibold text-primary flex items-center gap-0.5"
            >
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {pendingShipments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-card border border-dashed border-border/70 text-center space-y-1.5">
            <Clock className="w-7 h-7 mx-auto text-muted-foreground/30" />
            <p className="text-[13px] font-medium text-foreground">
              Tidak Ada Pengiriman Aktif
            </p>
            <p className="text-[11px] text-muted-foreground">
              Semua surat jalan telah diterima.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingShipments.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate("/cabang/receive")}
                className="w-full text-left p-3.5 rounded-2xl bg-card border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                  <ScanBarcode className="w-[18px] h-[18px] text-sky-600 dark:text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[13px] font-bold text-foreground truncate">
                    {s.referenceNo}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.transactionDate ? formatDate(s.transactionDate) : "-"} •{" "}
                    {s.totalUnits} unit
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                    s.receiptStatus === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  {s.receiptStatus === "COMPLETED"
                    ? "Selesai"
                    : s.receiptStatus === "PARTIAL"
                    ? "Sebagian"
                    : "Menunggu"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
