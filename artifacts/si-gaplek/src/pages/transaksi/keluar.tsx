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
import { Plus, Eye, Trash2, PackageMinus, Camera, Search, ScanBarcode, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StockOut { id: number; referenceNumber: string; departmentId: number | null; notes: string | null; status: string; createdAt: string; departmentName?: string; itemCount?: number; }
interface Item { id: number; code: string; name: string; currentStock: number; unitName?: string; barcode?: string | null; status?: string; }
interface Department { id: number; name: string; code: string; }
interface DetailEntry { itemId: number; quantity: number; notes: string | null; _item?: Item; }

export default function BarangKeluarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailEntry[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [form, setForm] = useState({ referenceNumber: "", departmentId: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1" });
  const { toast } = useToast();
  const qc = useQueryClient();

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
    mutationFn: () => apiFetch("/api/stock-out", {
      method: "POST",
      body: JSON.stringify({
        referenceNumber: form.referenceNumber,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        notes: form.notes || null,
        details: details.map(d => ({ itemId: d.itemId, quantity: d.quantity, notes: d.notes })),
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock-out"] }); qc.invalidateQueries({ queryKey: ["items"] }); setDialogOpen(false); toast({ title: "Barang keluar disimpan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
    setDetails(ds => {
      const existing = ds.find(d => d.itemId === item.id);
      if (existing) {
        return ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + qty } : d);
      }
      return [...ds, { itemId: item.id, quantity: qty, notes: null, _item: item }];
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
    const qty = parseInt(detailForm.quantity);
    if (item.currentStock < qty) { toast({ title: "Stok tidak cukup", description: `Stok tersedia: ${item.currentStock}`, variant: "destructive" }); return; }
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
            <TableHeader><TableRow className="bg-muted/30"><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Departemen</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                !stockOuts?.length ? <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium">Belum ada transaksi keluar</p><p className="text-xs mt-1">Klik Transaksi Baru untuk memulai</p></TableCell></TableRow> :
                  stockOuts.map(s => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-mono font-medium">{s.referenceNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(s.createdAt)}</TableCell>
                      <TableCell className="text-sm">{s.departmentName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{s.itemCount ?? 0} item</TableCell>
                      <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status === "completed" ? "Selesai" : "Draft"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setViewId(s.id)}><Eye className="w-4 h-4" /></Button>
                        </TooltipTrigger><TooltipContent>Lihat Detail</TooltipContent></Tooltip>
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
            <div className="space-y-1.5"><Label>Departemen Penerima</Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.code})</SelectItem>)}</SelectContent>
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
                    placeholder="🔍 Cari berdasarkan nama/kode/barcode, tekan Enter..."
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
                    <Camera className="w-4 h-4" /> 📷 Scan Barcode
                  </Button>
                </motion.div>
              </div>

              {/* Manual dropdown add */}
              <div className="flex gap-2">
                <Select value={detailForm.itemId} onValueChange={v => setDetailForm(f => ({ ...f, itemId: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Atau pilih barang" /></SelectTrigger>
                  <SelectContent>{items?.filter(i => i.currentStock > 0).map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.code} - {i.name} (stok: {i.currentStock})</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="1" value={detailForm.quantity} onChange={e => setDetailForm(f => ({ ...f, quantity: e.target.value }))} className="w-24" />
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
                              value={d.quantity}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                setDetails(ds => ds.map((dd, j) => j === i ? { ...dd, quantity: newQty } : dd));
                              }}
                              className="w-20 text-right inline-block"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.referenceNumber || details.length === 0 || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Simpan Transaksi"}</Button>
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
          <DialogFooter><Button onClick={() => setViewId(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
