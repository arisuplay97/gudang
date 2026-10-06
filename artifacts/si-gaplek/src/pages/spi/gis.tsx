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
  Database,
  Server,
  Network,
  Wifi,
  WifiOff,
  FileCode,
  Check,
  RefreshCw,
  Users,
  Package,
  ShieldCheck,
  UserCheck,
  Activity,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
export type AccessoryCategory = "valve" | "pipa" | "meter" | "fitting" | "other";

export function getAccessoryCategory(
  categoryName?: string | null,
  itemName?: string | null
): AccessoryCategory {
  const cat = (categoryName || "").toLowerCase();
  const name = (itemName || "").toLowerCase();

  // Valve / Gate Valve / Stop Kran
  if (
    cat.includes("valve") ||
    name.includes("valve") ||
    name.includes("kran") ||
    name.includes("katup") ||
    name.includes("stop kran")
  ) {
    return "valve";
  }

  // Aksesoris / Fitting Pipa (Tee, Elbow, Clamp Saddle, Reducer, Socket, Flange, Dop)
  if (
    cat.includes("aksesoris") ||
    cat.includes("fitting") ||
    name.includes("tee") ||
    name.includes("elbow") ||
    name.includes("bend") ||
    name.includes("reducer") ||
    name.includes("clamp") ||
    name.includes("saddle") ||
    name.includes("socket") ||
    name.includes("flange") ||
    name.includes("dop") ||
    name.includes("nipple")
  ) {
    return "fitting";
  }

  // Pipa HDPE / PVC / GIPT
  if (
    cat.includes("pipa") ||
    name.includes("pipa") ||
    name.includes("hdpe") ||
    name.includes("pvc") ||
    name.includes("gipt")
  ) {
    return "pipa";
  }

  // Meter Air / Flow Meter
  if (
    cat.includes("meter") ||
    cat.includes("alat ukur") ||
    name.includes("meter") ||
    name.includes("flow meter") ||
    name.includes("water meter")
  ) {
    return "meter";
  }

  return "other";
}

export const CATEGORY_CONFIG: Record<
  AccessoryCategory,
  {
    label: string;
    shortLabel: string;
    color: string;
    borderHex: string;
    badgeClass: string;
  }
> = {
  valve: {
    label: "Gate Valve & Valve",
    shortLabel: "Gate Valve",
    color: "#2563eb", // Sapphire Blue
    borderHex: "#1d4ed8",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  pipa: {
    label: "Pipa (HDPE / PVC)",
    shortLabel: "Pipa",
    color: "#059669", // Emerald Green
    borderHex: "#047857",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  meter: {
    label: "Meter Air",
    shortLabel: "Meter Air",
    color: "#d97706", // Amber Gold
    borderHex: "#b45309",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  fitting: {
    label: "Aksesoris & Fitting",
    shortLabel: "Aksesoris Pipa",
    color: "#7c3aed", // Violet / Purple
    borderHex: "#6d28d9",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  other: {
    label: "Material Lainnya",
    shortLabel: "Lainnya",
    color: "#0284c7", // Sky Blue
    borderHex: "#0369a1",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
};

interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] }; // [lon, lat]
  properties: {
    evidenceId: number;
    evidenceUuid?: string;
    photoUrl?: string | null;
    photoBeforeUrl?: string | null;
    photoAfterUrl?: string | null;
    itemName: string;
    itemCode: string;
    categoryName?: string | null;
    quantity: number;
    referenceNo: string;
    branchId?: number;
    branchName: string;
    verifiedAt: string | null;
    installedAt?: string | null;
    clientCaptureTime?: string | null;
    technicianNames?: string | null;
    capturedByName?: string | null;
    gpsAccuracy?: number | null;
    locationMismatch: boolean;
    deviationMeters: number | null;
    plannedCoordinates?: [number, number] | null; // [lon, lat]
    detectedDistrict?: string | null;
    targetDistrict?: string | null;
    isCrossDistrict?: boolean | null;
    crossDistrictNotes?: string | null;
  };
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

type BasemapType = "google_hybrid" | "google_satellite" | "esri_clarity" | "osm" | "positron";

const BASEMAP_CONFIGS: Record<
  BasemapType,
  { name: string; url: string; subdomains?: string[] | string; attribution: string; maxZoom: number }
> = {
  google_satellite: {
    name: "Foto Murni",
    url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution:
      "&copy; Google Maps Satellite",
    maxZoom: 21,
  },
  google_hybrid: {
    name: "Satelit Hybrid",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution:
      "&copy; Google Maps Satellite",
    maxZoom: 21,
  },
  esri_clarity: {
    name: "Esri Clarity",
    url: "https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri Clarity Archive",
    maxZoom: 19,
  },
  osm: {
    name: "Peta Jalan (OSM)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

/* ─── Distinct Dot Markers (No pulse unless clicked/selected) ─── */
function createCategoryDotIcon({
  category,
  isMismatch,
  isSelected,
  coLocatedTotal,
  coLocatedIndex,
}: {
  category: AccessoryCategory;
  isMismatch: boolean;
  isSelected: boolean;
  coLocatedTotal: number;
  coLocatedIndex: number;
}) {
  const conf = CATEGORY_CONFIG[category];
  const mainColor = isMismatch ? "#ef4444" : conf.color;
  const isMulti = coLocatedTotal > 1;

  if (isSelected) {
    // Pulse effect ONLY when selected/clicked!
    return L.divIcon({
      className: "gis-radar-marker",
      html: `
        <div class="relative flex items-center justify-center w-11 h-11 cursor-pointer pointer-events-auto">
          <span class="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style="background-color: ${mainColor}; animation-duration: 1.3s;"></span>
          <span class="absolute inline-flex w-8 h-8 rounded-full opacity-35" style="background-color: ${mainColor};"></span>
          <span class="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-xl ring-4" style="--tw-ring-color: ${mainColor}; border: 3px solid ${mainColor};">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${mainColor};"></span>
          </span>
          ${
            isMulti
              ? `<span class="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white shadow-sm z-20">${coLocatedIndex + 1}</span>`
              : ""
          }
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }

  // Crisp, static, professional GIS marker (NO animate-ping)
  return L.divIcon({
    className: "gis-radar-marker",
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer group pointer-events-auto">
        <span class="absolute inline-flex w-6 h-6 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-150" style="background-color: ${mainColor};"></span>
        <span class="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-150 group-hover:scale-125" style="border: 2.5px solid ${mainColor};">
          <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${mainColor};"></span>
        </span>
        ${
          isMismatch
            ? `<span class="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-xs z-10">!</span>`
            : ""
        }
        ${
          isMulti
            ? `<span class="absolute -top-1 -right-1 bg-slate-800 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-xs z-10" title="Titik ini memiliki ${coLocatedTotal} aksesoris terpasang">${coLocatedIndex + 1}</span>`
            : ""
        }
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

export interface ExternalGisConfig {
  enabled: boolean;
  serverType: "postgis_api" | "geoserver_wfs" | "custom_geojson";
  serverUrl: string;
  apiKey?: string;
}

export default function SpiGisPage() {
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // External GIS Server & PostGIS Config
  const [extConfig, setExtConfig] = useState<ExternalGisConfig>(() => {
    try {
      const saved = localStorage.getItem("sigaplek_ext_gis_config");
      return saved
        ? JSON.parse(saved)
        : {
            enabled: false,
            serverType: "postgis_api",
            serverUrl: "",
            apiKey: "",
          };
    } catch {
      return {
        enabled: false,
        serverType: "postgis_api",
        serverUrl: "",
        apiKey: "",
      };
    }
  });

  const [qgisDialogOpen, setQgisDialogOpen] = useState(false);
  const [tempExtConfig, setTempExtConfig] = useState<ExternalGisConfig>(extConfig);
  const [pingStatus, setPingStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
    featureCount?: number;
    latencyMs?: number;
  }>({ testing: false });
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedQgisUrl, setCopiedQgisUrl] = useState(false);

  const { data: gisData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["gis-materials", extConfig.enabled, extConfig.serverUrl],
    queryFn: async () => {
      if (extConfig.enabled && extConfig.serverUrl.trim()) {
        try {
          const headers: Record<string, string> = {};
          if (extConfig.apiKey) {
            headers["Authorization"] = `Bearer ${extConfig.apiKey}`;
            headers["x-api-key"] = extConfig.apiKey;
          }
          const res = await fetch(extConfig.serverUrl.trim(), { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          const data = await res.json();
          if (data && Array.isArray(data.features)) {
            return data as GeoCollection;
          }
          throw new Error("Format respon bukan FeatureCollection GeoJSON yang valid");
        } catch (err: any) {
          console.warn("External GIS fetch failed, falling back to local database:", err);
          toast.error(`Koneksi Server GIS Gagal: ${err.message}. Menampilkan database lokal.`);
          return apiFetch<GeoCollection>("/api/gis/material-locations");
        }
      }
      return apiFetch<GeoCollection>("/api/gis/material-locations");
    },
  });

  const rawFeatures = useMemo(() => gisData?.features || [], [gisData]);

  // States
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>("google_satellite");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
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
  const [activePhotoTab, setActivePhotoTab] = useState<"after" | "before">("after");

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

  // Category counts across raw dataset
  const categoryCounts = useMemo(() => {
    const counts: Record<AccessoryCategory, number> = {
      valve: 0,
      pipa: 0,
      meter: 0,
      fitting: 0,
      other: 0,
    };
    rawFeatures.forEach((f) => {
      const cat = getAccessoryCategory(f.properties.categoryName, f.properties.itemName);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [rawFeatures]);

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return rawFeatures.filter((f) => {
      const p = f.properties;

      // Filter by Branch
      if (selectedBranch !== "ALL" && p.branchName !== selectedBranch) {
        return false;
      }

      // Filter by Category
      if (selectedCategory !== "ALL") {
        const cat = getAccessoryCategory(p.categoryName, p.itemName);
        if (cat !== selectedCategory) return false;
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
        const matchesCat = p.categoryName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesRef && !matchesBranch && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [rawFeatures, selectedBranch, selectedCategory, selectedStatus, searchQuery]);

  // Group features by geographic coordinate bucket (5 decimals ~ 1 meter)
  const coordinateGroups = useMemo(() => {
    const groups = new Map<string, GeoFeature[]>();
    filteredFeatures.forEach((f) => {
      const key = `${f.geometry.coordinates[1].toFixed(5)},${f.geometry.coordinates[0].toFixed(5)}`;
      const list = groups.get(key) || [];
      list.push(f);
      groups.set(key, list);
    });
    return groups;
  }, [filteredFeatures]);

  // Find all accessories sharing coordinate with selectedFeature
  const coLocatedFeatures = useMemo(() => {
    if (!selectedFeature) return [];
    const key = `${selectedFeature.geometry.coordinates[1].toFixed(5)},${selectedFeature.geometry.coordinates[0].toFixed(5)}`;
    return coordinateGroups.get(key) || [selectedFeature];
  }, [selectedFeature, coordinateGroups]);

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
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  const isFiltered =
    selectedBranch !== "ALL" ||
    selectedCategory !== "ALL" ||
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

  const handleTestPing = async () => {
    if (!tempExtConfig.serverUrl.trim()) {
      toast.error("Masukkan URL Endpoint Server GIS IT terlebih dahulu");
      return;
    }
    setPingStatus({ testing: true });
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (tempExtConfig.apiKey) {
        headers["Authorization"] = `Bearer ${tempExtConfig.apiKey}`;
        headers["x-api-key"] = tempExtConfig.apiKey;
      }
      const res = await fetch(tempExtConfig.serverUrl.trim(), { headers });
      const latency = Math.round(performance.now() - start);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const count = Array.isArray(data?.features) ? data.features.length : 0;
      setPingStatus({
        testing: false,
        success: true,
        message: `Terhubung! Berhasil membaca ${count} titik spasial.`,
        featureCount: count,
        latencyMs: latency,
      });
      toast.success(`Server IT Terhubung (${latency}ms)`);
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setPingStatus({
        testing: false,
        success: false,
        message: `Gagal terhubung (${latency}ms): ${err.message}. Pastikan CORS diaktifkan di server IT.`,
      });
      toast.error(`Gagal menghubungkan ke server: ${err.message}`);
    }
  };

  const handleSaveExtConfig = () => {
    setExtConfig(tempExtConfig);
    localStorage.setItem("sigaplek_ext_gis_config", JSON.stringify(tempExtConfig));
    setQgisDialogOpen(false);
    toast.success("Konfigurasi Server GIS IT berhasil disimpan");
    refetch();
  };

  const qgisFeedUrl = `${window.location.origin}/api/gis/material-locations?token=sigaplek-qgis`;

  const handleCopyQgisUrl = () => {
    navigator.clipboard.writeText(qgisFeedUrl);
    setCopiedQgisUrl(true);
    setTimeout(() => setCopiedQgisUrl(false), 2000);
    toast.success("URL Feed QGIS disalin ke clipboard!");
  };

  const POSTGIS_SQL_SCHEMA = `-- 1. Aktifkan Ekstensi PostGIS di PostgreSQL
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Buat Tabel Titik Material (Kompatibel 100% QGIS & SIMONA)
CREATE TABLE IF NOT EXISTS pdam_material_gis (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,            -- e.g. MTR-001, AKS-004
    item_name VARCHAR(150) NOT NULL,           -- e.g. Meter Air DN 15mm
    quantity INTEGER DEFAULT 1,
    branch_name VARCHAR(100) NOT NULL,         -- e.g. Cabang Praya
    reference_no VARCHAR(100),                 -- No SPK / Surat Jalan
    photo_url TEXT,                            -- Bukti foto lapangan
    location_mismatch BOOLEAN DEFAULT FALSE,   -- Deviasi lokasi
    deviation_meters NUMERIC(8,2) DEFAULT 0,   -- Jarak deviasi (meter)
    geom GEOMETRY(Point, 4326),                -- Koordinat fisik riil GPS
    geom_plan GEOMETRY(Point, 4326),           -- Koordinat rencana SPK kantor
    verified_at TIMESTAMP WITH TIME ZONE,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Buat Spasial Index (GIST) untuk Performa Tinggi
CREATE INDEX IF NOT EXISTS idx_pdam_material_geom ON pdam_material_gis USING GIST (geom);

-- 4. Query SQL Penghasil GeoJSON Bawaan PostGIS untuk REST API:
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
        jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
                'evidenceId', id,
                'itemCode', item_code,
                'itemName', item_name,
                'quantity', quantity,
                'branchName', branch_name,
                'referenceNo', reference_no,
                'photoUrl', photo_url,
                'locationMismatch', location_mismatch,
                'deviationMeters', deviation_meters,
                'installedAt', installed_at,
                'verifiedAt', verified_at
            )
        )
    ), '[]'::jsonb)
) AS geojson
FROM pdam_material_gis;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(POSTGIS_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    toast.success("Skrip SQL PostGIS disalin ke clipboard!");
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

          {/* Integrasi QGIS & Server PostGIS Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempExtConfig(extConfig);
              setPingStatus({ testing: false });
              setQgisDialogOpen(true);
            }}
            className={`h-8 text-xs gap-1.5 shadow-2xs ${
              extConfig.enabled
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold"
                : "border-border hover:bg-muted"
            }`}
            title="Integrasi QGIS Desktop & Database PostGIS Server IT"
          >
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">
              {extConfig.enabled ? "Server PostGIS: Aktif" : "QGIS & PostGIS"}
            </span>
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
        <div className="w-full md:w-48">
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

        {/* Category Selector */}
        <div className="w-full md:w-52">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Semua Kategori Aksesoris" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori ({rawFeatures.length})</SelectItem>
              <SelectItem value="valve">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Gate Valve & Valve ({categoryCounts.valve})
                </span>
              </SelectItem>
              <SelectItem value="pipa">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Pipa HDPE / PVC ({categoryCounts.pipa})
                </span>
              </SelectItem>
              <SelectItem value="meter">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  Meter Air ({categoryCounts.meter})
                </span>
              </SelectItem>
              <SelectItem value="fitting">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  Aksesoris & Fitting ({categoryCounts.fitting})
                </span>
              </SelectItem>
              {categoryCounts.other > 0 && (
                <SelectItem value="other">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    Material Lainnya ({categoryCounts.other})
                  </span>
                </SelectItem>
              )}
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
            {...(BASEMAP_CONFIGS[activeBasemap].subdomains
              ? { subdomains: BASEMAP_CONFIGS[activeBasemap].subdomains as any }
              : {})}
          />

          {/* Map bounds and flyTo controllers */}
          <MapController
            focusCoords={focusedCoords}
            fitFeatures={fitTrigger > 0 ? filteredFeatures : null}
          />

          {/* ─── GeoJSON Features Rendered as Category-Aware Distinct Dots ─── */}
          {filteredFeatures.map((feature) => {
            const { coordinates } = feature.geometry;
            const props = feature.properties;
            const isMismatch = props.locationMismatch;
            const isSelected =
              selectedFeature?.properties.evidenceId === props.evidenceId;
            const category = getAccessoryCategory(props.categoryName, props.itemName);

            const key = `${coordinates[1].toFixed(5)},${coordinates[0].toFixed(5)}`;
            const group = coordinateGroups.get(key) || [feature];
            const coLocatedTotal = group.length;
            const coLocatedIndex = group.findIndex(
              (gf) => gf.properties.evidenceId === props.evidenceId
            );

            // If more than 1 accessory at this coordinate, apply micro-radial offset (spiderfy rosette)
            let markerPosition: [number, number] = [
              coordinates[1],
              coordinates[0],
            ];

            if (coLocatedTotal > 1 && coLocatedIndex >= 0) {
              const angle = (2 * Math.PI * coLocatedIndex) / coLocatedTotal + Math.PI / 4;
              const offsetRadius = 0.000042; // ~4-5 meters
              markerPosition = [
                coordinates[1] + offsetRadius * Math.cos(angle),
                coordinates[0] + offsetRadius * Math.sin(angle),
              ];
            }

            return (
              <div key={`feat-${props.evidenceId}`}>
                {/* Visual Anchor Halo when multiple accessories share coordinate */}
                {coLocatedTotal > 1 && coLocatedIndex === 0 && (
                  <Circle
                    center={[coordinates[1], coordinates[0]]}
                    radius={6}
                    pathOptions={{
                      color: "#94a3b8",
                      dashArray: "3 3",
                      fillColor: "#cbd5e1",
                      fillOpacity: 0.15,
                      weight: 1,
                    }}
                  />
                )}

                {/* Visual Deviasi: Circle Geofence if Mismatch */}
                {isMismatch && (
                  <Circle
                    center={[coordinates[1], coordinates[0]]}
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
                        [coordinates[1], coordinates[0]],
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

                {/* The Category Dot Marker (Distinct per accessory type, pulses ONLY when selected) */}
                <Marker
                  position={markerPosition}
                  icon={createCategoryDotIcon({
                    category,
                    isMismatch,
                    isSelected,
                    coLocatedTotal,
                    coLocatedIndex,
                  })}
                  eventHandlers={{
                    click: () => {
                      setSelectedFeature(feature);
                      setFocusedCoords([coordinates[1], coordinates[0]]);
                    },
                  }}
                >
                  {/* Subtle Hover Tooltip */}
                  <Tooltip direction="top" offset={[0, -16]}>
                    <div className="text-xs font-sans space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: CATEGORY_CONFIG[category].color }}
                        />
                        <p className="font-semibold text-foreground">
                          {props.itemName}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {props.branchName} • {props.quantity} Unit •{" "}
                        <span className="font-medium" style={{ color: CATEGORY_CONFIG[category].color }}>
                          {CATEGORY_CONFIG[category].shortLabel}
                        </span>
                      </p>
                      {coLocatedTotal > 1 && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          📍 Titik gabungan ({coLocatedIndex + 1} dari {coLocatedTotal} aksesoris)
                        </p>
                      )}
                      {props.isCrossDistrict ? (
                        <p className="text-[10px] text-rose-600 font-bold">
                          Lintas Wilayah: {props.detectedDistrict}
                        </p>
                      ) : isMismatch ? (
                        <p className="text-[10px] text-rose-600 font-semibold">
                          ⚠ Deviasi{" "}
                          {props.deviationMeters
                            ? `${Math.round(props.deviationMeters)}m`
                            : ""}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-medium">
                          ✓ Terverifikasi ({props.detectedDistrict || "Presisi"})
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
            onClick={() => setActiveBasemap("google_satellite")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "google_satellite"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Foto Udara Satelit Murni"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>Foto Murni</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBasemap("google_hybrid")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "google_hybrid"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Satelit dengan Garis dan Nama Jalan"
          >
            <span>Satelit Hybrid</span>
          </button>

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
            onClick={() => setActiveBasemap("esri_clarity")}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-medium ${
              activeBasemap === "esri_clarity"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Esri Clarity (Arsip Foto Satelit Bebas Awan)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Esri Clarity</span>
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
        <div className="absolute bottom-3 left-3 z-[400] bg-card/95 dark:bg-card/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-border text-xs space-y-2.5 max-w-[280px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Legenda GIS
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {filteredFeatures.length} Titik
            </span>
          </div>

          {/* Kategori Aksesoris */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Kategori Aksesoris
            </span>
            <div className="space-y-1 text-[11px]">
              {(["valve", "pipa", "meter", "fitting"] as AccessoryCategory[]).map((catKey) => {
                const conf = CATEGORY_CONFIG[catKey];
                const count = categoryCounts[catKey] || 0;
                const isCatActive = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(selectedCategory === catKey ? "ALL" : catKey)
                    }
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg transition-all text-left ${
                      isCatActive
                        ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                        : "hover:bg-muted/70 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="relative inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white shadow-xs"
                        style={{ border: `2px solid ${conf.color}` }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: conf.color }}
                        />
                      </span>
                      <span className="text-[11px] truncate">{conf.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground ml-1">
                      {count}
                    </span>
                  </button>
                );
              })}

              {categoryCounts.other > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === "other" ? "ALL" : "other")
                  }
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg transition-all text-left ${
                    selectedCategory === "other"
                      ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                      : "hover:bg-muted/70 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="relative inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white shadow-xs"
                      style={{ border: `2px solid ${CATEGORY_CONFIG.other.color}` }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_CONFIG.other.color }}
                      />
                    </span>
                    <span className="text-[11px] truncate">Material Lainnya</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground ml-1">
                    {categoryCounts.other}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Status & Panduan Simbol */}
          <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px]">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Status & Simbol
            </span>

            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600 border border-white"></span>
              </span>
              <span className="text-foreground">
                Location Mismatch ({mismatchCount})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center border border-white">
                2
              </span>
              <span className="text-muted-foreground">
                Multi-Aksesoris (1 Titik Gabungan)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-600 bg-amber-500/20"></span>
              <span className="text-muted-foreground">
                Titik Rencana SPK Awal
              </span>
            </div>
          </div>
        </div>

        {/* ─── Detail Material Inspector Panel (Slide-Over Card) ─── */}
        {selectedFeature && (
          <div className="absolute top-3 right-3 bottom-3 z-[450] w-80 md:w-[420px] bg-card/98 backdrop-blur-md rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in slide-in-from-right-5 duration-200">
            {/* Inspector Header */}
            {(() => {
              const currentCat = getAccessoryCategory(
                selectedFeature.properties.categoryName,
                selectedFeature.properties.itemName
              );
              const catConf = CATEGORY_CONFIG[currentCat];

              return (
                <div className="p-4 bg-muted/30 border-b border-border/80 flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedFeature.properties.isCrossDistrict && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2 py-0.5 gap-1 font-semibold bg-rose-600 shadow-2xs"
                        >
                          <AlertTriangle className="w-3 h-3" /> Lintas Kecamatan
                        </Badge>
                      )}
                      {selectedFeature.properties.locationMismatch && !selectedFeature.properties.isCrossDistrict && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2 py-0.5 gap-1 font-semibold shadow-2xs"
                        >
                          <AlertTriangle className="w-3 h-3" /> Deviasi Lokasi
                        </Badge>
                      )}
                      {!selectedFeature.properties.locationMismatch && !selectedFeature.properties.isCrossDistrict && (
                        <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] px-2 py-0.5 gap-1 font-medium shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terverifikasi Resmi
                        </Badge>
                      )}

                      {/* Category Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-medium ${catConf.badgeClass}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mr-1 inline-block"
                          style={{ backgroundColor: catConf.color }}
                        />
                        {catConf.shortLabel}
                      </Badge>

                      <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                        #{selectedFeature.properties.evidenceId}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug tracking-tight">
                      {selectedFeature.properties.itemName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      Kode: <span className="text-foreground font-medium">{selectedFeature.properties.itemCode}</span> • SPK:{" "}
                      <span className="text-foreground font-medium">{selectedFeature.properties.referenceNo}</span>
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFeature(null)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })()}

            {/* Co-located Accessories Switcher (If multiple items share this coordinate) */}
            {coLocatedFeatures.length > 1 && (
              <div className="px-4 py-2.5 bg-muted/50 border-b border-border/70 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Titik Ini Memiliki {coLocatedFeatures.length} Aksesoris Terpasang
                  </span>
                  <span className="text-[10px] text-muted-foreground">Pilih material</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {coLocatedFeatures.map((item, idx) => {
                    const itemCat = getAccessoryCategory(
                      item.properties.categoryName,
                      item.properties.itemName
                    );
                    const isCurrent =
                      item.properties.evidenceId === selectedFeature.properties.evidenceId;
                    return (
                      <button
                        key={item.properties.evidenceId}
                        onClick={() => {
                          setSelectedFeature(item);
                          setFocusedCoords([
                            item.geometry.coordinates[1],
                            item.geometry.coordinates[0],
                          ]);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                            : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_CONFIG[itemCat].color }}
                        />
                        <span className="truncate max-w-[130px] font-sans">
                          {item.properties.itemName}
                        </span>
                        <span className="text-[10px] opacity-75 font-mono">
                          #{item.properties.evidenceId}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inspector Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Evidence Installation Photo with Before/After Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" /> Foto Bukti Lapangan
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> GPS Watermark Verified
                  </span>
                </div>

                {/* Photo Tab Toggle (if before & after exist) */}
                {selectedFeature.properties.photoBeforeUrl &&
                  selectedFeature.properties.photoAfterUrl && (
                    <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border text-xs mb-1">
                      <button
                        type="button"
                        onClick={() => setActivePhotoTab("after")}
                        className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                          activePhotoTab === "after"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Foto Sesudah (Terpasang)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePhotoTab("before")}
                        className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${
                          activePhotoTab === "before"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Foto Sebelum (Galian)
                      </button>
                    </div>
                  )}

                {(() => {
                  const displayPhotoUrl =
                    activePhotoTab === "before"
                      ? selectedFeature.properties.photoBeforeUrl ||
                        selectedFeature.properties.photoUrl
                      : selectedFeature.properties.photoAfterUrl ||
                        selectedFeature.properties.photoUrl;

                  return displayPhotoUrl ? (
                    <div
                      className="relative rounded-xl overflow-hidden border border-border group cursor-pointer aspect-video bg-muted shadow-xs"
                      onClick={() => setPreviewPhoto(displayPhotoUrl)}
                    >
                      <img
                        src={displayPhotoUrl}
                        alt="Foto Pemasangan Material"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-3">
                        <div className="text-[11px] text-white space-y-0.5">
                          <p className="font-mono font-semibold">
                            {selectedFeature.geometry.coordinates[1].toFixed(6)},{" "}
                            {selectedFeature.geometry.coordinates[0].toFixed(6)}
                          </p>
                          <p className="text-white/80 text-[10px]">
                            {selectedFeature.properties.branchName} •{" "}
                            {activePhotoTab === "before" ? "Kondisi Sebelum" : "Kondisi Terpasang"}
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white rounded-lg p-1.5 backdrop-blur-xs">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center space-y-1.5">
                      <Camera className="w-7 h-7 mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Foto evidence fisik tersimpan di arsip digital cabang
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Deviasi Alert Box (If Location Mismatch) */}
              {selectedFeature.properties.locationMismatch && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 space-y-1.5 text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Peringatan Deviasi Geospasial
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Terpasang sejauh{" "}
                    <strong>
                      {selectedFeature.properties.deviationMeters
                        ? `${Math.round(selectedFeature.properties.deviationMeters)} meter`
                        : "signifikan"}
                    </strong>{" "}
                    dari koordinat perencanaan teknis SPK awal.
                  </p>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
                    Rekomendasi SPI: Sesuaikan dokumen as-built drawing jaringan dan validasi pipa cabang.
                  </p>
                </div>
              )}

              {/* Anomali Lintas Kecamatan Banner */}
              {selectedFeature.properties.isCrossDistrict && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs space-y-1 text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Temuan: Anomali Lintas Kecamatan</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Material tercatat milik <strong>{selectedFeature.properties.branchName}</strong>, namun koordinat GPS terdeteksi berada di{" "}
                    <strong>{selectedFeature.properties.detectedDistrict || "Kecamatan Lain"}</strong>.
                  </p>
                  {selectedFeature.properties.crossDistrictNotes && (
                    <p className="text-[10px] font-mono text-muted-foreground pt-0.5">
                      {selectedFeature.properties.crossDistrictNotes}
                    </p>
                  )}
                </div>
              )}

              {/* ─── DATA TEKNIS & LOKASI (Clean Enterprise Inspector) ─── */}
              <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Data Teknis & Lokasi
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    SIMONA GIS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Siapa Yang Pasang */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Petugas / Teknisi Pemasang
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate" title={selectedFeature.properties.technicianNames || selectedFeature.properties.capturedByName || "Tim Lapangan Cabang"}>
                        {selectedFeature.properties.technicianNames ||
                          selectedFeature.properties.capturedByName ||
                          "Tim Lapangan Cabang"}
                      </span>
                    </span>
                  </div>

                  {/* Tanggal Dipasang */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Tanggal & Waktu Dipasang
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {(() => {
                          const dateVal =
                            selectedFeature.properties.installedAt ||
                            selectedFeature.properties.clientCaptureTime ||
                            selectedFeature.properties.verifiedAt;
                          if (!dateVal) return "-";
                          try {
                            const d = new Date(dateVal);
                            return `${d.toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}, ${d.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} WITA`;
                          } catch {
                            return String(dateVal);
                          }
                        })()}
                      </span>
                    </span>
                  </div>

                  {/* Cabang Pelaksana */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Cabang Pelaksana
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedFeature.properties.branchName}</span>
                    </span>
                  </div>

                  {/* Jumlah Terpasang */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Jumlah Terpasang
                    </span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{selectedFeature.properties.quantity} Unit</span>
                    </span>
                  </div>

                  {/* Waktu Verifikasi SPI */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Waktu Verifikasi SPI
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1.5 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {selectedFeature.properties.verifiedAt
                          ? new Date(selectedFeature.properties.verifiedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </span>
                  </div>

                  {/* Akurasi GPS */}
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-medium">
                      Akurasi GPS Perangkat
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1">
                      <Crosshair className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {selectedFeature.properties.gpsAccuracy
                          ? `±${selectedFeature.properties.gpsAccuracy.toFixed(2)} meter`
                          : "High Precision (<5m)"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Field Koordinat Lapangan WGS84 */}
                <div className="pt-2.5 border-t border-border/70 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <Compass className="w-3 h-3" /> Koordinat Lapangan (WGS84)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCoords(
                          selectedFeature.geometry.coordinates[1],
                          selectedFeature.geometry.coordinates[0]
                        )
                      }
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" /> Salin
                    </button>
                  </div>
                  <div className="font-mono text-xs bg-muted/60 px-3 py-2 rounded-lg border border-border/80 text-foreground flex items-center justify-between">
                    <span>
                      {selectedFeature.geometry.coordinates[1].toFixed(7)},{" "}
                      {selectedFeature.geometry.coordinates[0].toFixed(7)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspector Footer Action Buttons */}
            <div className="p-3.5 bg-muted/30 border-t border-border/80 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-medium"
                onClick={() => setStreetViewFeature(selectedFeature)}
                title="Buka panorama 360° kondisi jalan & fisik di titik pipa"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Street View 360°
              </Button>

              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-medium"
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
                className="h-9 w-9 p-0 text-xs shrink-0"
                onClick={() =>
                  setFocusedCoords([
                    selectedFeature.geometry.coordinates[1],
                    selectedFeature.geometry.coordinates[0],
                  ])
                }
                title="Pusatkan kamera ke titik ini"
              >
                <Crosshair className="w-4 h-4" />
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
                    Buka Google Maps Penuh
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

        {/* ─── Dialog Integrasi QGIS & Server Database PostGIS ─── */}
        <Dialog open={qgisDialogOpen} onOpenChange={setQgisDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500/15 to-emerald-500/15 text-sky-600 border border-sky-500/20 shadow-2xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    Integrasi Server PostGIS & QGIS Desktop
                    <Badge variant="outline" className="text-[10px] py-0 border-sky-500/30 text-sky-600">
                      Enterprise GIS
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Sinkronisasi dua arah antara QGIS, database PostgreSQL/PostGIS server IT, dan peta tracking SIMONA.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="server" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-3 border-b border-border bg-card">
                <TabsList className="grid grid-cols-3 h-9 text-xs">
                  <TabsTrigger value="server" className="gap-1.5 text-xs">
                    <Server className="w-3.5 h-3.5" />
                    Sumber Server IT
                  </TabsTrigger>
                  <TabsTrigger value="qgis" className="gap-1.5 text-xs">
                    <Network className="w-3.5 h-3.5" />
                    Koneksi QGIS
                  </TabsTrigger>
                  <TabsTrigger value="sql" className="gap-1.5 text-xs">
                    <FileCode className="w-3.5 h-3.5" />
                    Skema SQL PostGIS
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: Sumber Server IT */}
              <TabsContent value="server" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
                <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-xs">Gunakan Server GIS IT Mandiri</p>
                    <p className="text-[11px] text-muted-foreground">
                      Jika diaktifkan, peta akan membaca titik koordinat langsung dari endpoint server IT kantor Anda.
                    </p>
                  </div>
                  <Switch
                    checked={tempExtConfig.enabled}
                    onCheckedChange={(checked) =>
                      setTempExtConfig({ ...tempExtConfig, enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Protokol / Tipe Server</label>
                    <Select
                      value={tempExtConfig.serverType}
                      onValueChange={(val: any) =>
                        setTempExtConfig({ ...tempExtConfig, serverType: val })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgis_api">REST API PostgreSQL / PostGIS (GeoJSON)</SelectItem>
                        <SelectItem value="geoserver_wfs">GeoServer WFS Service (JSON)</SelectItem>
                        <SelectItem value="custom_geojson">Endpoint Web Kustom (GeoJSON URL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center justify-between">
                      <span>URL Endpoint Server GIS IT</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Mendukung IP Lokal / Domain</span>
                    </label>
                    <Input
                      placeholder="Contoh: http://192.168.1.50:8000/api/gis/materials atau https://gis.pdam.co.id/api/pipes"
                      value={tempExtConfig.serverUrl}
                      onChange={(e) =>
                        setTempExtConfig({ ...tempExtConfig, serverUrl: e.target.value })
                      }
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Endpoint harus mengembalikan format standar <code>FeatureCollection</code> GeoJSON (WGS84 / EPSG:4326).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Token Otorisasi / API Key (Opsional)</label>
                    <Input
                      placeholder="Bearer token atau API Key jika server IT dilindungi otentikasi..."
                      value={tempExtConfig.apiKey || ""}
                      onChange={(e) =>
                        setTempExtConfig({ ...tempExtConfig, apiKey: e.target.value })
                      }
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Test Ping Status Box */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-foreground text-[11px]">Uji Komunikasi Server</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestPing}
                        disabled={pingStatus.testing}
                        className="h-8 text-xs gap-1.5"
                      >
                        {pingStatus.testing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        <span>{pingStatus.testing ? "Memeriksa..." : "Uji Koneksi (Test Ping)"}</span>
                      </Button>
                    </div>

                    {pingStatus.message && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          pingStatus.success
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/30 text-rose-800 dark:text-rose-300"
                        }`}
                      >
                        {pingStatus.success ? (
                          <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5">
                          <p className="font-semibold">
                            {pingStatus.success ? "Koneksi Berhasil" : "Koneksi Bermasalah"}
                          </p>
                          <p className="text-[11px] leading-relaxed">{pingStatus.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: Koneksi QGIS Desktop */}
              <TabsContent value="qgis" className="flex-1 overflow-y-auto p-5 space-y-4 m-0 text-xs">
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                    <p className="font-bold text-sky-900 dark:text-sky-200 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Cara 1: Sambung Live Feed SIMONA Langsung ke QGIS (Instan)
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      QGIS memuat layer titik material langsung via protokol GeoJSON:
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        readOnly
                        value={qgisFeedUrl}
                        className="h-8 text-[11px] font-mono bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleCopyQgisUrl}
                        className="h-8 text-xs shrink-0 gap-1.5"
                      >
                        {copiedQgisUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Disalin
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Salin URL
                          </>
                        )}
                      </Button>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] space-y-1 text-muted-foreground pt-1">
                      <li>Buka <strong>QGIS Desktop</strong> di laptop kantor.</li>
                      <li>Pilih menu <strong>Layer &rarr; Add Layer &rarr; Add Vector Layer...</strong></li>
                      <li>Pilih <strong>Source Type: Protocol (HTTP(S), cloud, etc.)</strong>.</li>
                      <li>Tempelkan URL di atas ke kolom <strong>URI</strong> &rarr; klik <strong>Add</strong>.</li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                    <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      Cara 2: Koneksi Native QGIS ke Database PostgreSQL Server IT
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Jika server IT sudah menjalankan PostgreSQL + PostGIS, Anda bisa mengedit data langsung dari QGIS:
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-1 text-muted-foreground">
                      <li>Di panel <strong>Browser</strong> sebelah kiri QGIS, klik kanan pada ikon <strong>PostGIS</strong> &rarr; pilih <strong>New Connection</strong>.</li>
                      <li>Isi <strong>Host</strong> (IP server kantor), <strong>Port: 5432</strong>, <strong>Database</strong>, dan Akun PostgreSQL Anda.</li>
                      <li>Klik <strong>Test Connection</strong>, lalu seret tabel <code>pdam_material_gis</code> ke kanvas peta.</li>
                      <li>Gunakan <strong>Rule-based Symbology</strong>: Beri warna <strong>Hijau</strong> untuk <code>location_mismatch = false</code> dan <strong>Merah</strong> untuk <code>location_mismatch = true</code>.</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: Skema SQL PostGIS */}
              <TabsContent value="sql" className="flex-1 overflow-y-auto p-5 space-y-3 m-0 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-xs">Skrip DDL SQL PostgreSQL + PostGIS</p>
                    <p className="text-[11px] text-muted-foreground">
                      Jalankan skrip ini di pgAdmin / DBeaver pada server IT kantor Anda.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopySql}
                    className="h-8 text-xs gap-1.5 shrink-0"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Disalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Salin Skrip SQL
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative rounded-xl border border-border bg-zinc-950 p-3.5 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-72">
                  <pre>{POSTGIS_SQL_SCHEMA}</pre>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tabel di atas memiliki kolom geometri <code>geom</code> bertipe Point EPSG:4326 yang otomatis dikenali oleh QGIS sebagai layer spasial dan mendukung pengeluaran format GeoJSON standar untuk web SIMONA.
                </p>
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Status:{" "}
                <strong>
                  {tempExtConfig.enabled
                    ? "Server IT Mandiri Aktif"
                    : "Database Lokal SIMONA Aktif"}
                </strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQgisDialogOpen(false)}
                  className="text-xs h-8"
                >
                  Tutup
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveExtConfig}
                  className="text-xs h-8 bg-primary text-primary-foreground"
                >
                  Simpan & Terapkan
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
