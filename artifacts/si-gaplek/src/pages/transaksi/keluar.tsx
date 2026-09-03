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
import { Plus, Eye, Trash2, PackageMinus, Camera, Search, ScanBarcode, FolderOpen, Printer, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SuratJalanPrintModal, type SuratJalanData } from "@/components/print/surat-jalan-print";

interface StockOut {
  id: number;
  referenceNumber?: string;
  referenceNo?: string;
  departmentId: number | null;
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
}
interface Item { id: number; code: string; name: string; currentStock: number; unitName?: string; barcode?: string | null; status?: string; }
interface Department { id: number; name: string; code: string; }
interface DetailEntry { itemId: number; quantity: number; notes: string | null; _item?: Item; }

export default function BarangKeluarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [printData, setPrintData] = useState<SuratJalanData | null>(null);
  const [details, setDetails] = useState<DetailEntry[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [form, setForm] = useState({ referenceNumber: "", departmentId: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const handlePrintById = async (id: number, fallbackRef?: string) => {
    try {
      const detail = await apiFetch<any>(`/api/stock-out/${id}`);
      setPrintData({
        id: detail.id,
        referenceNo: detail.referenceNo || fallbackRef || `BK-${id}`,
        transactionDate: detail.transactionDate || detail.createdAt || new Date().toISOString(),
        releasedAt: detail.releasedAt,
        departmentName: detail.departmentName,
        destinationBranchName: detail.destinationBranchName,
        warehouseName: detail.warehouseName,
        createdByName: detail.createdByName,
        qrToken: detail.qrToken,
        notes: detail.notes,
        items: (detail.items || []).map((it: any) => ({
          id: it.id,
          itemCode: it.itemCode,
          itemName: it.itemName,
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

  const { data: stockOutsData, isLoading } = useQuery({ queryKey: ["stock-out"], queryFn: () => apiFetch<StockOut[] | { data: StockOut[] }>("/api/stock-out") });
  const { data: itemsData } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=100") });
  const { data: departmentsData } = useQuery({ queryKey: ["departments"], queryFn: () => apiFetch<Department[] | { data: Department[] }>("/api/departments") });
  const { data: viewData } = useQuery({ queryKey: ["stock-out", viewId], queryFn: () => apiFetch<{ stockOut: StockOut; details: DetailEntry[] }>(`/api/stock-out/${viewId}`), enabled: !!viewId });

  const stockOuts: StockOut[] = useMemo(() => {
    if (Array.isArray(stockOutsData)) return stockOutsData;
    if (stockOutsData && typeof stockOutsData === "object" && Array.isArray((stockOutsData as any).data)) {
      return (stockOutsData as any).data;
    }
    return [];
  }, [stockOutsData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  const departments: Department[] = useMemo(() => {
    if (Array.isArray(departmentsData)) return departmentsData;
    if (departmentsData && typeof departmentsData === "object" && Array.isArray((departmentsData as any).data)) {
      return (departmentsData as any).data;
    }
    return [];
  }, [departmentsData]);

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
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        transactionDate: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        date: form.date,
        notes: form.notes || null,
        items: itemsPayload,
        details: itemsPayload,
        autoFinalize,
      };
      return apiFetch("/api/stock-out", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: (_data, autoFinalize) => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({
        title: autoFinalize ? "Barang Keluar Disimpan & Dikirim" : "Draft Barang Keluar Disimpan",
        description: autoFinalize ? "Stok fisik barang telah berkurang dan Surat Jalan aktif." : "Transaksi disimpan sebagai draft.",
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const finalizeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/stock-out/${id}/finalize`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-out"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      if (viewId) qc.invalidateQueries({ queryKey: ["stock-out", viewId] });
      toast({
        title: "Transaksi Selesai Difinalisasi",
        description: "Stok fisik barang telah berkurang dan Surat Jalan diterbitkan.",
      });
    },
    onError: (e: Error) => toast({ title: "Gagal Finalisasi", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setDetails([]);
    setForm({ referenceNumber: `BK-${Date.now().toString().slice(-6)}`, departmentId: "", notes: "", date: new Date().toISOString().split("T")[0] });
    setDetailForm({ itemId: "", quantity: "1" });
    setDialogOpen(true);
  };

  /* Add material to draft list by item object */
  const addItemToDraft = useCallback((item: Item, qty: number = 1) => {
    if ((item.status ?? "active") !== "active") {
      toast({ title: "Barang tidak aktif", description: "Material tidak dapat digunakan untuk transaksi.", variant: "destructive" });
      return;
    }
    const availStock = item.currentStock ?? 0;
    if (availStock <= 0) {
      toast({ title: "Stok Kosong", description: `Material ${item.name} saat ini tidak memiliki stok di gudang.`, variant: "destructive" });
      return;
    }
    setDetails(ds => {
      const existing = ds.find(d => d.itemId === item.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > availStock) {
          toast({
            title: "Batas Stok Terlampaui",
            description: `Total kuantitas (${nextQty}) melebihi stok yang tersedia (${availStock}). Disesuaikan ke stok maksimal.`,
            variant: "destructive",
          });
          return ds.map(d => d.itemId === item.id ? { ...d, quantity: availStock } : d);
        }
        return ds.map(d => d.itemId === item.id ? { ...d, quantity: nextQty } : d);
      }
      const safeQty = Math.min(qty, availStock);
      return [...ds, { itemId: item.id, quantity: safeQty, notes: null, _item: item }];
    });
    toast({ title: `${item.name} ditambahkan` });
  }, [toast]);

  /* Keyboard barcode scan handler (USB/Bluetooth scanner) */
  const handleBarcodeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const item = items?.find(i => i.barcode === barcodeInput.trim() || i.code === barcodeInput.trim());
      if (item) {
        addItemToDraft(item);
      } else {
        toast({ title: "Barcode tidak ditemukan", description: "Barang belum terdaftar di Master Material.", variant: "destructive" });
      }
      setBarcodeInput("");
    }
  };

  /* Camera scan detected → backend lookup → add to draft */
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
    const qty = parseInt(detailForm.quantity) || 1;
    const availStock = item.currentStock ?? 0;
    if (qty > availStock) {
      toast({
        title: "Stok tidak mencukupi",
        description: `Stok tersedia untuk ${item.name} hanya ${availStock}.`,
        variant: "destructive",
      });
      return;
    }
    addItemToDraft(item, qty);
    setDetailForm({ itemId: "", quantity: "1" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barang Keluar</h1>
          <p className="text-muted-foreground text-sm">Transaksi pengeluaran barang dari gudang.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Transaksi Baru</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <PackageMinus className="w-3.5 h-3.5 mr-1.5" />{stockOuts?.length ?? 0} Transaksi
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/30"><TableHead>No. Referensi / SPK</TableHead><TableHead>Tanggal</TableHead><TableHead>Tujuan / Cabang</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                !stockOuts?.length ? <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium">Belum ada transaksi keluar</p><p className="text-xs mt-1">Klik Transaksi Baru untuk memulai</p></TableCell></TableRow> :
                  stockOuts.map(s => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-mono font-medium">{s.referenceNumber || s.referenceNo}</TableCell>
                      <TableCell className="text-sm">{formatDate(s.transactionDate || s.createdAt)}</TableCell>
                      <TableCell className="text-sm font-medium">{s.destinationBranchName || s.departmentName || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{s.itemCount ?? 0} item</TableCell>
                      <TableCell><Badge variant={s.status === "completed" || s.status === "DIKIRIM" ? "default" : "secondary"}>{s.status === "completed" || s.status === "DIKIRIM" ? "Selesai / Dikirim" : "Draft"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status !== "completed" && s.status !== "DIKIRIM" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800"
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
                                className="h-7 gap-1 px-2 text-xs text-sky-700 border-sky-300 dark:text-sky-400 dark:border-sky-800"
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
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewId(s.id)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lihat Detail</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </motion.div>

      {/* ── Create Transaction Dialog ───────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transaksi Barang Keluar</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>No. Referensi *</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Departemen / Cabang Penerima</Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih departemen atau cabang" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Departemen Internal
                  </div>
                  {departments?.filter(d => !d.name.startsWith("Cabang ")).map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.code})</SelectItem>
                  ))}
                  <div className="px-2 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 border-t mt-1.5 pt-1.5 uppercase tracking-wider">
                    12 Unit Cabang (Lombok Tengah)
                  </div>
                  {departments?.filter(d => d.name.startsWith("Cabang ")).map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            {/* Material selection section */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">+ Tambah Material</p>

              {/* Scan Barcode row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKey}
                    placeholder="Cari berdasarkan nama/kode/barcode, tekan Enter..."
                    className="font-mono pl-9"
                  />
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCameraScanOpen(true)}
                    className="gap-2"
                  >
                    <Camera className="w-4 h-4" /> Scan Barcode
                  </Button>
                </motion.div>
              </div>

              {/* Manual dropdown add */}
              <div className="flex gap-2">
                <Select value={detailForm.itemId} onValueChange={v => setDetailForm(f => ({ ...f, itemId: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Atau pilih barang" /></SelectTrigger>
                  <SelectContent>{items?.filter(i => i.currentStock > 0).map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.code} - {i.name} (stok: {i.currentStock})</SelectItem>)}</SelectContent>
                </Select>
                {(() => {
                  const selItem = items?.find(i => i.id === parseInt(detailForm.itemId));
                  const maxStock = selItem?.currentStock ?? 999999;
                  return (
                    <Input
                      type="number"
                      min="1"
                      max={maxStock}
                      value={detailForm.quantity}
                      onChange={e => {
                        const val = e.target.value;
                        if (selItem && parseInt(val) > maxStock) {
                          toast({
                            title: "Melebihi Stok",
                            description: `Stok tersedia untuk ${selItem.name} hanya ${maxStock}.`,
                            variant: "destructive",
                          });
                          setDetailForm(f => ({ ...f, quantity: maxStock.toString() }));
                          return;
                        }
                        setDetailForm(f => ({ ...f, quantity: val }));
                      }}
                      className="w-24"
                    />
                  );
                })()}
                <Button type="button" onClick={addDetail} disabled={!detailForm.itemId}>Tambah</Button>
              </div>
            </div>

            {/* Draft items list */}
            <AnimatePresence>
              {details.length > 0 && (
                <motion.div
                  className="border rounded-lg overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Table>
                    <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Hapus</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {details.map((d, i) => (
                        <motion.tr
                          key={d.itemId}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.2 }}
                          className="border-b"
                        >
                          <TableCell>
                            <span className="font-medium">{d._item?.name ?? d.itemId}</span>
                            {d._item?.code && <span className="text-xs text-muted-foreground ml-2 font-mono">{d._item.code}</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              max={d._item?.currentStock}
                              value={d.quantity}
                              onChange={(e) => {
                                let newQty = parseInt(e.target.value) || 1;
                                const maxStock = d._item?.currentStock ?? 999999;
                                if (newQty > maxStock) {
                                  toast({
                                    title: "Melebihi Stok",
                                    description: `Kuantitas disesuaikan ke stok maksimal (${maxStock}).`,
                                    variant: "destructive",
                                  });
                                  newQty = maxStock;
                                }
                                setDetails(ds => ds.map((dd, j) => j === i ? { ...dd, quantity: newQty } : dd));
                              }}
                              className="w-20 text-right inline-block font-medium"
                            />
                          </TableCell>
                          <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDetails(ds => ds.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
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
              className="bg-sky-700 hover:bg-sky-800 text-white gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan & Kurangi Stok"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Camera Scanner (continuous mode) ────────────────────── */}
      <BarcodeScanner
        open={cameraScanOpen}
        onClose={() => setCameraScanOpen(false)}
        onDetected={handleCameraDetected}
        continuous
      />

      {/* ── View Detail Dialog ──────────────────────────────────── */}
      <Dialog open={viewId !== null} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Transaksi Keluar</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">No. Referensi:</span><p className="font-mono font-medium">{viewData.stockOut.referenceNumber}</p></div>
                <div><span className="text-muted-foreground">Tanggal:</span><p>{formatDate(viewData.stockOut.createdAt)}</p></div>
                <div><span className="text-muted-foreground">Departemen:</span><p>{viewData.stockOut.departmentName ?? "-"}</p></div>
                <div><span className="text-muted-foreground">Status:</span><Badge>{viewData.stockOut.status}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>{viewData.details?.map((d, i) => <TableRow key={i}><TableCell>{(d as any).itemName ?? d.itemId}</TableCell><TableCell className="text-right">{d.quantity}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewId(null)}>Tutup</Button>
              {viewData?.stockOut?.status !== "completed" && viewData?.stockOut?.status !== "DIKIRIM" && (
                <Button
                  onClick={() => {
                    if (viewId) finalizeMutation.mutate(viewId);
                  }}
                  disabled={finalizeMutation.isPending}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finalisasi & Kurangi Stok
                </Button>
              )}
            </div>
            <Button
              onClick={() => {
                if (viewId) {
                  handlePrintById(viewId, viewData?.stockOut?.referenceNumber);
                }
              }}
              className="gap-1.5 bg-sky-700 hover:bg-sky-800 text-white"
            >
              <Printer className="w-4 h-4" />
              Cetak Surat Jalan (BPB)
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
