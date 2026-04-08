import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassModal } from "@/components/custom/glass-modal";
import { AnimatedCard } from "@/components/custom/animated-card";
import { Plus, Eye, Trash2, Archive, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EntrustedGoods {
  id: number;
  transactionNumber: string;
  ownerName: string;
  contactInfo: string | null;
  status: string;
  notes: string | null;
  receivedDate: string;
  takenDate: string | null;
}

interface EntrustedItem {
  itemName: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Masih Dititipkan", variant: "secondary" },
  taken: { label: "Sudah Diambil", variant: "default" },
};

export default function BarangTitipanPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [itemRows, setItemRows] = useState<{ itemName: string; quantity: string; condition: string; notes: string }[]>([]);
  const [form, setForm] = useState({ ownerName: "", contactInfo: "", notes: "", receivedDate: new Date().toISOString().split("T")[0] });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: goods, isLoading } = useQuery({ queryKey: ["entrusted-goods"], queryFn: () => apiFetch<EntrustedGoods[]>("/api/entrusted-goods") });
  const { data: viewData } = useQuery({
    queryKey: ["entrusted-goods", viewId],
    queryFn: () => apiFetch<{ entrustedGoods: EntrustedGoods; items: EntrustedItem[] }>(`/api/entrusted-goods/${viewId}`),
    enabled: !!viewId,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/entrusted-goods", {
      method: "POST",
      body: JSON.stringify({
        ownerName: form.ownerName,
        contactInfo: form.contactInfo || null,
        notes: form.notes || null,
        receivedDate: form.receivedDate,
        status: "active",
        items: itemRows.map(r => ({
          itemName: r.itemName,
          quantity: parseInt(r.quantity),
          condition: r.condition || null,
          notes: r.notes || null,
        })),
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entrusted-goods"] });
      setDialogOpen(false);
      toast({ title: "Barang titipan berhasil dicatat" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const takenMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/entrusted-goods/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "taken", takenDate: new Date().toISOString() }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entrusted-goods"] });
      setViewId(null);
      toast({ title: "Barang titipan ditandai sudah diambil" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setItemRows([{ itemName: "", quantity: "1", condition: "baik", notes: "" }]);
    setForm({ ownerName: "", contactInfo: "", notes: "", receivedDate: new Date().toISOString().split("T")[0] });
    setDialogOpen(true);
  };

  const addRow = () => setItemRows(prev => [...prev, { itemName: "", quantity: "1", condition: "baik", notes: "" }]);
  const removeRow = (i: number) => setItemRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof typeof itemRows[0], val: string) =>
    setItemRows(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const canSave = form.ownerName && itemRows.length > 0 && itemRows.every(r => r.itemName && parseInt(r.quantity) > 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Barang Titipan</h1>
          <p className="text-muted-foreground text-sm">Pencatatan barang milik pihak lain yang dititipkan di gudang</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Catat Titipan Baru</Button>
      </div>

      <AnimatedCard className="p-0 border-none shadow-none bg-transparent">
        <Table className="bg-card rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead>No. Transaksi</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Tgl Diterima</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !goods?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada barang titipan yang dicatat</p>
                </TableCell>
              </TableRow>
            ) : goods.map(g => {
              const s = STATUS_BADGE[g.status] ?? { label: g.status, variant: "secondary" as const };
              return (
                <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewId(g.id)}>
                  <TableCell className="font-mono font-medium">{g.transactionNumber}</TableCell>
                  <TableCell className="font-medium">{g.ownerName}</TableCell>
                  <TableCell className="text-muted-foreground">{g.contactInfo ?? "-"}</TableCell>
                  <TableCell>{formatDate(g.receivedDate)}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setViewId(g.id); }}>
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
        title="Catat Barang Titipan"
        description="Isi data pemilik dan daftar barang yang dititipkan ke gudang"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Titipan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama Pemilik *</Label>
              <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Nama lengkap pemilik" />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Diterima</Label>
              <Input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kontak Pemilik (No. HP / Email)</Label>
            <Input value={form.contactInfo} onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))} placeholder="Nomor telepon / email..." />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Catatan tambahan..." />
          </div>

          <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Daftar Barang Titipan</p>
              <Button type="button" size="sm" variant="ghost" onClick={addRow}>+ Tambah Baris</Button>
            </div>
            {itemRows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4" value={row.itemName} onChange={e => updateRow(i, "itemName", e.target.value)} placeholder="Nama barang *" />
                <Input type="number" min="1" className="col-span-2" value={row.quantity} onChange={e => updateRow(i, "quantity", e.target.value)} placeholder="Qty" />
                <Input className="col-span-3" value={row.condition} onChange={e => updateRow(i, "condition", e.target.value)} placeholder="Kondisi" />
                <Input className="col-span-2" value={row.notes} onChange={e => updateRow(i, "notes", e.target.value)} placeholder="Keterangan" />
                {itemRows.length > 1 && (
                  <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8 text-destructive" onClick={() => removeRow(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Kolom: Nama Barang | Qty | Kondisi | Keterangan</p>
          </div>
        </div>
      </GlassModal>

      {/* View Dialog */}
      <GlassModal
        open={viewId !== null}
        onOpenChange={o => !o && setViewId(null)}
        title="Detail Barang Titipan"
        footer={
          <div className="flex gap-2 w-full justify-between">
            <Button variant="outline" onClick={() => setViewId(null)}>Tutup</Button>
            {viewData?.entrustedGoods.status === "active" && (
              <Button
                onClick={() => viewId && takenMutation.mutate(viewId)}
                disabled={takenMutation.isPending}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {takenMutation.isPending ? "Memproses..." : "Tandai Sudah Diambil"}
              </Button>
            )}
          </div>
        }
      >
        {viewData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 p-3 rounded-lg">
              <div><span className="text-muted-foreground block text-xs">No. Transaksi:</span><p className="font-mono font-bold text-primary">{viewData.entrustedGoods.transactionNumber}</p></div>
              <div><span className="text-muted-foreground block text-xs">Status:</span>
                <Badge variant={STATUS_BADGE[viewData.entrustedGoods.status]?.variant ?? "secondary"}>
                  {STATUS_BADGE[viewData.entrustedGoods.status]?.label ?? viewData.entrustedGoods.status}
                </Badge>
              </div>
              <div><span className="text-muted-foreground block text-xs">Pemilik:</span><p className="font-bold">{viewData.entrustedGoods.ownerName}</p></div>
              <div><span className="text-muted-foreground block text-xs">Kontak:</span><p className="font-medium">{viewData.entrustedGoods.contactInfo ?? "-"}</p></div>
              <div><span className="text-muted-foreground block text-xs">Tgl Diterima:</span><p className="font-medium">{formatDate(viewData.entrustedGoods.receivedDate)}</p></div>
              {viewData.entrustedGoods.takenDate && (
                <div><span className="text-muted-foreground block text-xs">Tgl Diambil:</span><p className="font-medium text-green-600">{formatDate(viewData.entrustedGoods.takenDate)}</p></div>
              )}
              {viewData.entrustedGoods.notes && (
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Catatan:</span><p>{viewData.entrustedGoods.notes}</p></div>
              )}
            </div>
            <Table className="border rounded-md">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Kondisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewData.items?.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{it.itemName}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell><Badge variant="outline">{it.condition ?? "baik"}</Badge></TableCell>
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
