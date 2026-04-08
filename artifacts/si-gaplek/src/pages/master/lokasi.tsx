import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Location { id: number; name: string; code: string; warehouseId: number; description: string | null; warehouseName?: string; }
interface Warehouse { id: number; name: string; code: string; }

export default function LokasiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", code: "", warehouseId: "", description: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch<Location[]>("/api/locations") });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("/api/warehouses") });

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name, code: form.code, warehouseId: parseInt(form.warehouseId), description: form.description || null };
      return editing ? apiFetch(`/api/locations/${editing.id}`, { method: "PUT", body: JSON.stringify(body) }) : apiFetch("/api/locations", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locations"] }); setDialogOpen(false); toast({ title: editing ? "Lokasi diperbarui" : "Lokasi ditambahkan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/locations/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locations"] }); setDeleteId(null); toast({ title: "Lokasi dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", warehouseId: "", description: "" }); setDialogOpen(true); };
  const openEdit = (l: Location) => { setEditing(l); setForm({ name: l.name, code: l.code, warehouseId: l.warehouseId.toString(), description: l.description ?? "" }); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Master Lokasi</h1><p className="text-muted-foreground text-sm">Kelola lokasi penyimpanan dalam gudang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Lokasi</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Lokasi</TableHead><TableHead>Gudang</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !data?.length ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada lokasi</p></TableCell></TableRow> :
             data.map(l => (
              <TableRow key={l.id}>
                <TableCell><span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{l.code}</span></TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.warehouseName ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{l.description ?? "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteId(l.id)}><Trash2 className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Lokasi" : "Tambah Lokasi"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Gudang *</Label>
              <Select value={form.warehouseId} onValueChange={v => setForm(f => ({ ...f, warehouseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih gudang" /></SelectTrigger>
                <SelectContent>{warehouses?.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name} ({w.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nama Lokasi *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Rak A1" /></div>
              <div className="space-y-1.5"><Label>Kode *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="RA1" /></div>
            </div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan lokasi" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.code || !form.warehouseId || save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Lokasi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus lokasi ini?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
