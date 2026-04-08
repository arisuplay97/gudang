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
import { Plus, Eye, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Mutation { id: number; referenceNumber: string; fromWarehouseId: number; toWarehouseId: number; status: string; createdAt: string; fromWarehouseName?: string; toWarehouseName?: string; }
interface Item { id: number; code: string; name: string; currentStock: number; }
interface Warehouse { id: number; name: string; }

export default function MutasiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [form, setForm] = useState({ referenceNumber: "", fromWarehouseId: "", toWarehouseId: "", itemId: "", quantity: "1", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: mutations, isLoading } = useQuery({ queryKey: ["mutations"], queryFn: () => apiFetch<Mutation[]>("/api/mutations") });
  const { data: items } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("/api/warehouses") });
  const { data: viewData } = useQuery({ queryKey: ["mutations", viewId], queryFn: () => apiFetch<any>(`/api/mutations/${viewId}`), enabled: !!viewId });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/mutations", {
      method: "POST",
      body: JSON.stringify({
        referenceNumber: form.referenceNumber,
        fromWarehouseId: parseInt(form.fromWarehouseId),
        toWarehouseId: parseInt(form.toWarehouseId),
        notes: form.notes || null,
        details: [{ itemId: parseInt(form.itemId), quantity: parseInt(form.quantity), notes: null }],
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutations"] }); setDialogOpen(false); toast({ title: "Mutasi barang disimpan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setForm({ referenceNumber: `MUT-${Date.now().toString().slice(-6)}`, fromWarehouseId: "", toWarehouseId: "", itemId: "", quantity: "1", notes: "" });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Mutasi Barang</h1><p className="text-muted-foreground text-sm">Perpindahan barang antar gudang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Buat Mutasi</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Dari Gudang</TableHead><TableHead>Ke Gudang</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !mutations?.length ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada mutasi barang</p></TableCell></TableRow> :
             mutations.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono font-medium">{m.referenceNumber}</TableCell>
                <TableCell>{formatDate(m.createdAt)}</TableCell>
                <TableCell>{m.fromWarehouseName ?? "-"}</TableCell>
                <TableCell>{m.toWarehouseName ?? "-"}</TableCell>
                <TableCell><Badge variant={m.status === "completed" ? "default" : "secondary"}>{m.status === "completed" ? "Selesai" : "Draft"}</Badge></TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewId(m.id)}><Eye className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Buat Mutasi Barang</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>No. Referensi *</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Dari Gudang *</Label>
                <Select value={form.fromWarehouseId} onValueChange={v => setForm(f => ({ ...f, fromWarehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang asal" /></SelectTrigger>
                  <SelectContent>{warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Ke Gudang *</Label>
                <Select value={form.toWarehouseId} onValueChange={v => setForm(f => ({ ...f, toWarehouseId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih gudang tujuan" /></SelectTrigger>
                  <SelectContent>{warehouses?.filter(w => w.id !== parseInt(form.fromWarehouseId)).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Barang *</Label>
                <Select value={form.itemId} onValueChange={v => setForm(f => ({ ...f, itemId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                  <SelectContent>{items?.filter(i => i.currentStock > 0).map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name} ({i.currentStock})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Jumlah *</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.referenceNumber || !form.fromWarehouseId || !form.toWarehouseId || !form.itemId || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Simpan Mutasi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewId !== null} onOpenChange={o => !o && setViewId(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Detail Mutasi</DialogTitle></DialogHeader>
          {viewData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">No. Referensi:</span><p className="font-mono font-medium">{(viewData as any).referenceNumber}</p></div>
                <div><span className="text-muted-foreground">Tanggal:</span><p>{formatDate((viewData as any).createdAt)}</p></div>
                <div><span className="text-muted-foreground">Dari:</span><p>{(viewData as any).fromWarehouseName ?? "-"}</p></div>
                <div><span className="text-muted-foreground">Ke:</span><p>{(viewData as any).toWarehouseName ?? "-"}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewId(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
