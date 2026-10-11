import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  Search,
  Copy,
  Check,
  MapPin,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Boxes,
  Layers,
  Building2,
  Calendar,
  X,
  Map as MapIcon,
  Phone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface TrackingItem {
  id: number;
  uuid: string;
  status: string;
  branchId: number;
  branchName?: string | null;
  itemName: string;
  itemCode: string;
  referenceNo: string;
  quantity: number;
  totalQuantity: number;
  installedQuantity: number;
  remainingQuantity: number;
  slaStatus: string;
  slaStartAt: string | null;
  slaDeadlineAt: string | null;
  receivedAt: string | null;
  installedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface MobileTrackingViewProps {
  items: TrackingItem[];
  isLoading: boolean;
}

export function MobileTrackingView({ items, isLoading }: MobileTrackingViewProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Selected item for detail view (ala Image 1 left screen)
  const [selectedItem, setSelectedItem] = useState<TrackingItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gisModalOpen, setGisModalOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Branch lockdown: CABANG only sees their own branch
  const branchFilteredItems = useMemo(() => {
    return items.filter((item) => {
      if (user?.role === "CABANG") {
        if (user.branchId && item.branchId && item.branchId !== user.branchId) return false;
        if (user.branchName && item.branchName && !item.branchName.toLowerCase().includes(user.branchName.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, user]);

  // Filter by status & search
  const filteredItems = useMemo(() => {
    return branchFilteredItems.filter((item) => {
      if (filterStatus === "in_transit" && (item.status === "TERVERIFIKASI" || item.status === "DITERIMA_CABANG")) return false;
      if (filterStatus === "delivered" && item.status !== "DITERIMA_CABANG" && item.status !== "TERVERIFIKASI") return false;
      if (filterStatus === "delayed" && item.slaStatus !== "BREACHED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ref = (item.referenceNo || "").toLowerCase();
        const name = (item.itemName || "").toLowerCase();
        const code = (item.itemCode || "").toLowerCase();
        if (!ref.includes(q) && !name.includes(q) && !code.includes(q)) return false;
      }

      return true;
    });
  }, [branchFilteredItems, filterStatus, searchQuery]);

  // Helper for status badge formatting (ala Image 1 pills)
  const getStatusBadge = (status: string, slaStatus?: string) => {
    if (slaStatus === "BREACHED") {
      return {
        label: "Tertunda",
        color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
        dotColor: "bg-rose-500",
      };
    }
    switch (status) {
      case "BARANG_KELUAR":
        return {
          label: "Dalam Perjalanan",
          color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
          dotColor: "bg-blue-500",
        };
      case "DITERIMA_CABANG":
        return {
          label: "Tiba di Cabang",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          dotColor: "bg-emerald-500",
        };
      case "MENUNGGU_PEMASANGAN":
        return {
          label: "Antre Pasang",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
          dotColor: "bg-amber-500",
        };
      case "MENUNGGU_VERIFIKASI":
        return {
          label: "Verifikasi SPI",
          color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
          dotColor: "bg-purple-500",
        };
      case "TERVERIFIKASI":
        return {
          label: "Selesai (GIS)",
          color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          dotColor: "bg-emerald-500",
        };
      default:
        return {
          label: "Diproses",
          color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25",
          dotColor: "bg-slate-500",
        };
    }
  };

  // If Detail View is open (ala Image 1 left screen)
  if (selectedItem) {
    const badge = getStatusBadge(selectedItem.status, selectedItem.slaStatus);
    const isReceived = Boolean(selectedItem.receivedAt || selectedItem.status !== "BARANG_KELUAR");
    const isInstalled = Boolean(selectedItem.installedAt || selectedItem.status === "MENUNGGU_VERIFIKASI" || selectedItem.status === "TERVERIFIKASI");
    const isVerified = selectedItem.status === "TERVERIFIKASI";

    return (
      <div className="space-y-4 px-4 pt-2 pb-10">
        {/* Top Bar Navigation (ala Image 1) */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedItem(null)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0 px-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              No. Pelacakan
            </p>
            <p className="font-mono text-sm font-bold text-foreground truncate">
              #{selectedItem.referenceNo}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(selectedItem.referenceNo)}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
            title="Salin No. SPK"
          >
            {copiedId === selectedItem.referenceNo ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Action Buttons (ala Image 1: Reschedule / Change Recipient) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setGisModalOpen(true)}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-xs font-semibold text-foreground"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            Peta Titik GIS
          </button>

          <button
            onClick={() => navigate(`/cabang/receive?shipment=${selectedItem.referenceNo}`)}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/40 active:scale-95 transition-all text-xs font-semibold text-foreground"
          >
            <Truck className="w-4 h-4 text-blue-500" />
            Terima Barang
          </button>
        </div>

        {/* Shipment Overview Card (ala Image 1 FedEx card) */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold">
              💧
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-foreground truncate">
                  #{selectedItem.referenceNo}
                </span>
                <button
                  onClick={() => copyToClipboard(selectedItem.referenceNo)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copiedId === selectedItem.referenceNo ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {selectedItem.itemName} ({selectedItem.totalQuantity || selectedItem.quantity} unit)
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Route / Alur Perjalanan Timeline (ala Image 1 Vertical Route) */}
        <div className="p-5 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Alur Pengiriman (Route)
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              Cabang: {selectedItem.branchName || "Cabang Praya"}
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {/* Step 1: SPK Created */}
            <div className="relative">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Surat Jalan Diterbitkan</p>
                <p className="text-[11px] text-muted-foreground">
                  Gudang Pusat Perumdam • {selectedItem.createdAt ? formatDate(selectedItem.createdAt) : "Terverifikasi"}
                </p>
              </div>
            </div>

            {/* Step 2: Preparing */}
            <div className="relative">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-xs">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Material Siap Dikirim</p>
                <p className="text-[11px] text-muted-foreground">
                  Alokasi {selectedItem.totalQuantity || selectedItem.quantity} unit aksesoris disiapkan armada
                </p>
              </div>
            </div>

            {/* Step 3: In Transit / Diterima */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-xs ${
                  isReceived
                    ? "bg-emerald-500 text-white"
                    : "bg-blue-500 text-white animate-pulse"
                }`}
              >
                {isReceived ? "✓" : "●"}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isReceived ? "Diterima di Cabang" : "Dalam Pengiriman ke Cabang"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedItem.receivedAt
                    ? `Diterima: ${formatDate(selectedItem.receivedAt)}`
                    : "Armada dalam perjalanan menuju gudang unit cabang"}
                </p>
              </div>
            </div>

            {/* Step 4: Installation */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-xs ${
                  isInstalled
                    ? "bg-emerald-500 text-white"
                    : isReceived
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isInstalled ? "✓" : "○"}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isInstalled ? "Pemasangan Fisik Selesai" : "Antre Pemasangan Lapangan"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedItem.installedAt
                    ? `Dipasang: ${formatDate(selectedItem.installedAt)}`
                    : "Teknisi siap memasang di titik pelanggan"}
                </p>
              </div>
            </div>

            {/* Step 5: Verified GIS */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-xs ${
                  isVerified
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isVerified ? "✓" : "○"}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isVerified ? "Terverifikasi Audit GIS" : "Verifikasi Akhir SPI"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedItem.verifiedAt
                    ? `Audit Selesai: ${formatDate(selectedItem.verifiedAt)}`
                    : "Menunggu validasi titik koordinat oleh SPI"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lightweight GIS Modal */}
        <LightweightGisMapDialog
          open={gisModalOpen}
          onClose={() => setGisModalOpen(false)}
          item={selectedItem}
        />
      </div>
    );
  }

  // ── List View (ala Image 1 right screen) ──
  return (
    <div className="space-y-4 px-4 pt-2 pb-10">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari no. resi, SPK, atau material..."
          className="pl-10 h-11 text-xs rounded-2xl bg-card border-border/80 shadow-xs font-sans"
        />
      </div>

      {/* Filter Chips (ala Image 1) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: "all", label: "Semua" },
          { id: "in_transit", label: "Dalam Perjalanan" },
          { id: "delivered", label: "Tiba di Cabang" },
          { id: "delayed", label: "Tertunda" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 text-xs ${
              filterStatus === f.id
                ? "bg-foreground text-background shadow-xs"
                : "bg-card border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items List (ala Image 1 cards) */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-card/60 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
          <Truck className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-xs font-bold text-foreground">Tidak Ada Kiriman</p>
          <p className="text-[11px] text-muted-foreground">
            Tidak ada pengiriman yang cocok dengan filter pelacakan saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const badge = getStatusBadge(item.status, item.slaStatus);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="p-4 rounded-3xl bg-card border border-border/80 shadow-xs space-y-2.5 hover:border-primary/50 active:scale-[0.99] transition-all cursor-pointer"
              >
                {/* Top Row: Status badge + Tracking Number + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                      {badge.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground truncate">
                      #{item.referenceNo}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>

                {/* Middle Row: Description */}
                <p className="text-xs text-foreground font-medium leading-snug line-clamp-2">
                  {item.itemName} ({item.totalQuantity || item.quantity} unit) • Menuju {item.branchName || "Cabang"}
                </p>

                {/* Bottom Row: Timestamp */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.createdAt ? formatDate(item.createdAt) : "Hari Ini"}
                  </span>
                  <span className="font-semibold text-primary text-[10px]">
                    Detail Alur & Peta →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Lightweight Leaflet GIS Map Dialog (Loads on Demand) ──
function LightweightGisMapDialog({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: TrackingItem | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);

  useEffect(() => {
    if (!open || !mapRef.current) return;

    // Small delay to allow dialog DOM layout to stabilize
    const timer = setTimeout(() => {
      if (!mapRef.current) return;
      if (!leafletInstance.current) {
        // Center on Praya, Lombok Tengah
        const map = L.map(mapRef.current).setView([-8.7063, 116.2704], 13);
        L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 19,
          attribution: "&copy; Google Maps",
        }).addTo(map);

        leafletInstance.current = map;
      }

      const map = leafletInstance.current;
      map.invalidateSize();

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });

      // Place a prominent verified installation pin
      const marker = L.marker([-8.7063, 116.2704])
        .addTo(map)
        .bindPopup(`
          <div style="font-size: 12px; line-height: 1.4; padding: 4px;">
            <p style="font-weight: bold; margin: 0 0 2px 0;">${item?.itemName || "Material"}</p>
            <p style="font-family: monospace; color: #666; margin: 0 0 2px 0;">SPK: #${item?.referenceNo}</p>
            <p style="margin: 0;">Cabang: <strong>${item?.branchName || "Cabang Praya"}</strong></p>
            <p style="color: #059669; font-weight: bold; margin: 2px 0 0 0;">📍 Titik Pemasangan Terverifikasi</p>
          </div>
        `)
        .openPopup();
    }, 200);

    return () => clearTimeout(timer);
  }, [open, item]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[94vw] p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-emerald-500" />
            Peta Titik Pasang GIS #{item?.referenceNo}
          </DialogTitle>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-border relative bg-muted">
            <div ref={mapRef} style={{ height: "100%", width: "100%", zIndex: 1 }} />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Koordinat: Lombok Tengah (-8.706300, 116.270400)</span>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
              Unit Terpasang
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
