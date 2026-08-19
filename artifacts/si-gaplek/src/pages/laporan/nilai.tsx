import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, DollarSign } from "lucide-react";

interface InventoryValueResponse {
  totalItems: number;
  totalValue: number;
  byCategory: Array<{
    categoryName: string;
    itemCount: number;
    totalValue: number;
  }>;
}

export default function LaporanNilaiPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports/inventory-value"],
    queryFn: () => apiFetch<InventoryValueResponse>("/api/reports/inventory-value"),
  });

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold">Nilai Inventaris</h1><p className="text-muted-foreground text-sm">Rekapitulasi nilai inventaris per kategori</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Nilai Inventaris</p><p className="text-2xl font-bold text-green-600">{formatCurrency(data?.totalValue ?? 0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">Total Jenis Barang</p><p className="text-2xl font-bold">{data?.totalItems ?? 0}</p></div>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !data?.byCategory?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Tidak ada data inventaris</p></CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nilai per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead className="text-right">Jumlah Barang</TableHead><TableHead className="text-right">Total Nilai</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.byCategory.map(cat => (
                  <TableRow key={cat.categoryName}>
                    <TableCell className="font-medium">{cat.categoryName}</TableCell>
                    <TableCell className="text-right">{formatNumber(cat.itemCount)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(cat.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
