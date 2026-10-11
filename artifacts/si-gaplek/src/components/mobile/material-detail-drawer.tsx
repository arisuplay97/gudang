import { useState } from "react";
import {
  Building2,
  SlidersHorizontal,
  History,
  Flame,
  Clock,
  QrCode,
  Wrench,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import type { MobileStockItem } from "./material-card-mobile";

interface BranchLedgerRow {
  id: number;
  movementDate: string;
  movementType: string;
  direction: "in" | "out";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceNo?: string | null;
  userName?: string | null;
  notes?: string | null;
}

interface MaterialDetailDrawerProps {
  item: MobileStockItem | null;
  open: boolean;
  onClose: () => void;
  ledgerRows: BranchLedgerRow[];
  loadingLedger: boolean;
  onUpdateThreshold: (id: number, minStock: number) => void;
  isUpdatingThreshold: boolean;
  onOpenQr: (item: MobileStockItem) => void;
  onNavigatePemasangan: () => void;
  onNavigateRetur: () => void;
}

export function MaterialDetailDrawer({
  item,
  open,
  onClose,
  ledgerRows,
  loadingLedger,
  onUpdateThreshold,
  isUpdatingThreshold,
  onOpenQr,
  onNavigatePemasangan,
  onNavigateRetur,
}: MaterialDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"detail" | "ledger">("detail");
  const [editMinVal, setEditMinVal] = useState<number>(item?.minimumStock ?? 5);

  if (!item) return null;

  const minStock = item.minimumStock ?? 5;
  const isSafe = item.quantity > minStock;
  const isLow = item.quantity > 0 && item.quantity <= minStock;
  const isOut = item.quantity <= 0;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88vh] flex flex-col rounded-t-[28px] border-t border-border/80 bg-card p-0 shadow-2xl">
        {/* iOS Drag Handle */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        {/* Header */}
        <DrawerHeader className="p-4 pb-2 text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                {item.itemCode}
              </span>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {item.branchName}
              </span>
            </div>

            {/* Status Tag */}
            <div>
              {isSafe && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  Aman
                </span>
              )}
              {isLow && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </span>
                  Menipis
                </span>
              )}
              {isOut && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                  Habis
                </span>
              )}
            </div>
          </div>

          <DrawerTitle className="text-lg font-bold text-foreground tracking-tight pt-1">
            {item.itemName}
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            {item.categoryName || "Aksesoris"} • Satuan: {item.unitName || "Pcs"}
          </DrawerDescription>
        </DrawerHeader>

        {/* Segmented Pill Tabs (iOS / Figma Style) */}
        <div className="px-4 py-1">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-medium">
            <button
              onClick={() => setActiveTab("detail")}
              className={cn(
                "py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 select-none",
                activeTab === "detail"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Info & Safety Stock
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={cn(
                "py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 select-none",
                activeTab === "ledger"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="w-3.5 h-3.5" />
              Riwayat Mutasi ({ledgerRows.length})
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {activeTab === "detail" && (
            <div className="space-y-3.5">
              {/* 2x2 Metric Card */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 block">
                    Sisa Fisik Saat Ini
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-foreground">
                      {formatNumber(item.quantity)}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">{item.unitName || "pcs"}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 block">
                    Batas Minimum (Safety)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {minStock}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase">{item.unitName || "pcs"}</span>
                  </div>
                </div>
              </div>

              {/* Analisis Laju Pemakaian Card */}
              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Analisis Konsumsi Lapangan
                  </span>
                  <span className="text-[10px] text-muted-foreground">30 Hari Terakhir</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Laju Pemasangan</span>
                    <span className="font-mono text-sm font-bold text-foreground">
                      {item.dailyBurnRate ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">unit/hari</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-card border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Estimasi Sisa Waktu</span>
                    {item.runoutDays !== null && item.runoutDays !== undefined ? (
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          item.runoutDays <= 3
                            ? "text-rose-600 dark:text-rose-400"
                            : item.runoutDays <= 7
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        ± {item.runoutDays} Hari
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">Stok Pasif</span>
                    )}
                  </div>
                </div>

                {item.runoutDays != null && item.runoutDays <= 3 && (
                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Stok kritis! Segera ajukan restock ke Gudang Pusat.</span>
                  </div>
                )}
              </div>

              {/* Safety Stock Threshold Configurator */}
              <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                  Ubah Ambang Batas Minimum Cabang
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sistem akan otomatis memberikan peringatan jika stok fisik berada di bawah angka ini.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min="0"
                    value={editMinVal}
                    onChange={(e) => setEditMinVal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-8 text-xs font-mono font-bold w-24 text-center"
                  />
                  <Button
                    size="sm"
                    disabled={isUpdatingThreshold || editMinVal === minStock}
                    onClick={() => onUpdateThreshold(item.id, editMinVal)}
                    className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isUpdatingThreshold ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ledger" && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground block">
                Timeline Pergerakan Mutasi Fisik
              </span>

              {loadingLedger ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Memuat riwayat mutasi...
                </div>
              ) : ledgerRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic rounded-xl bg-muted/20 border border-border/50">
                  Belum ada catatan mutasi fisik untuk material ini.
                </div>
              ) : (
                /* Dotted Timeline Tracker (Gaya Referensi Gambar 1) */
                <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:border-l-2 before:border-dashed before:border-border">
                  {ledgerRows.map((m) => {
                    const isMasuk = m.direction === "in";
                    return (
                      <div key={m.id} className="relative space-y-1">
                        {/* Milestone dot */}
                        <div
                          className={cn(
                            "absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-background",
                            isMasuk ? "bg-emerald-500" : "bg-sky-500"
                          )}
                        />

                        <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {m.movementType === "INSTALLATION"
                                ? "Pemasangan Fisik (Keluar)"
                                : m.movementType === "RECEIPT"
                                ? "Penerimaan Surat Jalan (Masuk)"
                                : m.movementType === "REJECTION_ROLLBACK"
                                ? "Rollback Penolakan SPI"
                                : m.movementType === "RETURN"
                                ? "Retur ke Pusat"
                                : m.movementType}
                            </span>
                            <span
                              className={cn(
                                "font-mono font-bold text-xs",
                                isMasuk ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"
                              )}
                            >
                              {isMasuk ? `+${m.quantity}` : `-${m.quantity}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                            <span>{m.movementDate ? formatDate(m.movementDate) : "-"}</span>
                            <span className="font-mono">{m.referenceNo || "-"}</span>
                          </div>

                          {m.notes && (
                            <p className="text-[10.5px] text-muted-foreground italic pt-0.5">
                              {m.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Dual Action Footer (Gaya Referensi Gambar 1 & 2) */}
        <DrawerFooter className="p-4 pt-2 border-t border-border/80 flex flex-row items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenQr(item)}
            className="flex-1 text-xs h-10 gap-1.5 border-border/80 rounded-xl"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-600" />
            Cetak Label Rak
          </Button>

          <Button
            variant="default"
            onClick={() => {
              onClose();
              onNavigatePemasangan();
            }}
            className="flex-1 text-xs h-10 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs font-semibold"
          >
            <Wrench className="w-3.5 h-3.5" />
            Catat Pasang
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
