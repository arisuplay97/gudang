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
import { Plus, Eye, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Adjustment { id: number; referenceNumber: string; itemId: number; adjustmentType: string; quantity: number; reason: string | null; status: string; createdAt: string; itemName?: string; }
interface Item { id: number; code: string; name: string; currentStock: number; }

export default function PenyesuaianPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ referenceNumber: "", itemId: "", adjustmentType: "add", quantity: "1", reason: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: adjustments, isLoading } = useQuery({ queryKey: ["adjustments"], queryFn: () => apiFetch<Adjustment[]>("/api/adjustments") });
  const { data: items } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/adjustments", {
      method: "POST",
      body: JSON.stringify({
        referenceNumber: form.referenceNumber,
        itemId: parseInt(form.itemId),
        adjustmentType: form.adjustmentType,
        quantity: parseInt(form.quantity),
        reason: form.reason || null,
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["adjustments"] }); qc.invalidateQueries({ queryKey: ["items"] }); setDialogOpen(false); toast({ title: "Penyesuaian stok disimpan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setForm({ referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`, itemId: "", adjustmentType: "add", quantity: "1", reason: "" });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Penyesuaian Stok</h1><p className="text-muted-foreground text-sm">Koreksi/penyesuaian stok barang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Buat Penyesuaian</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>No. Referensi</TableHead><TableHead>Tanggal</TableHead><TableHead>Barang</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !adjustments?.length ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada penyesuaian stok</p></TableCell></TableRow> :
             adjustments.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono font-medium">{a.referenceNumber}</TableCell>
                <TableCell>{formatDate(a.createdAt)}</TableCell>
                <TableCell>{a.itemName ?? `Item #${a.itemId}`}</TableCell>
                <TableCell><Badge variant={a.adjustmentType === "add" ? "default" : a.adjustmentType === "subtract" ? "destructive" : "secondary"}>{a.adjustmentType === "add" ? "Tambah" : a.adjustmentType === "subtract" ? "Kurang" : "Set"}</Badge></TableCell>
                <TableCell className="text-right font-medium">{a.adjustmentType === "add" ? "+" : a.adjustmentType === "subtract" ? "-" : ""}{a.quantity}</TableCell>
                <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Penyesuaian Stok</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>No. Referensi *</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Barang *</Label>
              <Select value={form.itemId} onValueChange={v => setForm(f => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.code} - {i.name} (stok: {i.currentStock})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Tipe Penyesuaian *</Label>
                <Select value={form.adjustmentType} onValueChange={v => setForm(f => ({ ...f, adjustmentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Tambah Stok</SelectItem>
                    <SelectItem value="subtract">Kurangi Stok</SelectItem>
                    <SelectItem value="set">Set Stok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Jumlah *</Label><Input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Alasan / Keterangan</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Jelaskan alasan penyesuaian stok..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.referenceNumber || !form.itemId || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
