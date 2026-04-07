import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category { id: number; name: string; description: string | null; }

export default function KategoriPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("/api/categories") });

  const save = useMutation({
    mutationFn: () => editing
      ? apiFetch(`/api/categories/${editing.id}`, { method: "PUT", body: JSON.stringify(form) })
      : apiFetch("/api/categories", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setDialogOpen(false); toast({ title: editing ? "Kategori diperbarui" : "Kategori ditambahkan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setDeleteId(null); toast({ title: "Kategori dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description ?? "" }); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Master Kategori</h1><p className="text-muted-foreground text-sm">Kelola kategori barang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Kategori</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nama Kategori</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !data?.length ? <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground"><Tags className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada kategori</p></TableCell></TableRow> :
             data.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.description ?? "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteId(c.id)}><Trash2 className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nama Kategori *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama kategori" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Kategori</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus kategori ini?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
