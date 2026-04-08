import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: number;
  code: string;
  name: string;
  barcode: string | null;
  categoryId: number | null;
  unitId: number | null;
  supplierId: number | null;
  description: string | null;
  minimumStock: number;
  currentStock: number;
  unitPrice: string | null;
  categoryName?: string;
  unitName?: string;
  supplierName?: string;
}

interface Category { id: number; name: string; }
interface Unit { id: number; name: string; }
interface Supplier { id: number; name: string; }

export default function BarangPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    code: "", name: "", barcode: "", categoryId: "", unitId: "", supplierId: "",
    description: "", minimumStock: "0", unitPrice: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["items", search],
    queryFn: () => apiFetch<Item[]>(`/api/items?search=${encodeURIComponent(search)}`),
  });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("/api/categories") });
  const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => apiFetch<Unit[]>("/api/units") });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => apiFetch<Supplier[]>("/api/suppliers") });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        code: form.code, name: form.name, barcode: form.barcode || null,
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        unitId: form.unitId ? parseInt(form.unitId) : null,
        supplierId: form.supplierId ? parseInt(form.supplierId) : null,
        description: form.description || null,
        minimumStock: parseInt(form.minimumStock) || 0,
        currentStock: 0,
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice.replace(/\./g, "").replace(/,/g, ".")) : 0,
      };
      if (editing) {
        return apiFetch(`/api/items/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      return apiFetch("/api/items", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: editing ? "Barang diperbarui" : "Barang ditambahkan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["items"] }); setDeleteId(null); toast({ title: "Barang dihapus" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", barcode: "", categoryId: "", unitId: "", supplierId: "", description: "", minimumStock: "0", unitPrice: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      code: item.code, name: item.name, barcode: item.barcode ?? "",
      categoryId: item.categoryId?.toString() ?? "", unitId: item.unitId?.toString() ?? "",
      supplierId: item.supplierId?.toString() ?? "", description: item.description ?? "",
      minimumStock: item.minimumStock.toString(), unitPrice: item.unitPrice ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Master Barang</h1>
          <p className="text-muted-foreground text-sm">Kelola data barang inventaris</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Barang</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama, kode, barcode..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : !items?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Belum ada data barang</p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <ScanBarcode className="w-3 h-3" /> {item.barcode}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.categoryName ?? "-"}</TableCell>
                    <TableCell>{item.unitName ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.currentStock <= item.minimumStock ? "destructive" : "secondary"}>
                        {item.currentStock <= item.minimumStock && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {formatNumber(item.currentStock)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Kode Barang *</Label>
              <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ATK-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Scan atau ketik" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Nama Barang *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap barang" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Satuan</Label>
              <Select value={form.unitId} onValueChange={(v) => setForm(f => ({ ...f, unitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                <SelectContent>{units?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stok Minimum</Label>
              <Input type="number" min="0" value={form.minimumStock} onChange={(e) => setForm(f => ({ ...f, minimumStock: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Harga Satuan (Rp)</Label>
              <Input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Keterangan tambahan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.code || !form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Barang</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus barang ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
