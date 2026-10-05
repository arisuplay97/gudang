import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Warehouse, Search, FolderOpen, Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WarehouseItem {
  id: number;
  name: string;
  code: string;
  address: string | null;
  description: string | null;
  isBranch?: boolean;
}

export default function GudangPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<WarehouseItem | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", description: "" });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "cabang" | "gudang">("all");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<WarehouseItem[]>("/api/warehouses"),
  });

  const allItems = useMemo(() => data || [], [data]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (activeTab === "cabang") {
      list = list.filter(w => w.isBranch || w.code?.startsWith("CBG") || w.name.toLowerCase().includes("cabang"));
    } else if (activeTab === "gudang") {
      list = list.filter(w => !(w.isBranch || w.code?.startsWith("CBG") || w.name.toLowerCase().includes("cabang")));
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q)
    );
  }, [allItems, activeTab, search]);

  const branchCount = useMemo(() =>
    allItems.filter(w => w.isBranch || w.code?.startsWith("CBG") || w.name.toLowerCase().includes("cabang")).length,
    [allItems]
  );

  const warehouseCount = useMemo(() =>
    allItems.filter(w => !(w.isBranch || w.code?.startsWith("CBG") || w.name.toLowerCase().includes("cabang"))).length,
    [allItems]
  );

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, address: form.address || null, description: form.description || null };
      return editing
        ? apiFetch(`/api/warehouses/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch("/api/warehouses", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
      setDialogOpen(false);
      toast({ title: editing ? "Data cabang/gudang diperbarui" : "Cabang/gudang berhasil ditambahkan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/warehouses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["branches"] });
      setDeleteId(null);
      toast({ title: "Data berhasil dihapus" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (w: WarehouseItem) => {
    setEditing(w);
    setForm({
      name: w.name,
      code: w.code,
      address: w.address ?? "",
      description: w.description ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Cabang & Gudang</h1>
          <p className="text-muted-foreground text-sm">
            Daftar 12 unit cabang pelayanan dan gudang penyimpanan Perumdam Tirta Ardhia Rinjani.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2 shadow-xs">
          <Plus className="w-4 h-4" /> Tambah Cabang / Gudang
        </Button>
      </motion.div>

      {/* ── Toolbar: Filter tabs & Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border shadow-xs"
      >
        <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab("cabang")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "cabang"
                ? "bg-sky-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Cabang ({branchCount})
          </button>
          <button
            onClick={() => setActiveTab("gudang")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "gudang"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" />
            Gudang Pusat ({warehouseCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama cabang, kode, atau alamat..."
            className="pl-9 h-9 text-xs bg-muted/20 border-border"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* ── Data Table ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-2xl border-border overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12 text-center text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold">Kode</TableHead>
                  <TableHead className="text-xs font-semibold">Nama Unit</TableHead>
                  <TableHead className="text-xs font-semibold">Tipe</TableHead>
                  <TableHead className="text-xs font-semibold">Alamat</TableHead>
                  <TableHead className="text-xs font-semibold">Deskripsi</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-24 pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="p-3">
                        <Skeleton className="h-8 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !filtered.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-sm">{search ? "Tidak ditemukan" : "Belum ada data cabang/gudang"}</p>
                      <p className="text-xs mt-1">{search ? "Coba sesuaikan kata kunci pencarian" : "Klik tombol Tambah untuk menambah unit baru."}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((w, i) => {
                    const isBranch = w.isBranch || w.code?.startsWith("CBG") || w.name.toLowerCase().includes("cabang");
                    return (
                      <TableRow key={w.id} className="hover:bg-muted/30 group">
                        <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {w.code}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground">
                          {w.name}
                        </TableCell>
                        <TableCell>
                          {isBranch ? (
                            <Badge variant="outline" className="text-[10px] font-medium bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                              <Building2 className="w-3 h-3 mr-1" /> Unit Cabang
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              <Warehouse className="w-3 h-3 mr-1" /> Gudang Pusat
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[240px] truncate">
                          {w.address ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{w.address}</span>
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                          {w.description ?? "—"}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                  onClick={() => openEdit(w)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Cabang / Gudang</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  onClick={() => setDeleteId(w.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Hapus</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Dialog Tambah / Edit ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cabang / Gudang" : "Tambah Cabang / Gudang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Unit / Cabang *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Cabang Praya"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kode Unit *</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="Contoh: CBG-PRY"
                  className="text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Alamat Wilayah Pelayanan</Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Jl. Soekarno-Hatta, Praya, Lombok Tengah"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Deskripsi / Catatan</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Unit Pelayanan Distribusi Wilayah..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={!form.name || !form.code || save.isPending}
            >
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Hapus ── */}
      <Dialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Cabang / Gudang?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground py-2 leading-relaxed">
            Apakah Anda yakin ingin menghapus data cabang/gudang ini? Data yang sudah terikat riwayat transaksi tidak dapat dihapus.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteId && del.mutate(deleteId)}
              disabled={del.isPending}
            >
              {del.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
