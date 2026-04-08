import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Supplier { id: number; name: string; contact: string | null; phone: string | null; email: string | null; address: string | null; }

export default function SupplierPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", email: "", address: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[]>("/api/suppliers") });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, contact: form.contact || null, phone: form.phone || null, email: form.email || null, address: form.address || null };
      return editing ? apiFetch(`/api/suppliers/${editing.id}`, { method: "PUT", body: JSON.stringify(body) }) : apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setDialogOpen(false); toast({ title: editing ? "Supplier diperbarui" : "Supplier ditambahkan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); setDeleteId(null); toast({ title: "Supplier dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ name: "", contact: "", phone: "", email: "", address: "" }); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, contact: s.contact ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" }); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Master Supplier</h1><p className="text-muted-foreground text-sm">Kelola data pemasok/supplier</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Supplier</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nama Supplier</TableHead><TableHead>Kontak</TableHead><TableHead>No. Telepon</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(3).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !data?.length ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><Truck className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada supplier</p></TableCell></TableRow> :
             data.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact ?? "-"}</TableCell>
                <TableCell>{s.phone ?? "-"}</TableCell>
                <TableCell>{s.email ?? "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nama Supplier *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama perusahaan/toko" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nama Kontak</Label><Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="PIC" /></div>
              <div className="space-y-1.5"><Label>No. Telepon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="021-xxx" /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com" /></div>
            <div className="space-y-1.5"><Label>Alamat</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Alamat lengkap" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Supplier</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus supplier ini?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
