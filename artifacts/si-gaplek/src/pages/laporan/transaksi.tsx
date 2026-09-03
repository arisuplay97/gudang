import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Download, RotateCcw, FolderOpen, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionReport {
  id: number; referenceNo: string; type: string; status: string;
  totalItems: number; transactionDate: string; createdByName: string | null;
}

const TYPE_LABELS: Record<string, string> = { stock_in: "Barang Masuk", stock_out: "Barang Keluar", mutation: "Mutasi", adjustment: "Penyesuaian" };
const TYPE_BADGE: Record<string, "default" | "destructive" | "secondary"> = { stock_in: "default", stock_out: "destructive" };

export default function LaporanTransaksiPage() {
  const [, setLocation] = useLocation();
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["reports/transactions", type, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (from) params.set("startDate", from);
      if (to) params.set("endDate", to);
      return apiFetch<TransactionReport[]>(`/api/reports/transactions?${params.toString()}`);
    },
  });

  const handleExport = () => {
    if (!data?.length) return;
    exportToCSV("laporan_transaksi", ["Tanggal", "Tipe", "No. Referensi", "Status", "Jml Item", "Operator"],
      data.map(t => [formatDate(t.transactionDate), TYPE_LABELS[t.type] ?? t.type, t.referenceNo, t.status, t.totalItems, t.createdByName ?? ""])
    );
    toast({ title: "Export berhasil", description: "File CSV telah diunduh" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Transaksi</h1>
          <p className="text-muted-foreground text-sm">Riwayat semua transaksi barang masuk, keluar, mutasi.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/laporan/pemasangan-aksesoris")}
            className="text-xs gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Format Pemasangan Aksesoris (Excel)
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <ScrollText className="w-3.5 h-3.5 mr-1.5" />{data?.length ?? 0} Transaksi
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="p-3 border-b flex flex-wrap gap-3">
            <Select value={type || "__all__"} onValueChange={v => setType(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Tipe</SelectItem>
                <SelectItem value="stock_in">Barang Masuk</SelectItem>
                <SelectItem value="stock_out">Barang Keluar</SelectItem>
                <SelectItem value="mutation">Mutasi</SelectItem>
                <SelectItem value="adjustment">Penyesuaian</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40 h-9" />
              <span className="text-muted-foreground text-sm">s/d</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40 h-9" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setType(""); setFrom(""); setTo(""); }}><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset</Button>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead><TableHead>No. Referensi</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Jml Item</TableHead><TableHead>Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(6).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                  !data?.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Tidak ada data transaksi</p>
                    </TableCell></TableRow>
                  ) : data.map((t, i) => (
                    <TableRow key={`${t.type}-${t.id}-${i}`}>
                      <TableCell className="text-sm">{formatDate(t.transactionDate)}</TableCell>
                      <TableCell><Badge variant={TYPE_BADGE[t.type] ?? "secondary"} className="text-xs">{TYPE_LABELS[t.type] ?? t.type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{t.referenceNo}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{t.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{t.totalItems}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.createdByName ?? "—"}</TableCell>
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
