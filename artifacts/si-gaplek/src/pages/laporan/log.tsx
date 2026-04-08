import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText } from "lucide-react";

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: number | null;
  description: string | null;
  createdAt: string;
  userName: string | null;
}

export default function LogAktivitasPage() {
  const [entity, setEntity] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: () => apiFetch<AuditLog[]>(`/api/reports/audit-logs${entity ? `?entity=${entity}` : ""}`),
  });

  const actionColor = (action: string) => {
    if (action.includes("create") || action.includes("add")) return "default";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("update") || action.includes("edit")) return "secondary";
    return "outline";
  };

  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-2xl font-bold">Log Aktivitas</h1><p className="text-muted-foreground text-sm">Rekam jejak aktivitas pengguna sistem</p></div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Semua Entitas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Entitas</SelectItem>
              <SelectItem value="item">Barang</SelectItem>
              <SelectItem value="stock_in">Barang Masuk</SelectItem>
              <SelectItem value="stock_out">Barang Keluar</SelectItem>
              <SelectItem value="user">Pengguna</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Pengguna</TableHead><TableHead>Aksi</TableHead><TableHead>Entitas</TableHead><TableHead>Deskripsi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array(8).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
               !data?.length ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada log aktivitas</p></TableCell></TableRow> :
               data.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="font-medium text-sm">{log.userName ?? `User #${log.userId}`}</TableCell>
                  <TableCell><Badge variant={actionColor(log.action)} className="text-xs">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">{log.entity}{log.entityId ? ` #${log.entityId}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.description ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
