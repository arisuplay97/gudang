import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Return {
  id: number;
  referenceNo: string;
  type: string;
  warehouseId: number | null;
  notes: string | null;
  transactionDate: string;
  createdAt: string;
}

interface ReturnItem {
  itemId: number;
  quantity: number;
  condition: string;
  unitPrice: number;
  serialNumber: string | null;
  notes: string | null;
  _item?: Item;
}

interface Item { id: number; code: string; name: string; }
interface Warehouse { id: number; name: string; }

export default function ReturPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [items, setItems_] = useState<ReturnItem[]>([]);
  const [form, setForm] = useState({
    type: "from_field",
    warehouseId: "",
    notes: "",
    transactionDate: new Date().toISOString().split("T")[0],
  });
  const [detailForm, setDetailForm] = useState({
    itemId: "",
    quantity: "1",
    condition: "good",
    unitPrice: "",
    serialNumber: "",
    notes: "",
  });

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: returns, isLoading } = useQuery({
    queryKey: ["returns"],
    queryFn: () => apiFetch<Return[]>("/api/returns"),
  });
  const { data: allItems } = useQuery({
    queryKey: ["items"],
    queryFn: () => apiFetch<Item[]>("/api/items"),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/api/warehouses"),
  });
  const { data: viewData } = useQuery({
    queryKey: ["return", viewId],
    queryFn: () => apiFetch<any>(`/api/returns/${viewId}`),
    enabled: !!viewId,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          warehouseId: form.warehouseId ? parseInt(form.warehouseId) : null,
          notes: form.notes || null,
          transactionDate: form.transactionDate,
          items: items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            condition: i.condition,
            unitPrice: i.unitPrice || 0,
            serialNumber: i.serialNumber || null,
            notes: i.notes || null,
          })),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: "Retur berhasil disimpan" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setItems_([]);
    setForm({
      type: "from_field",
      warehouseId: "",
      notes: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setDetailForm({ itemId: "", quantity: "1", condition: "good", unitPrice: "", serialNumber: "", notes: "" });
    setDialogOpen(true);
  };

  const addItem = () => {
    if (!detailForm.itemId) return;
    const item = allItems?.find((i) => i.id === parseInt(detailForm.itemId));
    if (!item) return;
    setItems_((prev) => [
      ...prev,
      {
        itemId: item.id,
        quantity: parseInt(detailForm.quantity) || 1,
        condition: detailForm.condition,
        unitPrice: parseFloat(detailForm.unitPrice) || 0,
        serialNumber: detailForm.serialNumber || null,
        notes: detailForm.notes || null,
        _item: item,
      },
    ]);
    setDetailForm({ itemId: "", quantity: "1", condition: "good", unitPrice: "", serialNumber: "", notes: "" });
  };

  const typeLabel = (t: string) => (t === "from_field" ? "Dari Lapangan" : "Ke Supplier");
  const conditionLabel = (c: string) => (c === "good" ? "Baik" : "Rusak");

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Retur Barang</h1>
          <p className="text-muted-foreground text-sm">Pengembalian barang dari lapangan atau ke supplier</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Buat Retur
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Referensi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                : !returns?.length
                ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Belum ada data retur</p>
                    </TableCell>
                  </TableRow>
                )
                : returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.referenceNo}</TableCell>
                    <TableCell>{formatDate(r.transactionDate)}</TableCell>
                    <TableCell>
                      <Badge variant={r.type === "from_field" ? "secondary" : "outline"}>
                        {typeLabel(r.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.notes ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewId(r.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Buat Retur */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Retur Barang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipe Retur *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_field">Dari Lapangan</SelectItem>
                    <SelectItem value="to_supplier">Ke Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Gudang</Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
            </div>

            {/* Tambah Item */}
            <div className="border rounded-lg p-3 space-y-3">
              <p className="font-medium text-sm">Tambah Barang</p>
              <div className="grid grid-cols-2 gap-2">
                <Select value={detailForm.itemId} onValueChange={(v) => setDetailForm((f) => ({ ...f, itemId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {allItems?.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.code} - {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={detailForm.quantity}
                    onChange={(e) => setDetailForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-20"
                    placeholder="Qty"
                  />
                  <Select
                    value={detailForm.condition}
                    onValueChange={(v) => setDetailForm((f) => ({ ...f, condition: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Baik</SelectItem>
                      <SelectItem value="damaged">Rusak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={detailForm.serialNumber}
                  onChange={(e) => setDetailForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  placeholder="No. Serial (opsional)"
                  className="flex-1 font-mono"
                />
                <Input
                  type="number"
                  min="0"
                  value={detailForm.unitPrice}
                  onChange={(e) => setDetailForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="Harga satuan"
                  className="w-36"
                />
                <Button type="button" onClick={addItem} disabled={!detailForm.itemId}>
                  Tambah
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Kondisi</TableHead>
                      <TableHead>No. Serial</TableHead>
                      <TableHead className="text-right">Hapus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{d._item?.name ?? d.itemId}</TableCell>
                        <TableCell className="text-right font-medium">{d.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={d.condition === "good" ? "default" : "destructive"}>
                            {conditionLabel(d.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {d.serialNumber ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500"
                            onClick={() => setItems_((ds) => ds.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={items.length === 0 || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Retur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Retur */}
      <Dialog open={viewId !== null} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Retur Barang</DialogTitle>
          </DialogHeader>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">No. Referensi:</span>
                  <p className="font-mono font-medium">{viewData.referenceNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipe:</span>
                  <p>
                    <Badge variant={viewData.type === "from_field" ? "secondary" : "outline"}>
                      {typeLabel(viewData.type)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal:</span>
                  <p>{formatDate(viewData.transactionDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Catatan:</span>
                  <p>{viewData.notes ?? "-"}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Kondisi</TableHead>
                    <TableHead>No. Serial</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewData.items?.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{item.itemName ?? item.itemId}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={item.condition === "good" ? "default" : "destructive"}>
                          {conditionLabel(item.condition)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.serialNumber ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewId(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
