import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BarChart3, Download, AlertTriangle } from "lucide-react";

interface StockReport {
  itemId: number;
  itemCode: string;
  itemName: string;
  categoryName: string | null;
  unitName: string | null;
  currentStock: number;
  minimumStock: number;
  unitPrice: string | null;
  totalValue: number;
}

export default function LaporanStokPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

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

  const totalValue = data?.reduce((sum, i) => sum + (i.totalValue ?? 0), 0) ?? 0;
  const lowStockCount = data?.filter(i => i.currentStock <= i.minimumStock).length ?? 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Laporan Stok Barang</h1><p className="text-muted-foreground text-sm">Ringkasan stok seluruh barang</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Barang</p><p className="text-2xl font-bold">{formatNumber(data?.length)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stok Rendah</p><p className="text-2xl font-bold text-amber-600">{lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Nilai Inventaris</p><p className="text-lg font-bold text-green-600">{formatCurrency(totalValue)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari barang..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kategori</SelectItem>
                {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama Barang</TableHead><TableHead>Kategori</TableHead><TableHead>Satuan</TableHead><TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min. Stok</TableHead><TableHead className="text-right">Nilai</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(6).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
               !data?.length ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Tidak ada data stok</p></TableCell></TableRow> :
               data.map(item => (
                <TableRow key={item.itemId}>
                  <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.categoryName ?? "-"}</TableCell>
                  <TableCell>{item.unitName ?? "-"}</TableCell>
                  <TableCell className="text-right font-medium">{formatNumber(item.currentStock)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.minimumStock}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalValue)}</TableCell>
                  <TableCell>
                    {item.currentStock <= item.minimumStock ? (
                      <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Rendah</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
