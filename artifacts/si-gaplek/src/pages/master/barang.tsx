import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatNumber, cn } from "@/lib/utils";
import { BarcodeDisplay } from "@/components/barcode-display";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Search, Pencil, Trash2, Package, AlertTriangle, Camera,
  Eye, Printer, Download, Tag, X, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, CheckCircle2,
  AlertCircle, XCircle, Radio, MoreHorizontal, ScanLine, Info,
  Filter, Columns3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ──────────────────────────────────────────────────── */
interface Item {
  id: number;
  code: string;
  name: string;
  barcode: string | null;
  categoryId: number | null;
  unitId: number | null;
  supplierId: number | null;
  description: string | null;
  minimumStock: number;
  maximumStock: number;
  currentStock: number;
  unitPrice: string | null;
  categoryName?: string;
  unitName?: string;
  supplierName?: string;
  status: string;
  trackingType: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ItemSummary {
  total: number;
  stokAman: number;
  stokMenipis: number;
  stokHabis: number;
  tracked: number;
  nonTracked: number;
  inactive: number;
}

interface PaginatedResponse {
  data: Item[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Category { id: number; name: string; }
interface Unit { id: number; name: string; }
interface Supplier { id: number; name: string; }

/* ── Helpers ─────────────────────────────────────────────────── */
function getStockStatus(item: Item) {
  if (item.status === "inactive") return { label: "Inactive", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" };
  if (item.currentStock <= 0) return { label: "Habis", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400", dot: "bg-red-500" };
  if (item.currentStock <= item.minimumStock) return { label: "Menipis", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400", dot: "bg-amber-500" };
  return { label: "Aman", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", dot: "bg-emerald-500" };
}

function getTrackingBadge(type: string) {
  if (type === "TRACKED") return { label: "Tracked", icon: Radio, color: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400" };
  return { label: "Non-Tracked", icon: Package, color: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
}

/* ── CountUp Animation Hook ─────────────────────────────────── */
function useCountUp(target: number, duration = 600) {
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

/* ── KPI Card Component ──────────────────────────────────────── */
function KpiCard({ label, value, icon: Icon, color, borderColor, delay = 0, onClick }: {
  label: string; value: number; icon: React.ElementType;
  color: string; borderColor: string; delay?: number; onClick?: () => void;
}) {
  const animatedValue = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card
        className={cn(
          "border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
          borderColor
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(animatedValue)}</p>
            </div>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function BarangPage() {
  /* State */
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTracking, setFilterTracking] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  /* Dialog states */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  const [form, setForm] = useState({
    code: "", name: "", barcode: "", categoryId: "", unitId: "", supplierId: "",
    description: "", minimumStock: "0", unitPrice: "",
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  /* Debounce search */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [filterCategory, filterTracking, filterStatus]);

  /* ── Queries ──────────────────────────────────────────────── */
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", limit.toString());
  queryParams.set("sortBy", sortBy);
  queryParams.set("sortOrder", sortOrder);
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (filterCategory) queryParams.set("categoryId", filterCategory);
  if (filterTracking) queryParams.set("trackingType", filterTracking);
  if (filterStatus) queryParams.set("status", filterStatus);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["items", page, limit, sortBy, sortOrder, debouncedSearch, filterCategory, filterTracking, filterStatus],
    queryFn: () => apiFetch<PaginatedResponse>(`/api/items?${queryParams.toString()}`),
  });

  const { data: summary } = useQuery({
    queryKey: ["items-summary"],
    queryFn: () => apiFetch<ItemSummary>("/api/items/summary"),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("/api/categories") });
  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => apiFetch<Unit[]>("/api/units") });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[]>("/api/suppliers") });

  const items = pageData?.data ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalItems = pageData?.total ?? 0;

  /* ── Mutations ──────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        code: form.code, name: form.name,
        barcode: null,
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        unitId: form.unitId ? parseInt(form.unitId) : null,
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        description: form.description || null,
        minimumStock: parseInt(form.minimumStock) || 0,
        currentStock: 0,
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : 0,
      };
      if (editing) {
        return apiFetch(`/api/items/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      return apiFetch("/api/items", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["items-summary"] });
      setDialogOpen(false);
      toast({ title: editing ? "Barang diperbarui" : "Barang ditambahkan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["items-summary"] });
      setDeleteId(null);
      toast({ title: "Barang dihapus" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ── Handlers ──────────────────────────────────────────────── */
  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", barcode: "", categoryId: "", unitId: "", supplierId: "", description: "", minimumStock: "0", unitPrice: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      code: item.code, name: item.name, barcode: item.barcode ?? "",
      categoryId: item.categoryId?.toString() ?? "", unitId: item.unitId?.toString() ?? "",
      supplierId: item.supplierId?.toString() ?? "", description: item.description ?? "",
      minimumStock: item.minimumStock.toString(), unitPrice: (item.unitPrice ?? "").toString(),
    });
    setDialogOpen(true);
  };

  const handleCameraDetected = useCallback(async (barcode: string) => {
    try {
      const result = await apiFetch<Item>(`/api/items/barcode/${encodeURIComponent(barcode)}`);
      setCameraScanOpen(false);
      setDetailItem(result);
    } catch (err: any) {
      throw new Error(err.message || "Barcode tidak ditemukan.");
    }
  }, []);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = (item: Item) => {
    const printWindow = window.open("", "_blank", "width=500,height=400");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Barcode - ${item.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;}
      h3{margin:0 0 4px;}p{margin:0;color:#666;font-family:monospace;}</style></head>
      <body><h3>${item.name}</h3><p>${item.code}</p><p style="margin-top:8px">Barcode: ${item.barcode ?? item.code}</p>
      <script>setTimeout(()=>window.print(),300);<\/script></body></html>
    `);
    printWindow.document.close();
  };

  const activeFilterCount = [filterCategory, filterTracking, filterStatus].filter(Boolean).length;
  const lowStockCount = summary?.stokMenipis ?? 0;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortOrder === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1440px] mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Barang</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kelola material, stok, lokasi, barcode, dan status barang.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCameraScanOpen(true)} className="gap-2">
            <ScanLine className="w-4 h-4" /> Scan Barcode
          </Button>
          <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4" /> Tambah Barang
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total Barang" value={summary?.total ?? 0}
          icon={Package} color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" borderColor="border-l-blue-500"
          delay={0}
        />
        <KpiCard
          label="Stok Aman" value={summary?.stokAman ?? 0}
          icon={CheckCircle2} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" borderColor="border-l-emerald-500"
          delay={0.05} onClick={() => { setFilterStatus("AMAN"); setFilterCategory(""); setFilterTracking(""); }}
        />
        <KpiCard
          label="Stok Menipis" value={summary?.stokMenipis ?? 0}
          icon={AlertTriangle} color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" borderColor="border-l-amber-500"
          delay={0.1} onClick={() => { setFilterStatus("MENIPIS"); setFilterCategory(""); setFilterTracking(""); }}
        />
        <KpiCard
          label="Stok Habis" value={summary?.stokHabis ?? 0}
          icon={XCircle} color="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" borderColor="border-l-red-500"
          delay={0.15} onClick={() => { setFilterStatus("HABIS"); setFilterCategory(""); setFilterTracking(""); }}
        />
        <KpiCard
          label="Tracked" value={summary?.tracked ?? 0}
          icon={Radio} color="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400" borderColor="border-l-violet-500"
          delay={0.2} onClick={() => { setFilterTracking("TRACKED"); setFilterCategory(""); setFilterStatus(""); }}
        />
      </div>

      {/* ── Info Banner ──────────────────────────────────────── */}
      <AnimatePresence>
        {lowStockCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
              <span className="font-semibold">{lowStockCount} barang</span> stok menipis dan memerlukan pengadaan ulang.
            </p>
            <Button
              variant="ghost" size="sm"
              className="text-amber-700 hover:text-amber-900 dark:text-amber-400 text-xs"
              onClick={() => { setFilterStatus("MENIPIS"); setFilterCategory(""); setFilterTracking(""); }}
            >
              Lihat Detail →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + Filters ────────────────────────────────── */}
      <motion.div
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <div className="relative flex-1 min-w-0 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama barang, kode, barcode..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              onClick={() => setSearch("")}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={filterCategory || "all"} onValueChange={v => setFilterCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterTracking || "all"} onValueChange={v => setFilterTracking(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Tracking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Type</SelectItem>
              <SelectItem value="TRACKED">Tracked</SelectItem>
              <SelectItem value="NON_TRACKED">Non-Tracked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus || "all"} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="AMAN">Aman</SelectItem>
              <SelectItem value="MENIPIS">Menipis</SelectItem>
              <SelectItem value="HABIS">Habis</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost" size="sm" className="h-9 text-xs gap-1 text-muted-foreground"
              onClick={() => { setFilterCategory(""); setFilterTracking(""); setFilterStatus(""); }}
            >
              <X className="w-3 h-3" /> Reset ({activeFilterCount})
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Bulk Actions Bar ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5"
          >
            <span className="text-sm font-medium">{selectedIds.length} barang dipilih</span>
            <Separator orientation="vertical" className="h-5" />
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => {
              selectedIds.forEach(id => {
                const item = items.find(i => i.id === id);
                if (item) handlePrint(item);
              });
            }}>
              <Printer className="w-3.5 h-3.5" /> Print Barcode
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds([])}>
              Batal
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Data Table ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={items.length > 0 && selectedIds.length === items.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("code")}>
                      <span className="flex items-center text-xs font-semibold uppercase tracking-wider">
                        Kode <SortIcon col="code" />
                      </span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      <span className="flex items-center text-xs font-semibold uppercase tracking-wider">
                        Nama Barang <SortIcon col="name" />
                      </span>
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Kategori</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Satuan</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Tracking</TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("stock")}>
                      <span className="flex items-center justify-end text-xs font-semibold uppercase tracking-wider">
                        Stok <SortIcon col="stock" />
                      </span>
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Supplier</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(8).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10} className="p-3">
                          <Skeleton className="h-10 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !items.length ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                            <Package className="w-7 h-7 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              {debouncedSearch || activeFilterCount > 0 ? "Tidak ada material yang cocok." : "Belum ada data barang."}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {debouncedSearch || activeFilterCount > 0
                                ? "Coba ubah kata kunci atau reset filter."
                                : "Mulai dengan menambahkan barang baru."}
                            </p>
                          </div>
                          {debouncedSearch || activeFilterCount > 0 ? (
                            <Button variant="outline" size="sm" className="mt-1" onClick={() => { setSearch(""); setFilterCategory(""); setFilterTracking(""); setFilterStatus(""); }}>
                              Reset Filter
                            </Button>
                          ) : (
                            <Button size="sm" className="mt-1 gap-1.5" onClick={openCreate}>
                              <Plus className="w-4 h-4" /> Tambah Barang
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {items.map((item, idx) => {
                        const stockStatus = getStockStatus(item);
                        const tracking = getTrackingBadge(item.trackingType);
                        const TrackingIcon = tracking.icon;
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            className="border-b transition-colors hover:bg-muted/30 group"
                          >
                            <TableCell className="pl-4 w-10">
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                                aria-label={`Select ${item.name}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-medium text-primary">{item.code}</span>
                            </TableCell>
                            <TableCell>
                              <button
                                className="text-left hover:underline cursor-pointer"
                                onClick={() => setDetailItem(item)}
                              >
                                <p className="font-medium text-sm">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{item.description}</p>
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-sm">{item.categoryName ?? <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell className="text-sm">{item.unitName ?? <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium", tracking.color)}>
                                <TrackingIcon className="w-3 h-3" />
                                {tracking.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm font-semibold">{formatNumber(item.currentStock)}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">/ {formatNumber(item.minimumStock)}</span>
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", stockStatus.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", stockStatus.dot)} />
                                {stockStatus.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{item.supplierName ?? <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailItem(item)}>
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Detail</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => setDeleteId(item.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Hapus</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination ─────────────────────────────────── */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span>
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows per page</span>
                    <Select value={limit.toString()} onValueChange={v => { setLimit(parseInt(v)); setPage(1); }}>
                      <SelectTrigger className="w-[72px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Camera Scanner ──────────────────────────────────── */}
      <BarcodeScanner
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onDetected={handleCameraDetected}
      />

      {/* ── Add / Edit Dialog ───────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kode *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAT-PIPA-001" /></div>
              <div className="space-y-1.5"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Barcode</Label><Input value="[AUTO GENERATED]" readOnly className="bg-muted text-muted-foreground" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Kategori</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Satuan</Label>
                <Select value={form.unitId} onValueChange={v => setForm(f => ({ ...f, unitId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{units?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Stok Minimum</Label><Input type="number" min="0" value={form.minimumStock} onChange={e => setForm(f => ({ ...f, minimumStock: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Harga Satuan</Label><Input type="number" min="0" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.code || !form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : editing ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Barang?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Sheet ────────────────────────────────────── */}
      <Sheet open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailItem && (() => {
            const stockStatus = getStockStatus(detailItem);
            const tracking = getTrackingBadge(detailItem.trackingType);
            const TrackingIcon = tracking.icon;
            return (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg">{detailItem.name}</SheetTitle>
                  <p className="text-sm font-mono text-muted-foreground">{detailItem.code}</p>
                </SheetHeader>

                <div className="space-y-5">
                  {/* Status badges */}
                  <div className="flex gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", tracking.color)}>
                      <TrackingIcon className="w-3.5 h-3.5" />
                      {tracking.label}
                    </span>
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", stockStatus.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", stockStatus.dot)} />
                      {stockStatus.label}
                    </span>
                  </div>

                  <Separator />

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Kategori</p>
                      <p className="text-sm font-medium">{detailItem.categoryName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Satuan</p>
                      <p className="text-sm font-medium">{detailItem.unitName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Stok Saat Ini</p>
                      <p className="text-sm font-semibold">{formatNumber(detailItem.currentStock)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Stok Minimum</p>
                      <p className="text-sm font-medium">{formatNumber(detailItem.minimumStock)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Supplier</p>
                      <p className="text-sm font-medium">{detailItem.supplierName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Harga Satuan</p>
                      <p className="text-sm font-medium">
                        {detailItem.unitPrice ? `Rp ${formatNumber(parseFloat(detailItem.unitPrice.toString()))}` : "-"}
                      </p>
                    </div>
                  </div>

                  {detailItem.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                        <p className="text-sm">{detailItem.description}</p>
                      </div>
                    </>
                  )}

                  {/* Barcode section */}
                  {detailItem.barcode && (
                    <>
                      <Separator />
                      <div className="flex flex-col items-center py-4 px-6 bg-muted/30 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-3">Barcode Material</p>
                        <BarcodeDisplay value={detailItem.barcode} size={160} showValue />
                      </div>
                    </>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handlePrint(detailItem)}>
                      <Printer className="w-4 h-4" /> Print
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                      <Pencil className="w-4 h-4" /> Edit
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5 text-red-500 hover:text-red-600" onClick={() => { setDetailItem(null); setDeleteId(detailItem.id); }}>
                      <Trash2 className="w-4 h-4" /> Hapus
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
