import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Eye, ScanBarcode, Trash2, PackagePlus, FolderOpen, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuktiPenerimaanPrintModal, type BuktiPenerimaanData } from "@/components/print/bukti-penerimaan-print";

interface StockIn {
  id: number;
  referenceNumber?: string;
  referenceNo?: string;
  supplierId: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  transactionDate?: string;
  supplierName?: string;
  warehouseName?: string;
  itemCount?: number;
  totalItems?: number;
}

interface Item { id: number; code: string; name: string; unitName?: string; }
interface Supplier { id: number; name: string; }
interface Warehouse { id: number; name: string; }
interface Location { id: number; name: string; warehouseId: number; }

interface StockInDetail {
  itemId: number;
  quantity: number;
  unitPrice: string | null;
  warehouseId: number | null;
  locationId: number | null;
  notes: string | null;
  _item?: Item;
  _warehouseName?: string;
  _locationName?: string;
}

export default function BarangMasukPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [printData, setPrintData] = useState<BuktiPenerimaanData | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [details, setDetails] = useState<StockInDetail[]>([]);
  const [form, setForm] = useState({ referenceNumber: "", supplierId: "", notes: "", warehouseId: "", date: new Date().toISOString().split("T")[0] });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1", unitPrice: "", locationId: "", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const handlePrintById = async (id: number, fallbackRef?: string) => {
    try {
      const detail = await apiFetch<any>(`/api/stock-in/${id}`);
      setPrintData({
        id: detail.id,
        referenceNo: detail.referenceNo || fallbackRef || `BM-${id}`,
        transactionDate: detail.transactionDate || detail.createdAt || new Date().toISOString(),
        supplierName: detail.supplierName,
        warehouseName: detail.warehouseName,
        createdByName: detail.createdByName,
        notes: detail.notes,
        items: (detail.items || []).map((it: any) => ({
          id: it.id,
          itemCode: it.itemCode,
          itemName: it.itemName,
          quantity: it.quantity,
          unitName: it.unitName || "Buah",
          unitPrice: it.unitPrice ? parseFloat(String(it.unitPrice)) : undefined,
          locationName: it.locationName,
          notes: it.notes,
        })),
      });
    } catch (err: any) {
      toast({
        title: "Gagal memuat Bukti Penerimaan",
        description: err.message || "Terjadi kesalahan saat memuat data.",
        variant: "destructive",
      });
    }
  };

  const { data: stockInsData, isLoading } = useQuery({ queryKey: ["stock-in"], queryFn: () => apiFetch<StockIn[] | { data: StockIn[] }>("/api/stock-in"), refetchInterval: 15_000 });
  const { data: itemsData } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=100") });
  const { data: suppliersData } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[] | { data: Supplier[] }>("/api/suppliers") });
  const { data: warehousesData } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[] | { data: Warehouse[] }>("/api/warehouses") });
  const { data: locationsData } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch<Location[] | { data: Location[] }>("/api/locations") });
  const { data: viewData } = useQuery({ queryKey: ["stock-in", viewId], queryFn: () => apiFetch<{ stockIn: StockIn; details: StockInDetail[] }>(`/api/stock-in/${viewId}`), enabled: !!viewId });

  const stockIns: StockIn[] = useMemo(() => {
    if (Array.isArray(stockInsData)) return stockInsData;
    if (stockInsData && typeof stockInsData === "object" && Array.isArray((stockInsData as any).data)) {
      return (stockInsData as any).data;
    }
    return [];
  }, [stockInsData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  const suppliers: Supplier[] = useMemo(() => {
    if (Array.isArray(suppliersData)) return suppliersData;
    if (suppliersData && typeof suppliersData === "object" && Array.isArray((suppliersData as any).data)) {
      return (suppliersData as any).data;
    }
    return [];
  }, [suppliersData]);

  const warehouses: Warehouse[] = useMemo(() => {
    if (Array.isArray(warehousesData)) return warehousesData;
    if (warehousesData && typeof warehousesData === "object" && Array.isArray((warehousesData as any).data)) {
      return (warehousesData as any).data;
    }
    return [];
  }, [warehousesData]);

  const locations: Location[] = useMemo(() => {
    if (Array.isArray(locationsData)) return locationsData;
    if (locationsData && typeof locationsData === "object" && Array.isArray((locationsData as any).data)) {
      return (locationsData as any).data;
    }
    return [];
  }, [locationsData]);

  const filteredLocations = locations?.filter(l => !form.warehouseId || l.warehouseId === parseInt(form.warehouseId));

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        referenceNumber: form.referenceNumber,
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        notes: form.notes || null,
        details: details.map(d => ({
          itemId: d.itemId, quantity: d.quantity,
          unitPrice: d.unitPrice || null,
          warehouseId: d.warehouseId || null,
          locationId: d.locationId || null,
          notes: d.notes || null,
        })),
      };
      return apiFetch("/api/stock-in", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-in"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: "Barang masuk disimpan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setDetails([]);
    setForm({ referenceNumber: `BM-${Date.now().toString().slice(-6)}`, supplierId: "", notes: "", warehouseId: "", date: new Date().toISOString().split("T")[0] });
    setDetailForm({ itemId: "", quantity: "1", unitPrice: "", locationId: "", notes: "" });
    setDialogOpen(true);
  };

  const handleBarcodeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const item = items?.find(i => (i as any).barcode === barcodeInput.trim() || i.code === barcodeInput.trim());
      if (item) {
        const existing = details.find(d => d.itemId === item.id);
        if (existing) {
          setDetails(ds => ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + 1 } : d));
        } else {
          setDetails(ds => [...ds, { itemId: item.id, quantity: 1, unitPrice: null, warehouseId: null, locationId: null, notes: null, _item: item }]);
        }
        toast({ title: `${item.name} ditambahkan` });
      } else {
        toast({ title: "Barang tidak ditemukan", variant: "destructive" });
      }
      setBarcodeInput("");
    }
  };

  const addDetail = () => {
    if (!detailForm.itemId) return;
    const item = items?.find(i => i.id === parseInt(detailForm.itemId));
    if (!item) return;
    const existing = details.find(d => d.itemId === item.id);
    if (existing) {
      setDetails(ds => ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + parseInt(detailForm.quantity) } : d));
    } else {
      setDetails(ds => [...ds, {
        itemId: item.id, quantity: parseInt(detailForm.quantity), unitPrice: detailForm.unitPrice || null,
        warehouseId: null, locationId: null, notes: null, _item: item,
      }]);
    }
    setDetailForm({ itemId: "", quantity: "1", unitPrice: "", locationId: "", notes: "" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barang Masuk</h1>
          <p className="text-muted-foreground text-sm">Transaksi penerimaan barang ke gudang.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Transaksi Baru</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <PackagePlus className="w-3.5 h-3.5 mr-1.5" />{stockIns?.length ?? 0} Transaksi
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/30"><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                !stockIns?.length ? <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium">Belum ada transaksi masuk</p><p className="text-xs mt-1">Klik Transaksi Baru untuk memulai</p></TableCell></TableRow> :
                  stockIns.map(s => (
                    <TableRow key={s.id} className="group">
                      <TableCell className="font-mono font-medium">{s.referenceNumber || s.referenceNo}</TableCell>
                      <TableCell className="text-sm">{formatDate(s.transactionDate || s.createdAt)}</TableCell>
                      <TableCell className="text-sm">{s.supplierName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{s.itemCount ?? 0} item</TableCell>
                      <TableCell><Badge variant={s.status === "completed" ? "default" : "secondary"}>{s.status === "completed" ? "Selesai" : "Draft"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-xs text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800"
                                onClick={() => handlePrintById(s.id, s.referenceNumber || s.referenceNo)}
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Bukti Masuk</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cetak Bukti Penerimaan (GRN)</TooltipContent>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transaksi Barang Masuk</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>No. Referensi *</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Gudang</Label>
                <Select value={form.warehouseId} onValueChange={v => setForm(f => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                  <SelectContent>{warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="font-medium text-sm flex items-center gap-2"><ScanBarcode className="w-4 h-4" /> Scan Barcode / Tambah Barang</p>
              <Input ref={barcodeRef} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeKey} placeholder="Scan barcode atau ketik kode dan tekan Enter..." className="font-mono" />
              <div className="flex gap-2">
                <Select value={detailForm.itemId} onValueChange={v => setDetailForm(f => ({ ...f, itemId: v }))} >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Atau pilih barang" /></SelectTrigger>
                  <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.code} - {i.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="1" value={detailForm.quantity} onChange={e => setDetailForm(f => ({ ...f, quantity: e.target.value }))} className="w-24" placeholder="Qty" />
                <Button type="button" onClick={addDetail} disabled={!detailForm.itemId}>Tambah</Button>
              </div>
            </div>

            {details.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Hapus</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {details.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d._item?.name ?? d.itemId}</TableCell>
                        <TableCell className="text-right font-medium">{d.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDetails(ds => ds.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.referenceNumber || details.length === 0 || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewId !== null} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Transaksi Masuk</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">No. Referensi:</span><p className="font-mono font-medium">{viewData.stockIn.referenceNumber}</p></div>
                <div><span className="text-muted-foreground">Tanggal:</span><p>{formatDate(viewData.stockIn.createdAt)}</p></div>
                <div><span className="text-muted-foreground">Supplier:</span><p>{viewData.stockIn.supplierName ?? "-"}</p></div>
                <div><span className="text-muted-foreground">Status:</span><Badge>{viewData.stockIn.status}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>{viewData.details?.map((d, i) => <TableRow key={i}><TableCell>{(d as any).itemName ?? d.itemId}</TableCell><TableCell className="text-right">{d.quantity}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="outline" onClick={() => setViewId(null)}>Tutup</Button>
            <Button
              onClick={() => {
                if (viewId) handlePrintById(viewId, viewData?.stockIn?.referenceNumber);
              }}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Printer className="w-4 h-4" />
              Cetak Bukti Penerimaan (GRN)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Printable Bukti Penerimaan Modal ────────────────────── */}
      <BuktiPenerimaanPrintModal
        open={printData !== null}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </div>
  );
}
