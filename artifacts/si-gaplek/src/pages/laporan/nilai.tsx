import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, DollarSign, Download, FolderOpen, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryValueResponse {
  totalItems: number;
  totalValue: number;
  byCategory: Array<{ categoryName: string; itemCount: number; totalValue: number; }>;
}

export default function LaporanNilaiPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["reports/inventory-value"],
    queryFn: () => apiFetch<InventoryValueResponse>("/api/reports/inventory-value"),
  });

  const handleExport = () => {
    if (!data?.byCategory?.length) return;
    exportToCSV("laporan_nilai_inventaris", ["Kategori", "Jumlah Barang", "Total Nilai"],
      data.byCategory.map(c => [c.categoryName, c.itemCount, c.totalValue])
    );
    toast({ title: "Export berhasil", description: "File CSV telah diunduh" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nilai Inventaris</h1>
          <p className="text-muted-foreground text-sm">Rekapitulasi nilai inventaris per kategori barang.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.byCategory?.length}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Nilai Inventaris</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(data?.totalValue ?? 0)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Jenis Barang</p><p className="text-xl font-bold">{data?.totalItems ?? 0}</p></div>
        </CardContent></Card>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !data?.byCategory?.length ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Tidak ada data inventaris</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah Barang</TableHead>
                    <TableHead className="text-right">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCategory.map((cat, i) => (
                    <TableRow key={cat.categoryName}>
                      <TableCell className="text-center text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium">{cat.categoryName}</TableCell>
                      <TableCell className="text-right">{formatNumber(cat.itemCount)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(cat.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/20 font-bold">
                    <TableCell colSpan={2} className="text-right">Total</TableCell>
                    <TableCell className="text-right">{formatNumber(data.totalItems)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(data.totalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
