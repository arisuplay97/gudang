import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText } from "lucide-react";

interface TransactionReport {
  id: number;
  type: string;
  referenceNumber: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unitName: string | null;
  partyName: string | null;
  notes: string | null;
  createdAt: string;
  userName: string | null;
}

export default function LaporanTransaksiPage() {
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reports/transactions", type, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return apiFetch<TransactionReport[]>(`/api/reports/transactions?${params.toString()}`);
    },
  });

  const typeLabel = (t: string) => ({ stock_in: "Barang Masuk", stock_out: "Barang Keluar", mutation: "Mutasi", adjustment: "Penyesuaian" }[t] ?? t);
  const typeBadge = (t: string) => ({ stock_in: "default" as const, stock_out: "destructive" as const }[t] ?? "secondary" as const);

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold">Laporan Transaksi</h1><p className="text-muted-foreground text-sm">Riwayat semua transaksi barang</p></div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Tipe</SelectItem>
                <SelectItem value="stock_in">Barang Masuk</SelectItem>
                <SelectItem value="stock_out">Barang Keluar</SelectItem>
                <SelectItem value="mutation">Mutasi</SelectItem>
                <SelectItem value="adjustment">Penyesuaian</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" placeholder="Dari tanggal" />
              <span className="text-muted-foreground">s/d</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" placeholder="Sampai tanggal" />
            </div>
            <Button variant="outline" onClick={() => { setType(""); setFrom(""); setTo(""); }}>Reset</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Tipe</TableHead><TableHead>No. Referensi</TableHead><TableHead>Barang</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Satuan</TableHead><TableHead>Pihak</TableHead><TableHead>Operator</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(6).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
               !data?.length ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Tidak ada data transaksi</p></TableCell></TableRow> :
               data.map((t, i) => (
                <TableRow key={`${t.type}-${t.id}-${i}`}>
                  <TableCell className="text-sm">{formatDate(t.createdAt)}</TableCell>
                  <TableCell><Badge variant={typeBadge(t.type)} className="text-xs">{typeLabel(t.type)}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{t.referenceNumber}</TableCell>
                  <TableCell>
                    <div><p className="font-medium text-sm">{t.itemName}</p><p className="text-xs text-muted-foreground">{t.itemCode}</p></div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{t.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.unitName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{t.partyName ?? "-"}</TableCell>
                  <TableCell className="text-sm">{t.userName ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
