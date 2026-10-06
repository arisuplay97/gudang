import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Eye, Trash2, Camera, Search, FolderOpen,
  Printer, CheckCircle2, ChevronLeft, ChevronRight, Calendar,
  Pencil, AlertTriangle, Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SuratJalanPrintModal, type SuratJalanData } from "@/components/print/surat-jalan-print";

interface StockOut {
  id: number;
  referenceNumber?: string;
  referenceNo?: string;
  departmentId: number | null;
  destinationBranchId?: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  transactionDate?: string;
  departmentName?: string;
  destinationBranchName?: string;
  warehouseName?: string;
  createdByName?: string;
  qrToken?: string | null;
  itemCount?: number;
  totalItems?: number;
  totalQuantity?: number;
}

interface Item {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  unitName?: string;
  categoryName?: string;
  barcode?: string | null;
  status?: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface DetailEntry {
  itemId: number;
  quantity: number;
  notes: string | null;
  _item?: Item;
}

export default function BarangKeluarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [printData, setPrintData] = useState<SuratJalanData | null>(null);
  const [details, setDetails] = useState<DetailEntry[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cameraScanOpen, setCameraScanOpen] = useState(false);

  // Edit states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockOut | null>(null);
  const [editForm, setEditForm] = useState({
    referenceNumber: "",
    branchId: "",
    date: "",
    notes: "",
  });

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Create form state
  const [form, setForm] = useState({
    referenceNumber: "",
    branchId: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1" });

  const { toast } = useToast();
  const qc = useQueryClient();

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const MONTHS = [
    { value: "0", label: "Januari" },
    { value: "1", label: "Februari" },
    { value: "2", label: "Maret" },
    { value: "3", label: "April" },
    { value: "4", label: "Mei" },
    { value: "5", label: "Juni" },
    { value: "6", label: "Juli" },
    { value: "7", label: "Agustus" },
    { value: "8", label: "September" },
    { value: "9", label: "Oktober" },
    { value: "10", label: "November" },
    { value: "11", label: "Desember" },
  ];

  const handlePrintById = async (id: number, fallbackRef?: string) => {
    try {
      const detail = await apiFetch<any>(`/api/stock-out/${id}`);
      const header = detail?.stockOut || detail || {};
      const itemsList = detail?.items || detail?.details || header?.items || [];

      setPrintData({
        id: header.id || id,
        referenceNo: header.referenceNo || header.referenceNumber || fallbackRef || `BK-${id}`,
        transactionDate: header.transactionDate || header.createdAt || new Date().toISOString(),
        releasedAt: header.releasedAt,
        departmentName: header.destinationBranchName || header.departmentName,
        destinationBranchName: header.destinationBranchName || header.departmentName,
        warehouseName: header.warehouseName,
        createdByName: header.createdByName,
        qrToken: header.qrToken,
        notes: header.notes,
        items: itemsList.map((it: any) => ({
          id: it.id,
          itemCode: it.itemCode || it.code,
          itemName: it.itemName || it.name,
          quantity: it.quantity,
          unitName: it.unitName || "Buah",
          locationName: it.locationName,
          notes: it.notes,
        })),
      });
    } catch (err: any) {
      toast({
        title: "Gagal memuat Surat Jalan",
        description: err.message || "Terjadi kesalahan saat memuat data.",
        variant: "destructive",
      });
    }
  };

  const { data: stockOutsData, isLoading } = useQuery({
    queryKey: ["stock-out"],
    queryFn: () => apiFetch<StockOut[] | { data: StockOut[] }>("/api/stock-out"),
  });
  const { data: itemsData } = useQuery({
    queryKey: ["items"],
    queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=250"),
  });
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[] | { data: Branch[] }>("/api/branches"),
  });
  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ["stock-out", viewId],
    queryFn: () => apiFetch<any>(`/api/stock-out/${viewId}`),
    enabled: !!viewId,
  });

  const stockOuts: StockOut[] = useMemo(() => {
    if (Array.isArray(stockOutsData)) return stockOutsData;
    if (stockOutsData && typeof stockOutsData === "object" && Array.isArray((stockOutsData as any).data)) {
      return (stockOutsData as any).data;
    }
    return [];
  }, [stockOutsData]);

  const branches: Branch[] = useMemo(() => {
    if (Array.isArray(branchesData)) return branchesData;
    if (branchesData && typeof branchesData === "object" && Array.isArray((branchesData as any).data)) {
      return (branchesData as any).data;
    }
    return [];
  }, [branchesData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  // Extract available years dynamically from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    stockOuts.forEach((s) => {
      const dStr = s.transactionDate || s.createdAt;
      if (dStr) {
        yearsSet.add(new Date(dStr).getFullYear().toString());
      }
    });
    yearsSet.add(new Date().getFullYear().toString());
    return Array.from(yearsSet).sort().reverse();
  }, [stockOuts]);

  // Filtered transactions
  const filteredStockOuts = useMemo(() => {
    return stockOuts.filter((s) => {
      const dStr = s.transactionDate || s.createdAt;
      const d = dStr ? new Date(dStr) : null;

      if (filterYear !== "all" && d && d.getFullYear().toString() !== filterYear) {
        return false;
      }
      if (filterMonth !== "all" && d && d.getMonth().toString() !== filterMonth) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (s.referenceNumber || s.referenceNo || "").toLowerCase();
        const dest = (s.destinationBranchName || s.departmentName || "").toLowerCase();
        const wh = (s.warehouseName || "").toLowerCase();
        const notes = (s.notes || "").toLowerCase();
        if (!ref.includes(q) && !dest.includes(q) && !wh.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [stockOuts, filterYear, filterMonth, searchQuery]);

  // Pagination calculation
  const totalItemsCount = filteredStockOuts.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedStockOuts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStockOuts.slice(start, start + pageSize);
  }, [filteredStockOuts, safeCurrentPage, pageSize]);

  // Create mutation
  const saveMutation = useMutation({
    mutationFn: (autoFinalize: boolean = false) => {
      const itemsPayload = details.map(d => ({
        itemId: d.itemId,
        quantity: d.quantity,
        notes: d.notes,
      }));
      const body = {
        referenceNumber: form.referenceNumber,
        referenceNo: form.referenceNumber,
        destinationBranchId: form.branchId ? parseInt(form.branchId) : null,
        transactionDate: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        date: form.date,
        notes: form.notes || null,
        items: itemsPayload,
        details: itemsPayload,
        autoFinalize,
      };
      return apiFetch("/api/stock-out", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: (data: any, autoFinalize) => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({
        title: autoFinalize ? "Barang Keluar Disimpan & Dikirim" : "Draft Barang Keluar Disimpan",
        description: autoFinalize ? "Stok fisik barang telah berkurang dan Surat Jalan aktif." : "Transaksi disimpan sebagai draft.",
      });
      if (autoFinalize && data?.id) {
        handlePrintById(data.id, data.referenceNo);
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) throw new Error("Tidak ada transaksi yang dipilih");
      const body = {
        referenceNo: editForm.referenceNumber,
        referenceNumber: editForm.referenceNumber,
        destinationBranchId: editForm.branchId ? parseInt(editForm.branchId) : null,
        transactionDate: editForm.date ? new Date(editForm.date).toISOString() : undefined,
        notes: editForm.notes,
      };
      return apiFetch(`/api/stock-out/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      setEditDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Transaksi Berhasil Diperbarui", description: "Perubahan informasi pengeluaran barang telah disimpan." });
    },
    onError: (e: Error) => toast({ title: "Gagal Memperbarui", description: e.message, variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/stock-out/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDeleteConfirmId(null);
      toast({ title: "Transaksi Berhasil Dihapus", description: "Data transaksi dan unit pelacakan terkait telah dihapus." });
    },
    onError: (e: Error) => toast({
      title: "Gagal Menghapus Transaksi",
      description: e.message || "Material mungkin sudah dalam proses pemasangan atau verifikasi.",
      variant: "destructive",
    }),
  });

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/stock-out/${id}/finalize`, { method: "POST" }),
    onSuccess: (_data: any, id: number) => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      if (viewId) qc.invalidateQueries({ queryKey: ["stock-out", viewId] });
      toast({
        title: "Transaksi Selesai Difinalisasi",
        description: "Stok fisik barang telah berkurang dan Surat Jalan diterbitkan.",
      });
      handlePrintById(id);
    },
    onError: (e: Error) => toast({ title: "Gagal Finalisasi", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setDetails([]);
    setForm({
      referenceNumber: `BK-${Date.now().toString().slice(-6)}`,
      branchId: branches[0]?.id ? String(branches[0].id) : "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
    setDetailForm({ itemId: "", quantity: "1" });
    setDialogOpen(true);
  };

  const openEdit = (item: StockOut) => {
    setEditingItem(item);
    const dStr = item.transactionDate || item.createdAt;
    setEditForm({
      referenceNumber: item.referenceNumber || item.referenceNo || "",
      branchId: item.destinationBranchId ? String(item.destinationBranchId) : "",
      date: dStr ? new Date(dStr).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      notes: item.notes || "",
    });
    setEditDialogOpen(true);
  };

  /* Add material to draft list by item object */
  const addItemToDraft = useCallback((item: Item, qty: number = 1) => {
    if ((item.status ?? "active") !== "active") {
      toast({ title: "Barang tidak aktif", description: "Material tidak dapat digunakan untuk transaksi.", variant: "destructive" });
      return;
    }
    const safeQty = Math.max(1, qty);
    setDetails(ds => {
      const existing = ds.find(d => d.itemId === item.id);
      if (existing) {
        return ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + safeQty } : d);
      }
      return [...ds, { itemId: item.id, quantity: safeQty, notes: null, _item: item }];
    });
    toast({ title: `${item.name} ditambahkan (${safeQty} ${item.unitName || "unit"})` });
  }, [toast]);

  /* Keyboard barcode scan handler */
  const handleBarcodeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const q = barcodeInput.trim().toLowerCase();
      const item = items?.find(i =>
        (i.barcode && i.barcode.toLowerCase() === q) ||
        (i.code && i.code.toLowerCase() === q) ||
        (i.name && i.name.toLowerCase().includes(q))
      );
      if (item) {
        addItemToDraft(item);
      } else {
        toast({ title: "Material tidak ditemukan", description: "Material belum terdaftar di Master Material.", variant: "destructive" });
      }
      setBarcodeInput("");
    }
  };

  /* Camera scan detected */
  const handleCameraDetected = useCallback(async (barcode: string) => {
    try {
      const result = await apiFetch<Item>(`/api/items/barcode/${encodeURIComponent(barcode)}`);
      if ((result.status ?? "active") !== "active") {
        throw new Error("Barang tidak aktif.");
      }
      addItemToDraft(result);
    } catch {
      throw new Error("Barcode tidak ditemukan (Barang belum terdaftar).");
    }
  }, [addItemToDraft]);

  /* Manual dropdown add */
  const addDetail = () => {
    if (!detailForm.itemId) return;
    const item = items?.find(i => i.id === parseInt(detailForm.itemId));
    if (!item) return;
    const qty = Math.max(1, parseInt(detailForm.quantity) || 1);
    addItemToDraft(item, qty);
    setDetailForm({ itemId: "", quantity: "1" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ── Top Header ── */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barang Keluar (Distribusi)</h1>
          <p className="text-muted-foreground text-sm">Pengeluaran dan pengiriman material aksesoris ke unit cabang.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2 shadow-xs">
          <Plus className="w-4 h-4" /> Transaksi Baru
        </Button>
      </motion.div>

      {/* ── Filter Toolbar (Search, Month, Year) ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari no. referensi SPK, cabang tujuan, atau catatan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 h-9 text-xs bg-muted/30 border-border"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <Select
            value={filterMonth}
            onValueChange={(val) => {
              setFilterMonth(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs w-36 bg-muted/30 border-border">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Semua Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select
            value={filterYear}
            onValueChange={(val) => {
              setFilterYear(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs w-32 bg-muted/30 border-border">
              <SelectValue placeholder="Semua Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={yr}>
                  Tahun {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters button if any active */}
          {(searchQuery || filterMonth !== "all" || filterYear !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterMonth("all");
                setFilterYear("all");
                setCurrentPage(1);
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}

          <Badge variant="secondary" className="h-9 px-3 text-xs font-mono">
            {filteredStockOuts.length} Data
          </Badge>
        </div>
      </motion.div>

      {/* ── Table Section ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold pl-4">No. Referensi / SPK</TableHead>
                  <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold">Cabang Tujuan</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Jml Item</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="p-3">
                        <Skeleton className="h-8 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStockOuts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-sm">Tidak ada transaksi keluar yang cocok</p>
                      <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter bulan/tahun.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStockOuts.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium pl-4 text-xs text-primary">
                        {s.referenceNumber || s.referenceNo}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {formatDate(s.transactionDate || s.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {s.destinationBranchName || s.departmentName || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {s.totalQuantity ? `${s.totalQuantity} unit` : `${s.totalItems ?? s.itemCount ?? 0} item`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.status === "completed" || s.status === "DIKIRIM" ? "default" : "secondary"}
                          className="text-[10px] font-medium"
                        >
                          {s.status === "completed" || s.status === "DIKIRIM" ? "Selesai / Dikirim" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {s.status !== "completed" && s.status !== "DIKIRIM" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800"
                                  onClick={() => finalizeMutation.mutate(s.id)}
                                  disabled={finalizeMutation.isPending}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Finalisasi</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Finalisasi transaksi & kurangi stok gudang</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                                onClick={() => handlePrintById(s.id, s.referenceNumber || s.referenceNo)}
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Surat Jalan</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cetak Surat Jalan & BPB</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewId(s.id)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lihat Detail</TooltipContent>
                          </Tooltip>

                          {/* Tombol Edit */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Transaksi</TooltipContent>
                          </Tooltip>

                          {/* Tombol Hapus */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                onClick={() => setDeleteConfirmId(s.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus Transaksi</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* ── Pagination Footer ── */}
            {filteredStockOuts.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>
                    Menampilkan <b className="text-foreground">{(safeCurrentPage - 1) * pageSize + 1}</b> -{" "}
                    <b className="text-foreground">{Math.min(safeCurrentPage * pageSize, totalItemsCount)}</b> dari{" "}
                    <b className="text-foreground">{totalItemsCount}</b> transaksi
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <span>Baris per halaman:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs bg-muted/40 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="h-8 px-2 text-xs gap-1 border-border"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        return (
                          <div key={p} className="flex items-center">
                            {prevPage && p - prevPage > 1 && (
                              <span className="px-1 text-muted-foreground">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                                p === safeCurrentPage
                                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="h-8 px-2 text-xs gap-1 border-border"
                  >
                    Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Create Transaction Dialog ───────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaksi Barang Keluar (Distribusi Cabang)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Header Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">No. Referensi / SPK *</Label>
                <Input
                  value={form.referenceNumber}
                  onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder="BK-XXXXXX"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tanggal Distribusi</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cabang Penerima *</Label>
                <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih cabang tujuan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()} className="text-xs">
                        {b.name}{b.code ? ` (${b.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Material selection section with Category */}
            <div className="border rounded-xl p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  Tambah Material Distribusi
                </p>
                <span className="text-[11px] text-muted-foreground">Scan barcode atau pilih material</span>
              </div>

              {/* Scan Barcode row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKey}
                    placeholder="Scan barcode / cari nama / kode material, lalu tekan Enter..."
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCameraScanOpen(true)}
                  className="gap-1.5 h-9 text-xs"
                >
                  <Camera className="w-3.5 h-3.5" /> Kamera QR
                </Button>
              </div>

              {/* Manual dropdown add with Category badge */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select value={detailForm.itemId} onValueChange={v => setDetailForm(f => ({ ...f, itemId: v }))}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih barang material..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {items.filter(i => (i.status ?? "active") === "active").map(i => (
                        <SelectItem key={i.id} value={i.id.toString()} className="text-xs">
                          <span className="font-bold text-primary">[{i.categoryName || "Aksesoris"}]</span>{" "}
                          <span className="font-mono">{i.code}</span> - {i.name}{" "}
                          <span className="text-muted-foreground">({i.unitName || "unit"})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={detailForm.quantity}
                    onChange={e => setDetailForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="Qty"
                    className="h-9 text-xs text-center font-semibold"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addDetail}
                  disabled={!detailForm.itemId}
                  className="h-9 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </Button>
              </div>
            </div>

            {/* Draft items list with Kategori column */}
            <AnimatePresence>
              {details.length > 0 && (
                <motion.div
                  className="border rounded-xl overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Material & Kode</TableHead>
                        <TableHead className="text-xs font-semibold">Kategori</TableHead>
                        <TableHead className="text-xs font-semibold text-center w-28">Qty</TableHead>
                        <TableHead className="text-xs font-semibold">Satuan</TableHead>
                        <TableHead className="text-right text-xs font-semibold w-16 pr-3">Hapus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.map((d, i) => (
                        <TableRow key={d.itemId} className="hover:bg-muted/30">
                          <TableCell className="py-2.5">
                            <p className="font-medium text-xs">{d._item?.name ?? d.itemId}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{d._item?.code}</p>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
                              {d._item?.categoryName || "Aksesoris"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={d.quantity}
                              onChange={(e) => {
                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                setDetails(ds => ds.map((dd, j) => j === i ? { ...dd, quantity: newQty } : dd));
                              }}
                              className="h-8 w-20 text-center mx-auto text-xs font-semibold"
                            />
                          </TableCell>
                          <TableCell className="py-2.5 text-xs text-muted-foreground">
                            {d._item?.unitName || "Unit"}
                          </TableCell>
                          <TableCell className="py-2.5 text-right pr-3">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => setDetails(ds => ds.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Catatan textarea dipindahkan ke paling bawah sesuai permintaan */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-medium">Catatan Distribusi (Opsional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Contoh: Pengiriman material aksesoris tahap 2 lombok tengah..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              variant="secondary"
              onClick={() => saveMutation.mutate(false)}
              disabled={!form.referenceNumber || details.length === 0 || saveMutation.isPending}
            >
              Simpan Draft
            </Button>
            <Button
              onClick={() => saveMutation.mutate(true)}
              disabled={!form.referenceNumber || details.length === 0 || saveMutation.isPending}
              className="bg-primary text-primary-foreground gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan & Kirim ke Cabang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Transaction Dialog ─────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaksi Barang Keluar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">No. Referensi / Surat Jalan</Label>
              <Input
                value={editForm.referenceNumber}
                onChange={e => setEditForm(f => ({ ...f, referenceNumber: e.target.value }))}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Transaksi</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cabang Penerima</Label>
              <Select
                value={editForm.branchId}
                onValueChange={v => setEditForm(f => ({ ...f, branchId: v }))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih cabang tujuan" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-xs">
                      {b.name}{b.code ? ` (${b.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catatan Transaksi</Label>
              <Textarea
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Catatan perbaikan atau alasan revisi..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editForm.referenceNumber}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={o => !o && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Hapus Transaksi Keluar?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground py-2 leading-relaxed space-y-2">
            <p>
              Apakah Anda yakin ingin menghapus transaksi keluar ini? Nomor seri dan unit pelacakan terkait akan dibatalkan secara aman.
            </p>
            <p className="p-2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium">
              Transaksi yang materialnya telah dipasang oleh teknisi lapangan atau diverifikasi SPI tidak dapat dihapus demi integritas audit.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Camera Scanner ──────────────────────────────────────── */}
      <BarcodeScanner
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onDetected={handleCameraDetected}
        continuous
      />

      {/* ── View Detail Dialog (Resilient & safe against undefined) ── */}
      <Dialog open={viewId !== null} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Keluar</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : viewData ? (() => {
            const header = (viewData as any)?.stockOut || viewData || {};
            const refNumber = header?.referenceNumber || header?.referenceNo || (viewData as any)?.referenceNo || (viewData as any)?.referenceNumber || "—";
            const dateStr = header?.transactionDate || header?.createdAt || (viewData as any)?.transactionDate || (viewData as any)?.createdAt;
            const destName = header?.destinationBranchName || header?.departmentName || (viewData as any)?.destinationBranchName || (viewData as any)?.departmentName || "—";
            const st = header?.status || (viewData as any)?.status || "DRAFT";
            const itemsList: any[] = (viewData as any)?.items || (viewData as any)?.details || header?.items || header?.details || [];

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">No. Referensi:</span>
                    <p className="font-mono font-bold text-primary">{refNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Tanggal Transaksi:</span>
                    <p className="font-medium">{formatDate(dateStr)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Cabang Penerima:</span>
                    <p className="font-medium">{destName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">Status:</span>
                    <Badge variant={st === "completed" || st === "DIKIRIM" ? "default" : "secondary"} className="text-[10px]">
                      {st === "completed" || st === "DIKIRIM" ? "Selesai / Dikirim" : "Draft"}
                    </Badge>
                  </div>
                  {header?.notes && (
                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <span className="text-muted-foreground block mb-0.5">Catatan:</span>
                      <p className="text-xs italic text-foreground">{header.notes}</p>
                    </div>
                  )}
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Material</TableHead>
                        <TableHead className="text-xs font-semibold">Kategori</TableHead>
                        <TableHead className="text-right text-xs font-semibold pr-4">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                            Tidak ada item terlampir
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemsList.map((d: any, i: number) => (
                          <TableRow key={i} className="hover:bg-muted/30">
                            <TableCell className="py-2.5">
                              <p className="font-medium text-xs">{d.itemName ?? d.name ?? d.itemId}</p>
                              {(d.itemCode ?? d.code) && (
                                <p className="text-[11px] font-mono text-muted-foreground">{d.itemCode ?? d.code}</p>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs">
                              <Badge variant="outline" className="text-[10px]">
                                {d.categoryName || "Aksesoris"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4 py-2.5 font-semibold text-xs">
                              {d.quantity} {d.unitName || "unit"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })() : (
            <div className="text-center py-8 text-muted-foreground text-xs">Data transaksi tidak ditemukan.</div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewId(null)}>Tutup</Button>
              {viewData && (() => {
                const header = (viewData as any)?.stockOut || viewData || {};
                const st = header?.status || (viewData as any)?.status;
                if (st !== "completed" && st !== "DIKIRIM") {
                  return (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (viewId) finalizeMutation.mutate(viewId);
                      }}
                      disabled={finalizeMutation.isPending}
                      className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Finalisasi
                    </Button>
                  );
                }
                return null;
              })()}
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (viewId) {
                  const header = (viewData as any)?.stockOut || viewData || {};
                  handlePrintById(viewId, header?.referenceNumber || header?.referenceNo);
                }
              }}
              className="gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Surat Jalan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Printable Surat Jalan Modal ──────────────────────────── */}
      <SuratJalanPrintModal
        open={printData !== null}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </div>
  );
}
