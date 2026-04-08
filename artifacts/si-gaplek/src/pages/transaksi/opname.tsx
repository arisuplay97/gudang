import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, ScanBarcode, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Opname { id: number; referenceNumber: string; warehouseId: number; status: string; createdAt: string; warehouseName?: string; }
interface Item { id: number; code: string; name: string; currentStock: number; barcode?: string | null; }
interface Warehouse { id: number; name: string; }
interface OpnameDetail { itemId: number; systemStock: number; physicalStock: number; _item?: Item; }

export default function OpnamePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [details, setDetails] = useState<OpnameDetail[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [form, setForm] = useState({ referenceNumber: "", warehouseId: "", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: opnames, isLoading } = useQuery({ queryKey: ["opnames"], queryFn: () => apiFetch<Opname[]>("/api/opname") });
  const { data: items } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("/api/warehouses") });
  const { data: viewData } = useQuery({ queryKey: ["opname", viewId], queryFn: () => apiFetch<any>(`/api/opname/${viewId}`), enabled: !!viewId });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/opname", {
      method: "POST",
      body: JSON.stringify({
        referenceNumber: form.referenceNumber,
        warehouseId: parseInt(form.warehouseId),
        notes: form.notes || null,
        details: details.map(d => ({ itemId: d.itemId, systemStock: d.systemStock, physicalStock: d.physicalStock })),
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["opnames"] }); setDialogOpen(false); toast({ title: "Stock opname disimpan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setDetails([]);
    setForm({ referenceNumber: `OPN-${Date.now().toString().slice(-6)}`, warehouseId: "", notes: "" });
    setDialogOpen(true);
  };

  const handleBarcodeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const item = items?.find(i => (i as any).barcode === barcodeInput.trim() || i.code === barcodeInput.trim());
      if (item) {
        if (!details.find(d => d.itemId === item.id)) {
          setDetails(ds => [...ds, { itemId: item.id, systemStock: item.currentStock, physicalStock: item.currentStock, _item: item }]);
        }
        toast({ title: `${item.name} ditambahkan` });
      } else {
        toast({ title: "Barang tidak ditemukan", variant: "destructive" });
      }
      setBarcodeInput("");
    }
  };

  const addAllItems = () => {
    const newItems = items?.filter(i => !details.find(d => d.itemId === i.id)).map(i => ({
      itemId: i.id, systemStock: i.currentStock, physicalStock: i.currentStock, _item: i,
    })) ?? [];
    setDetails(ds => [...ds, ...newItems]);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Stock Opname</h1><p className="text-muted-foreground text-sm">Pencocokan stok fisik dengan data sistem</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Buat Opname</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Gudang</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !opnames?.length ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><ScanBarcode className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada stock opname</p></TableCell></TableRow> :
             opnames.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono font-medium">{o.referenceNumber}</TableCell>
                <TableCell>{formatDate(o.createdAt)}</TableCell>
                <TableCell>{o.warehouseName ?? "-"}</TableCell>
                <TableCell><Badge variant={o.status === "completed" ? "default" : o.status === "in_progress" ? "secondary" : "outline"}>{o.status === "completed" ? "Selesai" : o.status === "in_progress" ? "Proses" : o.status}</Badge></TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewId(o.id)}><Eye className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Stock Opname</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>No. Referensi *</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Gudang *</Label>
                <Select value={form.warehouseId} onValueChange={v => setForm(f => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                  <SelectContent>{warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm flex items-center gap-2"><ScanBarcode className="w-4 h-4" /> Tambah Barang</p>
                <Button size="sm" variant="outline" onClick={addAllItems}>Tambah Semua Barang</Button>
              </div>
              <Input value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeKey} placeholder="Scan barcode atau kode barang, tekan Enter..." className="font-mono" />
            </div>

            {details.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Stok Sistem</TableHead><TableHead className="text-right">Stok Fisik</TableHead><TableHead className="text-right">Selisih</TableHead><TableHead className="text-right">Hapus</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {details.map((d, i) => {
                      const diff = d.physicalStock - d.systemStock;
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{d._item?.name ?? d.itemId}</TableCell>
                          <TableCell className="text-right">{d.systemStock}</TableCell>
                          <TableCell className="text-right">
                            <Input type="number" min="0" value={d.physicalStock} onChange={e => setDetails(ds => ds.map((x, j) => j === i ? { ...x, physicalStock: parseInt(e.target.value) || 0 } : x))} className="w-20 text-right h-7" />
                          </TableCell>
                          <TableCell className={`text-right font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>{diff > 0 ? "+" : ""}{diff}</TableCell>
                          <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDetails(ds => ds.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.referenceNumber || !form.warehouseId || details.length === 0 || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Simpan Opname"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewId !== null} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Detail Stock Opname</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Referensi:</span><p className="font-mono font-medium">{(viewData as any).opname?.referenceNumber}</p></div>
                <div><span className="text-muted-foreground">Gudang:</span><p>{(viewData as any).opname?.warehouseName ?? "-"}</p></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Sistem</TableHead><TableHead className="text-right">Fisik</TableHead><TableHead className="text-right">Selisih</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(viewData as any).details?.map((d: any, i: number) => {
                    const diff = d.physicalStock - d.systemStock;
                    return <TableRow key={i}><TableCell>{d.itemName ?? d.itemId}</TableCell><TableCell className="text-right">{d.systemStock}</TableCell><TableCell className="text-right">{d.physicalStock}</TableCell><TableCell className={`text-right font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>{diff > 0 ? "+" : ""}{diff}</TableCell></TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewId(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
