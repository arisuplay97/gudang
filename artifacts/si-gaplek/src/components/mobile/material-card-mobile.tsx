import { Building2, ChevronRight, Clock, History, QrCode } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface MobileStockItem {
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
  usage7d?: number;
  dailyBurnRate?: number;
  runoutDays?: number | null;
  updatedAt: string;
}

interface MaterialCardMobileProps {
  item: MobileStockItem;
  onClick: () => void;
  onOpenLedger: (e: React.MouseEvent) => void;
  onOpenQr: (e: React.MouseEvent) => void;
}

export function MaterialCardMobile({
  item,
  onClick,
  onOpenLedger,
  onOpenQr,
}: MaterialCardMobileProps) {
  const minStock = item.minimumStock ?? 5;
  const isSafe = item.quantity > minStock;
  const isLow = item.quantity > 0 && item.quantity <= minStock;
  const isOut = item.quantity <= 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all duration-200 active:scale-[0.985] hover:border-border hover:shadow-sm cursor-pointer space-y-3 select-none"
    >
      {/* Top Meta Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
            {item.itemCode}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Building2 className="w-3 h-3 text-muted-foreground/70" />
            {item.branchName}
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Item Title & Category */}
      <div>
        <h3 className="text-sm font-bold text-foreground leading-snug tracking-tight">
          {item.itemName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.categoryName || "Aksesoris"} • Satuan: {item.unitName || "Pcs"}
        </p>
      </div>

      {/* Stock Value & Status Badge */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 block">
            Sisa Fisik di Cabang
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatNumber(item.quantity)}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {item.unitName || "Pcs"}
            </span>
          </div>
        </div>

        {/* Refined SaaS Status Badge */}
        <div>
          {isSafe && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              Aman
            </span>
          )}
          {isLow && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-500/[0.08] text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              Menipis
            </span>
          )}
          {isOut && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-500/[0.08] text-rose-800 dark:text-rose-300 border border-rose-500/25 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
              Habis
            </span>
          )}
        </div>
      </div>

      {/* Progress & Runway Prediction Bar */}
      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
        {/* Safety stock visual meter */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isSafe && "bg-emerald-500",
                isLow && "bg-amber-500",
                isOut && "bg-rose-500"
              )}
              style={{
                width: `${Math.min(100, Math.max(8, (item.quantity / (minStock * 2 || 10)) * 100))}%`,
              }}
            />
          </div>
          <span className="text-[10.5px] text-muted-foreground/80 truncate">
            Min: <strong className="font-mono text-foreground font-semibold">{minStock}</strong>
          </span>
        </div>

        {/* Runway Days Chip */}
        <div>
          {item.runoutDays !== null && item.runoutDays !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border",
                item.runoutDays <= 3
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 font-semibold"
                  : item.runoutDays <= 7
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 font-medium"
                  : "bg-muted/60 text-muted-foreground border-border/50"
              )}
            >
              <Clock className="w-2.5 h-2.5" />
              Habis ±{item.runoutDays} hr
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 select-none">
              Stok pasif
            </span>
          )}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenQr}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1 rounded-lg"
        >
          <QrCode className="w-3.5 h-3.5 text-sky-600" />
          Label Rak
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenLedger}
          className="h-8 px-2.5 text-xs text-foreground hover:bg-muted gap-1 rounded-lg border-border/70"
        >
          <History className="w-3.5 h-3.5 text-primary" />
          Kartu Stok
        </Button>
      </div>
    </div>
  );
}
