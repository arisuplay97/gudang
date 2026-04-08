import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassModal } from "@/components/custom/glass-modal";
import { AnimatedCard } from "@/components/custom/animated-card";
import { Plus, Eye, Trash2, KeyRound, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Borrowing {
  id: number;
  transactionNumber: string;
  borrowedBy: number;
  borrowedByName?: string;
  status: string;
  notes: string | null;
  borrowDate: string;
  dueDate: string | null;
  returnedDate: string | null;
}

interface BorrowingItem {
  itemId: number;
  itemName?: string;
  quantityBorrowed: number;
  quantityReturned: number;
}

interface User { id: number; fullName: string; }
interface Item { id: number; code: string; name: string; currentStock: number; }

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrowed: { label: "Dipinjam", variant: "secondary" },
  partially_returned: { label: "Sebagian Kembali", variant: "outline" },
  returned: { label: "Dikembalikan", variant: "default" },
  overdue: { label: "Terlambat", variant: "destructive" },
};

export default function PeminjamanPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [items, setItems] = useState<{ itemId: string; quantity: string }[]>([]);
  const [form, setForm] = useState({ borrowedBy: "", notes: "", dueDate: "", borrowDate: new Date().toISOString().split("T")[0] });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: borrowings, isLoading } = useQuery({ queryKey: ["borrowing"], queryFn: () => apiFetch<Borrowing[]>("/api/borrowing") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => apiFetch<User[]>("/api/users") });
  const { data: masterItems } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });
  const { data: viewData } = useQuery({
    queryKey: ["borrowing", viewId],
    queryFn: () => apiFetch<{ borrowing: Borrowing; items: BorrowingItem[] }>(`/api/borrowing/${viewId}`),
    enabled: !!viewId,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/borrowing", {
      method: "POST",
      body: JSON.stringify({
        borrowedBy: parseInt(form.borrowedBy),
        notes: form.notes || null,
        borrowDate: form.borrowDate,
        dueDate: form.dueDate || null,
        status: "borrowed",
        items: items.map(i => ({ itemId: parseInt(i.itemId), quantityBorrowed: parseInt(i.quantity) })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrowing"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: "Peminjaman berhasil dicatat" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const returnMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/borrowing/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "returned", returnedDate: new Date().toISOString() }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrowing"] });
      setViewId(null);
      toast({ title: "Pengembalian berhasil dicatat" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setItems([{ itemId: "", quantity: "1" }]);
    setForm({ borrowedBy: "", notes: "", dueDate: "", borrowDate: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const addItemRow = () => setItems(prev => [...prev, { itemId: "", quantity: "1" }]);
  const removeItemRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: "itemId" | "quantity", val: string) =>
    setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const canSave = form.borrowedBy && items.length > 0 && items.every(i => i.itemId && parseInt(i.quantity) > 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Peminjaman Barang / Tools</h1>
          <p className="text-muted-foreground text-sm">Pencatatan barang atau alat yang dipinjam dari gudang</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Catat Peminjaman</Button>
      </div>

      <AnimatedCard className="p-0 border-none shadow-none bg-transparent">
        <Table className="bg-card rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead>No. Transaksi</TableHead>
              <TableHead>Peminjam</TableHead>
              <TableHead>Tgl Pinjam</TableHead>
              <TableHead>Tgl Kembali</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !borrowings?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada data peminjaman</p>
                </TableCell>
              </TableRow>
            ) : borrowings.map(b => {
              const s = STATUS_BADGE[b.status] ?? { label: b.status, variant: "secondary" as const };
              const isOverdue = b.dueDate && !b.returnedDate && new Date(b.dueDate) < new Date();
              return (
                <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewId(b.id)}>
                  <TableCell className="font-mono font-medium">{b.transactionNumber}</TableCell>
                  <TableCell>{b.borrowedByName ?? `User #${b.borrowedBy}`}</TableCell>
                  <TableCell>{formatDate(b.borrowDate)}</TableCell>
                  <TableCell>
                    {b.dueDate ? (
                      <span className={isOverdue ? "text-destructive font-medium" : ""}>{formatDate(b.dueDate)}</span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOverdue ? "destructive" : s.variant}>
                      {isOverdue ? <><AlertTriangle className="w-3 h-3 mr-1 inline" />Terlambat</> : s.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setViewId(b.id); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </AnimatedCard>

      {/* Create Dialog */}
      <GlassModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Catat Peminjaman Barang / Tools"
        description="Isi data peminjam dan barang yang akan dipinjam dari gudang"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Peminjaman"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Peminjam *</Label>
              <Select value={form.borrowedBy} onValueChange={v => setForm(f => ({ ...f, borrowedBy: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih peminjam" /></SelectTrigger>
                <SelectContent>{users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Pinjam</Label>
              <Input type="date" value={form.borrowDate} onChange={e => setForm(f => ({ ...f, borrowDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Batas Pengembalian (Opsional)</Label>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Tujuan peminjaman..." />
          </div>

          <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Daftar Barang / Tools</p>
              <Button type="button" size="sm" variant="ghost" onClick={addItemRow}>+ Tambah Baris</Button>
            </div>
            {items.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={row.itemId} onValueChange={v => updateItem(i, "itemId", v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                  <SelectContent>
                    {masterItems?.filter(it => it.currentStock > 0).map(it => (
                      <SelectItem key={it.id} value={it.id.toString()}>{it.code} - {it.name} (stok: {it.currentStock})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" min="1" className="w-24" value={row.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} placeholder="Qty" />
                {items.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItemRow(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </GlassModal>

      {/* View Dialog */}
      <GlassModal
        open={viewId !== null}
        onOpenChange={o => !o && setViewId(null)}
        title="Detail Peminjaman"
        footer={
          <div className="flex gap-2 w-full justify-between">
            <Button variant="outline" onClick={() => setViewId(null)}>Tutup</Button>
            {viewData?.borrowing.status === "borrowed" || viewData?.borrowing.status === "overdue" ? (
              <Button
                onClick={() => viewId && returnMutation.mutate(viewId)}
                disabled={returnMutation.isPending}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {returnMutation.isPending ? "Memproses..." : "Tandai Dikembalikan"}
              </Button>
            ) : null}
          </div>
        }
      >
        {viewData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 p-3 rounded-lg">
              <div><span className="text-muted-foreground block text-xs">No. Transaksi:</span><p className="font-mono font-bold text-primary">{viewData.borrowing.transactionNumber}</p></div>
              <div><span className="text-muted-foreground block text-xs">Status:</span>
                <Badge variant={STATUS_BADGE[viewData.borrowing.status]?.variant ?? "secondary"}>
                  {STATUS_BADGE[viewData.borrowing.status]?.label ?? viewData.borrowing.status}
                </Badge>
              </div>
              <div><span className="text-muted-foreground block text-xs">Tgl Pinjam:</span><p className="font-medium">{formatDate(viewData.borrowing.borrowDate)}</p></div>
              <div><span className="text-muted-foreground block text-xs">Batas Kembali:</span><p className="font-medium">{viewData.borrowing.dueDate ? formatDate(viewData.borrowing.dueDate) : "-"}</p></div>
              {viewData.borrowing.returnedDate && (
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Tgl Dikembalikan:</span><p className="font-medium text-green-600">{formatDate(viewData.borrowing.returnedDate)}</p></div>
              )}
              {viewData.borrowing.notes && (
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Catatan:</span><p>{viewData.borrowing.notes}</p></div>
              )}
            </div>
            <Table className="border rounded-md">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Barang / Tools</TableHead>
                  <TableHead className="text-right">Dipinjam</TableHead>
                  <TableHead className="text-right">Dikembalikan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewData.items?.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{it.itemName ?? `Item #${it.itemId}`}</TableCell>
                    <TableCell className="text-right">{it.quantityBorrowed}</TableCell>
                    <TableCell className="text-right">
                      <span className={it.quantityReturned >= it.quantityBorrowed ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {it.quantityReturned}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
