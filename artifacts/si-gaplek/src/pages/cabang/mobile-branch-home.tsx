import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import {
  Boxes,
  PackageCheck,
  ShieldAlert,
  Wrench,
  ScanBarcode,
  QrCode,
  RotateCcw,
  ArrowRight,
  Search,
  X,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { LabelQrPrintDialog, type LabelItem } from "@/components/label-qr-print-dialog";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [qrPrintOpen, setQrPrintOpen] = useState(false);
  const [qrPrintItems, setQrPrintItems] = useState<LabelItem[]>([]);

  // Queries
  const { data: branchStocksData } = useQuery<{ data: BranchStockRow[] } | BranchStockRow[]>({
    queryKey: ["branch-stocks", user?.branchId],
    queryFn: () => {
      const url = user?.branchId ? `/api/branch-stocks?branchId=${user.branchId}` : "/api/branch-stocks";
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

  // Statistics calculation
  const stockStats = useMemo(() => {
    let totalUnits = 0;
    let safeCount = 0;
    let lowCount = 0;
    let outCount = 0;

    for (const item of allStocks) {
      totalUnits += item.quantity;
      const minStock = item.minimumStock ?? 5;
      if (item.quantity <= 0) {
        outCount++;
      } else if (item.quantity <= minStock) {
        lowCount++;
      } else {
        safeCount++;
      }
    }

    const totalItems = allStocks.length || 1;
    const safePercent = Math.round((safeCount / totalItems) * 100);
    const lowPercent = Math.round((lowCount / totalItems) * 100);
    const outPercent = Math.round((outCount / totalItems) * 100);

    return {
      totalUnits,
      safeCount,
      lowCount,
      outCount,
      totalItems: allStocks.length,
      safePercent,
      lowPercent,
      outPercent,
    };
  }, [allStocks]);

  const handleOpenBulkQr = () => {
    const items: LabelItem[] = allStocks.map((r) => ({
      id: r.itemId,
      code: r.itemCode,
      name: r.itemName,
      barcode: `${window.location.origin}/cabang/quick-material?code=${encodeURIComponent(r.itemCode)}&branch=${r.branchId}`,
      categoryName: r.categoryName || undefined,
      unitName: r.unitName || undefined,
      locationName: r.branchName,
      rackCode: `RAK-${r.branchName.replace(/\s+/g, "").toUpperCase()}`,
    }));
    setQrPrintItems(items);
    setQrPrintOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cabang/stok-material?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/cabang/stok-material");
    }
  };

  return (
    <div className="space-y-4 pb-6 select-none">
      {/* ── 1. Search Pill Input (Gaya Image 1 Screen 1) ── */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Cari material, kode rak, surat jalan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 pl-10 pr-9 text-xs rounded-2xl bg-card border-border/80 shadow-2xs placeholder:text-muted-foreground/60 transition-all focus:border-primary/80"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </form>

      {/* ── 2. 2x2 SaaS Metric Grid (Exact Replica Image 1 Screen 1) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Total Sisa Fisik */}
        <div
          onClick={() => navigate("/cabang/stok-material")}
          className="group p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 cursor-pointer hover:border-border transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <Boxes className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Siap Pasang
            </span>
          </div>
          <div>
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground block">
              Total Sisa Fisik
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {formatNumber(stockStats.totalUnits)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Unit</span>
            </div>
          </div>
        </div>

        {/* Card 2: Stok Aman */}
        <div
          onClick={() => navigate("/cabang/stok-material")}
          className="group p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 cursor-pointer hover:border-border transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <PackageCheck className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {stockStats.safePercent}% Aman
            </span>
          </div>
          <div>
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground block">
              Kondisi Optimal
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {stockStats.safeCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Item</span>
            </div>
          </div>
        </div>

        {/* Card 3: Menipis / Kritis */}
        <div
          onClick={() => navigate("/cabang/stok-material")}
          className="group p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 cursor-pointer hover:border-border transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
              <ShieldAlert className="w-4 h-4 stroke-[2]" />
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                stockStats.lowCount > 0
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                  : "bg-muted text-muted-foreground border-border/50"
              )}
            >
              {stockStats.lowCount > 0 ? "Perlu Order" : "Aman"}
            </span>
          </div>
          <div>
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground block">
              Di Bawah Minimum
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={cn(
                  "font-mono text-2xl font-bold tracking-tight",
                  stockStats.lowCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                )}
              >
                {stockStats.lowCount}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Item</span>
            </div>
          </div>
        </div>

        {/* Card 4: Terpasang Lapangan */}
        <div
          onClick={() => navigate("/cabang/pemasangan")}
          className="group p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5 cursor-pointer hover:border-border transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
              <Wrench className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
              Bulan Ini
            </span>
          </div>
          <div>
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground block">
              Pemasangan Lapangan
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {statsData?.installedUnitsCount ?? 0}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase">Unit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Overview Segmented Track (Exact Replica Image 1 Screen 1 "Pipeline Overview") ── */}
      <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-foreground">Kondisi Ketersediaan Stok</span>
            <p className="text-[11px] text-muted-foreground">Distribusi kesehatan fisik material cabang</p>
          </div>
          <button
            onClick={() => navigate("/cabang/stok-material")}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
          >
            Lihat Stok <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatNumber(stockStats.totalUnits)}
            </span>
            <span className="text-xs text-muted-foreground uppercase font-semibold">Unit Fisik</span>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {stockStats.safePercent}% Siap Pakai
          </span>
        </div>

        {/* Segmented Vertical Pill Bars Track */}
        <div className="flex items-center gap-1 h-7 w-full py-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const thresholdSafe = Math.round((stockStats.safePercent / 100) * 24);
            const thresholdLow = thresholdSafe + Math.round((stockStats.lowPercent / 100) * 24);

            let barColor = "bg-muted";
            if (i < thresholdSafe) barColor = "bg-emerald-500";
            else if (i < thresholdLow) barColor = "bg-amber-500";
            else if (stockStats.outCount > 0) barColor = "bg-rose-500";

            return (
              <div
                key={i}
                className={cn("flex-1 h-full rounded-full transition-all", barColor)}
              />
            );
          })}
        </div>

        {/* Legend Pills with Counts */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Aman:</span>
            <strong className="font-mono text-foreground font-semibold ml-auto">{stockStats.safeCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">Menipis:</span>
            <strong className="font-mono text-foreground font-semibold ml-auto">{stockStats.lowCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">Habis:</span>
            <strong className="font-mono text-foreground font-semibold ml-auto">{stockStats.outCount}</strong>
          </div>
        </div>
      </div>

      {/* ── 4. Quick Actions Row (Exact Replica Image 1 Screen 2 "Quick Actions") ── */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-foreground px-0.5 block">Aksi Cepat Lapangan</span>
        <div className="grid grid-cols-4 gap-2">
          {/* Action 1: Terima SJ */}
          <button
            onClick={() => navigate("/cabang/receive")}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/80 hover:border-border active:scale-95 transition-all text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <ScanBarcode className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">Terima SJ</span>
          </button>

          {/* Action 2: Catat Pasang */}
          <button
            onClick={() => navigate("/cabang/pemasangan")}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/80 hover:border-border active:scale-95 transition-all text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
              <Wrench className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">Catat Pasang</span>
          </button>

          {/* Action 3: Label Rak */}
          <button
            onClick={handleOpenBulkQr}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/80 hover:border-border active:scale-95 transition-all text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <QrCode className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">Label Rak</span>
          </button>

          {/* Action 4: Retur Pusat */}
          <button
            onClick={() => navigate("/transaksi/retur")}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/80 hover:border-border active:scale-95 transition-all text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
              <RotateCcw className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[11px] font-semibold text-foreground leading-tight">Retur Pusat</span>
          </button>
        </div>
      </div>

      {/* ── 5. Recent Activity / Mutasi Terakhir (Exact Replica Image 1 & 2) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-foreground">Pengiriman & Surat Jalan Aktif</span>
          <button
            onClick={() => navigate("/cabang/tracking")}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
          >
            Lacak Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {shipments.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-card border border-dashed border-border text-xs text-muted-foreground space-y-1">
            <Clock className="w-6 h-6 mx-auto text-muted-foreground/40 stroke-[1.5]" />
            <p className="font-semibold text-foreground">Tidak Ada Pengiriman Aktif</p>
            <p className="text-[11px]">Semua Surat Jalan telah diterima dan terverifikasi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shipments.slice(0, 4).map((s) => {
              const isCompleted = s.receiptStatus === "COMPLETED";
              return (
                <div
                  key={s.id}
                  onClick={() => navigate("/cabang/receive")}
                  className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs hover:border-border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                        isCompleted
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      )}
                    >
                      <ScanBarcode className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-foreground block truncate">
                        {s.referenceNo}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {s.transactionDate ? formatDate(s.transactionDate) : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-foreground block">
                      {s.totalUnits} Unit
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      )}
                    >
                      {isCompleted ? "Selesai" : "Menunggu"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Cetak Label QR Stiker Rak */}
      <LabelQrPrintDialog
        open={qrPrintOpen}
        onClose={() => setQrPrintOpen(false)}
        items={qrPrintItems}
      />
    </div>
  );
}
