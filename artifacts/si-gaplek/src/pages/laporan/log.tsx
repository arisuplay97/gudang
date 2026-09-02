import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Download, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: number; userId: number | null; action: string;
  entityType: string; entityId: number | null;
  description: string | null; createdAt: string; userName: string | null;
}

export default function LogAktivitasPage() {
  const [entity, setEntity] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", entity],
    queryFn: () => apiFetch<AuditLog[]>(`/api/audit-logs${entity ? `?entityType=${entity}` : ""}`),
  });

  const actionBadge = (action: string): "default" | "destructive" | "secondary" | "outline" => {
    if (action.includes("create") || action.includes("add")) return "default";
    if (action.includes("delete") || action.includes("remove")) return "destructive";
    if (action.includes("update") || action.includes("edit")) return "secondary";
    return "outline";
  };

  const handleExport = () => {
    if (!data?.length) return;
    exportToCSV("audit_log", ["Waktu", "Pengguna", "Aksi", "Entitas", "Deskripsi"],
      data.map(l => [formatDateTime(l.createdAt), l.userName ?? `User #${l.userId}`, l.action, `${l.entityType}${l.entityId ? ` #${l.entityId}` : ""}`, l.description ?? ""])
    );
    toast({ title: "Export berhasil", description: "File CSV telah diunduh" });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log Aktivitas</h1>
          <p className="text-muted-foreground text-sm">Rekam jejak aktivitas pengguna dalam sistem.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          <ScrollText className="w-3.5 h-3.5 mr-1.5" />{data?.length ?? 0} Log
        </Badge>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="p-3 border-b">
            <Select value={entity || "__all__"} onValueChange={v => setEntity(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Semua Entitas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Entitas</SelectItem>
                <SelectItem value="item">Barang</SelectItem>
                <SelectItem value="stock_in">Barang Masuk</SelectItem>
                <SelectItem value="stock_out">Barang Keluar</SelectItem>
                <SelectItem value="user">Pengguna</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Waktu</TableHead><TableHead>Pengguna</TableHead><TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead><TableHead>Deskripsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array(8).fill(0).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) :
                  !data?.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Belum ada log aktivitas</p>
                    </TableCell></TableRow>
                  ) : data.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell className="font-medium text-sm">{log.userName ?? `User #${log.userId}`}</TableCell>
                      <TableCell><Badge variant={actionBadge(log.action)} className="text-xs">{log.action}</Badge></TableCell>
                      <TableCell className="text-sm">{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{log.description ?? "—"}</TableCell>
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
