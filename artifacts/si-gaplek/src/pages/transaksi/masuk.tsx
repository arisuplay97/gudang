import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassModal } from "@/components/custom/glass-modal";
import { AnimatedCard } from "@/components/custom/animated-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Eye, ScanBarcode, Trash2, PackagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StockIn {
  id: number;
  referenceNumber: string;
  supplierId: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  supplierName?: string;
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
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [details, setDetails] = useState<StockInDetail[]>([]);
  const [form, setForm] = useState({ referenceNumber: "", supplierId: "", notes: "", warehouseId: "", date: new Date().toISOString().split("T")[0] });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1", unitPrice: "", locationId: "", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stockIns, isLoading } = useQuery({ queryKey: ["stock-in"], queryFn: () => apiFetch<StockIn[]>("/api/stock-in") });
  const { data: items } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[]>("/api/suppliers") });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("/api/warehouses") });
  const { data: locations } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch<Location[]>("/api/locations") });
  const { data: viewData } = useQuery({ queryKey: ["stock-in", viewId], queryFn: () => apiFetch<{ stockIn: StockIn; details: StockInDetail[] }>(`/api/stock-in/${viewId}`), enabled: !!viewId });

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
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Barang Masuk</h1><p className="text-muted-foreground text-sm">Transaksi penerimaan barang ke gudang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Transaksi Baru</Button>
      </div>

      <AnimatedCard className="p-0 border-none shadow-none bg-transparent">
        <Table className="bg-card rounded-md border">
          <TableHeader><TableRow><TableHead>No. Referensi (LPB)</TableHead><TableHead>Tanggal</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !stockIns?.length ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><PackagePlus className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada transaksi masuk</p></TableCell></TableRow> :
             stockIns.map(s => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewId(s.id)}>
                <TableCell className="font-mono font-medium">{s.referenceNumber}</TableCell>
                <TableCell>{formatDate(s.createdAt)}</TableCell>
                <TableCell>{s.supplierName ?? "-"}</TableCell>
                <TableCell className="text-right">{s.itemCount ?? 0} item</TableCell>
                <TableCell><Badge variant={s.status === "finalized" ? "default" : "secondary"}>{s.status === "finalized" ? "Selesai" : "Draft"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setViewId(s.id); }}><Eye className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AnimatedCard>

      <GlassModal open={dialogOpen} onOpenChange={setDialogOpen} title="Transaksi / Penerimaan Barang Masuk (LPB)" description="Isi form persetujuan penerimaan barang dan input qty yang akan dimasukkan ke stok"
        footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button onClick={() => saveMutation.mutate()} disabled={details.length === 0 || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Simpan Penerimaan"}</Button></>}>
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
      </GlassModal>

      <GlassModal open={viewId !== null} onOpenChange={o => !o && setViewId(null)} title="Detail Laporan Penerimaan Barang (LPB)" footer={<Button onClick={() => setViewId(null)}>Tutup</Button>}>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg">
                <div><span className="text-muted-foreground block text-xs">No. LPB:</span><p className="font-mono font-bold text-base text-primary">{viewData.stockIn.referenceNumber}</p></div>
                <div><span className="text-muted-foreground block text-xs">Tanggal:</span><p className="font-medium">{formatDate(viewData.stockIn.createdAt)}</p></div>
                <div><span className="text-muted-foreground block text-xs">Supplier:</span><p className="font-medium">{viewData.stockIn.supplierName ?? "-"}</p></div>
                <div><span className="text-muted-foreground block text-xs">Status:</span><Badge variant={viewData.stockIn.status === "finalized" ? "default" : "secondary"}>{viewData.stockIn.status}</Badge></div>
              </div>
              <Table className="border rounded-md">
                <TableHeader className="bg-muted"><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>{viewData.details?.map((d, i) => <TableRow key={i}><TableCell className="font-medium">{(d as any).itemName ?? d.itemId}</TableCell><TableCell className="text-right">{d.quantity}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
      </GlassModal>
    </div>
  );
}
