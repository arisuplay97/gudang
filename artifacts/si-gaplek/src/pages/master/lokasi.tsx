import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, MapPin, Search, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Location { id: number; name: string; code: string; warehouseId: number; description: string | null; warehouseName?: string; }
interface Warehouse { id: number; name: string; code: string; }

export default function LokasiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", code: "", warehouseId: "", description: "" });
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["locations"], queryFn: () => apiFetch<Location[]>("/api/locations") });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("/api/warehouses") });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(l => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.warehouseName?.toLowerCase().includes(q));
  }, [data, search]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name, code: form.code, warehouseId: parseInt(form.warehouseId), description: form.description || null };
      return editing ? apiFetch(`/api/locations/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) }) : apiFetch("/api/locations", { method: "POST", body: JSON.stringify(body) });
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
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Lokasi</h1>
          <p className="text-muted-foreground text-sm">Kelola lokasi rak dan penyimpanan dalam gudang.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Tambah Lokasi</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <MapPin className="w-3.5 h-3.5 mr-1.5" />{data?.length ?? 0} Lokasi
        </Badge>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari lokasi..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Lokasi</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                  !filtered.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">{search ? "Tidak ditemukan" : "Belum ada lokasi"}</p>
                      <p className="text-xs mt-1">{search ? "Coba kata kunci lain" : "Klik tombol Tambah untuk menambah lokasi"}</p>
                    </TableCell></TableRow>
                  ) : filtered.map((l, i) => (
                    <TableRow key={l.id} className="group">
                      <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell><span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{l.code}</span></TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{l.warehouseName ?? "—"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{l.description ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="w-3.5 h-3.5" /></Button>
                          </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setDeleteId(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </TooltipTrigger><TooltipContent>Hapus</TooltipContent></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

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
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus lokasi ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
