import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, DollarSign } from "lucide-react";

interface InventoryValue {
  categoryName: string;
  totalItems: number;
  totalStock: number;
  totalValue: number;
  items: Array<{ id: number; code: string; name: string; stock: number; unitPrice: number; value: number; unit: string }>;
}

export default function LaporanNilaiPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports/inventory-value"],
    queryFn: () => apiFetch<InventoryValue[]>("/api/reports/inventory-value"),
  });

  const grandTotal = data?.reduce((sum, c) => sum + c.totalValue, 0) ?? 0;
  const grandItems = data?.reduce((sum, c) => sum + c.totalItems, 0) ?? 0;

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold">Nilai Inventaris</h1><p className="text-muted-foreground text-sm">Rekapitulasi nilai inventaris per kategori</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Nilai Inventaris</p><p className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Jenis Barang</p><p className="text-2xl font-bold">{grandItems}</p></div>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Tidak ada data inventaris</p></CardContent></Card>
      ) : (
        data.map(cat => (
          <Card key={cat.categoryName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{cat.categoryName}</span>
                <span className="text-green-600 font-bold">{formatCurrency(cat.totalValue)}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{cat.totalItems} jenis barang • Total stok: {formatNumber(cat.totalStock)}</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead className="text-right">Stok</TableHead><TableHead>Satuan</TableHead><TableHead className="text-right">Harga Satuan</TableHead><TableHead className="text-right">Total Nilai</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cat.items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.stock)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
