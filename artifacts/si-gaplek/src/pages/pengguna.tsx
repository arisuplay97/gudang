import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate, roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Users, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function PenggunaPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", fullName: "", email: "", role: "gudang", password: "", isActive: true });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => apiFetch<User[]>("/api/users") });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, email: form.email || null, password: form.password || undefined };
      return editing
        ? apiFetch(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDialogOpen(false); toast({ title: editing ? "Pengguna diperbarui" : "Pengguna ditambahkan" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeleteId(null); toast({ title: "Pengguna dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm({ username: "", fullName: "", email: "", role: "gudang", password: "", isActive: true }); setDialogOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ username: u.username, fullName: u.fullName, email: u.email ?? "", role: u.role, password: "", isActive: u.isActive }); setDialogOpen(true); };

  const roleBadgeVariant = (role: string) => ({ admin: "destructive" as const, gudang: "default" as const, keuangan: "secondary" as const, pimpinan: "outline" as const }[role] ?? "outline" as const);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground text-sm">Kelola akun pengguna sistem.</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-2" /> Tambah Pengguna</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <Users className="w-3.5 h-3.5 mr-1.5" />{data?.length ?? 0} Pengguna
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/30"><TableHead>Username</TableHead><TableHead>Nama Lengkap</TableHead><TableHead>Email</TableHead><TableHead>Peran</TableHead><TableHead>Status</TableHead><TableHead>Dibuat</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                !data?.length ? <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="font-medium">Belum ada pengguna</p></TableCell></TableRow> :
                  data.map(u => (
                    <TableRow key={u.id} className="group">
                      <TableCell className="font-mono font-medium">{u.username}</TableCell>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email ?? "—"}</TableCell>
                      <TableCell><Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge></TableCell>
                      <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteId(u.id)}><Trash2 className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Hapus</TooltipContent></Tooltip>
                      </div></TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Username *</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" disabled={!!editing} /></div>
              <div className="space-y-1.5"><Label>{editing ? "Password Baru" : "Password *"}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editing ? "Kosongkan jika tidak diubah" : "Password"} /></div>
            </div>
            <div className="space-y-1.5"><Label>Nama Lengkap *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@kantor.go.id" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peran *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="gudang">Staff Gudang</SelectItem>
                    <SelectItem value="keuangan">Staff Keuangan</SelectItem>
                    <SelectItem value="pimpinan">Pimpinan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status Aktif</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                  <span className="text-sm">{form.isActive ? "Aktif" : "Nonaktif"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={!form.username || !form.fullName || (!editing && !form.password) || save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Hapus Pengguna</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>{del.isPending ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
