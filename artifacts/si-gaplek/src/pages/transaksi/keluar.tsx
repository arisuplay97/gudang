import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Eye, Trash2, PackageMinus, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { GlassModal } from "@/components/custom/glass-modal";
import { AnimatedCard } from "@/components/custom/animated-card";

interface StockOut { id: number; referenceNumber: string; bppNumber: string; bppType?: string; departmentId: number | null; notes: string | null; status: string; createdAt: string; departmentName?: string; projectName?: string; itemCount?: number; }
interface Item { id: number; code: string; name: string; currentStock: number; unitName?: string; barcode?: string | null; }
interface Department { id: number; name: string; code: string; }
interface JobType { id: number; name: string; }
interface Project { id: number; name: string; }
interface DetailEntry { itemId: number; quantity: number; notes: string | null; _item?: Item; }

export default function BarangKeluarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailEntry[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [form, setForm] = useState({ bppType: "NON_SR", jobTypeId: "", projectId: "", departmentId: "", notes: "", transactionDate: new Date().toISOString().split("T")[0] });
  const [detailForm, setDetailForm] = useState({ itemId: "", quantity: "1" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: stockOuts, isLoading } = useQuery({ queryKey: ["stock-out"], queryFn: () => apiFetch<StockOut[]>("/api/stock-out") });
  const { data: items } = useQuery({ queryKey: ["items"], queryFn: () => apiFetch<Item[]>("/api/items") });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => apiFetch<Department[]>("/api/departments") });
  const { data: jobTypes } = useQuery({ queryKey: ["job-types"], queryFn: () => apiFetch<JobType[]>("/api/job-types") });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch<Project[]>("/api/projects") });
  const { data: viewData } = useQuery({ queryKey: ["stock-out", viewId], queryFn: () => apiFetch<{ stockOut: StockOut; details: DetailEntry[] }>(`/api/stock-out/${viewId}`), enabled: !!viewId });

  const saveMutation = useMutation({
    mutationFn: () => apiFetch("/api/stock-out", {
      method: "POST",
      body: JSON.stringify({
        bppType: form.bppType,
        jobTypeId: form.jobTypeId ? parseInt(form.jobTypeId) : null,
        projectId: form.projectId ? parseInt(form.projectId) : null,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
        notes: form.notes || null,
        transactionDate: form.transactionDate,
        items: details.map(d => ({ itemId: d.itemId, quantity: d.quantity, notes: d.notes })),
      }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stock-out"] }); qc.invalidateQueries({ queryKey: ["items"] }); setDialogOpen(false); toast({ title: "BPP Berhasil dibuat" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setDetails([]);
    setForm({ bppType: "NON_SR", jobTypeId: "", projectId: "", departmentId: "", notes: "", transactionDate: new Date().toISOString().split("T")[0] });
    setDetailForm({ itemId: "", quantity: "1" });
    setDialogOpen(true);
  };

  const handleBarcodeKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const item = items?.find(i => (i as any).barcode === barcodeInput.trim() || i.code === barcodeInput.trim());
      if (item) {
        const existing = details.find(d => d.itemId === item.id);
        if (existing) {
          setDetails(ds => ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + 1 } : d));
        } else {
          setDetails(ds => [...ds, { itemId: item.id, quantity: 1, notes: null, _item: item }]);
        }
        toast({ title: `${item.name} ditambahkan` });
      } else {
        toast({ title: "Barang tidak ditemukan", variant: "destructive" });
      }
      setBarcodeInput("");
    }
  };

  const addDetail = () => {
    if (!detailForm.itemId) return;
    const item = items?.find(i => i.id === parseInt(detailForm.itemId));
    if (!item) return;
    const qty = parseInt(detailForm.quantity);
    if (item.currentStock < qty) { toast({ title: "Stok tidak cukup", description: `Stok tersedia: ${item.currentStock}`, variant: "destructive" }); return; }
    const existing = details.find(d => d.itemId === item.id);
    if (existing) setDetails(ds => ds.map(d => d.itemId === item.id ? { ...d, quantity: d.quantity + qty } : d));
    else setDetails(ds => [...ds, { itemId: item.id, quantity: qty, notes: null, _item: item }]);
    setDetailForm({ itemId: "", quantity: "1" });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Barang Keluar</h1><p className="text-muted-foreground text-sm">Transaksi pengeluaran barang dari gudang</p></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Transaksi Baru</Button>
      </div>

      <AnimatedCard className="p-0 border-none shadow-none bg-transparent">
        <Table className="bg-card rounded-md border">
          <TableHeader><TableRow><TableHead>No. BPP</TableHead><TableHead>Tanggal</TableHead><TableHead>Jenis BPP</TableHead><TableHead>Proyek</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array(4).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
             !stockOuts?.length ? <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><PackageMinus className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada transaksi BPP</p></TableCell></TableRow> :
             stockOuts.map(s => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewId(s.id)}>
                <TableCell className="font-mono font-medium">{s.bppNumber}</TableCell>
                <TableCell>{formatDate(s.createdAt)}</TableCell>
                <TableCell><Badge variant="outline">{s.bppType || "BPP"}</Badge></TableCell>
                <TableCell>{s.projectName ?? "-"}</TableCell>
                <TableCell className="text-right">{s.itemCount ?? 0} item</TableCell>
                <TableCell><Badge variant={s.status === "finalized" ? "default" : "secondary"}>{s.status === "finalized" ? "Selesai" : "Draft"}</Badge></TableCell>
                <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setViewId(s.id); }}><Eye className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AnimatedCard>

      <GlassModal open={dialogOpen} onOpenChange={setDialogOpen} title="Transaksi Bukti Permintaan Barang (BPP)" description="Buat dokumen pengajuan pengeluaran gudang"
        footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button onClick={() => saveMutation.mutate()} disabled={details.length === 0 || saveMutation.isPending}>{saveMutation.isPending ? "Menyimpan..." : "Buat BPP"}</Button></>}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Tipe BPP</Label>
                <Select value={form.bppType} onValueChange={v => setForm(f => ({ ...f, bppType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih Jenis BPP" /></SelectTrigger>
                  <SelectContent><SelectItem value="SR">BPP SR (Sambungan Rumah)</SelectItem><SelectItem value="NON_SR">BPP Non-SR</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Tanggal Transaksi</Label><Input type="date" value={form.transactionDate} onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))} /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Proyek (Opsional)</Label>
                <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih proyek" /></SelectTrigger>
                  <SelectContent>{projects?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Jenis Pekerjaan</Label>
                <Select value={form.jobTypeId} onValueChange={v => setForm(f => ({ ...f, jobTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis pekerjaan" /></SelectTrigger>
                  <SelectContent>{jobTypes?.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5"><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <p className="font-medium text-sm flex items-center gap-2"><ScanBarcode className="w-4 h-4" /> Scan Barcode / Tambah Barang</p>
              <Input value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeKey} placeholder="Scan barcode atau kode barang, tekan Enter..." className="font-mono" />
              <div className="flex gap-2">
                <Select value={detailForm.itemId} onValueChange={v => setDetailForm(f => ({ ...f, itemId: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Atau pilih barang" /></SelectTrigger>
                  <SelectContent>{items?.filter(i => i.currentStock > 0).map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.code} - {i.name} (stok: {i.currentStock})</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="1" value={detailForm.quantity} onChange={e => setDetailForm(f => ({ ...f, quantity: e.target.value }))} className="w-24" />
                <Button type="button" onClick={addDetail} disabled={!detailForm.itemId}>Tambah</Button>
              </div>
            </div>

            {details.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Hapus</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {details.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d._item?.name ?? d.itemId}</TableCell>
                        <TableCell className="text-right">{d.quantity}</TableCell>
                        <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setDetails(ds => ds.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
      </GlassModal>

      <GlassModal open={viewId !== null} onOpenChange={o => !o && setViewId(null)} title="Detail Transaksi BPP" footer={<Button onClick={() => setViewId(null)}>Tutup</Button>}>
          {viewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-lg">
                <div><span className="text-muted-foreground block text-xs">No. BPP:</span><p className="font-mono font-bold text-base text-primary">{viewData.stockOut.bppNumber}</p></div>
                <div><span className="text-muted-foreground block text-xs">Tanggal:</span><p className="font-medium">{formatDate(viewData.stockOut.createdAt)}</p></div>
                <div><span className="text-muted-foreground block text-xs">Proyek:</span><p className="font-medium">{viewData.stockOut.projectName ?? "-"}</p></div>
                <div><span className="text-muted-foreground block text-xs">Status:</span><Badge variant={viewData.stockOut.status === "finalized" ? "default" : "secondary"}>{viewData.stockOut.status}</Badge></div>
              </div>
              <Table className="border rounded-md">
                <TableHeader className="bg-muted"><TableRow><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>{viewData.details?.map((d, i) => <TableRow key={i}><TableCell className="font-medium">{(d as any).itemName ?? d.itemId}</TableCell><TableCell className="text-right">{d.quantity}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
      </GlassModal>
    </div>
  );
}
