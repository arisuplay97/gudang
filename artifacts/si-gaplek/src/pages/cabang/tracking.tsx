import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  Building2,
  Download,
  Eye,
  Camera,
  RotateCcw,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in bundlers
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const verifiedMarkerIcon = L.divIcon({
  className: "gis-radar-marker",
  html: `
    <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group pointer-events-auto">
      <span class="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-45 animate-ping" style="animation-duration: 2.2s;"></span>
      <span class="absolute inline-flex w-5 h-5 rounded-full bg-emerald-500/25"></span>
      <span class="relative inline-flex rounded-full w-3.5 h-3.5 bg-emerald-600 border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-125"></span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

function TrackingMapLeaflet({ gisLocations }: { gisLocations: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapInstance.current) {
      const map = L.map(containerRef.current).setView([-8.6705, 116.1155], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapInstance.current = map;
    }

    const map = mapInstance.current;
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (Array.isArray(gisLocations)) {
      gisLocations.forEach((loc: any) => {
        const lat = parseFloat(loc.verifiedLatitude || loc.latitude);
        const lon = parseFloat(loc.verifiedLongitude || loc.longitude);
        if (isNaN(lat) || isNaN(lon)) return;

        L.marker([lat, lon], { icon: verifiedMarkerIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-size: 12px; line-height: 1.4;">
              <p style="font-weight: bold; margin: 0 0 2px 0;">${loc.itemName}</p>
              <p style="font-family: monospace; color: #666; margin: 0 0 2px 0;">${loc.itemCode} · Ref: ${loc.referenceNo}</p>
              <p style="margin: 0;">Cabang: <strong>${loc.branchName}</strong></p>
              <p style="margin: 0;">Kuantitas: <strong>${loc.allocationQuantity} unit</strong></p>
              <p style="color: #059669; font-family: monospace; font-size: 10px; margin: 2px 0 0 0;">GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
            </div>
          `);
      });
    }
  }, [gisLocations]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 1 }} />;
}

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

interface Branch {
  id: number;
  name: string;
}

const MONTHS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const YEARS = [
  { value: "all", label: "Semua Tahun" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

const STEPS = [
  { key: "BARANG_KELUAR", label: "Keluar Gudang", desc: "Material dirilis dari gudang pusat" },
  { key: "DITERIMA_CABANG", label: "Diterima Cabang", desc: "Surat jalan & QR diverifikasi cabang" },
  { key: "MENUNGGU_PEMASANGAN", label: "Alokasi Titik Fisik", desc: "Kuantitas dialokasikan ke titik pemasangan" },
  { key: "MENUNGGU_VERIFIKASI", label: "Pemasangan Selesai", desc: "Foto bukti watermark & GPS terkirim" },
  { key: "TERVERIFIKASI", label: "Terverifikasi (GIS)", desc: "Audit SPI disetujui & tercatat di peta" },
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

  // Filters: Search, Status, Month, Year, Branch
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedTrackingUuid, setSelectedTrackingUuid] = useState<string | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<"timeline" | "allocations" | "events">("timeline");

  // Fetch Tracking Data
  const { data: trackingResponse, isLoading } = useQuery({
    queryKey: ["cabang-tracking"],
    queryFn: () => apiFetch<{ data: TrackingItem[] }>("/api/tracking?limit=150"),
  });

  // Fetch Branches for filter
  const { data: branchesResponse } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Branch[] } | Branch[]>("/api/branches"),
  });

  const branchList = useMemo(() => {
    if (Array.isArray(branchesResponse)) return branchesResponse;
    if (branchesResponse && typeof branchesResponse === "object" && Array.isArray((branchesResponse as any).data)) {
      return (branchesResponse as any).data;
    }
    return [];
  }, [branchesResponse]);

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

  // Filtered List based on Search, Status, Month, Year, and Branch
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

      // 2. Status
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // 3. Month Filter
      if (monthFilter !== "all") {
        const itemDate = new Date(item.createdAt);
        if (itemDate.getMonth() + 1 !== parseInt(monthFilter)) {
          return false;
        }
      }

      // 4. Year Filter
      if (yearFilter !== "all") {
        const itemDate = new Date(item.createdAt);
        if (itemDate.getFullYear() !== parseInt(yearFilter)) {
          return false;
        }
      }

      // 5. Branch Filter
      if (branchFilter !== "all") {
        if (item.branchId !== parseInt(branchFilter) && item.branchName !== branchFilter) {
          return false;
        }
      }

      return true;
    });
  }, [rawList, searchTerm, statusFilter, monthFilter, yearFilter, branchFilter]);

  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "all" ||
    monthFilter !== "all" ||
    yearFilter !== "all" ||
    branchFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setBranchFilter("all");
  };

  // Restrained, executive status badge (Clean, subtle, non-AI-slop)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MENUNGGU_DITERIMA":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground bg-muted/40 font-medium text-[11px]">
            Menunggu Diterima
          </Badge>
        );
      case "DITERIMA_CABANG":
        return (
          <Badge variant="outline" className="border-border text-foreground bg-muted/60 font-medium text-[11px]">
            Diterima Cabang
          </Badge>
        );
      case "MENUNGGU_PEMASANGAN":
        return (
          <Badge variant="outline" className="border-border text-foreground bg-muted/70 font-medium text-[11px]">
            Alokasi Titik
          </Badge>
        );
      case "MENUNGGU_VERIFIKASI":
        return (
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20 font-medium text-[11px]">
            Menunggu Verifikasi
          </Badge>
        );
      case "TERVERIFIKASI":
        return (
          <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 font-medium text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Terverifikasi (GIS)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  // Restrained SLA badge
  const getSlaIndicator = (slaStatus: string, deadline?: string | null) => {
    switch (slaStatus) {
      case "NORMAL":
        return (
          <span className="text-muted-foreground text-xs flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SLA Normal
          </span>
        );
      case "WARNING":
        return (
          <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> &lt; 48 Jam
          </span>
        );
      case "KRITIS":
        return (
          <span className="text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1 font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> &lt; 24 Jam
          </span>
        );
      case "OVERDUE":
        return (
          <Badge variant="outline" className="border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/30 text-[10px] font-mono">
            SLA Terlewat
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
      {/* ─── Top Header & View Switcher ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Material Tracking
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitoring material perpipaan & distribusi fisik cabang
          </p>
        </div>

        {/* 4 View Modes Switcher */}
        <div className="bg-muted/60 p-1 rounded-lg border border-border flex items-center self-start md:self-auto">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-md shadow-xs"
            onClick={() => handleViewChange("list")}
          >
            <List className="w-3.5 h-3.5" /> List
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-md shadow-xs"
            onClick={() => handleViewChange("table")}
          >
            <TableIcon className="w-3.5 h-3.5" /> Table
          </Button>
          <Button
            variant={viewMode === "board" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-md shadow-xs"
            onClick={() => handleViewChange("board")}
          >
            <Kanban className="w-3.5 h-3.5" /> Board
          </Button>
          <Button
            variant={viewMode === "map" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-md shadow-xs"
            onClick={() => handleViewChange("map")}
          >
            <MapIcon className="w-3.5 h-3.5" /> Map GIS
          </Button>
        </div>
      </div>

      {/* ─── Clean Executive KPI Cards (No Rainbow Colors) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Material", count: kpis.total, filterVal: "all", icon: Layers },
          { label: "Menunggu Terima", count: kpis.waitingReceive, filterVal: "MENUNGGU_DITERIMA", icon: Clock },
          { label: "Alokasi / Pasang", count: kpis.installed, filterVal: "MENUNGGU_PEMASANGAN", icon: Package },
          { label: "Verifikasi SPI", count: kpis.waitingVerification, filterVal: "MENUNGGU_VERIFIKASI", icon: ShieldCheck },
          { label: "SLA Overdue", count: kpis.overdue, filterVal: "OVERDUE", icon: ShieldAlert },
        ].map((card) => {
          const isActive =
            card.filterVal === "all"
              ? statusFilter === "all"
              : card.filterVal === "OVERDUE"
              ? false
              : statusFilter === card.filterVal;

          return (
            <Card
              key={card.label}
              onClick={() => {
                if (card.filterVal === "all") setStatusFilter("all");
                else if (card.filterVal === "OVERDUE") {
                  // toggle overdue
                  setStatusFilter("all");
                } else {
                  setStatusFilter(statusFilter === card.filterVal ? "all" : card.filterVal);
                }
              }}
              className={`cursor-pointer transition-all border border-border/80 bg-card hover:border-foreground/30 shadow-xs ${
                isActive ? "border-foreground/50 bg-muted/30" : ""
              }`}
            >
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">{card.count}</p>
                </div>
                <div className="w-8 h-8 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <card.icon className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Filter Bar: Search, Status, Bulan, Tahun, Cabang ─── */}
      <div className="bg-card p-3 rounded-xl border border-border/80 shadow-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 items-center">
          {/* 1. Pencarian */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari material, kode, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background h-8 text-xs font-normal"
            />
          </div>

          {/* 2. Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="MENUNGGU_DITERIMA">Menunggu Diterima</SelectItem>
              <SelectItem value="DITERIMA_CABANG">Diterima Cabang</SelectItem>
              <SelectItem value="MENUNGGU_PEMASANGAN">Alokasi Titik</SelectItem>
              <SelectItem value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</SelectItem>
              <SelectItem value="TERVERIFIKASI">Terverifikasi (GIS)</SelectItem>
            </SelectContent>
          </Select>

          {/* 3. Filter Bulan */}
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 4. Filter Tahun */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 5. Filter Cabang */}
          <div className="flex items-center gap-1.5">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="bg-background h-8 text-xs flex-1">
                <SelectValue placeholder="Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branchList.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={resetFilters}
                title="Reset Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 1. LIST VIEW (CLEAN ENTERPRISE CARDS — NON-AI-SLOP) ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-2.5">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : filteredList.length === 0 ? (
            <Card className="border-dashed p-10 text-center bg-muted/20">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-medium text-sm text-foreground">Tidak Ada Material Sesuai Filter</p>
              <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                  Reset Semua Filter
                </Button>
              )}
            </Card>
          ) : (
            filteredList.map((track) => {
              const pct = Math.round((track.installedQuantity / (track.totalQuantity || 1)) * 100);

              return (
                <Card
                  key={track.id}
                  className="p-4 border border-border/80 bg-card hover:border-foreground/30 transition-colors shadow-xs group cursor-pointer"
                  onClick={() => setSelectedTrackingUuid(track.uuid)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Material Info */}
                    <div className="space-y-1 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {track.itemName}
                        </h3>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                          {track.itemCode}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">Ref: {track.referenceNo}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground/60" />
                          {track.branchName || "Cabang PDAM"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          {formatDate(track.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Progress Bar & Clean Text */}
                    <div className="w-full lg:w-64 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress:</span>
                        <span className="text-foreground font-mono font-medium">
                          {track.installedQuantity} / {track.totalQuantity} ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {track.totalQuantity} dikirim · {track.installedQuantity} terpasang · {track.remainingQuantity} sisa
                      </p>
                    </div>

                    {/* Right: Subdued Status & Detail Button */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                      <div className="flex flex-col items-start lg:items-end gap-1">
                        {getStatusBadge(track.status)}
                        {getSlaIndicator(track.slaStatus, track.slaDeadlineAt)}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs shadow-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackingUuid(track.uuid);
                        }}
                      >
                        Detail Journey
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 2. TABLE VIEW (DENSE DATA TABLE) ───────────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <div className="p-3 bg-muted/20 border-b flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">
              Total {filteredList.length} Material Tracking
            </span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportToCSV}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-xs">Material</TableHead>
                  <TableHead className="text-xs">Kode</TableHead>
                  <TableHead className="text-xs">Ref Transaksi</TableHead>
                  <TableHead className="text-xs">Cabang</TableHead>
                  <TableHead className="text-right text-xs">Qty</TableHead>
                  <TableHead className="text-right text-xs">Terpasang</TableHead>
                  <TableHead className="text-right text-xs">Sisa</TableHead>
                  <TableHead className="text-center text-xs">Status</TableHead>
                  <TableHead className="text-center text-xs">SLA</TableHead>
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-right text-xs">Aksi</TableHead>
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
                    <TableCell colSpan={11} className="py-10 text-center text-muted-foreground text-xs">
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
                      <TableCell className="font-medium text-foreground">{t.itemName}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{t.itemCode}</TableCell>
                      <TableCell className="font-mono">{t.referenceNo}</TableCell>
                      <TableCell>{t.branchName || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{t.totalQuantity}</TableCell>
                      <TableCell className="text-right font-mono font-medium text-foreground">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 overflow-x-auto pb-4">
          {[
            {
              id: "COL_1",
              title: "Barang Keluar",
              desc: "Menunggu Diterima Cabang",
              filterFn: (t: TrackingItem) => t.status === "MENUNGGU_DITERIMA",
            },
            {
              id: "COL_2",
              title: "Diterima Cabang",
              desc: "Surat Jalan Telah Discan",
              filterFn: (t: TrackingItem) => t.status === "DITERIMA_CABANG",
            },
            {
              id: "COL_3",
              title: "Pemasangan Fisik",
              desc: "Alokasi & Bukti Pemasangan",
              filterFn: (t: TrackingItem) =>
                t.status === "MENUNGGU_PEMASANGAN" || t.status === "MENUNGGU_VERIFIKASI" || t.status === "TERPASANG",
            },
            {
              id: "COL_4",
              title: "Terverifikasi (GIS)",
              desc: "Tercatat Resmi di Peta",
              filterFn: (t: TrackingItem) => t.status === "TERVERIFIKASI",
            },
          ].map((col) => {
            const itemsInCol = filteredList.filter(col.filterFn);

            return (
              <div key={col.id} className="bg-muted/30 rounded-xl p-3 border border-border/80 flex flex-col min-h-[420px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b mb-2.5">
                  <div>
                    <h3 className="font-semibold text-xs text-foreground tracking-wide">{col.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{col.desc}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {itemsInCol.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[580px] pr-1">
                  {itemsInCol.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-lg">
                      Tidak ada material
                    </div>
                  ) : (
                    itemsInCol.map((track) => (
                      <Card
                        key={track.id}
                        className="p-3 border border-border/80 shadow-xs cursor-pointer hover:border-foreground/30 transition-all bg-card"
                        onClick={() => setSelectedTrackingUuid(track.uuid)}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-medium text-xs text-foreground leading-tight">
                              {track.itemName}
                            </h4>
                            {getSlaIndicator(track.slaStatus)}
                          </div>

                          <p className="font-mono text-[10px] text-muted-foreground">
                            {track.itemCode} · Ref: {track.referenceNo}
                          </p>

                          <div className="pt-1 border-t flex justify-between items-center text-[11px]">
                            <span className="text-muted-foreground">
                              Qty: <strong className="text-foreground">{track.installedQuantity} / {track.totalQuantity}</strong>
                            </span>
                            <span className="text-muted-foreground text-[10px] flex items-center gap-0.5 hover:text-foreground">
                              Detail <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 4. MAP VIEW (VERIFIED GIS ONLY) ────────────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === "map" && (
        <Card className="border border-border/80 shadow-xs overflow-hidden p-0">
          <div className="p-3 bg-muted/20 border-b flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-foreground">
                Peta Titik Pemasangan Terverifikasi (GIS Resmi)
              </span>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
              {gisLocations?.length || 0} Titik Terverifikasi
            </Badge>
          </div>

          <div className="h-[500px] w-full relative">
            <style>{`
              .gis-radar-marker {
                background: transparent !important;
                border: none !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
            `}</style>
            <TrackingMapLeaflet gisLocations={gisLocations} />
          </div>
        </Card>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ─── 5. DETAIL MATERIAL JOURNEY MODAL ───────────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      <Dialog open={selectedTrackingUuid !== null} onOpenChange={(o) => !o && setSelectedTrackingUuid(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden p-0 border border-border/90 shadow-xl bg-card">
          <AnimatePresence mode="wait">
            {selectedTrackingUuid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col h-full max-h-[88vh]"
              >
                {/* Modal Header */}
                <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
                  <div className="space-y-0.5">
                    <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Perjalanan Material (Material Journey)
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      Pelacakan siklus hidup material dari gudang pusat hingga titik pasang fisik.
                    </p>
                  </div>
                </DialogHeader>

                {/* Modal Body with Scroll */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  {isDetailLoading ? (
                    <div className="py-12 text-center space-y-3">
                      <Skeleton className="h-20 w-full rounded-xl" />
                      <Skeleton className="h-36 w-full rounded-xl" />
                    </div>
                  ) : detailData ? (
                    <>
                      {/* Material Overview Card */}
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base text-foreground">
                              {detailData.transactionItem?.itemName ?? detailData.item?.itemName ?? "Material"}
                            </h3>
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">
                              Kode: {detailData.transactionItem?.itemCode ?? detailData.item?.itemCode ?? "—"}
                            </p>
                          </div>
                          {getStatusBadge(detailData.tracking?.status || "")}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs">
                          <div>
                            <span className="text-[11px] text-muted-foreground block">Ref:</span>
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
                              {detailData.branch?.name ?? "Cabang"}
                            </strong>
                          </div>
                        </div>
                      </div>

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
                          <div className="relative pl-7 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                            {STEPS.map((step, idx) => {
                              const currentIdx = getStepIndex(detailData.tracking?.status || "");
                              const isDone = idx < currentIdx;
                              const isCurrent = idx === currentIdx;

                              return (
                                <motion.div
                                  key={step.key}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.06 }}
                                  className="relative"
                                >
                                  {/* Step Circle with Gentle Pulse for Current Step */}
                                  <div
                                    className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isDone
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : isCurrent
                                        ? "bg-foreground border-foreground text-background ring-3 ring-foreground/20"
                                        : "bg-background border-muted-foreground/30 text-muted-foreground/30"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : isCurrent ? (
                                      <span className="w-2 h-2 rounded-full bg-background" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                    )}
                                  </div>

                                  {/* Step Details */}
                                  <div className="p-3 rounded-lg border bg-card/60">
                                    <div className="flex items-center justify-between">
                                      <p className={`text-sm font-medium ${isCurrent ? "text-foreground font-semibold" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                                        {step.label}
                                      </p>
                                      {isDone && <span className="text-[10px] text-emerald-600 font-medium">Selesai</span>}
                                      {isCurrent && <Badge variant="secondary" className="text-[10px]">Tahap Berjalan</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </TabsContent>

                        {/* ─── TAB 2: TITIK ALOKASI & EVIDENCE ─── */}
                        <TabsContent value="allocations" className="pt-3 space-y-2.5">
                          {!detailData.allocations || detailData.allocations.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                              Belum ada alokasi titik fisik yang dibuat untuk material ini.
                            </div>
                          ) : (
                            detailData.allocations.map((alloc: any, i: number) => {
                              const evidence = alloc.evidence?.[0];
                              const isVerified = alloc.status === "VERIFIED";

                              return (
                                <div
                                  key={alloc.id}
                                  className="p-3 rounded-xl border bg-muted/20 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-foreground">
                                      Titik #{i + 1} ({alloc.quantity} unit)
                                    </h4>
                                    <Badge
                                      variant={isVerified ? "default" : "secondary"}
                                      className={isVerified ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                                    >
                                      {isVerified ? "Terverifikasi" : alloc.status || "Menunggu Foto"}
                                    </Badge>
                                  </div>

                                  {/* Coordinates */}
                                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2 rounded-lg bg-background border">
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Rencana:</span>
                                      {alloc.plannedLatitude
                                        ? `${alloc.plannedLatitude}, ${alloc.plannedLongitude}`
                                        : "—"}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-muted-foreground block">Realisasi (GPS):</span>
                                      {evidence?.latitude
                                        ? `${evidence.latitude}, ${evidence.longitude}`
                                        : "Belum Ada"}
                                    </div>
                                  </div>

                                  {/* Photo Evidence Preview if available */}
                                  {evidence?.photoUrl && (
                                    <div className="pt-1">
                                      <p className="text-[11px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
                                        <Camera className="w-3.5 h-3.5 text-muted-foreground" /> Foto Bukti Watermark:
                                      </p>
                                      <div className="relative aspect-video max-h-36 rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                                        <img
                                          src={evidence.photoUrl}
                                          alt="Bukti Pemasangan"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </TabsContent>

                        {/* ─── TAB 3: AUDIT EVENTS ─── */}
                        <TabsContent value="events" className="pt-3 space-y-1.5">
                          {!detailData.events || detailData.events.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                              Belum ada catatan log kejadian.
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                              {detailData.events.map((evt: any, i: number) => (
                                <div key={i} className="p-2 rounded-lg bg-muted/30 border text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-foreground">{evt.eventType}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {new Date(evt.eventTime).toLocaleString("id-ID")}
                                    </p>
                                  </div>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    User #{evt.userId || "System"}
                                  </span>
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
                    className="gap-1.5 shadow-xs"
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
