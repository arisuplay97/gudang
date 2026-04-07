import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Department { id: number; name: string; code: string; description: string | null; }

export default function DepartemenPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["departments"], queryFn: () => apiFetch<Department[]>("/api/departments") });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, description: form.description || null };
      return editing ? apiFetch(`/api/departments/${editing.id}`, { method: "PUT", body: JSON.stringify(body) }) : apiFetch("/api/departments", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setDialogOpen(false); toast({ title: editing ? "Departemen diperbarui" : "Departemen ditambahkan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/departments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setDeleteId(null); toast({ title: "Departemen dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ name: "", code: "", description: "" }); setDialogOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, code: d.code, description: d.description ?? "" }); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Master Departemen</h1><p className="text-muted-foreground text-sm">Kelola data departemen/bagian kantor</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Departemen</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Departemen</TableHead><TableHead>Deskripsi</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !data?.length ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada departemen</p></TableCell></TableRow> :
             data.map(d => (
              <TableRow key={d.id}>
                <TableCell><span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{d.code}</span></TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.description ?? "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteId(d.id)}><Trash2 className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Departemen" : "Tambah Departemen"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nama Departemen *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sekretariat" /></div>
              <div className="space-y-1.5"><Label>Kode *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SEKR" /></div>
            </div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan departemen" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.code || save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Departemen</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus departemen ini?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
