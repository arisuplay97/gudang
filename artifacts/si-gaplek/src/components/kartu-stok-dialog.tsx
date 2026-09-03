import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  Printer,
  X,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  Archive,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatNumber, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface StockCardEntry {
  date: string;
  type: string;
  typeLabel?: string;
  referenceNo: string;
  party: string;
  notes?: string;
  in: number;
  out: number;
  balance: number;
  unitPrice?: number;
}

interface StockCardResponse {
  item: {
    id: number;
    code: string;
    name: string;
    categoryName?: string;
    unitName?: string;
    currentStock: number;
    minimumStock: number;
  };
  summary: {
    totalIn: number;
    totalOut: number;
    currentBalance: number;
    currentStock: number;
    totalTransactions: number;
  };
  entries: StockCardEntry[];
}

interface KartuStokDialogProps {
  itemId: number | null;
  open: boolean;
  onClose: () => void;
}

export function KartuStokDialog({ itemId, open, onClose }: KartuStokDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "7" | "30">("all");

  const { data, isLoading, refetch, isFetching } = useQuery<StockCardResponse>({
    queryKey: ["item-stock-card", itemId],
    queryFn: () => apiFetch<StockCardResponse>(`/api/items/${itemId}/stock-card`),
    enabled: open && !!itemId,
  });

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];

    let list = [...data.entries];

    if (periodFilter !== "all") {
      const days = parseInt(periodFilter, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);
      list = list.filter((e) => new Date(e.date) >= cutoff);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.referenceNo.toLowerCase().includes(q) ||
          e.party.toLowerCase().includes(q) ||
          e.type.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data?.entries, periodFilter, searchTerm]);

  // Export Kartu Stok to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!data || !filteredEntries || filteredEntries.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada riwayat pergerakan stok untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      const wsData: any[][] = [
        ["KARTU STOK MATERIAL - PERUMDAM TIRTA ARDHIA RINJANI"],
        [`Kode Barang: ${data.item.code} | Nama: ${data.item.name}`],
        [`Kategori: ${data.item.categoryName || "-"} | Satuan: ${data.item.unitName || "Buah"} | Stok Saat Ini: ${data.item.currentStock}`],
        [],
        ["NO", "TANGGAL", "JENIS TRANSAKSI", "NO. REFERENSI", "PIHAK TERKAIT / KETERANGAN", "MASUK (+)", "KELUAR (-)", "SALDO BERJALAN"],
      ];

      filteredEntries.forEach((e, idx) => {
        const dt = new Date(e.date).toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        wsData.push([
          idx + 1,
          dt,
          e.type,
          e.referenceNo,
          e.party,
          e.in > 0 ? e.in : "-",
          e.out > 0 ? e.out : "-",
          e.balance,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 35 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Kartu_Stok");
      XLSX.writeFile(wb, `KARTU_STOK_${data.item.code}_${Date.now()}.xlsx`);

      toast({
        title: "Export Excel Berhasil",
        description: `Kartu Stok ${data.item.code} berhasil diunduh.`,
      });
    } catch (err: any) {
      toast({
        title: "Gagal Export",
        description: err.message || "Terjadi kesalahan saat membuat file Excel.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                  Kartu Stok Material (Stock Ledger)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {data?.item.code} • {data?.item.name} ({data?.item.unitName || "Buah"})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1 text-xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={handleExportExcel}
                size="sm"
                disabled={!filteredEntries.length}
                className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/20 border-b">
          <div className="bg-card p-3 rounded-lg border border-border/80">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
              Stok Saat Ini
            </span>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {formatNumber(data?.summary.currentStock ?? 0)}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {data?.item.unitName || "Buah"}
              </span>
            </p>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border/80">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              Total Masuk
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
              +{formatNumber(data?.summary.totalIn ?? 0)}
            </p>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border/80">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-600" />
              Total Keluar
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
              -{formatNumber(data?.summary.totalOut ?? 0)}
            </p>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border/80">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
              Total Mutasi Transaksi
            </span>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {data?.summary.totalTransactions ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">Riwayat</span>
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2.5 bg-card border-b flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari no. referensi, pihak, tipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setPeriodFilter("all")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1 text-xs font-medium rounded-md transition-all",
                periodFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semua
            </button>
            <button
              onClick={() => setPeriodFilter("30")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1 text-xs font-medium rounded-md transition-all",
                periodFilter === "30"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              30 Hari
            </button>
            <button
              onClick={() => setPeriodFilter("7")}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1 text-xs font-medium rounded-md transition-all",
                periodFilter === "7"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              7 Hari
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-xs z-10">
              <TableRow className="text-xs">
                <TableHead className="w-12 text-center">NO</TableHead>
                <TableHead className="w-36">TANGGAL & WAKTU</TableHead>
                <TableHead className="w-32">JENIS</TableHead>
                <TableHead className="w-36">NO. REFERENSI</TableHead>
                <TableHead className="min-w-[220px]">PIHAK TERKAIT / KETERANGAN</TableHead>
                <TableHead className="w-24 text-right">MASUK (+)</TableHead>
                <TableHead className="w-24 text-right">KELUAR (-)</TableHead>
                <TableHead className="w-28 text-right font-bold">SALDO AKHIR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                    Tidak ada riwayat pergerakan stok untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((row, idx) => {
                  const isMasuk = row.type.includes("MASUK") || row.type.includes("(+)");
                  const isKeluar = row.type.includes("KELUAR") || row.type.includes("(-)") || row.type.includes("SUPPLIER");

                  return (
                    <TableRow key={idx} className="text-xs hover:bg-muted/40">
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono">
                        {new Date(row.date).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold uppercase px-2 py-0.5",
                            isMasuk && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
                            isKeluar && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                            !isMasuk && !isKeluar && "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800"
                          )}
                        >
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium text-foreground">
                        {row.referenceNo}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{row.party}</span>
                        {row.notes && row.notes !== "-" && (
                          <span className="block text-[11px] text-muted-foreground">
                            {row.notes}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {row.in > 0 ? `+${formatNumber(row.in)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                        {row.out > 0 ? `-${formatNumber(row.out)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-extrabold text-foreground bg-muted/20">
                        {formatNumber(row.balance)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
