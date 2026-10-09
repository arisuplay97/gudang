import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
} from "lucide-react";

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
  updatedAt: string;
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

/* ── Minimalist KPI Card ── */
function KpiCard({
  label,
  value,
  unit = "",
  sublabel,
  icon: Icon,
  variant = "default",
  delay = 0,
}: {
  label: string;
  value: number;
  unit?: string;
  sublabel?: string;
  icon: React.ElementType;
  variant?: "default" | "warning" | "success" | "info";
  delay?: number;
}) {
  const animatedValue = useCountUp(value);

  const variantStyles = {
    default: "border-border/80 bg-card text-card-foreground",
    warning: "border-amber-500/20 bg-amber-500/5 text-card-foreground",
    success: "border-emerald-500/20 bg-emerald-500/5 text-card-foreground",
    info: "border-sky-500/20 bg-sky-500/5 text-card-foreground",
  };

  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className={cn("border shadow-xs rounded-2xl transition-all duration-200", variantStyles[variant])}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {formatNumber(animatedValue)}
              </span>
              {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
            </div>
            {sublabel && <p className="text-[11px] text-muted-foreground/80">{sublabel}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Main Component ── */
export default function StokMaterialCabangPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Filters state
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    user?.role === "CABANG" && user?.branchId ? String(user.branchId) : "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "safe" | "low" | "out">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<"name" | "stock" | "branch">("branch");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Detail Modal state
  const [detailItem, setDetailItem] = useState<BranchStockRow | null>(null);

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

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allRows
      .filter((row) => {
        // Filter Cabang
        const matchBranch = selectedBranchId === "all" || row.branchId === Number(selectedBranchId);

        // Filter Kategori
        const matchCat =
          selectedCategory === "all" ||
          (row.categoryName && row.categoryName.toLowerCase() === selectedCategory.toLowerCase());

        // Filter Status
        let matchStatus = true;
        if (statusFilter === "safe") matchStatus = row.quantity > 10;
        else if (statusFilter === "low") matchStatus = row.quantity > 0 && row.quantity <= 10;
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
        } else {
          comp = a.branchName.localeCompare(b.branchName);
        }
        return sortOrder === "asc" ? comp : -comp;
      });
  }, [allRows, selectedBranchId, selectedCategory, statusFilter, searchTerm, sortField, sortOrder]);

  // Overall Statistics from all rows
  const stats = useMemo(() => {
    const totalUnits = filteredRows.reduce((acc, r) => acc + (r.quantity || 0), 0);
    const uniqueItems = new Set(filteredRows.map((r) => r.itemId)).size;
    const activeBranches = new Set(filteredRows.filter((r) => r.quantity > 0).map((r) => r.branchId)).size;
    const lowStockCount = filteredRows.filter((r) => r.quantity <= 10).length;

    return {
      totalUnits,
      uniqueItems,
      activeBranches,
      lowStockCount,
    };
  }, [filteredRows]);

  // Export CSV function
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = ["Cabang", "Kode Material", "Nama Aksesoris", "Kategori", "Sisa Stok", "Satuan", "Status", "Terakhir Diperbarui"];
    const rows = filteredRows.map((r) => [
      `"${r.branchName.replace(/"/g, '""')}"`,
      `"${r.itemCode.replace(/"/g, '""')}"`,
      `"${r.itemName.replace(/"/g, '""')}"`,
      `"${(r.categoryName || "-").replace(/"/g, '""')}"`,
      r.quantity,
      `"${r.unitName || "pcs"}"`,
      r.quantity > 10 ? "Aman" : r.quantity > 0 ? "Menipis" : "Habis",
      `"${r.updatedAt ? formatDate(r.updatedAt) : "-"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `sisa-stok-cabang-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    (selectedBranchId !== "all" && user?.role !== "CABANG") ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim() !== "";

  const handleResetFilters = () => {
    if (user?.role !== "CABANG") setSelectedBranchId("all");
    setSelectedCategory("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-6">

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
                Real-Time
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
              Sisa Stok Aksesoris Cabang
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Monitoring kuantitas fisik material & aksesoris yang siap pakai di seluruh cabang operasional
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

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/transaksi/retur")}
              className="h-9 text-xs gap-1.5 shadow-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retur Barang
            </Button>
          </div>
        </motion.div>

        {/* ── KPI Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Sisa Stok Fisik"
            value={stats.totalUnits}
            unit="unit"
            sublabel="Akumulasi material di cabang"
            icon={Layers}
            variant="default"
            delay={0.05}
          />
          <KpiCard
            label="Variasi Aksesoris"
            value={stats.uniqueItems}
            unit="jenis"
            sublabel="Item unik terdata di sistem"
            icon={Package}
            variant="info"
            delay={0.1}
          />
          <KpiCard
            label="Cabang Pemegang Stok"
            value={stats.activeBranches}
            unit="cabang"
            sublabel="Cabang dengan stok fisik aktif"
            icon={Building2}
            variant="success"
            delay={0.15}
          />
          <KpiCard
            label="Perlu Perhatian"
            value={stats.lowStockCount}
            unit="item"
            sublabel="Stok menipis atau kosong"
            icon={AlertTriangle}
            variant={stats.lowStockCount > 0 ? "warning" : "default"}
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

              {/* Status Selector */}
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-[140px] bg-muted/20 border-border/80">
                  <SelectValue placeholder="Status Stok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="safe">Stok Aman (&gt;10)</SelectItem>
                  <SelectItem value="low">Menipis (1-10)</SelectItem>
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
              <span className="text-[11px] font-medium">Filter Cepat:</span>
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
                Aman ({allRows.filter((r) => r.quantity > 10).length})
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
                Menipis ({allRows.filter((r) => r.quantity > 0 && r.quantity <= 10).length})
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
              <span>{allRows.length}</span> data
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
                      <span>Sisa Stok Cabang</span>
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
                        <TableCell colSpan={10} className="p-3">
                          <Skeleton className="h-10 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
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
                    const isSafe = row.quantity > 10;
                    const isLow = row.quantity > 0 && row.quantity <= 10;
                    const isOut = row.quantity === 0;

                    return (
                      <TableRow
                        key={`${row.branchId}-${row.itemId}`}
                        className="hover:bg-muted/30 transition-colors group"
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

                        {/* Kuantitas Stok */}
                        <TableCell className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-bold text-base text-foreground">
                              {formatNumber(row.quantity)}
                            </span>
                            {/* Visual mini bar */}
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  isSafe && "bg-emerald-500",
                                  isLow && "bg-amber-500",
                                  isOut && "bg-rose-500"
                                )}
                                style={{
                                  width: `${Math.min(100, Math.max(5, (row.quantity / 50) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* Satuan */}
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {row.unitName || "pcs"}
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          {isSafe && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Aman
                            </span>
                          )}
                          {isLow && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              Menipis
                            </span>
                          )}
                          {isOut && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3 text-rose-500" />
                              Habis
                            </span>
                          )}
                        </TableCell>

                        {/* Terakhir Update */}
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {row.updatedAt ? formatDate(row.updatedAt) : "-"}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-center pr-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailItem(row)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1 rounded-lg"
                              title="Lihat Detail Material"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
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
                Total Sisa Unit:{" "}
                <strong className="font-mono text-base font-bold text-foreground">
                  {formatNumber(stats.totalUnits)}
                </strong>{" "}
                unit
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Detail Modal Dialog ── */}
        <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-card p-6">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border/60">
                  {detailItem?.itemCode}
                </span>
                <span className="text-xs text-muted-foreground">• {detailItem?.branchName}</span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {detailItem?.itemName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informasi detail alokasi persediaan fisik material di cabang
              </DialogDescription>
            </DialogHeader>

            {detailItem && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
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
                    <span className="text-muted-foreground block text-[11px]">Sisa Stok Tersedia</span>
                    <span className="font-mono font-bold text-lg text-foreground mt-0.5 block">
                      {formatNumber(detailItem.quantity)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {detailItem.unitName || "pcs"}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status Ketersediaan</span>
                    <span className="mt-1 inline-block">
                      {detailItem.quantity > 10 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Stok Aman
                        </span>
                      ) : detailItem.quantity > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Stok Menipis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Habis
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/15 p-3 rounded-lg border border-border/40">
                  <p>
                    • Material ini diperbarui otomatis setiap kali terjadi transaksi penerimaan surat jalan, retur barang, atau verifikasi pemasangan di lapangan.
                  </p>
                  <p>
                    • Waktu sinkronisasi terakhir:{" "}
                    <strong className="text-foreground">
                      {detailItem.updatedAt ? formatDate(detailItem.updatedAt) : "-"}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
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
                Catat Pemasangan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
