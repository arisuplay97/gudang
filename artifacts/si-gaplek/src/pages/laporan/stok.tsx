import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BarChart3, Download, AlertTriangle, Package, DollarSign, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StockReport {
  itemId: number; itemCode: string; itemName: string;
  categoryName: string | null; unitName: string | null;
  currentStock: number; minimumStock: number;
  unitPrice: string | null; totalValue: number;
}

export default function LaporanStokPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["reports/stock", search, categoryId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      return apiFetch<StockReport[]>(`/api/reports/stock?${params.toString()}`);
    },
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<{ id: number; name: string }[]>("/api/categories") });

  const filtered = data ?? [];
  const totalValue = filtered.reduce((sum, i) => sum + (i.totalValue ?? 0), 0);
  const lowStockCount = filtered.filter(i => i.currentStock <= i.minimumStock).length;

  const handleExport = () => {
    if (!filtered.length) return;
    exportToCSV("laporan_stok", ["Kode", "Nama Barang", "Kategori", "Satuan", "Stok", "Min. Stok", "Harga Satuan", "Total Nilai", "Status"],
      filtered.map(i => [i.itemCode, i.itemName, i.categoryName ?? "", i.unitName ?? "", i.currentStock, i.minimumStock, i.unitPrice ?? "", i.totalValue, i.currentStock <= i.minimumStock ? "Rendah" : "Normal"])
    );
    toast({ title: "Export berhasil", description: "File CSV telah diunduh" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Stok Barang</h1>
          <p className="text-muted-foreground text-sm">Ringkasan stok dan nilai inventaris seluruh barang.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Barang</p><p className="text-xl font-bold">{formatNumber(filtered.length)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Stok Rendah</p><p className="text-xl font-bold text-amber-600">{lowStockCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Nilai Inventaris</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(totalValue)}</p></div>
        </CardContent></Card>
      </motion.div>

      {/* Filters + Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="p-3 border-b flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari barang..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryId || "__all__"} onValueChange={v => setCategoryId(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Kategori</SelectItem>
                {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Kode</TableHead><TableHead>Nama Barang</TableHead><TableHead>Kategori</TableHead><TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(6).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                  !filtered.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Tidak ada data stok</p>
                    </TableCell></TableRow>
                  ) : filtered.map(item => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.categoryName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{item.unitName ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(item.currentStock)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.minimumStock}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.totalValue)}</TableCell>
                      <TableCell>
                        {item.currentStock <= item.minimumStock ? (
                          <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Rendah</Badge>
                        ) : <Badge variant="secondary" className="text-xs">Normal</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
