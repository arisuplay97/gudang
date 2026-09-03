import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
import { Plus, Eye, ScanBarcode, Trash2, FolderOpen, ClipboardCheck } from "lucide-react";
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

  const { data: opnamesData, isLoading } = useQuery({ queryKey: ["opnames"], queryFn: () => apiFetch<Opname[] | { data: Opname[] }>("/api/opname") });
  const { data: itemsData } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=100") });
  const { data: warehousesData } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[] | { data: Warehouse[] }>("/api/warehouses") });

  const opnames: Opname[] = useMemo(() => {
    if (Array.isArray(opnamesData)) return opnamesData;
    if (opnamesData && typeof opnamesData === "object" && Array.isArray((opnamesData as any).data)) {
      return (opnamesData as any).data;
    }
    return [];
  }, [opnamesData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  const warehouses: Warehouse[] = useMemo(() => {
    if (Array.isArray(warehousesData)) return warehousesData;
    if (warehousesData && typeof warehousesData === "object" && Array.isArray((warehousesData as any).data)) {
      return (warehousesData as any).data;
    }
    return [];
  }, [warehousesData]);

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
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Opname</h1>
          <p className="text-muted-foreground text-sm">Pencocokan stok fisik dengan data sistem.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Buat Opname</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />{opnames?.length ?? 0} Opname
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/30"><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Gudang</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                !opnames?.length ? <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium">Belum ada stock opname</p></TableCell></TableRow> :
                  opnames.map(o => (
                    <TableRow key={o.id} className="group">
                      <TableCell className="font-mono font-medium">{o.referenceNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(o.createdAt)}</TableCell>
                      <TableCell className="text-sm">{o.warehouseName ?? "—"}</TableCell>
                      <TableCell><Badge variant={o.status === "completed" ? "default" : o.status === "in_progress" ? "secondary" : "outline"}>{o.status === "completed" ? "Selesai" : o.status === "in_progress" ? "Proses" : o.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setViewId(o.id)}><Eye className="w-4 h-4" /></Button>
                        </TooltipTrigger><TooltipContent>Lihat Detail</TooltipContent></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </motion.div>

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
