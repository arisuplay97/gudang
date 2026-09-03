import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  List,
  Table as TableIcon,
  Kanban,
  Map as MapIcon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Package,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Eye,
  Camera,
  Compass,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icons in bundlers
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const verifiedMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface TrackingItem {
  id: number;
  uuid: string;
  status: string;
  branchId: number;
  branchName?: string | null;
  transactionItemId: number;
  itemName: string;
  itemCode: string;
  referenceNo: string;
  quantity: number;
  totalQuantity: number;
  installedQuantity: number;
  remainingQuantity: number;
  isPartial: boolean;
  slaStatus: string;
  slaStartAt: string | null;
  slaDeadlineAt: string | null;
  receivedAt: string | null;
  installedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

const STEPS = [
  { key: "BARANG_KELUAR", label: "Keluar Gudang", desc: "Material dirilis dari gudang pusat" },
  { key: "DITERIMA_CABANG", label: "Diterima Cabang", desc: "QR Surat Jalan diverifikasi petugas cabang" },
  { key: "MENUNGGU_PEMASANGAN", label: "Alokasi Titik Fisik", desc: "Kuantitas dibagi ke titik rencana pemasangan" },
  { key: "MENUNGGU_VERIFIKASI", label: "Pemasangan Selesai", desc: "Bukti foto ber-watermark & koordinat GPS terkirim" },
  { key: "TERVERIFIKASI", label: "Terverifikasi (GIS)", desc: "Audit SPI disetujui & tercatat di peta resmi" },
];

export default function CabangTrackingPage() {
  const [, setLocation] = useLocation();

  // Mode view switcher with persistence
  const [viewMode, setViewMode] = useState<"list" | "table" | "board" | "map">(() => {
    return (localStorage.getItem("material_tracking_view") as any) || "list";
  });

  const handleViewChange = (mode: "list" | "table" | "board" | "map") => {
    setViewMode(mode);
    localStorage.setItem("material_tracking_view", mode);
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exceptionFilter, setExceptionFilter] = useState<"all" | "overdue" | "partial" | "pending_verification" | "verified">("all");
  const [selectedTrackingUuid, setSelectedTrackingUuid] = useState<string | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<"timeline" | "allocations" | "events">("timeline");

  // Fetch Tracking Data
  const { data: trackingResponse, isLoading, refetch } = useQuery({
    queryKey: ["cabang-tracking"],
    queryFn: () => apiFetch<{ data: TrackingItem[] }>("/api/tracking?limit=150"),
  });

  // Fetch GIS Locations for Map View (Verified only according to PRD Section 8)
  const { data: gisLocations } = useQuery({
    queryKey: ["gis-material-locations"],
    queryFn: () => apiFetch<any[]>("/api/gis/material-locations"),
    enabled: viewMode === "map",
  });

  // Fetch Detail Data for active modal
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ["tracking-detail", selectedTrackingUuid],
    queryFn: () => apiFetch<any>(`/api/tracking/${selectedTrackingUuid}`),
    enabled: !!selectedTrackingUuid,
  });

  const rawList: TrackingItem[] = useMemo(() => {
    if (Array.isArray(trackingResponse?.data)) return trackingResponse.data;
    if (Array.isArray(trackingResponse)) return trackingResponse as any;
    return [];
  }, [trackingResponse]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = rawList.length;
    const waitingReceive = rawList.filter((t) => t.status === "MENUNGGU_DITERIMA").length;
    const installed = rawList.filter((t) => t.status === "MENUNGGU_PEMASANGAN" || t.status === "TERPASANG").length;
    const waitingVerification = rawList.filter((t) => t.status === "MENUNGGU_VERIFIKASI").length;
    const overdue = rawList.filter((t) => t.slaStatus === "OVERDUE").length;
    return { total, waitingReceive, installed, waitingVerification, overdue };
  }, [rawList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          item.itemName.toLowerCase().includes(term) ||
          item.itemCode.toLowerCase().includes(term) ||
          (item.referenceNo ?? "").toLowerCase().includes(term) ||
          (item.branchName ?? "").toLowerCase().includes(term);
        if (!matches) return false;
      }

      // 2. Status dropdown
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // 3. Exception filter pills
      if (exceptionFilter === "overdue" && item.slaStatus !== "OVERDUE") return false;
      if (exceptionFilter === "partial" && !item.isPartial) return false;
      if (exceptionFilter === "pending_verification" && item.status !== "MENUNGGU_VERIFIKASI") return false;
      if (exceptionFilter === "verified" && item.status !== "TERVERIFIKASI") return false;

      return true;
    });
  }, [rawList, searchTerm, statusFilter, exceptionFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MENUNGGU_DITERIMA":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400">
            MENUNGGU DITERIMA
          </Badge>
        );
      case "DITERIMA_CABANG":
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400">
            DITERIMA CABANG
          </Badge>
        );
      case "MENUNGGU_PEMASANGAN":
        return (
          <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400">
            MENUNGGU PEMASANGAN
          </Badge>
        );
      case "MENUNGGU_VERIFIKASI":
        return (
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 animate-pulse">
            MENUNGGU VERIFIKASI
          </Badge>
        );
      case "TERVERIFIKASI":
        return (
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
            TERVERIFIKASI (GIS)
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSlaIndicator = (slaStatus: string, deadline?: string | null) => {
    switch (slaStatus) {
      case "NORMAL":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> SLA Normal
          </Badge>
        );
      case "WARNING":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-[11px] gap-1">
            <Clock className="w-3 h-3" /> &lt; 48 Jam
          </Badge>
        );
      case "KRITIS":
        return (
          <Badge variant="destructive" className="bg-rose-500 text-[11px] gap-1">
            <ShieldAlert className="w-3 h-3" /> &lt; 24 Jam
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="bg-red-950 text-red-200 border border-red-800 text-[11px] gap-1">
            <ShieldAlert className="w-3 h-3" /> OVERDUE
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "BARANG_KELUAR":
      case "MENUNGGU_DITERIMA":
        return 0;
      case "DITERIMA_CABANG":
        return 1;
      case "MENUNGGU_PEMASANGAN":
        return 2;
      case "TERPASANG":
      case "MENUNGGU_VERIFIKASI":
        return 3;
      case "TERVERIFIKASI":
        return 4;
      default:
        return 1;
    }
  };

  // Export Table View to CSV
  const exportToCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ["Nama Material", "Kode", "No Ref", "Cabang", "Total Qty", "Terpasang", "Sisa", "Status", "SLA"];
    const rows = filteredList.map((t) => [
      `"${t.itemName}"`,
      `"${t.itemCode}"`,
      `"${t.referenceNo}"`,
      `"${t.branchName || "-"}"`,
      t.totalQuantity,
      t.installedQuantity,
      t.remainingQuantity,
      `"${t.status}"`,
      `"${t.slaStatus}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `material_tracking_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & View Switcher */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Material Tracking Multi-View
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitoring siklus hidup material perpipaan & distribusi fisik cabang dengan 4 mode tampilan.
          </p>
        </div>

        {/* 4 View Modes Switcher */}
        <div className="bg-muted/80 p-1 rounded-xl border border-border/70 flex items-center shadow-inner self-start md:self-auto">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-lg"
            onClick={() => handleViewChange("list")}
          >
            <List className="w-3.5 h-3.5" /> List
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-lg"
            onClick={() => handleViewChange("table")}
          >
            <TableIcon className="w-3.5 h-3.5" /> Table
          </Button>
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-lg"
            onClick={() => handleViewChange("board")}
          >
            <Kanban className="w-3.5 h-3.5" /> Board
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-lg"
            onClick={() => handleViewChange("map")}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map GIS
          </Button>
        </div>
      </motion.div>

      {/* KPI Interactive Clickable Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card
            onClick={() => setExceptionFilter("all")}
            className={`cursor-pointer transition-all border-border/80 shadow-sm ${
              exceptionFilter === "all" ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/40"
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Material</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{kpis.total}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Layers className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card
            onClick={() => setStatusFilter(statusFilter === "MENUNGGU_DITERIMA" ? "all" : "MENUNGGU_DITERIMA")}
            className={`cursor-pointer transition-all border-border/80 shadow-sm ${
              statusFilter === "MENUNGGU_DITERIMA" ? "ring-2 ring-amber-500 bg-amber-50/20" : "hover:border-amber-400/50"
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Menunggu Terima</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">
                  {kpis.waitingReceive}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card
            onClick={() => setExceptionFilter(exceptionFilter === "partial" ? "all" : "partial")}
            className={`cursor-pointer transition-all border-border/80 shadow-sm ${
              exceptionFilter === "partial" ? "ring-2 ring-purple-500 bg-purple-50/20" : "hover:border-purple-400/50"
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Parsial / Alokasi</p>
                <p className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 mt-0.5">
                  {kpis.installed}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card
            onClick={() =>
              setExceptionFilter(exceptionFilter === "pending_verification" ? "all" : "pending_verification")
            }
            className={`cursor-pointer transition-all border-border/80 shadow-sm ${
              exceptionFilter === "pending_verification" ? "ring-2 ring-orange-500 bg-orange-50/20" : "hover:border-orange-400/50"
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Verifikasi SPI</p>
                <p className="text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-400 mt-0.5">
                  {kpis.waitingVerification}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card
            onClick={() => setExceptionFilter(exceptionFilter === "overdue" ? "all" : "overdue")}
            className={`cursor-pointer transition-all border-border/80 shadow-sm col-span-2 sm:col-span-1 ${
              exceptionFilter === "overdue" ? "ring-2 ring-rose-500 bg-rose-50/20" : "hover:border-rose-400/50"
            }`}
          >
            <CardContent className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">SLA Overdue</p>
                <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-0.5">
                  {kpis.overdue}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Global & Quick Exception Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari nama material, kode, atau no ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] bg-background h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="MENUNGGU_DITERIMA">Menunggu Diterima</SelectItem>
              <SelectItem value="DITERIMA_CABANG">Diterima Cabang</SelectItem>
              <SelectItem value="MENUNGGU_PEMASANGAN">Menunggu Pemasangan</SelectItem>
              <SelectItem value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</SelectItem>
              <SelectItem value="TERVERIFIKASI">Terverifikasi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Exception Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <Button
            size="sm"
            variant={exceptionFilter === "all" ? "default" : "outline"}
            className="h-8 text-[11px] px-2.5 rounded-lg"
            onClick={() => setExceptionFilter("all")}
          >
            Semua
          </Button>
          <Button
            size="sm"
            variant={exceptionFilter === "overdue" ? "default" : "outline"}
            className={`h-8 text-[11px] px-2.5 rounded-lg ${
              exceptionFilter === "overdue" ? "bg-rose-600 hover:bg-rose-700" : "text-rose-600 border-rose-200"
            }`}
            onClick={() => setExceptionFilter("overdue")}
          >
            Overdue
          </Button>
          <Button
            size="sm"
            variant={exceptionFilter === "partial" ? "default" : "outline"}
            className={`h-8 text-[11px] px-2.5 rounded-lg ${
              exceptionFilter === "partial" ? "bg-purple-600 hover:bg-purple-700" : "text-purple-600 border-purple-200"
            }`}
            onClick={() => setExceptionFilter("partial")}
          >
            Parsial
          </Button>
          <Button
            size="sm"
            variant={exceptionFilter === "pending_verification" ? "default" : "outline"}
            className={`h-8 text-[11px] px-2.5 rounded-lg ${
              exceptionFilter === "pending_verification" ? "bg-orange-600 hover:bg-orange-700" : "text-orange-600 border-orange-200"
            }`}
            onClick={() => setExceptionFilter("pending_verification")}
          >
            Verifikasi SPI
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 1. LIST VIEW (HORIZONTAL RICH CARDS — DEFAULT) ─────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : filteredList.length === 0 ? (
            <Card className="border-dashed p-12 text-center bg-muted/20">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-foreground">Tidak Ada Material Tracking Sesuai Filter</p>
              <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan pencarian atau reset filter di atas.</p>
            </Card>
          ) : (
            filteredList.map((track) => {
              const pct = Math.round((track.installedQuantity / (track.totalQuantity || 1)) * 100);

              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="p-4 border-border/80 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group bg-card"
                    onClick={() => setSelectedTrackingUuid(track.uuid)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Material Info */}
                      <div className="space-y-1.5 flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                            {track.itemName}
                          </h3>
                          <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
                            {track.itemCode}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">Ref: {track.referenceNo}</span>
                          {track.isPartial && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                              PARSIAL
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {track.branchName || "Cabang PDAM"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            Dikeluarkan: {formatDate(track.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Progress & Breakdown (3 dikirim | 2 terpasang | 1 sisa) */}
                      <div className="w-full lg:w-72 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-muted-foreground">Progress Fisik:</span>
                          <span className="text-foreground">
                            <strong>{track.installedQuantity}</strong> / {track.totalQuantity} ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {track.totalQuantity} dikirim | {track.installedQuantity} terpasang | {track.remainingQuantity} sisa
                        </p>
                      </div>

                      {/* Right: SLA, Status, Action */}
                      <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                        <div className="flex flex-col items-start lg:items-end gap-1">
                          {getStatusBadge(track.status)}
                          {getSlaIndicator(track.slaStatus, track.slaDeadlineAt)}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrackingUuid(track.uuid);
                          }}
                        >
                          Detail Journey
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 2. TABLE VIEW (DENSE DATA TABLE + EXPORT) ─────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <div className="p-3 bg-muted/30 border-b flex justify-between items-center text-xs">
            <span className="font-semibold text-muted-foreground">
              Menampilkan {filteredList.length} Material Tracking
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportToCSV}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-bold">Material</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Ref Transaksi</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-right">Qty Keluar</TableHead>
                  <TableHead className="text-right">Terpasang</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={11}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-12 text-center text-muted-foreground text-xs">
                      Tidak ada data yang cocok dengan filter pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors text-xs"
                      onClick={() => setSelectedTrackingUuid(t.uuid)}
                    >
                      <TableCell className="font-semibold text-foreground">{t.itemName}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{t.itemCode}</TableCell>
                      <TableCell className="font-mono">{t.referenceNo}</TableCell>
                      <TableCell>{t.branchName || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{t.totalQuantity}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600">
                        {t.installedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {t.remainingQuantity}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-center">{getSlaIndicator(t.slaStatus)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 3. BOARD / KANBAN VIEW ─────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {[
            {
              id: "COL_1",
              title: "BARANG KELUAR",
              desc: "Menunggu Diterima Cabang",
              filterFn: (t: TrackingItem) => t.status === "MENUNGGU_DITERIMA",
              badgeColor: "bg-amber-100 text-amber-800",
            },
            {
              id: "COL_2",
              title: "DITERIMA CABANG",
              desc: "Surat Jalan Telah Discan",
              filterFn: (t: TrackingItem) => t.status === "DITERIMA_CABANG",
              badgeColor: "bg-blue-100 text-blue-800",
            },
            {
              id: "COL_3",
              title: "PEMASANGAN",
              desc: "Alokasi & Verifikasi SPI",
              filterFn: (t: TrackingItem) =>
                t.status === "MENUNGGU_PEMASANGAN" || t.status === "MENUNGGU_VERIFIKASI" || t.status === "TERPASANG",
              badgeColor: "bg-purple-100 text-purple-800",
            },
            {
              id: "COL_4",
              title: "TERVERIFIKASI (GIS)",
              desc: "Resmi Muncul di Peta",
              filterFn: (t: TrackingItem) => t.status === "TERVERIFIKASI",
              badgeColor: "bg-emerald-100 text-emerald-800",
            },
          ].map((col) => {
            const itemsInCol = filteredList.filter(col.filterFn);

            return (
              <div key={col.id} className="bg-muted/40 rounded-xl p-3 border border-border/80 flex flex-col min-h-[450px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b mb-3">
                  <div>
                    <h3 className="font-bold text-xs text-foreground tracking-wider uppercase">{col.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{col.desc}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {itemsInCol.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {itemsInCol.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-lg">
                      Kosong
                    </div>
                  ) : (
                    itemsInCol.map((track) => (
                      <motion.div key={track.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className="p-3 border-border/80 shadow-sm cursor-pointer hover:border-primary/50 transition-all bg-card"
                          onClick={() => setSelectedTrackingUuid(track.uuid)}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-semibold text-xs text-foreground leading-tight">
                                {track.itemName}
                              </h4>
                              {getSlaIndicator(track.slaStatus)}
                            </div>

                            <p className="font-mono text-[10px] text-muted-foreground">
                              {track.itemCode} | {track.referenceNo}
                            </p>

                            <div className="pt-1.5 border-t flex justify-between items-center text-[11px]">
                              <span className="text-muted-foreground">
                                Qty: <strong className="text-foreground">{track.installedQuantity} / {track.totalQuantity}</strong>
                              </span>
                              <span className="text-primary text-[10px] font-medium flex items-center">
                                Detail <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 4. MAP VIEW (VERIFIED GIS POINTS ONLY — SECTION 8) ─── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "map" && (
        <Card className="border-border/80 shadow-sm overflow-hidden p-0">
          <div className="p-3 bg-muted/30 border-b flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-foreground">
                Peta Titik Pemasangan Terverifikasi (GIS Resmi)
              </span>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50">
              {gisLocations?.length || 0} Titik Terverifikasi
            </Badge>
          </div>

          <div className="h-[520px] w-full relative">
            <MapContainer
              center={[-8.6705, 116.1155]} // Lombok / NTB Center
              zoom={11}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {Array.isArray(gisLocations) &&
                gisLocations.map((loc: any) => {
                  const lat = parseFloat(loc.verifiedLatitude || loc.latitude);
                  const lon = parseFloat(loc.verifiedLongitude || loc.longitude);
                  if (isNaN(lat) || isNaN(lon)) return null;

                  return (
                    <Marker key={loc.evidenceId} position={[lat, lon]} icon={verifiedMarkerIcon}>
                      <Popup>
                        <div className="space-y-1.5 p-1 text-xs">
                          <p className="font-bold text-sm text-foreground">{loc.itemName}</p>
                          <p className="font-mono text-muted-foreground text-[11px]">{loc.itemCode} | Ref: {loc.referenceNo}</p>
                          <p className="text-muted-foreground">Cabang: <strong>{loc.branchName}</strong></p>
                          <p className="text-muted-foreground">Kuantitas Titik: <strong>{loc.allocationQuantity} unit</strong></p>
                          <p className="font-mono text-[10px] text-emerald-600">
                            GPS: {lat.toFixed(6)}, {lon.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 5. DETAIL MATERIAL JOURNEY MODAL WITH RICH ANIMATIONS ─ */}
      {/* ────────────────────────────────────────────────────────── */}
      <Dialog open={selectedTrackingUuid !== null} onOpenChange={(o) => !o && setSelectedTrackingUuid(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0 border-2 border-primary/20 shadow-2xl bg-card">
          <AnimatePresence mode="wait">
            {selectedTrackingUuid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col h-full max-h-[88vh]"
              >
                {/* Modal Header */}
                <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
                        Perjalanan Material (Material Journey)
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground">
                        Pelacakan siklus hidup material dari gudang hingga titik pasang terverifikasi.
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                {/* Modal Body with Scroll */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1">
                  {isDetailLoading ? (
                    <div className="py-14 text-center space-y-3">
                      <Skeleton className="h-20 w-full rounded-xl" />
                      <Skeleton className="h-40 w-full rounded-xl" />
                    </div>
                  ) : detailData ? (
                    <>
                      {/* Material Overview Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-muted/40 to-muted/20 border border-primary/20 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-base text-foreground">
                              {detailData.transactionItem?.itemName ?? detailData.item?.itemName ?? "Material Pipa/Valve"}
                            </h3>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              Kode: {detailData.transactionItem?.itemCode ?? detailData.item?.itemCode ?? "—"}
                            </p>
                          </div>
                          {getStatusBadge(detailData.tracking?.status || "")}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs">
                          <div>
                            <span className="text-[11px] text-muted-foreground block">No. Referensi:</span>
                            <strong className="font-mono text-foreground text-xs">
                              {detailData.transactionItem?.referenceNo ?? detailData.item?.referenceNo ?? "—"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Total Keluar:</span>
                            <strong className="text-foreground text-xs">
                              {detailData.transactionItem?.quantity ?? detailData.summary?.totalQuantity ?? "—"} unit
                            </strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Gudang Asal:</span>
                            <strong className="text-foreground text-xs">
                              {detailData.transactionItem?.warehouseName ?? "Gudang Pusat"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Cabang Tujuan:</span>
                            <strong className="text-foreground text-xs">
                              {detailData.branch?.name ?? "Cabang PDAM"}
                            </strong>
                          </div>
                        </div>
                      </motion.div>

                      {/* Modal Internal Tabs */}
                      <Tabs value={detailModalTab} onValueChange={(v) => setDetailModalTab(v as any)}>
                        <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 text-xs">
                          <TabsTrigger value="timeline">Alur Lifecycle</TabsTrigger>
                          <TabsTrigger value="allocations">
                            Titik Alokasi ({detailData.allocations?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="events">Audit Log ({detailData.events?.length || 0})</TabsTrigger>
                        </TabsList>

                        {/* ─── TAB 1: ANIMATED TIMELINE ─── */}
                        <TabsContent value="timeline" className="pt-3 space-y-4">
                          <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                            {STEPS.map((step, idx) => {
                              const currentIdx = getStepIndex(detailData.tracking?.status || "");
                              const isDone = idx < currentIdx;
                              const isCurrent = idx === currentIdx;

                              return (
                                <motion.div
                                  key={step.key}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.07 }}
                                  className="relative"
                                >
                                  {/* Step Circle with Animated Glow for Current Step */}
                                  <div
                                    className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isDone
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                        : isCurrent
                                        ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-4 ring-primary/20 animate-pulse"
                                        : "bg-background border-muted-foreground/30 text-muted-foreground/30"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : isCurrent ? (
                                      <span className="w-2 h-2 rounded-full bg-white" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                    )}
                                  </div>

                                  {/* Step Details */}
                                  <div className="p-3 rounded-lg border bg-card/60 shadow-xs hover:border-primary/40 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <p className={`text-sm font-semibold ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                                        {step.label}
                                      </p>
                                      {isDone && <span className="text-[10px] text-emerald-600 font-medium">Selesai</span>}
                                      {isCurrent && <Badge className="text-[10px] bg-primary text-primary-foreground">Tahap Saat Ini</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </TabsContent>

                        {/* ─── TAB 2: TITIK ALOKASI & EVIDENCE ─── */}
                        <TabsContent value="allocations" className="pt-3 space-y-3">
                          {!detailData.allocations || detailData.allocations.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                              Belum ada alokasi titik fisik yang dibuat untuk material ini.
                            </div>
                          ) : (
                            detailData.allocations.map((alloc: any, i: number) => {
                              const evidence = alloc.evidence?.[0];
                              const isVerified = alloc.status === "VERIFIED";

                              return (
                                <motion.div
                                  key={alloc.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                        #{i + 1}
                                      </span>
                                      <h4 className="font-semibold text-sm text-foreground">
                                        Alokasi Titik #{i + 1} ({alloc.quantity} unit)
                                      </h4>
                                    </div>
                                    <Badge
                                      variant={isVerified ? "default" : "secondary"}
                                      className={isVerified ? "bg-emerald-600 text-white text-[11px]" : "text-[11px]"}
                                    >
                                      {isVerified ? "TERVERIFIKASI" : alloc.status || "MENUNGGU FOTO"}
                                    </Badge>
                                  </div>

                                  {/* Coordinates */}
                                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2 rounded-lg bg-background/80 border">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Titik Rencana:</span>
                                      {alloc.plannedLatitude
                                        ? `${alloc.plannedLatitude}, ${alloc.plannedLongitude}`
                                        : "—"}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Titik Realisasi (GPS):</span>
                                      {evidence?.latitude
                                        ? `${evidence.latitude}, ${evidence.longitude}`
                                        : "Belum Diambil"}
                                    </div>
                                  </div>

                                  {/* Photo Evidence Preview if available */}
                                  {evidence?.photoUrl && (
                                    <div className="pt-1">
                                      <p className="text-[11px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                                        <Camera className="w-3.5 h-3.5 text-primary" /> Foto Bukti Ber-Watermark:
                                      </p>
                                      <div className="relative aspect-video max-h-40 rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                                        <img
                                          src={evidence.photoUrl}
                                          alt="Bukti Pemasangan"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                        </TabsContent>

                        {/* ─── TAB 3: AUDIT EVENTS ─── */}
                        <TabsContent value="events" className="pt-3 space-y-2">
                          {!detailData.events || detailData.events.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                              Belum ada catatan log kejadian.
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                              {detailData.events.map((evt: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-muted/40 border text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold text-foreground">{evt.eventType}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Waktu: {new Date(evt.eventTime).toLocaleString("id-ID")}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="font-mono text-[10px]">
                                    User #{evt.userId || "System"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTrackingUuid(null)}>
                    Tutup
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    onClick={() => {
                      setSelectedTrackingUuid(null);
                      setLocation("/cabang/pemasangan");
                    }}
                  >
                    Ke Menu Pemasangan <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
