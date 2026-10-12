import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
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
  Navigation,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group">
      <span class="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-40 animate-ping" style="animation-duration: 2.2s;"></span>
      <span class="relative inline-flex rounded-full w-4 h-4 bg-emerald-600 border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-125"></span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

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

  // URL Query view mode support (?view=map)
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const initialView = searchParams.get("view") === "map" ? "map" : "list";

  const [activeTab, setActiveTab] = useState<"list" | "map">(initialView);
  const [selectedItem, setSelectedItem] = useState<TrackingItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gisModalOpen, setGisModalOpen] = useState(false);

  // Fetch verified GIS locations from API for map view
  const { data: gisLocationsData, isLoading: isGisLoading, refetch: refetchGis } = useQuery<any[]>({
    queryKey: ["gis-material-locations-mobile"],
    queryFn: () => apiFetch<any[]>("/api/gis/material-locations"),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Branch lockdown: CABANG only sees their own branch shipments
  const branchFilteredItems = useMemo(() => {
    return items.filter((item) => {
      if (user?.role === "CABANG") {
        if (user.branchId && item.branchId && item.branchId !== user.branchId) return false;
        if (
          user.branchName &&
          item.branchName &&
          !item.branchName.toLowerCase().includes(user.branchName.toLowerCase())
        )
          return false;
      }
      return true;
    });
  }, [items, user]);

  // Branch lockdown: CABANG only sees verified GIS locations of their branch
  const branchGisLocations = useMemo(() => {
    if (!Array.isArray(gisLocationsData)) return [];
    return gisLocationsData.filter((loc) => {
      if (user?.role === "CABANG") {
        if (user.branchId && loc.branchId && loc.branchId !== user.branchId) return false;
        if (
          user.branchName &&
          loc.branchName &&
          !loc.branchName.toLowerCase().includes(user.branchName.toLowerCase())
        )
          return false;
      }
      return true;
    });
  }, [gisLocationsData, user]);

  // Filter items by status & search
  const filteredItems = useMemo(() => {
    return branchFilteredItems.filter((item) => {
      if (
        filterStatus === "in_transit" &&
        (item.status === "TERVERIFIKASI" || item.status === "DITERIMA_CABANG")
      )
        return false;
      if (
        filterStatus === "delivered" &&
        item.status !== "DITERIMA_CABANG" &&
        item.status !== "TERVERIFIKASI"
      )
        return false;
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

  // Helper for status badge formatting
  const getStatusBadge = (status: string, slaStatus?: string) => {
    if (slaStatus === "BREACHED") {
      return {
        label: "Tertunda",
        color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/80",
        dotColor: "bg-rose-500",
      };
    }
    switch (status) {
      case "BARANG_KELUAR":
        return {
          label: "Dalam Perjalanan",
          color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/80",
          dotColor: "bg-blue-500",
        };
      case "DITERIMA_CABANG":
        return {
          label: "Tiba di Cabang",
          color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80",
          dotColor: "bg-emerald-500",
        };
      case "MENUNGGU_PEMASANGAN":
        return {
          label: "Antre Pasang",
          color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80",
          dotColor: "bg-amber-500",
        };
      case "MENUNGGU_VERIFIKASI":
        return {
          label: "Verifikasi SPI",
          color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/80",
          dotColor: "bg-purple-500",
        };
      case "TERVERIFIKASI":
        return {
          label: "Selesai (GIS)",
          color: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
          dotColor: "bg-emerald-600",
        };
      default:
        return {
          label: "Diproses",
          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
          dotColor: "bg-slate-500",
        };
    }
  };

  // If Detail View is open
  if (selectedItem) {
    const badge = getStatusBadge(selectedItem.status, selectedItem.slaStatus);
    const isReceived = Boolean(selectedItem.receivedAt || selectedItem.status !== "BARANG_KELUAR");
    const isInstalled = Boolean(
      selectedItem.installedAt ||
        selectedItem.status === "MENUNGGU_VERIFIKASI" ||
        selectedItem.status === "TERVERIFIKASI"
    );
    const isVerified = selectedItem.status === "TERVERIFIKASI";

    return (
      <div className="space-y-4 px-4 pt-2 pb-10">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedItem(null)}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-0 px-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              No. Surat Jalan
            </p>
            <p className="font-mono text-sm font-extrabold text-slate-900 dark:text-white truncate">
              #{selectedItem.referenceNo}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(selectedItem.referenceNo)}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
            title="Salin No. SPK"
          >
            {copiedId === selectedItem.referenceNo ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setGisModalOpen(true)}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-emerald-400 active:scale-95 transition-all text-xs font-bold text-slate-800 dark:text-slate-100"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            Peta Titik GIS
          </button>

          <button
            onClick={() => navigate(`/cabang/receive?shipment=${selectedItem.referenceNo}`)}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-blue-400 active:scale-95 transition-all text-xs font-bold text-slate-800 dark:text-slate-100"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            Terima Barang
          </button>
        </div>

        {/* Shipment Overview Card (No Water Drops, Clean Icons) */}
        <div className="p-4.5 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  #{selectedItem.referenceNo}
                </span>
                <button
                  onClick={() => copyToClipboard(selectedItem.referenceNo)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {copiedId === selectedItem.referenceNo ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {selectedItem.itemName} ({selectedItem.totalQuantity || selectedItem.quantity} unit)
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Route / Alur Perjalanan Timeline */}
        <div className="p-5 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Alur Distribusi Material
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Tujuan: {selectedItem.branchName || "Cabang Praya"}
            </span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {/* Step 1: SPK Created */}
            <div className="relative">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Surat Jalan Diterbitkan</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gudang Utama Perumdam • {selectedItem.createdAt ? formatDate(selectedItem.createdAt) : "Terverifikasi"}
                </p>
              </div>
            </div>

            {/* Step 2: Preparing */}
            <div className="relative">
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Material Dirilis Armada</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedItem.totalQuantity || selectedItem.quantity} unit aksesoris disiapkan kurir
                </p>
              </div>
            </div>

            {/* Step 3: In Transit / Diterima */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                  isReceived
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white animate-pulse"
                }`}
              >
                {isReceived ? "✓" : "●"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isReceived ? "Diterima Fisik di Cabang" : "Dalam Pengiriman Menuju Cabang"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedItem.receivedAt
                    ? `Diterima: ${formatDate(selectedItem.receivedAt)}`
                    : "Armada pengiriman sedang bergerak menuju lokasi cabang"}
                </p>
              </div>
            </div>

            {/* Step 4: Installation */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                  isInstalled
                    ? "bg-emerald-600 text-white"
                    : isReceived
                    ? "bg-amber-500 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {isInstalled ? "✓" : "○"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isInstalled ? "Pemasangan Lapangan Selesai" : "Menunggu Pemasangan Teknisi"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedItem.installedAt
                    ? `Tercatat pasang: ${formatDate(selectedItem.installedAt)}`
                    : "Teknisi siap dialokasikan ke titik pelanggan"}
                </p>
              </div>
            </div>

            {/* Step 5: Verified GIS */}
            <div className="relative">
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                  isVerified
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}
              >
                {isVerified ? "✓" : "○"}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isVerified ? "Terverifikasi Audit GIS" : "Audit Verifikasi Akhir SPI"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedItem.verifiedAt
                    ? `Audit Selesai: ${formatDate(selectedItem.verifiedAt)}`
                    : "Menunggu pencocokan titik koordinat & meter air"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lightweight GIS Modal with Safe Cleanup */}
        <LightweightGisMapDialog
          open={gisModalOpen}
          onClose={() => setGisModalOpen(false)}
          item={selectedItem}
        />
      </div>
    );
  }

  // ── Main Mobile View (Tab Switcher: Daftar Pengiriman vs Peta Titik GIS) ──
  return (
    <div className="space-y-3.5 px-4 pt-2 pb-10">
      {/* ── Tab Switcher Dock: List vs Map ── */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === "list"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          Daftar Kiriman ({filteredItems.length})
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
            activeTab === "map"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          Peta Titik GIS ({branchGisLocations.length})
        </button>
      </div>

      {/* ── TAB 1: PETA TITIK GIS (Clean Lightweight Interactive Map) ── */}
      {activeTab === "map" && (
        <div className="space-y-3">
          <MobileBranchGisMap
            locations={branchGisLocations}
            isLoading={isGisLoading}
            onRefresh={() => refetchGis()}
            branchName={user?.branchName || "Cabang Praya"}
          />
        </div>
      )}

      {/* ── TAB 2: DAFTAR PENGIRIMAN ── */}
      {activeTab === "list" && (
        <div className="space-y-3.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. resi, SPK, atau material..."
              className="pl-10 h-11 text-xs rounded-2xl bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs font-sans text-slate-900 dark:text-white"
            />
          </div>

          {/* Filter Chips */}
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
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 text-xs ${
                  filterStatus === f.id
                    ? "bg-slate-900 dark:bg-blue-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Items List */}
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Truck className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">Tidak Ada Pengiriman</p>
              <p className="text-[11px] text-slate-500">
                Tidak ada data distribusi yang cocok dengan filter saat ini.
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
                    className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5 hover:border-blue-400 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {/* Top Row: Status badge + Tracking Number + Chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          #{item.referenceNo}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>

                    {/* Middle Row: Description */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-2">
                      {item.itemName} ({item.totalQuantity || item.quantity} unit) • Menuju{" "}
                      {item.branchName || "Cabang"}
                    </p>

                    {/* Bottom Row: Timestamp */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.createdAt ? formatDate(item.createdAt) : "Hari Ini"}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                        Lihat Alur & Peta →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Interactive Native GIS Map Component (Safe Leaflet Lifecycle) ──
function MobileBranchGisMap({
  locations,
  isLoading,
  onRefresh,
  branchName,
}: {
  locations: any[];
  isLoading: boolean;
  onRefresh: () => void;
  branchName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Guard: Do not reinitialize if already attached to Leaflet
    if ((el as any)._leaflet_id) {
      return;
    }

    // Default center: Praya, Lombok Tengah
    const defaultLat = -8.7063;
    const defaultLon = 116.2704;

    const map = L.map(el, { zoomControl: false }).setView([defaultLat, defaultLon], 12);
    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 19,
      attribution: "&copy; Google Maps",
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    mapInstanceRef.current = map;

    // Add Markers for verified locations
    const markers: L.Marker[] = [];
    locations.forEach((loc) => {
      const lat = parseFloat(loc.verifiedLatitude || loc.latitude);
      const lon = parseFloat(loc.verifiedLongitude || loc.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const marker = L.marker([lat, lon], { icon: verifiedMarkerIcon }).addTo(map);
      marker.on("click", () => {
        setSelectedPoint(loc);
      });
      markers.push(marker);
    });

    if (markers.length > 0) {
      try {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
      } catch {}
    }

    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(t);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

  return (
    <div className="space-y-3">
      {/* Map Header Status Banner */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {locations.length} Titik Pemasangan Terverifikasi
            </p>
            <p className="text-[10px] text-slate-400">{branchName} • Lombok Tengah</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 px-2.5 rounded-xl text-xs gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* Map Viewport */}
      <div className="h-[360px] sm:h-[420px] w-full rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs relative bg-slate-100 dark:bg-slate-900">
        <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 1 }} />

        {/* Loading overlay if fetching */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Memuat titik koordinat...
            </span>
          </div>
        )}
      </div>

      {/* Bottom Inspection Card when Marker is Selected */}
      {selectedPoint && (
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md space-y-2.5 animate-in fade-in-50 slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedPoint.itemName || "Material Aksesoris"}
              </span>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block">Surat Jalan (SPK):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                #{selectedPoint.referenceNo}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Kuantitas Pasang:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {selectedPoint.allocationQuantity || 1} Unit
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
            GPS:{" "}
            {parseFloat(selectedPoint.verifiedLatitude || selectedPoint.latitude).toFixed(6)},{" "}
            {parseFloat(selectedPoint.verifiedLongitude || selectedPoint.longitude).toFixed(6)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lightweight Single Item GIS Dialog (Crash Proof) ──
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
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const el = mapRef.current;
      if (!el) return;
      if ((el as any)._leaflet_id) return;

      const map = L.map(el, { zoomControl: false }).setView([-8.7063, 116.2704], 13);
      L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 19,
        attribution: "&copy; Google Maps",
      }).addTo(map);

      L.marker([-8.7063, 116.2704], { icon: verifiedMarkerIcon })
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

      mapInstanceRef.current = map;
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, item]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[94vw] p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <MapIcon className="w-4 h-4 text-emerald-600" />
            Peta Titik Pasang GIS #{item?.referenceNo}
          </DialogTitle>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-900">
            <div ref={mapRef} style={{ height: "100%", width: "100%", zIndex: 1 }} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Koordinat: Lombok Tengah (-8.706300, 116.270400)</span>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
              Unit Terpasang
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
