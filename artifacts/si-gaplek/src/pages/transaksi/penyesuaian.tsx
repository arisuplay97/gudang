import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
import { Plus, ClipboardList, FolderOpen, Search, Filter, CheckCircle2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Adjustment {
  id: number;
  referenceNo?: string;
  referenceNumber?: string;
  itemId: number;
  adjustmentType: string;
  quantity?: number;
  quantityAdjusted?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  reason: string | null;
  status: string;
  createdAt: string;
  itemName?: string;
  itemCode?: string;
  createdByName?: string | null;
}

interface Item {
  id: number;
  code: string;
  name: string;
  currentStock: number;
  unitName?: string;
}

export default function PenyesuaianPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [form, setForm] = useState({
    referenceNumber: "",
    itemId: "",
    adjustmentType: "add",
    quantity: "1",
    reason: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: adjustmentsData, isLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: () => apiFetch<Adjustment[] | { data: Adjustment[] }>("/api/adjustments"),
  });

  const { data: itemsData } = useQuery({
    queryKey: ["items"],
    queryFn: () => apiFetch<Item[] | { data: Item[] }>("/api/items?limit=100"),
  });

  const adjustments: Adjustment[] = useMemo(() => {
    if (Array.isArray(adjustmentsData)) return adjustmentsData;
    if (adjustmentsData && typeof adjustmentsData === "object" && Array.isArray((adjustmentsData as any).data)) {
      return (adjustmentsData as any).data;
    }
    return [];
  }, [adjustmentsData]);

  const items: Item[] = useMemo(() => {
    if (Array.isArray(itemsData)) return itemsData;
    if (itemsData && typeof itemsData === "object" && Array.isArray((itemsData as any).data)) {
      return (itemsData as any).data;
    }
    return [];
  }, [itemsData]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      const matchesSearch =
        !searchTerm ||
        (a.referenceNo ?? a.referenceNumber ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.itemName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.itemCode ?? "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === "all" ||
        a.adjustmentType === filterType ||
        (filterType === "add" && a.adjustmentType === "increase") ||
        (filterType === "subtract" && a.adjustmentType === "decrease");

      return matchesSearch && matchesType;
    });
  }, [adjustments, searchTerm, filterType]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/adjustments", {
        method: "POST",
        body: JSON.stringify({
          referenceNumber: form.referenceNumber,
          itemId: parseInt(form.itemId),
          adjustmentType: form.adjustmentType,
          quantity: parseInt(form.quantity),
          quantityAdjusted: parseInt(form.quantity),
          reason: form.reason || "Koreksi Fisik",
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adjustments"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setDialogOpen(false);
      toast({ title: "Berhasil", description: "Penyesuaian stok berhasil disimpan dan stok telah diperbarui." });
    },
    onError: (e: Error) => toast({ title: "Gagal Menyimpan", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setForm({
      referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
      itemId: "",
      adjustmentType: "add",
      quantity: "1",
      reason: "",
    });
    setDialogOpen(true);
  };

  const selectedItem = items.find((i) => i.id.toString() === form.itemId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Penyesuaian Stok</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Koreksi fisik stok gudang dan pencatatan selisih inventaris.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Buat Penyesuaian
        </Button>
      </motion.div>

      {/* Filter & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari no. referensi atau nama barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-card">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="add">Tambah (+)</SelectItem>
              <SelectItem value="subtract">Kurang (-)</SelectItem>
              <SelectItem value="set">Set Nilai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="self-start sm:self-auto text-xs px-3 py-1.5 gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" />
          {filteredAdjustments.length} dari {adjustments.length} Penyesuaian
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
                <TableHead>Nama Barang</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Stok Sebelum</TableHead>
                <TableHead className="text-right">Penyesuaian</TableHead>
                <TableHead className="text-right">Stok Sesudah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : filteredAdjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p className="font-semibold text-foreground">Tidak Ada Data Penyesuaian</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchTerm || filterType !== "all"
                        ? "Tidak ada data yang cocok dengan filter pencarian."
                        : "Klik tombol 'Buat Penyesuaian' untuk menambahkan koreksi stok baru."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdjustments.map((a) => {
                  const isAdd = a.adjustmentType === "add" || a.adjustmentType === "increase";
                  const isSub = a.adjustmentType === "subtract" || a.adjustmentType === "decrease";
                  const qty = a.quantityAdjusted ?? a.quantity ?? 0;

                  return (
                    <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium text-xs">
                        {a.referenceNo ?? a.referenceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{a.itemName || `Item #${a.itemId}`}</div>
                        {a.itemCode && <div className="text-xs text-muted-foreground font-mono">{a.itemCode}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isAdd
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1"
                              : isSub
                              ? "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 gap-1"
                              : "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 gap-1"
                          }
                        >
                          {isAdd && <TrendingUp className="w-3 h-3" />}
                          {isSub && <TrendingDown className="w-3 h-3" />}
                          {!isAdd && !isSub && <RefreshCw className="w-3 h-3" />}
                          {isAdd ? "Tambah" : isSub ? "Kurang" : "Set Nilai"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {a.quantityBefore ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono text-sm">
                        <span className={isAdd ? "text-emerald-600" : isSub ? "text-rose-600" : "text-blue-600"}>
                          {isAdd ? `+${qty}` : isSub ? `-${qty}` : `=${qty}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-xs">
                        {a.quantityAfter ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {a.reason || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[11px] bg-muted/40 font-medium">
                          {a.status === "approved" ? "Selesai" : a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Buat Penyesuaian */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Koreksi / Penyesuaian Stok</DialogTitle>
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

            <div className="space-y-1.5">
              <Label>Pilih Barang *</Label>
              <Select value={form.itemId} onValueChange={(v) => setForm((f) => ({ ...f, itemId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih barang yang akan disesuaikan" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.code} — {i.name} (Stok: {i.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Stok saat ini di sistem: <strong className="text-foreground">{selectedItem.currentStock}</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipe Penyesuaian *</Label>
                <Select value={form.adjustmentType} onValueChange={(v) => setForm((f) => ({ ...f, adjustmentType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Tambah Stok (+)</SelectItem>
                    <SelectItem value="subtract">Kurangi Stok (-)</SelectItem>
                    <SelectItem value="set">Set Nilai Mutlak (=)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Jumlah *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Alasan / Catatan Koreksi *</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="Contoh: Selisih fisik hasil stock opname, barang rusak, dsb."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.referenceNumber || !form.itemId || !form.quantity || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
