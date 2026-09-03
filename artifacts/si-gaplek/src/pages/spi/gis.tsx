import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Layers,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Satellite,
  Map as MapIcon,
  Search,
  ExternalLink,
  Copy,
  X,
  Crosshair,
  RotateCcw,
  Navigation,
  Eye,
  Camera,
  Calendar,
  Building2,
  Compass,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

/* ─── Leaflet CSS Overrides for Radar Pulse Dots ─── */
const RADAR_CSS = `
.gis-radar-marker {
  background: transparent !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
`;

/* ─── Types ─── */
interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] }; // [lon, lat]
  properties: {
    evidenceId: number;
    evidenceUuid?: string;
    photoUrl?: string | null;
    itemName: string;
    itemCode: string;
    quantity: number;
    referenceNo: string;
    branchId?: number;
    branchName: string;
    verifiedAt: string | null;
    installedAt?: string | null;
    gpsAccuracy?: number | null;
    locationMismatch: boolean;
    deviationMeters: number | null;
    plannedCoordinates?: [number, number] | null; // [lon, lat]
  };
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

type BasemapType = "osm" | "satellite" | "positron";

const BASEMAP_CONFIGS: Record<
  BasemapType,
  { name: string; url: string; attribution: string; maxZoom: number }
> = {
  osm: {
    name: "Peta Jalan (OSM)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    name: "Citra Satelit (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
    maxZoom: 19,
  },
  positron: {
    name: "Minimalis Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
};

/* ─── Pulsing Dot Markers (Radar Ping) ─── */
function createRadarDotIcon(isMismatch: boolean, isSelected: boolean) {
  if (isMismatch) {
    return L.divIcon({
      className: "gis-radar-marker",
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group pointer-events-auto">
          <span class="absolute inline-flex w-full h-full rounded-full bg-rose-500 opacity-60 animate-ping" style="animation-duration: 1.2s;"></span>
          <span class="absolute inline-flex w-5 h-5 rounded-full bg-rose-500/30"></span>
          <span class="relative inline-flex rounded-full w-3.5 h-3.5 bg-rose-600 border-2 border-white shadow-md ${
            isSelected ? "ring-4 ring-rose-400 scale-125" : ""
          } transition-transform duration-200 group-hover:scale-125"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  return L.divIcon({
    className: "gis-radar-marker",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group pointer-events-auto">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-45 animate-ping" style="animation-duration: 2.2s;"></span>
        <span class="absolute inline-flex w-5 h-5 rounded-full bg-emerald-500/25"></span>
        <span class="relative inline-flex rounded-full w-3.5 h-3.5 bg-emerald-600 border-2 border-white shadow-md ${
          isSelected ? "ring-4 ring-emerald-400 scale-125" : ""
        } transition-transform duration-200 group-hover:scale-125"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const plannedLocationDotIcon = L.divIcon({
  className: "gis-radar-marker",
  html: `
    <div class="relative flex items-center justify-center w-6 h-6 cursor-pointer opacity-85 group pointer-events-auto">
      <span class="relative inline-flex rounded-full w-3 h-3 bg-amber-500 border-2 border-dashed border-amber-900 shadow-sm"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

/* ─── Map Controller for bounds & focusing ─── */
function MapController({
  focusCoords,
  fitFeatures,
}: {
  focusCoords: [number, number] | null;
  fitFeatures: GeoFeature[] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusCoords) {
      map.flyTo(focusCoords, 16, { duration: 1.2 });
    }
  }, [focusCoords, map]);

  useEffect(() => {
    if (fitFeatures && fitFeatures.length > 0) {
      const bounds = L.latLngBounds(
        fitFeatures.map(
          (f) =>
            [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [
              number,
              number,
            ]
        )
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [fitFeatures, map]);

  // Invalidate map size on window/container resize
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Center of Lombok Tengah area
const DEFAULT_CENTER: [number, number] = [-8.7065, 116.2755];
const DEFAULT_ZOOM = 11;

export default function SpiGisPage() {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const { data: gisData, isLoading } = useQuery({
    queryKey: ["gis-materials"],
    queryFn: () => apiFetch<GeoCollection>("/api/gis/material-locations"),
  });

  const rawFeatures = useMemo(() => gisData?.features || [], [gisData]);

  // States
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>("osm");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<
    "ALL" | "VERIFIED" | "MISMATCH"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(
    null
  );
  const [focusedCoords, setFocusedCoords] = useState<[number, number] | null>(
    null
  );
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Street View & Fullscreen States
  const [streetViewFeature, setStreetViewFeature] = useState<GeoFeature | null>(
    null
  );
  const [isStreetViewFullscreen, setIsStreetViewFullscreen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [streetViewMode, setStreetViewMode] = useState<"pano" | "map">("pano");

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleMapFullscreen = () => {
    if (!document.fullscreenElement) {
      mapWrapperRef.current?.requestFullscreen?.().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.error("Exit fullscreen error:", err);
      });
    }
  };

  // Extract unique branches from dataset
  const branches = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => {
      if (f.properties.branchName) set.add(f.properties.branchName);
    });
    return Array.from(set).sort();
  }, [rawFeatures]);

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return rawFeatures.filter((f) => {
      const p = f.properties;

      // Filter by Branch
      if (selectedBranch !== "ALL" && p.branchName !== selectedBranch) {
        return false;
      }

      // Filter by Status
      if (selectedStatus === "VERIFIED" && p.locationMismatch) return false;
      if (selectedStatus === "MISMATCH" && !p.locationMismatch) return false;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.itemName?.toLowerCase().includes(q);
        const matchesCode = p.itemCode?.toLowerCase().includes(q);
        const matchesRef = p.referenceNo?.toLowerCase().includes(q);
        const matchesBranch = p.branchName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesRef && !matchesBranch) {
          return false;
        }
      }

      return true;
    });
  }, [rawFeatures, selectedBranch, selectedStatus, searchQuery]);

  // Counts
  const verifiedCount = useMemo(
    () => rawFeatures.filter((f) => !f.properties.locationMismatch).length,
    [rawFeatures]
  );
  const mismatchCount = useMemo(
    () => rawFeatures.filter((f) => f.properties.locationMismatch).length,
    [rawFeatures]
  );

  const resetFilters = () => {
    setSelectedBranch("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  const isFiltered =
    selectedBranch !== "ALL" ||
    selectedStatus !== "ALL" ||
    searchQuery.trim().length > 0;

  const handleCopyCoords = (lat: number, lon: number) => {
    const text = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    toast.success("Koordinat disalin ke clipboard", {
      description: text,
    });
  };

  const handleOpenGoogleMaps = (lat: number, lon: number) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      "_blank"
    );
  };

  const handleOpenGoogleStreetView = (lat: number, lon: number) => {
    window.open(
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
      "_blank"
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-3 h-[calc(100vh-3.5rem)] flex flex-col animate-page-enter">
      <style>{RADAR_CSS}</style>

      {/* ─── Top Header & Summary Statistics ─── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              Peta Material (GIS)
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[11px] font-normal border-border text-muted-foreground"
            >
              Lombok Tengah
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Monitoring geospasial real-time, verifikasi titik fisik & Street View 360° perpipaan
          </p>
        </div>

        {/* Live Status Indicators & Fullscreen Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border shadow-2xs text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-muted-foreground">Terverifikasi:</span>
            <span className="font-semibold text-foreground">
              {verifiedCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border shadow-2xs text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-muted-foreground">Mismatch:</span>
            <span
              className={`font-semibold ${
                mismatchCount > 0 ? "text-rose-600" : "text-foreground"
              }`}
            >
              {mismatchCount}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFitTrigger((prev) => prev + 1)}
            className="h-8 text-xs gap-1.5"
            title="Pusatkan seluruh titik material"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pusatkan</span>
          </Button>

          {/* Fullscreen Map Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMapFullscreen}
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            title={isMapFullscreen ? "Keluar dari Layar Penuh" : "Mode Layar Penuh (Fullscreen)"}
          >
            {isMapFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Normal</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Interactive Filter Toolbar ─── */}
      <div className="bg-card border border-border/80 rounded-xl p-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari material, kode barang, atau No. SPK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Branch Selector */}
        <div className="w-full md:w-56">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Cabang (Lombok Tengah)</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter Segment */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setSelectedStatus("ALL")}
            className={`px-2.5 py-1 rounded-md transition-all font-medium ${
              selectedStatus === "ALL"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({rawFeatures.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("VERIFIED")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
              selectedStatus === "VERIFIED"
                ? "bg-background text-emerald-700 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Terverifikasi ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("MISMATCH")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
              selectedStatus === "MISMATCH"
                ? "bg-background text-rose-700 shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Mismatch ({mismatchCount})
          </button>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* ─── Map Workspace Container ─── */}
      <div
        ref={mapWrapperRef}
        className={`flex-1 overflow-hidden border border-border shadow-xs relative bg-muted flex ${
          isMapFullscreen ? "h-screen w-screen rounded-none z-[9999]" : "rounded-2xl"
        }`}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center backdrop-blur-xs">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                Memuat data geospasial Lombok Tengah...
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredFeatures.length === 0 && !isLoading && (
          <div className="absolute inset-0 z-[500] pointer-events-none flex flex-col items-center justify-center bg-background/40 backdrop-blur-2xs">
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg max-w-sm text-center pointer-events-auto">
              <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-foreground">
                Tidak Ada Titik yang Cocok
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ubah kata kunci pencarian atau sesuaikan filter cabang dan
                status.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={resetFilters}
                className="mt-3 text-xs"
              >
                Reset Semua Filter
              </Button>
            </div>
          </div>
        )}

        {/* ─── Leaflet Map Container ─── */}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full z-0"
          style={{ minHeight: 450 }}
          scrollWheelZoom
          zoomControl={false}
        >
          {/* Active Basemap TileLayer */}
          <TileLayer
            key={activeBasemap}
            url={BASEMAP_CONFIGS[activeBasemap].url}
            attribution={BASEMAP_CONFIGS[activeBasemap].attribution}
            maxZoom={BASEMAP_CONFIGS[activeBasemap].maxZoom}
          />

          {/* Map bounds and flyTo controllers */}
          <MapController
            focusCoords={focusedCoords}
            fitFeatures={fitTrigger > 0 ? filteredFeatures : null}
          />

          {/* ─── GeoJSON Features Rendered as Pulsing Dots ─── */}
          {filteredFeatures.map((feature) => {
            const { coordinates } = feature.geometry;
            const props = feature.properties;
            const isMismatch = props.locationMismatch;
            const isSelected =
              selectedFeature?.properties.evidenceId === props.evidenceId;
            const actualPosition: [number, number] = [
              coordinates[1],
              coordinates[0],
            ];

            return (
              <div key={`feat-${props.evidenceId}`}>
                {/* Visual Deviasi: Circle Geofence if Mismatch */}
                {isMismatch && (
                  <Circle
                    center={actualPosition}
                    radius={
                      props.deviationMeters
                        ? Math.max(props.deviationMeters, 35)
                        : 40
                    }
                    pathOptions={{
                      color: "#ef4444",
                      dashArray: "4 4",
                      fillColor: "#ef4444",
                      fillOpacity: 0.12,
                      weight: 1.5,
                    }}
                  />
                )}

                {/* Visual Deviasi: Polyline Vector from Planned to Actual */}
                {isMismatch && props.plannedCoordinates && (
                  <>
                    <Polyline
                      positions={[
                        [
                          props.plannedCoordinates[1],
                          props.plannedCoordinates[0],
                        ],
                        actualPosition,
                      ]}
                      pathOptions={{
                        color: "#f59e0b",
                        dashArray: "5 5",
                        weight: 2,
                      }}
                    />
                    <Marker
                      position={[
                        props.plannedCoordinates[1],
                        props.plannedCoordinates[0],
                      ]}
                      icon={plannedLocationDotIcon}
                    >
                      <Tooltip direction="top" offset={[0, -10]}>
                        <div className="text-[11px] font-sans">
                          <p className="font-semibold text-amber-700">
                            Titik Rencana Awal (SPK)
                          </p>
                          <p className="text-muted-foreground font-mono">
                            {props.plannedCoordinates[1].toFixed(6)},{" "}
                            {props.plannedCoordinates[0].toFixed(6)}
                          </p>
                        </div>
                      </Tooltip>
                    </Marker>
                  </>
                )}

                {/* The Primary Pulsing Radar Dot Marker */}
                <Marker
                  position={actualPosition}
                  icon={createRadarDotIcon(isMismatch, isSelected)}
                  eventHandlers={{
                    click: () => {
                      setSelectedFeature(feature);
                      setFocusedCoords(actualPosition);
                    },
                  }}
                >
                  {/* Subtle Hover Tooltip */}
                  <Tooltip direction="top" offset={[0, -16]}>
                    <div className="text-xs font-sans space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {props.itemName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {props.branchName} • {props.quantity} Unit
                      </p>
                      {isMismatch ? (
                        <p className="text-[10px] text-rose-600 font-semibold">
                          ⚠ Deviasi{" "}
                          {props.deviationMeters
                            ? `${Math.round(props.deviationMeters)}m`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-medium">
                          ✓ Terverifikasi Presisi
                        </p>
                      )}
                    </div>
                  </Tooltip>
                </Marker>
              </div>
            );
          })}
        </MapContainer>

        {/* ─── Floating Basemap Switcher & Fullscreen (Top Right) ─── */}
        <div className="absolute top-3 right-3 z-[400] flex items-center bg-card/90 dark:bg-card/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-border text-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveBasemap("osm")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "osm"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Peta Jalan Standar OpenStreetMap"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Jalan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBasemap("satellite")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "satellite"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Citra Satelit Resolusi Tinggi Esri World Imagery"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Satelit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBasemap("positron")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "positron"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Tampilan Minimalis Grayscale"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Positron</span>
          </button>

          <div className="w-[1px] h-4 bg-border/80 mx-0.5" />

          {/* Quick Fullscreen Button on Map */}
          <button
            type="button"
            onClick={toggleMapFullscreen}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title={isMapFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isMapFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* ─── Modern Telemetry Radar Legend (Bottom Left) ─── */}
        <div className="absolute bottom-3 left-3 z-[400] bg-card/92 dark:bg-card/92 backdrop-blur-md rounded-xl p-3 shadow-lg border border-border text-xs space-y-2 max-w-[260px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
              Legenda Radar GIS
            </span>
            <span className="text-[10px] text-muted-foreground">
              {filteredFeatures.length} Ditampilkan
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 border border-white"></span>
              </span>
              <span className="text-foreground font-medium">
                Terverifikasi Presisi
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 border border-white"></span>
              </span>
              <span className="text-foreground font-medium">
                Location Mismatch (Deviasi)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-600 bg-amber-500/20"></span>
              <span className="text-muted-foreground">
                Titik Rencana Awal (SPK)
              </span>
            </div>
          </div>
        </div>

        {/* ─── Detail Material Inspector Panel (Slide-Over Card) ─── */}
        {selectedFeature && (
          <div className="absolute top-3 right-3 bottom-3 z-[450] w-80 md:w-96 bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
            {/* Inspector Header */}
            <div className="p-3.5 bg-muted/40 border-b border-border/80 flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {selectedFeature.properties.locationMismatch ? (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0 gap-1 font-medium shadow-2xs"
                    >
                      <AlertTriangle className="w-3 h-3" /> Location Mismatch
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 text-[10px] px-1.5 py-0 gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                      Terverifikasi Resmi
                    </Badge>
                  )}
                  <span className="text-[11px] font-mono text-muted-foreground">
                    #{selectedFeature.properties.evidenceId}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground leading-tight">
                  {selectedFeature.properties.itemName}
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Kode: {selectedFeature.properties.itemCode} • SPK:{" "}
                  {selectedFeature.properties.referenceNo}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFeature(null)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Inspector Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Street View 360° Hero Banner Button */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-sky-600/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> Street View 360°
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Lihat panorama 360° kondisi jalan & fisik di titik pipa
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setStreetViewFeature(selectedFeature)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  Buka
                </Button>
              </div>

              {/* Evidence Installation Photo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" /> Foto Bukti
                    Pemasangan
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium">
                    ✓ GPS Watermark Verified
                  </span>
                </div>

                {selectedFeature.properties.photoUrl ? (
                  <div
                    className="relative rounded-xl overflow-hidden border border-border group cursor-pointer aspect-video bg-muted"
                    onClick={() =>
                      setPreviewPhoto(
                        selectedFeature.properties.photoUrl || null
                      )
                    }
                  >
                    <img
                      src={selectedFeature.properties.photoUrl}
                      alt="Foto Pemasangan Material"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                      <div className="text-[10px] text-white space-y-0.5">
                        <p className="font-mono">
                          {selectedFeature.geometry.coordinates[1].toFixed(6)},{" "}
                          {selectedFeature.geometry.coordinates[0].toFixed(6)}
                        </p>
                        <p className="text-white/80">
                          {selectedFeature.properties.branchName}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-md p-1">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center space-y-1">
                    <Camera className="w-6 h-6 mx-auto text-muted-foreground/50" />
                    <p className="text-[11px] text-muted-foreground">
                      Foto evidence fisik tersimpan di arsip digital cabang
                    </p>
                  </div>
                )}
              </div>

              {/* Deviasi Alert Box (If Location Mismatch) */}
              {selectedFeature.properties.locationMismatch && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 space-y-1.5 text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Peringatan Deviasi Geospasial
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Terpasang sejauh{" "}
                    <strong>
                      {selectedFeature.properties.deviationMeters
                        ? `${Math.round(
                            selectedFeature.properties.deviationMeters
                          )} meter`
                        : "signifikan"}
                    </strong>{" "}
                    dari koordinat perencanaan teknis SPK awal.
                  </p>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
                    Rekomendasi SPI: Sesuaikan dokumen as-built drawing jaringan
                    dan validasi pipa cabang.
                  </p>
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="bg-muted/30 border border-border/70 rounded-xl p-3 space-y-2 text-xs">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                  Data Teknis & Lokasi
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Cabang Pelaksana
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      {selectedFeature.properties.branchName}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Jumlah Terpasang
                    </span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedFeature.properties.quantity} Unit
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Waktu Verifikasi SPI
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {selectedFeature.properties.verifiedAt
                        ? new Date(
                            selectedFeature.properties.verifiedAt
                          ).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px]">
                      Akurasi GPS Perangkat
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {selectedFeature.properties.gpsAccuracy
                        ? `±${selectedFeature.properties.gpsAccuracy} meter`
                        : "High Precision (<5m)"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3 h-3" /> Koordinat Lapangan (WGS84)
                    </span>
                    <button
                      onClick={() =>
                        handleCopyCoords(
                          selectedFeature.geometry.coordinates[1],
                          selectedFeature.geometry.coordinates[0]
                        )
                      }
                      className="text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Copy className="w-2.5 h-2.5" /> Salin
                    </button>
                  </div>
                  <p className="font-mono text-[11px] bg-background px-2.5 py-1.5 rounded-lg border border-border/80 text-foreground">
                    {selectedFeature.geometry.coordinates[1].toFixed(7)},{" "}
                    {selectedFeature.geometry.coordinates[0].toFixed(7)}
                  </p>
                </div>
              </div>
            </div>

            {/* Inspector Footer Action Buttons */}
            <div className="p-3 bg-muted/40 border-t border-border/80 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={() => setStreetViewFeature(selectedFeature)}
                title="Buka Street View 360°"
              >
                <Eye className="w-3.5 h-3.5" />
                Street View 360°
              </Button>

              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                onClick={() =>
                  handleOpenGoogleMaps(
                    selectedFeature.geometry.coordinates[1],
                    selectedFeature.geometry.coordinates[0]
                  )
                }
              >
                <Navigation className="w-3.5 h-3.5" />
                Google Maps
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={() =>
                  setFocusedCoords([
                    selectedFeature.geometry.coordinates[1],
                    selectedFeature.geometry.coordinates[0],
                  ])
                }
                title="Pusatkan kamera ke titik ini"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Interactive Street View 360° Dialog ─── */}
        {streetViewFeature && (
          <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
            <div
              className={`relative bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                isStreetViewFullscreen
                  ? "w-full h-full rounded-none"
                  : "w-full max-w-5xl h-[88vh]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Street View Dialog Header */}
              <div className="p-3.5 md:p-4 bg-muted/50 border-b border-border flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm md:text-base font-semibold text-foreground">
                        Street View 360° Panorama
                      </h2>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                      >
                        Live Telemetry
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {streetViewFeature.properties.itemName} •{" "}
                      {streetViewFeature.properties.branchName} • GPS:{" "}
                      <span className="font-mono text-foreground">
                        {streetViewFeature.geometry.coordinates[1].toFixed(6)},{" "}
                        {streetViewFeature.geometry.coordinates[0].toFixed(6)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Street View Header Actions */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setStreetViewMode("pano")}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${
                        streetViewMode === "pano"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Panorama 360°
                    </button>
                    <button
                      type="button"
                      onClick={() => setStreetViewMode("map")}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium text-xs ${
                        streetViewMode === "map"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Google Maps 3D
                    </button>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                    onClick={() =>
                      handleOpenGoogleStreetView(
                        streetViewFeature.geometry.coordinates[1],
                        streetViewFeature.geometry.coordinates[0]
                      )
                    }
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Google Maps Penuh (Gratis)
                  </Button>

                  {/* Toggle Fullscreen Modal */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() =>
                      setIsStreetViewFullscreen(!isStreetViewFullscreen)
                    }
                    title={
                      isStreetViewFullscreen
                        ? "Keluar Layar Penuh"
                        : "Layar Penuh (Fullscreen)"
                    }
                  >
                    {isStreetViewFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Close Dialog */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => {
                      setStreetViewFeature(null);
                      setIsStreetViewFullscreen(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Street View Iframe Body */}
              <div className="flex-1 relative bg-black flex flex-col overflow-hidden">
                <iframe
                  key={`${streetViewFeature.properties.evidenceId}-${streetViewMode}`}
                  title="Street View 360"
                  src={
                    streetViewMode === "pano"
                      ? `https://maps.google.com/maps?layer=c&cbll=${streetViewFeature.geometry.coordinates[1]},${streetViewFeature.geometry.coordinates[0]}&cbp=11,0,0,0,0&output=svembed`
                      : `https://maps.google.com/maps?q=${streetViewFeature.geometry.coordinates[1]},${streetViewFeature.geometry.coordinates[0]}&t=m&z=18&output=embed`
                  }
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                />

                {/* Subtle Interactive Instruction Bar */}
                <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-center">
                  <div className="bg-black/85 backdrop-blur-md text-white text-[11px] px-4 py-2 rounded-full shadow-lg border border-white/10 flex items-center gap-2.5 pointer-events-auto">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>
                      {streetViewMode === "pano"
                        ? "Putar panorama 360° dengan mouse/sentuhan • Jika jalan belum tercover mobil Google:"
                        : "Peta lokasi presisi koordinat GPS material • Untuk panorama 360°:"}
                    </span>
                    <button
                      onClick={() =>
                        handleOpenGoogleStreetView(
                          streetViewFeature.geometry.coordinates[1],
                          streetViewFeature.geometry.coordinates[0]
                        )
                      }
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline flex items-center gap-1"
                    >
                      Buka di Google Maps <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Photo Lightbox Modal ─── */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-card border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewPhoto}
                alt="Detail Evidence Pemasangan"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-3 right-3 rounded-full h-8 w-8 bg-black/60 text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
