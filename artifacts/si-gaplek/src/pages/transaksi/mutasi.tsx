import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Eye, ArrowLeftRight, FolderOpen, Search, Warehouse as WarehouseIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Mutation {
  id: number;
  referenceNo?: string;
  referenceNumber?: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  status: string;
  createdAt: string;
  transactionDate?: string;
  fromWarehouseName?: string | null;
  toWarehouseName?: string | null;
  totalItems?: number;
  createdByName?: string | null;
}

interface Item {
  id: number;
  code: string;
  name: string;
  currentStock: number;
}

interface Warehouse {
  id: number;
  name: string;
}

export default function MutasiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    referenceNumber: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    itemId: "",
    quantity: "1",
    notes: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: mutationsData, isLoading } = useQuery({
    queryKey: ["mutations"],
    queryFn: () => apiFetch<Mutation[] | { data: Mutation[] }>("/api/mutations"),
  });

  const { data: itemsData } = useQuery({
    queryKey: ["items"],
    queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=100"),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[] | { data: Warehouse[] }>("/api/warehouses"),
  });

  const { data: viewData, isLoading: isViewLoading } = useQuery({
    queryKey: ["mutations", viewId],
    queryFn: () => apiFetch<any>(`/api/mutations/${viewId}`),
    enabled: !!viewId,
  });

  const mutations: Mutation[] = useMemo(() => {
    if (Array.isArray(mutationsData)) return mutationsData;
    if (mutationsData && typeof mutationsData === "object" && Array.isArray((mutationsData as any).data)) {
      return (mutationsData as any).data;
    }
    return [];
  }, [mutationsData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  const warehouses: Warehouse[] = useMemo(() => {
    if (Array.isArray(warehousesData)) return warehousesData;
    if (warehousesData && typeof warehousesData === "object" && Array.isArray((warehousesData as any).data)) {
      return (warehousesData as any).data;
    }
    return [];
  }, [warehousesData]);

  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (!searchTerm) return true;
      const ref = (m.referenceNo ?? m.referenceNumber ?? "").toLowerCase();
      const from = (m.fromWarehouseName ?? "").toLowerCase();
      const to = (m.toWarehouseName ?? "").toLowerCase();
      const term = searchTerm.toLowerCase();
      return ref.includes(term) || from.includes(term) || to.includes(term);
    });
  }, [mutations, searchTerm]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/mutations", {
        method: "POST",
        body: JSON.stringify({
          referenceNumber: form.referenceNumber,
          fromWarehouseId: parseInt(form.fromWarehouseId),
          toWarehouseId: parseInt(form.toWarehouseId),
          transactionDate: new Date().toISOString(),
          notes: form.notes || null,
          items: [{ itemId: parseInt(form.itemId), quantity: parseInt(form.quantity), notes: null }],
          details: [{ itemId: parseInt(form.itemId), quantity: parseInt(form.quantity), notes: null }],
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: "Berhasil", description: "Mutasi barang antar gudang berhasil disimpan." });
    },
    onError: (e: Error) => toast({ title: "Gagal Menyimpan", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setForm({
      referenceNumber: `MUT-${Date.now().toString().slice(-6)}`,
      fromWarehouseId: warehouses[0]?.id ? String(warehouses[0].id) : "",
      toWarehouseId: warehouses[1]?.id ? String(warehouses[1].id) : "",
      itemId: "",
      quantity: "1",
      notes: "",
    });
    setDialogOpen(true);
  };

  const selectedItem = items.find((i) => i.id.toString() === form.itemId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mutasi Barang</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Perpindahan fisik stok material antar gudang & lokasi.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Buat Mutasi
        </Button>
      </motion.div>

      {/* Filter & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari referensi atau nama gudang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <Badge variant="secondary" className="self-start sm:self-auto text-xs px-3 py-1.5 gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {filteredMutations.length} dari {mutations.length} Mutasi
        </Badge>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm border-border/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[160px]">No. Referensi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Dari Gudang</TableHead>
                <TableHead>Ke Gudang</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredMutations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p className="font-semibold text-foreground">Belum Ada Data Mutasi</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchTerm ? "Tidak ada mutasi yang cocok dengan pencarian." : "Klik 'Buat Mutasi' untuk memindahkan stok antar gudang."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMutations.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono font-medium text-xs">
                      {m.referenceNo ?? m.referenceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(m.transactionDate ?? m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <WarehouseIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {m.fromWarehouseName ?? `Gudang #${m.fromWarehouseId}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <WarehouseIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        {m.toWarehouseName ?? `Gudang #${m.toWarehouseId}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-[11px] capitalize">
                        {m.status === "completed" ? "Selesai" : m.status || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewId(m.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lihat Detail Mutasi</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Buat Mutasi */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Mutasi Barang Antar Gudang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>No. Referensi *</Label>
              <Input
                value={form.referenceNumber}
                onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dari Gudang Asal *</Label>
                <Select value={form.fromWarehouseId} onValueChange={(v) => setForm((f) => ({ ...f, fromWarehouseId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang asal" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ke Gudang Tujuan *</Label>
                <Select value={form.toWarehouseId} onValueChange={(v) => setForm((f) => ({ ...f, toWarehouseId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih gudang tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== parseInt(form.fromWarehouseId))
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Pilih Barang *</Label>
                <Select value={form.itemId} onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barang" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.code} — {i.name} (Stok: {i.currentStock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Jumlah *</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedItem ? selectedItem.currentStock : undefined}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>

            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                Stok tersedia: <strong className="text-foreground">{selectedItem.currentStock}</strong>
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Alasan mutasi atau instruksi pengiriman..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.referenceNumber || !form.fromWarehouseId || !form.toWarehouseId || !form.itemId || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Mutasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Mutasi */}
      <Dialog open={viewId !== null} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Mutasi Barang</DialogTitle>
          </DialogHeader>
          {isViewLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat detail mutasi...</div>
          ) : viewData ? (
            <div className="space-y-4 text-sm py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40">
                <div>
                  <span className="text-xs text-muted-foreground">No. Referensi</span>
                  <p className="font-mono font-medium text-foreground">{viewData.referenceNo ?? viewData.referenceNumber}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tanggal</span>
                  <p className="text-foreground">{formatDate(viewData.transactionDate ?? viewData.createdAt)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Dari Gudang</span>
                  <p className="font-medium text-foreground">{viewData.fromWarehouseName ?? "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ke Gudang</span>
                  <p className="font-medium text-foreground">{viewData.toWarehouseName ?? "-"}</p>
                </div>
              </div>

              {viewData.notes && (
                <div>
                  <span className="text-xs text-muted-foreground">Catatan:</span>
                  <p className="text-xs text-foreground mt-0.5">{viewData.notes}</p>
                </div>
              )}

              {Array.isArray(viewData.items) && viewData.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden mt-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Barang</TableHead>
                        <TableHead className="text-right text-xs">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewData.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">
                            <span className="font-medium">{item.itemName ?? item.name}</span>
                            {item.itemCode && <span className="block text-muted-foreground font-mono text-[11px]">{item.itemCode}</span>}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs">
                            {item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Data mutasi tidak ditemukan.</div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewId(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
