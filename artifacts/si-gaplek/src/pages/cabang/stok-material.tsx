import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  exportBeritaAcaraStokCabangPdf,
  exportKartuStokMaterialPdf,
  type BranchStockPdfRow,
  type BranchLedgerPdfRow,
} from "@/lib/export-branch-stock-pdf";
import {
  Layers,
  Search,
  Building2,
  Package,
  RotateCcw,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  X,
  ExternalLink,
  Wrench,
  ArrowUpDown,
  ChevronRight,
  TrendingDown,
  Warehouse,
  Printer,
  History,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  FileText,
  Calendar,
  Clock,
  Info,
  ShieldCheck,
  Boxes,
  ShieldAlert,
  PackageCheck,
  QrCode,
  Flame,
  ScanBarcode,
} from "lucide-react";
import { LabelQrPrintDialog, type LabelItem } from "@/components/label-qr-print-dialog";
import { MaterialCardMobile } from "@/components/mobile/material-card-mobile";
import { MaterialDetailDrawer } from "@/components/mobile/material-detail-drawer";

/* ── Interfaces ── */
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
  usage7d?: number;
  dailyBurnRate?: number;
  runoutDays?: number | null;
  updatedAt: string;
}

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
  createdAt?: string;
}

interface LedgerResponse {
  stockInfo: any;
  summary: {
    currentBalance: number;
    totalIn: number;
    totalOut: number;
    movementCount: number;
  };
  movements: BranchLedgerRow[];
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface Category {
  id: number;
  name: string;
}

/* ── CountUp Animation Hook ── */
function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    const step = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

/* ── Premium SaaS KPI Card ── */
interface SaaSKpiCardProps {
  label: string;
  value: number;
  unit?: string;
  description: string;
  icon: React.ElementType;
  badge?: {
    text: string;
    variant: "neutral" | "success" | "warning";
  };
  delay?: number;
}

function SaaSKpiCard({
  label,
  value,
  unit = "",
  description,
  icon: Icon,
  badge,
  delay = 0,
}: SaaSKpiCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/75 bg-card/90 backdrop-blur-sm p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs hover:border-border hover:-translate-y-0.5"
    >
      {/* Subtle top edge accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 truncate">
          {label}
        </span>
        <div className="w-7 h-7 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-all shrink-0">
          <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
        </div>
      </div>

      {/* Main Stat Metric */}
      <div className="my-1.5 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {formatNumber(animatedValue)}
        </span>
        {unit && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Context & Badge */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/30 text-[10.5px]">
        <span className="text-muted-foreground/75 truncate text-[10.5px] leading-tight">{description}</span>
        {badge && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-medium shrink-0 border select-none",
              badge.variant === "warning" &&
                "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-semibold",
              badge.variant === "success" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
              badge.variant === "neutral" &&
                "bg-muted/60 text-muted-foreground border-border/60"
            )}
          >
            {badge.variant === "warning" && (
              <span className="relative flex h-1 w-1 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-500" />
              </span>
            )}
            {badge.variant === "success" && (
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-500 mr-0.5" />
            )}
            {badge.text}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Refined Modern SaaS Status Badge ── */
function StockStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: "safe" | "low" | "out";
  size?: "sm" | "md";
  className?: string;
}) {
  if (status === "safe") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium tracking-tight transition-all select-none",
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
          "bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300",
          "border border-emerald-500/25 dark:border-emerald-500/35 shadow-[0_1px_2px_rgba(16,185,129,0.04)]",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" />
        <span>Aman</span>
      </span>
    );
  }

  if (status === "low") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md font-medium tracking-tight transition-all select-none",
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
          "bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
          "border border-amber-500/30 dark:border-amber-500/40 shadow-[0_1px_2px_rgba(245,158,11,0.05)]",
          className
        )}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
        </span>
        <span>Menipis</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium tracking-tight transition-all select-none",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        "bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
        "border border-rose-500/25 dark:border-rose-500/35 shadow-[0_1px_2px_rgba(244,63,94,0.04)]",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 ring-2 ring-rose-500/20" />
      <span>Habis</span>
    </span>
  );
}

/* ── Main Component ── */
export default function StokMaterialCabangPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Filters state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.role === "CABANG" && user?.branchId ? String(user.branchId) : "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "safe" | "low" | "out">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<"name" | "stock" | "branch" | "min">("branch");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Detail Modal & Ledger state
  const [detailItem, setDetailItem] = useState<BranchStockRow | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"detail" | "ledger">("detail");
  const [editMinStockValue, setEditMinStockValue] = useState<number>(5);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // QR Code Bin Card print state
  const [qrPrintOpen, setQrPrintOpen] = useState(false);
  const [qrPrintItems, setQrPrintItems] = useState<LabelItem[]>([]);

  const handleOpenBulkQrLabels = () => {
    const items: LabelItem[] = filteredRows.map((r) => ({
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

  const handleOpenSingleQrLabel = (item: BranchStockRow) => {
    const labelItem: LabelItem = {
      id: item.itemId,
      code: item.itemCode,
      name: item.itemName,
      barcode: `${window.location.origin}/cabang/quick-material?code=${encodeURIComponent(item.itemCode)}&branch=${item.branchId}`,
      categoryName: item.categoryName || undefined,
      unitName: item.unitName || undefined,
      locationName: item.branchName,
      rackCode: `RAK-${item.branchName.replace(/\s+/g, "").toUpperCase()}`,
    };
    setQrPrintItems([labelItem]);
    setQrPrintOpen(true);
  };

  // Queries
  const {
    data: branchStocksData,
    isLoading: loadingStocks,
    refetch: refetchStocks,
    isRefetching,
  } = useQuery({
    queryKey: ["branch-stocks", selectedBranchId],
    queryFn: () => {
      const url = selectedBranchId && selectedBranchId !== "all"
        ? `/api/branch-stocks?branchId=${selectedBranchId}`
        : "/api/branch-stocks";
      return apiFetch<{ data: BranchStockRow[] }>(url);
    },
    refetchInterval: 30_000,
  });

  const { data: branchesData } = useQuery<{ data: Branch[] } | Branch[]>({
    queryKey: ["branches-list"],
    queryFn: () => apiFetch<{ data: Branch[] } | Branch[]>("/api/branches"),
  });

  const { data: categoriesData } = useQuery<{ data: Category[] } | Category[]>({
    queryKey: ["categories-list"],
    queryFn: () => apiFetch<{ data: Category[] } | Category[]>("/api/categories"),
  });

  // Query Kartu Stok (Ledger) saat modal dibuka
  const {
    data: ledgerData,
    isLoading: loadingLedger,
    refetch: refetchLedger,
  } = useQuery<LedgerResponse>({
    queryKey: ["branch-stock-ledger", detailItem?.branchId, detailItem?.itemId],
    queryFn: async (): Promise<LedgerResponse> => {
      if (!detailItem) {
        return {
          stockInfo: null,
          summary: { currentBalance: 0, totalIn: 0, totalOut: 0, movementCount: 0 },
          movements: [],
        };
      }
      return apiFetch<LedgerResponse>(`/api/branch-stocks/${detailItem.branchId}/${detailItem.itemId}/ledger`);
    },
    enabled: !!detailItem && (activeModalTab === "ledger" || mobileDrawerOpen),
  });

  // Mutation: Update Batas Minimum Stok Dinamis
  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, minimumStock }: { id: number; minimumStock: number }) => {
      return apiFetch<{ message: string; data: any }>(`/api/branch-stocks/${id}/threshold`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumStock }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Batas Minimum Diperbarui",
        description: data.message || "Batas minimum safety stock berhasil disimpan.",
      });
      refetchStocks();
      if (detailItem) {
        setDetailItem((prev) => (prev ? { ...prev, minimumStock: editMinStockValue } : null));
      }
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Memperbarui",
        description: err.message || "Terjadi kesalahan saat menyimpan batas minimum.",
        variant: "destructive",
      });
    },
  });

  const branches: Branch[] = useMemo(() => {
    return Array.isArray(branchesData) ? branchesData : branchesData?.data || [];
  }, [branchesData]);

  const categories: Category[] = useMemo(() => {
    return Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || [];
  }, [categoriesData]);

  const allRows: BranchStockRow[] = useMemo(() => {
    if (Array.isArray(branchStocksData)) return branchStocksData;
    return branchStocksData?.data || [];
  }, [branchStocksData]);

  // Sync editMinStockValue saat detailItem berubah
  useEffect(() => {
    if (detailItem) {
      setEditMinStockValue(detailItem.minimumStock || 5);
      setActiveModalTab("detail");
    }
  }, [detailItem]);

  // Filtered rows dengan status dinamis berbasis minimumStock masing-masing
  const filteredRows = useMemo(() => {
    return allRows
      .filter((row) => {
        const minVal = row.minimumStock ?? 5;

        // Filter Cabang
        const matchBranch = selectedBranchId === "all" || row.branchId === Number(selectedBranchId);

        // Filter Kategori
        const matchCat =
          selectedCategory === "all" ||
          (row.categoryName && row.categoryName.toLowerCase() === selectedCategory.toLowerCase());

        // Filter Status Dinamis
        let matchStatus = true;
        if (statusFilter === "safe") matchStatus = row.quantity > minVal;
        else if (statusFilter === "low") matchStatus = row.quantity > 0 && row.quantity <= minVal;
        else if (statusFilter === "out") matchStatus = row.quantity === 0;

        // Search
        const s = searchTerm.toLowerCase().trim();
        const matchSearch =
          !s ||
          row.itemName.toLowerCase().includes(s) ||
          row.itemCode.toLowerCase().includes(s) ||
          row.branchName.toLowerCase().includes(s) ||
          (row.categoryName && row.categoryName.toLowerCase().includes(s));

        return matchBranch && matchCat && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "name") {
          comp = a.itemName.localeCompare(b.itemName);
        } else if (sortField === "stock") {
          comp = a.quantity - b.quantity;
        } else if (sortField === "min") {
          comp = (a.minimumStock ?? 5) - (b.minimumStock ?? 5);
        } else {
          comp = a.branchName.localeCompare(b.branchName);
        }
        return sortOrder === "asc" ? comp : -comp;
      });
  }, [allRows, selectedBranchId, selectedCategory, statusFilter, searchTerm, sortField, sortOrder]);

  // Overall Statistics dinamis
  const stats = useMemo(() => {
    const totalUnits = filteredRows.reduce((acc, r) => acc + (r.quantity || 0), 0);
    const uniqueItems = new Set(filteredRows.map((r) => r.itemId)).size;
    const activeBranches = new Set(filteredRows.filter((r) => r.quantity > 0).map((r) => r.branchId)).size;
    const lowStockCount = filteredRows.filter((r) => r.quantity <= (r.minimumStock ?? 5)).length;

    return {
      totalUnits,
      uniqueItems,
      activeBranches,
      lowStockCount,
    };
  }, [filteredRows]);

  // Nama Cabang Terpilih
  const activeBranchName = useMemo(() => {
    if (selectedBranchId === "all") return "Semua Cabang Operasional";
    const b = branches.find((item) => String(item.id) === selectedBranchId);
    return b ? b.name : "Cabang";
  }, [selectedBranchId, branches]);

  // ── Export Berita Acara PDF Resmi ──
  const handleExportBeritaAcaraPdf = () => {
    if (filteredRows.length === 0) {
      toast({
        title: "Data Kosong",
        description: "Tidak ada material yang dapat dicetak.",
        variant: "destructive",
      });
      return;
    }

    const pdfRows: BranchStockPdfRow[] = filteredRows.map((r) => ({
      branchName: r.branchName,
      itemCode: r.itemCode,
      itemName: r.itemName,
      categoryName: r.categoryName,
      unitName: r.unitName,
      quantity: r.quantity,
      minimumStock: r.minimumStock ?? 5,
      updatedAt: r.updatedAt,
    }));

    exportBeritaAcaraStokCabangPdf({
      branchName: activeBranchName,
      rows: pdfRows,
      printedBy: user?.fullName || "Petugas Logistik Cabang",
    });

    toast({
      title: "PDF Berhasil Dibuat",
      description: `Berita Acara Rekapitulasi Sisa Stok ${activeBranchName} siap diunduh & dicetak.`,
    });
  };

  // ── Export Single Item Ledger PDF ──
  const handleExportSingleLedgerPdf = () => {
    if (!detailItem) return;
    const movements: BranchLedgerPdfRow[] = (ledgerData?.movements || []).map((m) => ({
      movementDate: m.movementDate,
      movementType: m.movementType,
      direction: m.direction,
      quantity: m.quantity,
      balanceBefore: m.balanceBefore,
      balanceAfter: m.balanceAfter,
      referenceNo: m.referenceNo,
      userName: m.userName,
      notes: m.notes,
    }));

    exportKartuStokMaterialPdf({
      branchName: detailItem.branchName,
      itemCode: detailItem.itemCode,
      itemName: detailItem.itemName,
      categoryName: detailItem.categoryName,
      unitName: detailItem.unitName,
      currentStock: detailItem.quantity,
      minimumStock: detailItem.minimumStock ?? 5,
      movements,
      printedBy: user?.fullName || "Petugas Logistik Cabang",
    });

    toast({
      title: "Kartu Stok Diunduh",
      description: `Kartu Kendali Stok untuk "${detailItem.itemName}" telah di-generate.`,
    });
  };

  // ── Export CSV Tradisional ──
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      "Cabang",
      "Kode Material",
      "Nama Aksesoris",
      "Kategori",
      "Sisa Stok Fisik",
      "Batas Minimum",
      "Satuan",
      "Status Ketersediaan",
      "Terakhir Diperbarui",
    ];
    const rows = filteredRows.map((r) => [
      `"${r.branchName.replace(/"/g, '""')}"`,
      `"${r.itemCode.replace(/"/g, '""')}"`,
      `"${r.itemName.replace(/"/g, '""')}"`,
      `"${(r.categoryName || "-").replace(/"/g, '""')}"`,
      r.quantity,
      r.minimumStock ?? 5,
      `"${r.unitName || "pcs"}"`,
      r.quantity > (r.minimumStock ?? 5) ? "Aman" : r.quantity > 0 ? "Menipis" : "Habis",
      `"${r.updatedAt ? formatDate(r.updatedAt) : "-"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `sisa-stok-${activeBranchName.toLowerCase().replace(/\s+/g, "-")}-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    (selectedBranchId !== "all" && user?.role !== "CABANG") ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim() !== "";

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  const handleResetFilters = () => {
    if (user?.role !== "CABANG") setSelectedBranchId("all");
    setSelectedCategory("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="p-4 sm:p-5 md:p-8 max-w-[1600px] mx-auto space-y-5 md:space-y-6">

        {/* ══════════════════════════════════════════════════
            MOBILE PWA EXPERIENCE (Clean list-only view)
           ══════════════════════════════════════════════════ */}
        <div className="block md:hidden pb-10 space-y-3 max-w-lg mx-auto">
          {/* Search Bar */}
          <div className="px-4 pt-2 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder="Cari kode, nama material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 pl-9 pr-8 text-[13px] rounded-xl bg-card border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] placeholder:text-muted-foreground/60"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border",
                  statusFilter === "all"
                    ? "bg-foreground text-background border-foreground font-semibold"
                    : "bg-card text-muted-foreground border-border/70"
                )}
              >
                Semua ({allRows.length})
              </button>
              <button
                onClick={() => setStatusFilter("safe")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border",
                  statusFilter === "safe"
                    ? "bg-emerald-600 text-white border-emerald-600 font-semibold"
                    : "bg-card text-muted-foreground border-border/70"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Aman ({allRows.filter((r) => r.quantity > (r.minimumStock ?? 5)).length})
              </button>
              <button
                onClick={() => setStatusFilter("low")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border",
                  statusFilter === "low"
                    ? "bg-amber-600 text-white border-amber-600 font-semibold"
                    : "bg-card text-muted-foreground border-border/70"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Menipis ({allRows.filter((r) => r.quantity > 0 && r.quantity <= (r.minimumStock ?? 5)).length})
              </button>
              <button
                onClick={() => setStatusFilter("out")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border",
                  statusFilter === "out"
                    ? "bg-rose-600 text-white border-rose-600 font-semibold"
                    : "bg-card text-muted-foreground border-border/70"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Habis ({allRows.filter((r) => r.quantity === 0).length})
              </button>
            </div>
          </div>

          {/* Material Card List */}
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{filteredRows.length} material ditemukan</span>
            </div>

            {loadingStocks ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-card border border-dashed border-border/70 space-y-2">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="text-[13px] font-medium text-foreground">Tidak Ada Material</p>
                <p className="text-[11px] text-muted-foreground">Sesuaikan pencarian atau filter.</p>
              </div>
            ) : (
              filteredRows.map((row) => (
                <MaterialCardMobile
                  key={row.id}
                  item={row}
                  onClick={() => {
                    setDetailItem(row);
                    setMobileDrawerOpen(true);
                  }}
                  onOpenLedger={(e) => {
                    e.stopPropagation();
                    setDetailItem(row);
                    setActiveModalTab("ledger");
                    setMobileDrawerOpen(true);
                  }}
                  onOpenQr={(e) => {
                    e.stopPropagation();
                    handleOpenSingleQrLabel(row);
                  }}
                />
              ))
            )}
          </div>
        </div>



        {/* ══════════════════════════════════════════════════
            DESKTOP ADMIN EXPERIENCE (Full Table & Toolbar)
           ══════════════════════════════════════════════════ */}
        <div className="hidden md:block space-y-6">
          {/* ── Page Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Inventaris & Pergudangan Cabang
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                Ledger & Safety Stock Aktif
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
              Sisa Stok Aksesoris Cabang
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Monitoring kuantitas fisik material, batas minimum dinamis, dan riwayat mutasi di seluruh cabang operasional
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStocks()}
              disabled={isRefetching}
              className="h-9 text-xs gap-1.5 border-border/80 hover:bg-muted"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRefetching && "animate-spin")} />
              {isRefetching ? "Memperbarui..." : "Refresh"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredRows.length === 0}
              className="h-9 text-xs gap-1.5 border-border/80 hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              Export CSV
            </Button>

            {/* Tombol Cetak Berita Acara PDF Resmi */}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportBeritaAcaraPdf}
              disabled={filteredRows.length === 0}
              className="h-9 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Berita Acara (PDF)
            </Button>

            {/* Tombol Cetak Label Rak QR */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBulkQrLabels}
              disabled={filteredRows.length === 0}
              className="h-9 text-xs gap-1.5 border-border/80 hover:bg-muted font-medium"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-600" />
              Cetak Label Rak (QR)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/transaksi/retur")}
              className="h-9 text-xs gap-1.5 border-border/80 hover:bg-muted font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Retur Barang
            </Button>
          </div>
        </motion.div>

        {/* ── Premium SaaS KPI Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SaaSKpiCard
            label="Total Sisa Stok Fisik"
            value={stats.totalUnits}
            unit="unit"
            description="Akumulasi fisik siap pakai di cabang"
            icon={Boxes}
            badge={{ text: "Siap Pasang", variant: "neutral" }}
            delay={0.05}
          />
          <SaaSKpiCard
            label="Variasi Aksesoris"
            value={stats.uniqueItems}
            unit="jenis"
            description="Item unik terdata di sistem"
            icon={PackageCheck}
            badge={{ text: `${stats.uniqueItems} Item`, variant: "neutral" }}
            delay={0.1}
          />
          <SaaSKpiCard
            label="Cabang Pemegang Stok"
            value={stats.activeBranches}
            unit="cabang"
            description="Titik distribusi aktif"
            icon={Building2}
            badge={{ text: "Terdistribusi", variant: "neutral" }}
            delay={0.15}
          />
          <SaaSKpiCard
            label="Di Bawah Safety Stock"
            value={stats.lowStockCount}
            unit="item"
            description="Mendekati atau di bawah batas minimum"
            icon={ShieldAlert}
            badge={
              stats.lowStockCount > 0
                ? { text: `${stats.lowStockCount} Perlu Re-Order`, variant: "warning" }
                : { text: "Stok Optimal", variant: "success" }
            }
            delay={0.2}
          />
        </div>

        {/* ── Filter & Search Toolbar ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4 bg-card text-card-foreground border border-border/80 shadow-xs space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama aksesoris, kode material, cabang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-8 text-xs bg-muted/20 border-border/80 focus:border-primary"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selects & Status filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Branch Selector (if admin/gudang/spi) */}
              {user?.role !== "CABANG" && (
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-9 text-xs w-[170px] bg-muted/20 border-border/80">
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Selector */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 text-xs w-[160px] bg-muted/20 border-border/80">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Selector Dinamis */}
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-[150px] bg-muted/20 border-border/80">
                  <SelectValue placeholder="Status Stok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="safe">Stok Aman (&gt; Min)</SelectItem>
                  <SelectItem value="low">Menipis (&le; Min)</SelectItem>
                  <SelectItem value="out">Habis (0)</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset filter button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Quick status counters bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium">Filter Dinamis:</span>
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                  statusFilter === "all"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                Semua ({allRows.length})
              </button>
              <button
                onClick={() => setStatusFilter("safe")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                  statusFilter === "safe"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                Aman ({allRows.filter((r) => r.quantity > (r.minimumStock ?? 5)).length})
              </button>
              <button
                onClick={() => setStatusFilter("low")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                  statusFilter === "low"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                Menipis ({allRows.filter((r) => r.quantity > 0 && r.quantity <= (r.minimumStock ?? 5)).length})
              </button>
              <button
                onClick={() => setStatusFilter("out")}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                  statusFilter === "out"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                Habis ({allRows.filter((r) => r.quantity === 0).length})
              </button>
            </div>

            <div className="text-[11px]">
              Menampilkan <span className="font-semibold text-foreground">{filteredRows.length}</span> dari{" "}
              <span>{allRows.length}</span> data material
            </div>
          </div>
        </motion.div>

        {/* ── Table Card Container ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                  <TableHead className="w-12 text-center text-xs font-semibold uppercase text-muted-foreground">
                    No
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "branch") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else {
                        setSortField("branch");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cabang</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Kode Material
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold uppercase text-muted-foreground cursor-pointer select-none min-w-[200px]"
                    onClick={() => {
                      if (sortField === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else {
                        setSortField("name");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Aksesoris</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Kategori
                  </TableHead>
                  <TableHead
                    className="text-right text-xs font-semibold uppercase text-muted-foreground cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "stock") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else {
                        setSortField("stock");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Sisa Fisik</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right text-xs font-semibold uppercase text-muted-foreground cursor-pointer select-none"
                    onClick={() => {
                      if (sortField === "min") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else {
                        setSortField("min");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Min Stok</span>
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                    Satuan
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                    Terakhir Update
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground pr-4">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingStocks ? (
                  Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={11} className="p-3">
                          <Skeleton className="h-10 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                        <Package className="w-6 h-6 opacity-60" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Tidak ada stok aksesoris yang cocok</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        {searchTerm || selectedBranchId !== "all" || selectedCategory !== "all" || statusFilter !== "all"
                          ? "Coba sesuaikan kata kunci pencarian atau reset filter untuk menampilkan data lainnya."
                          : "Belum ada material yang terdistribusi dan tercatat di cabang ini."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-4 text-xs h-8 border-border"
                        >
                          Reset Semua Filter
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, index) => {
                    const minStockVal = row.minimumStock ?? 5;
                    const isSafe = row.quantity > minStockVal;
                    const isLow = row.quantity > 0 && row.quantity <= minStockVal;
                    const isOut = row.quantity === 0;

                    return (
                      <TableRow
                        key={`${row.branchId}-${row.itemId}`}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setDetailItem(row)}
                      >
                        {/* No */}
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {/* Cabang */}
                        <TableCell className="font-medium text-xs">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-foreground text-xs font-medium border border-border/40">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {row.branchName}
                          </span>
                        </TableCell>

                        {/* Kode */}
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {row.itemCode}
                        </TableCell>

                        {/* Nama Aksesoris */}
                        <TableCell>
                          <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {row.itemName}
                          </div>
                        </TableCell>

                        {/* Kategori */}
                        <TableCell className="text-xs">
                          {row.categoryName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground border border-border/30">
                              {row.categoryName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Kuantitas Stok Fisik */}
                        <TableCell className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-bold text-base text-foreground">
                              {formatNumber(row.quantity)}
                            </span>
                            {/* Visual mini bar dinamis berbasis safety stock */}
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  isSafe && "bg-emerald-500",
                                  isLow && "bg-amber-500",
                                  isOut && "bg-rose-500"
                                )}
                                style={{
                                  width: `${Math.min(100, Math.max(8, (row.quantity / (minStockVal * 2 || 10)) * 100))}%`,
                                }}
                              />
                            </div>

                            {/* Prediksi Hari Habis / Laju Pemakaian */}
                            <div className="mt-1">
                              {row.runoutDays !== null && row.runoutDays !== undefined ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded",
                                    row.runoutDays <= 3
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold"
                                      : row.runoutDays <= 7
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
                                      : "text-muted-foreground/80 bg-muted/40"
                                  )}
                                  title={`Laju pemasangan: ${row.dailyBurnRate || 0} unit/hari (30 hari terakhir: ${row.usage30d || 0} unit)`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  ±{row.runoutDays} hr
                                </span>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/50 select-none">
                                  Pasif
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Batas Minimum Dinamis */}
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-muted/50 text-muted-foreground border border-border/40">
                            {minStockVal}
                          </span>
                        </TableCell>

                        {/* Satuan */}
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {row.unitName || "pcs"}
                        </TableCell>

                        {/* Status Badge Dinamis */}
                        <TableCell className="text-center">
                          {isSafe ? (
                            <StockStatusBadge status="safe" />
                          ) : isLow ? (
                            <StockStatusBadge status="low" />
                          ) : (
                            <StockStatusBadge status="out" />
                          )}
                        </TableCell>

                        {/* Terakhir Update */}
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {row.updatedAt ? formatDate(row.updatedAt) : "-"}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-center pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailItem(row)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1 rounded-lg"
                              title="Lihat Detail & Kartu Stok"
                            >
                              <History className="w-3.5 h-3.5 text-sky-600" />
                              Kartu Stok
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>
                Menampilkan <strong className="text-foreground">{filteredRows.length}</strong> jenis aksesoris
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span>
                Total Sisa Fisik:{" "}
                <strong className="font-mono text-base font-bold text-foreground">
                  {formatNumber(stats.totalUnits)}
                </strong>{" "}
                unit
              </span>
            </div>
          </div>
        </motion.div>
        </div>

        {/* ── Detail & Kartu Stok (Ledger) Modal Dialog (Desktop) ── */}
        <Dialog open={!!detailItem && !mobileDrawerOpen} onOpenChange={(open) => !open && setDetailItem(null)}>
          <DialogContent className="sm:max-w-3xl rounded-2xl border border-border/80 bg-card p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border/60">
                    {detailItem?.itemCode}
                  </span>
                  <span className="text-xs text-muted-foreground">• {detailItem?.branchName}</span>
                </div>
                {detailItem && (
                  <div>
                    {detailItem.quantity > (detailItem.minimumStock ?? 5) ? (
                      <StockStatusBadge status="safe" size="sm" />
                    ) : detailItem.quantity > 0 ? (
                      <StockStatusBadge status="low" size="sm" />
                    ) : (
                      <StockStatusBadge status="out" size="sm" />
                    )}
                  </div>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-foreground">
                {detailItem?.itemName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kendali persediaan fisik dan kartu riwayat mutasi pergerakan stok cabang
              </DialogDescription>
            </DialogHeader>

            {/* Modal Tabs Header */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-2 pt-2">
              <button
                onClick={() => setActiveModalTab("detail")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeModalTab === "detail"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Informasi & Safety Stock
              </button>
              <button
                onClick={() => setActiveModalTab("ledger")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeModalTab === "ledger"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <History className="w-3.5 h-3.5" />
                Kartu Riwayat Mutasi (Ledger)
                {ledgerData?.summary?.movementCount ? (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
                    {ledgerData.summary.movementCount}
                  </span>
                ) : null}
              </button>
            </div>

            {/* TAB 1: INFORMASI & PARAMETER SAFETY STOCK */}
            {activeModalTab === "detail" && detailItem && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Cabang Lokasi</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {detailItem.branchName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Kategori</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {detailItem.categoryName || "Umum"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Sisa Stok Fisik</span>
                    <span className="font-mono font-bold text-lg text-foreground mt-0.5 block">
                      {formatNumber(detailItem.quantity)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {detailItem.unitName || "pcs"}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Batas Minimum Saat Ini</span>
                    <span className="font-mono font-bold text-lg text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {detailItem.minimumStock ?? 5}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {detailItem.unitName || "pcs"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Card Analisis Laju Pemakaian & Estimasi Hari Habis */}
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Analisis Laju Pemakaian & Estimasi Habis
                      </h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Berdasarkan pemasangan 30 hari terakhir
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Laju Pemasangan</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {detailItem.dailyBurnRate ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">unit/hari</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Pemasangan 30 Hari</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {detailItem.usage30d ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">{detailItem.unitName || "unit"}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Estimasi Stok Habis</span>
                      {detailItem.runoutDays !== null && detailItem.runoutDays !== undefined ? (
                        <span
                          className={cn(
                            "font-mono font-bold text-sm",
                            detailItem.runoutDays <= 3
                              ? "text-rose-600 dark:text-rose-400"
                              : detailItem.runoutDays <= 7
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          ± {detailItem.runoutDays} Hari
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Stok Pasif</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Pengaturan Safety Stock Dinamis */}
                <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Konfigurasi Ambang Batas Minimum (Safety Stock)
                      </h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Disesuaikan per kebutuhan cabang
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Sistem akan otomatis memberikan peringatan "Menipis" atau mengirim alert ketika saldo fisik di cabang ini berada di bawah batas angka ini.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-foreground whitespace-nowrap">
                        Minimum Stok:
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editMinStockValue}
                        onChange={(e) => setEditMinStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 h-8 text-xs font-mono font-bold text-center"
                      />
                      <span className="text-xs text-muted-foreground">{detailItem.unitName || "pcs"}</span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        updateThresholdMutation.mutate({
                          id: detailItem.id,
                          minimumStock: editMinStockValue,
                        })
                      }
                      disabled={updateThresholdMutation.isPending || editMinStockValue === detailItem.minimumStock}
                      className="h-8 text-xs gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updateThresholdMutation.isPending ? "Menyimpan..." : "Simpan Ambang Batas"}
                    </Button>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/15 p-3 rounded-lg border border-border/40">
                  <p>
                    • Setiap mutasi masuk dari penerimaan Surat Jalan maupun pengeluaran untuk pemasangan di lapangan akan tercatat otomatis pada <strong>Buku Besar / Kartu Stok Cabang</strong>.
                  </p>
                  <p>
                    • Waktu sinkronisasi data terakhir:{" "}
                    <strong className="text-foreground">
                      {detailItem.updatedAt ? formatDate(detailItem.updatedAt) : "-"}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: KARTU RIWAYAT MUTASI (LEDGER) */}
            {activeModalTab === "ledger" && detailItem && (
              <div className="space-y-4 py-2">
                {/* Ringkasan Pergerakan Item */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Total Masuk</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        +{formatNumber(ledgerData?.summary?.totalIn || 0)} {detailItem.unitName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Total Keluar</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        -{formatNumber(ledgerData?.summary?.totalOut || 0)} {detailItem.unitName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Saldo Berjalan Saat Ini</span>
                      <span className="font-mono font-bold text-base text-primary">
                        {formatNumber(detailItem.quantity)} {detailItem.unitName}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportSingleLedgerPdf}
                      className="h-8 text-xs gap-1.5 border-border hover:bg-muted"
                    >
                      <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                      Cetak Kartu Stok (PDF)
                    </Button>
                  </div>
                </div>

                {/* Tabel Pergerakan Kartu Stok */}
                <div className="border border-border/80 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px] border-b border-border/80">
                        <TableHead className="w-10 text-center">No</TableHead>
                        <TableHead>Waktu Transaksi</TableHead>
                        <TableHead>Tipe Mutasi</TableHead>
                        <TableHead>Referensi Dokumen</TableHead>
                        <TableHead className="text-right">Perubahan</TableHead>
                        <TableHead className="text-right">Saldo Akhir</TableHead>
                        <TableHead>Pelaksana / Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLedger ? (
                        Array(4)
                          .fill(0)
                          .map((_, i) => (
                            <TableRow key={i}>
                              <TableCell colSpan={7} className="p-2">
                                <Skeleton className="h-7 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (ledgerData?.movements || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                            <History className="w-6 h-6 mx-auto mb-2 opacity-40" />
                            Belum ada riwayat mutasi kartu stok tercatat untuk material ini di {detailItem.branchName}.
                            <p className="text-[11px] text-muted-foreground/80 mt-1">
                              Setiap penerimaan Surat Jalan, pengeluaran pemasangan, dan retur akan otomatis muncul di sini.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (ledgerData?.movements || []).map((m, idx) => {
                          const isMasuk = m.direction === "in";
                          const isRollback = m.movementType === "REJECTION_ROLLBACK";
                          return (
                            <TableRow key={m.id || idx} className="text-xs hover:bg-muted/30">
                              <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="whitespace-nowrap font-medium text-[11px]">
                                {m.movementDate ? formatDate(m.movementDate) : "-"}
                              </TableCell>
                              <TableCell>
                                {isRollback ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    <RotateCcw className="w-3 h-3" /> Rollback Ditolak SPI
                                  </span>
                                ) : m.movementType === "RECEIPT" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    <ArrowDownRight className="w-3 h-3" /> Penerimaan Surat Jalan
                                  </span>
                                ) : m.movementType === "INSTALLATION" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                    <Wrench className="w-3 h-3" /> Pemasangan Fisik
                                  </span>
                                ) : m.movementType === "RETURN" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    <RotateCcw className="w-3 h-3" /> Retur ke Pusat
                                  </span>
                                ) : (
                                  <span className="text-[11px]">{m.movementType}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-muted-foreground">
                                {m.referenceNo || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                {isMasuk ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">+{m.quantity}</span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400">-{m.quantity}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-foreground">
                                {m.balanceAfter} {detailItem.unitName}
                              </TableCell>
                              <TableCell className="text-[11px] text-muted-foreground max-w-[200px] truncate" title={m.notes || m.userName || ""}>
                                {m.notes || m.userName || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/80">
              <Button
                variant="outline"
                size="sm"
                onClick={() => detailItem && handleOpenSingleQrLabel(detailItem)}
                className="text-xs h-9 gap-1.5 border-border hover:bg-muted"
                title="Cetak Label Rak QR untuk Material Ini"
              >
                <QrCode className="w-3.5 h-3.5 text-sky-600" />
                Cetak Label Rak (QR)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailItem(null);
                  navigate("/transaksi/retur");
                }}
                className="text-xs h-9 gap-1.5 border-border hover:bg-muted"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                Retur Barang ke Pusat
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setDetailItem(null);
                  navigate("/cabang/pemasangan");
                }}
                className="text-xs h-9 gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                Catat Pemasangan Lapangan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile iOS-style Bottom Sheet Drawer (Kartu Stok & Timeline Mutasi ala Referensi) */}
        <MaterialDetailDrawer
          item={detailItem}
          open={mobileDrawerOpen}
          onClose={() => {
            setMobileDrawerOpen(false);
            setDetailItem(null);
          }}
          ledgerRows={ledgerData?.movements || []}
          loadingLedger={loadingLedger}
          onUpdateThreshold={(id, minStock) => {
            updateThresholdMutation.mutate({ id, minimumStock: minStock });
          }}
          isUpdatingThreshold={updateThresholdMutation.isPending}
          onOpenQr={(item) => handleOpenSingleQrLabel(item as any)}
          onNavigatePemasangan={() => navigate("/cabang/pemasangan")}
          onNavigateRetur={() => navigate("/transaksi/retur")}
        />

        {/* Modal Cetak Label QR Stiker Rak / Bin Card */}
        <LabelQrPrintDialog
          open={qrPrintOpen}
          onClose={() => setQrPrintOpen(false)}
          items={qrPrintItems}
        />
      </div>
    </div>
  );
}
