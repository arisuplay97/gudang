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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Users, FolderOpen, Building2, ShieldCheck, Warehouse, UserCheck, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  branchId: number | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Branch {
  id: number;
  name: string;
  code: string;
  city?: string | null;
}

export default function PenggunaPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    role: "GUDANG",
    branchId: "",
    password: "",
    isActive: true,
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/api/users"),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/api/branches"),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        role: form.role,
        branchId: form.role === "CABANG" && form.branchId ? Number(form.branchId) : null,
        password: form.password || undefined,
        isActive: form.isActive,
      };
      return editing
        ? apiFetch(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      toast({
        title: editing ? "Pengguna Berhasil Diperbarui" : "Pengguna Baru Ditambahkan",
        description: `Akun ${form.username} siap digunakan.`,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Gagal Menyimpan Pengguna",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteId(null);
      toast({ title: "Pengguna Dihapus", description: "Akun telah dihapus dari sistem." });
    },
    onError: (e: Error) => {
      toast({
        title: "Gagal Menghapus Pengguna",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: "",
      fullName: "",
      email: "",
      role: "GUDANG",
      branchId: branches && branches.length > 0 ? String(branches[0].id) : "",
      password: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email ?? "",
      role: u.role,
      branchId: u.branchId ? String(u.branchId) : (branches && branches.length > 0 ? String(branches[0].id) : ""),
      password: "",
      isActive: u.isActive,
    });
    setDialogOpen(true);
  };

  const roleBadge = (role: string) => {
    const r = role.toUpperCase();
    if (r === "ADMIN") {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-medium">
          <UserCheck className="w-3 h-3 mr-1 text-rose-600" />
          Administrator
        </Badge>
      );
    }
    if (r === "GUDANG") {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-medium">
          <Warehouse className="w-3 h-3 mr-1 text-blue-600" />
          Staff Gudang
        </Badge>
      );
    }
    if (r === "CABANG") {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium">
          <Building2 className="w-3 h-3 mr-1 text-emerald-600" />
          Operator Cabang
        </Badge>
      );
    }
    if (r === "SPI") {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-medium">
          <ShieldCheck className="w-3 h-3 mr-1 text-purple-600" />
          Auditor SPI
        </Badge>
      );
    }
    return <Badge variant="secondary">{roleLabel(role)}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manajemen Pengguna
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola hak akses akun Administrator, Gudang Utama, Operator Cabang Wilayah, dan Auditor SPI.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2"
      >
        <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          {users?.length ?? 0} Akun Terdaftar
        </Badge>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold">Username</TableHead>
                  <TableHead className="font-semibold">Nama Lengkap</TableHead>
                  <TableHead className="font-semibold">Peran (Role)</TableHead>
                  <TableHead className="font-semibold">Wilayah / Penugasan</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Dibuat</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-9 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : !users?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Belum ada pengguna terdaftar</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        @{u.username}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {u.fullName}
                      </TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell>
                        {u.role.toUpperCase() === "CABANG" ? (
                          <span className="text-xs font-medium text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-sky-600" />
                            {u.branchName || "Cabang Belum Dipilih"}
                          </span>
                        ) : u.role.toUpperCase() === "SPI" ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Kantor Pusat
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Warehouse className="w-3.5 h-3.5 text-blue-500" /> Gudang Utama
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-600"}
                        >
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-foreground hover:bg-muted"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Pengguna</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                onClick={() => setDeleteId(u.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus Pengguna</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal Dialog Form Tambah / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? `Edit Pengguna @${editing.username}` : "Tambah Pengguna Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editing ? "Perbarui informasi akun, peran, atau reset kata sandi." : "Lengkapi data untuk membuat akun pengguna baru sistem."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Username *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().trim() }))}
                  placeholder="contoh: petugas_praya"
                  disabled={!!editing}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>{editing ? "Reset Password" : "Password *"}</span>
                  {editing && <span className="text-[10px] text-muted-foreground font-normal">Opsional</span>}
                </Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Kosongkan jika tak diubah" : "Minimal 6 karakter"}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Lengkap *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Nama lengkap petugas"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alamat Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@pdamlomboktengah.co.id"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Peran (Role) *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="GUDANG">Staff Gudang</SelectItem>
                    <SelectItem value="CABANG">Operator Cabang</SelectItem>
                    <SelectItem value="SPI">Auditor SPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Akun</Label>
                <div className="flex items-center gap-2 pt-1.5">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {form.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
            </div>

            {/* Branch selector if role is CABANG */}
            {form.role === "CABANG" && (
              <div className="space-y-1.5 p-3 rounded-lg border border-sky-200 bg-sky-50/50 dark:bg-sky-950/20 animate-in fade-in">
                <Label className="text-xs font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                  Penugasan Wilayah Cabang *
                </Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Pilih cabang wilayah..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Pengguna hanya dapat memproses penerimaan dan pemasangan material pada wilayah cabang ini.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={
                !form.username ||
                !form.fullName ||
                (!editing && (!form.password || form.password.length < 6)) ||
                (form.role === "CABANG" && !form.branchId) ||
                save.isPending
              }
            >
              {save.isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Konfirmasi Hapus */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus akun pengguna ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteId && del.mutate(deleteId)}
              disabled={del.isPending}
            >
              {del.isPending ? "Menghapus..." : "Hapus Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
