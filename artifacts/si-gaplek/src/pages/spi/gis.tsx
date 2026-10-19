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
  Compass,
  Maximize2,
  Minimize2,
  Database,
  Server,
  Network,
  Wifi,
  WifiOff,
  FileCode,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

/* ─── Clean GIS Map & Marker Overrides (No Leaflet Watermark, Clean White Tooltips) ─── */
const GIS_CARTOGRAPHY_CSS = `
.gis-vector-node {
  background: transparent !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.leaflet-control-attribution {
  display: none !important;
}
.leaflet-container {
  font-family: inherit;
  background: #f1f5f9;
}
.leaflet-tooltip {
  background: rgba(255, 255, 255, 0.98) !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  color: #0f172a !important;
  padding: 6px 10px !important;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12) !important;
}
.leaflet-tooltip-top:before {
  border-top-color: rgba(255, 255, 255, 0.98) !important;
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

  if (
    cat.includes("valve") ||
    name.includes("valve") ||
    name.includes("kran") ||
    name.includes("katup") ||
    name.includes("stop kran")
  ) {
    return "valve";
  }

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

  if (
    cat.includes("pipa") ||
    name.includes("pipa") ||
    name.includes("hdpe") ||
    name.includes("pvc") ||
    name.includes("gipt")
  ) {
    return "pipa";
  }

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
    color: "#2563eb",
    borderHex: "#1d4ed8",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pipa: {
    label: "Pipa (HDPE / PVC)",
    shortLabel: "Pipa",
    color: "#059669",
    borderHex: "#047857",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  meter: {
    label: "Meter Air",
    shortLabel: "Meter Air",
    color: "#d97706",
    borderHex: "#b45309",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  fitting: {
    label: "Aksesoris & Fitting",
    shortLabel: "Aksesoris Pipa",
    color: "#7c3aed",
    borderHex: "#6d28d9",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  other: {
    label: "Material Lainnya",
    shortLabel: "Lainnya",
    color: "#0284c7",
    borderHex: "#0369a1",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
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

/* ─── 100% Free, Zero-API-Key Basemaps (Esri, Google, OpenStreetMap) ─── */
type BasemapType =
  | "esri_hybrid"
  | "google_hybrid"
  | "osm"
  | "google_streets"
  | "esri_topo"
  | "google_satellite";

interface BasemapLayerSpec {
  url: string;
  subdomains?: string[] | string;
  opacity?: number;
  maxNativeZoom?: number;
}

const BASEMAP_CONFIGS: Record<
  BasemapType,
  {
    name: string;
    shortName: string;
    maxZoom: number;
    layers: BasemapLayerSpec[];
  }
> = {
  esri_hybrid: {
    name: "Satelit Hybrid Modern (Esri Imagery + Jalan)",
    shortName: "Satelit Hybrid",
    maxZoom: 21,
    layers: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        subdomains: ["0", "1", "2", "3"],
        maxNativeZoom: 21,
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        opacity: 0.85,
        maxNativeZoom: 19,
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        opacity: 0.95,
        maxNativeZoom: 19,
      },
    ],
  },
  osm: {
    name: "OpenStreetMap Standar",
    shortName: "OpenStreetMap",
    maxZoom: 19,
    layers: [
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        maxNativeZoom: 19,
      },
    ],
  },
  google_streets: {
    name: "Google Maps Jalan",
    shortName: "Peta Jalan",
    maxZoom: 21,
    layers: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        subdomains: ["0", "1", "2", "3"],
        maxNativeZoom: 21,
      },
    ],
  },
  esri_topo: {
    name: "Peta Topografi GIS (Esri Topo)",
    shortName: "Topografi",
    maxZoom: 19,
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        maxNativeZoom: 19,
      },
    ],
  },
  google_hybrid: {
    name: "Google Satelit Hybrid",
    shortName: "Google Hybrid",
    maxZoom: 21,
    layers: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        subdomains: ["0", "1", "2", "3"],
        maxNativeZoom: 21,
      },
    ],
  },
  google_satellite: {
    name: "Foto Udara Satelit Murni",
    shortName: "Citra Murni",
    maxZoom: 21,
    layers: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        subdomains: ["0", "1", "2", "3"],
        maxNativeZoom: 21,
      },
    ],
  },
};

/* ─── High-Visibility Crisp Ring-Dot Marker (Matches Legend, No Giant Pulse Blob) ─── */
function createCategoryDotIcon({
  category,
  isMismatch,
  isCrossDistrict,
  isSelected,
  clusterTotal,
  clusterIndex,
}: {
  category: AccessoryCategory;
  isMismatch: boolean;
  isCrossDistrict?: boolean;
  isSelected: boolean;
  clusterTotal: number;
  clusterIndex: number;
}) {
  const conf = CATEGORY_CONFIG[category];
  const hasAnomaly = isMismatch || Boolean(isCrossDistrict);
  const mainColor = hasAnomaly ? "#e11d48" : conf.color;
  const isMulti = clusterTotal > 1;

  if (isSelected) {
    // Clean, clearly visible selected ring-dot (No giant animate-ping blob!)
    return L.divIcon({
      className: "gis-vector-node",
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 cursor-pointer pointer-events-auto">
          <span class="absolute inline-flex w-7 h-7 rounded-full" style="background-color: ${mainColor}28; border: 1.5px solid ${mainColor};"></span>
          <span class="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-md" style="border: 3px solid ${mainColor};">
            <span class="w-2 h-2 rounded-full" style="background-color: ${mainColor};"></span>
          </span>
          ${
            isMulti
              ? `<span class="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white shadow-xs z-20">${clusterIndex + 1}</span>`
              : ""
          }
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  // Crisp, high-visibility ring-dot (18px white circle with 2.5px colored ring + 7px inner core)
  return L.divIcon({
    className: "gis-vector-node",
    html: `
      <div class="relative flex items-center justify-center w-7 h-7 cursor-pointer group pointer-events-auto">
        <span class="relative inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white shadow-md transition-transform duration-150 group-hover:scale-115" style="border: 2.5px solid ${mainColor}; box-shadow: 0 2px 5px rgba(0,0,0,0.35);">
          <span class="w-[7px] h-[7px] rounded-full" style="background-color: ${mainColor};"></span>
        </span>
        ${
          hasAnomaly && !isMulti
            ? `<span class="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-xs z-10">!</span>`
            : ""
        }
        ${
          isMulti
            ? `<span class="absolute -top-0.5 -right-0.5 bg-slate-800 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white shadow-xs z-10">${clusterIndex + 1}</span>`
            : ""
        }
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const plannedLocationDotIcon = L.divIcon({
  className: "gis-vector-node",
  html: `
    <div class="relative flex items-center justify-center w-5 h-5">
      <span class="inline-flex rounded-full w-3 h-3 bg-amber-500 border-2 border-dashed border-amber-900 shadow-xs"></span>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const trueGpsAnchorIcon = L.divIcon({
  className: "gis-vector-node",
  html: `
    <div style="width:10px;height:10px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <span style="width:5px;height:5px;border-radius:9999px;background:#475569;border:1.5px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.4);"></span>
    </div>
  `,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

/* ─── Map Telemetry & Controller Hook ─── */
function MapController({
  focusCoords,
  focusZoom,
  fitFeatures,
  onZoomChange,
  onCursorMove,
  inspectorOpen,
}: {
  focusCoords: [number, number] | null;
  focusZoom: number | null;
  fitFeatures: GeoFeature[] | null;
  onZoomChange: (z: number) => void;
  onCursorMove: (coords: [number, number] | null) => void;
  inspectorOpen: boolean;
}) {
  const map = useMap();

  useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
    mousemove: (e) => {
      onCursorMove([e.latlng.lat, e.latlng.lng]);
    },
    mouseout: () => {
      onCursorMove(null);
    },
  });

  useEffect(() => {
    if (focusCoords) {
      const targetZoom = focusZoom ?? Math.max(map.getZoom(), 15);
      map.flyTo(focusCoords, targetZoom, { duration: 0.65 });
    }
  }, [focusCoords, focusZoom, map]);

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
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15 });
    }
  }, [fitFeatures, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 180);
    return () => clearTimeout(timer);
  }, [map, inspectorOpen]);

  return null;
}

const DEFAULT_CENTER: [number, number] = [-8.7065, 116.2755];
const DEFAULT_ZOOM = 12;

export interface ExternalGisConfig {
  enabled: boolean;
  serverType: "postgis_api" | "geoserver_wfs" | "custom_geojson";
  serverUrl: string;
  apiKey?: string;
}

interface DisplacedNode {
  feature: GeoFeature;
  rawLatLng: [number, number];
  displayLatLng: [number, number];
  clusterAnchorLatLng: [number, number];
  clusterId: string;
  clusterTotal: number;
  clusterIndex: number;
  isDisplaced: boolean;
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

  const { data: gisData, isLoading, refetch } = useQuery({
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

  // Default basemap: Satelit Hybrid (Esri Reference + Satellite, 0 API Key Required)
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>("esri_hybrid");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "VERIFIED" | "MISMATCH">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  const [focusedCoords, setFocusedCoords] = useState<[number, number] | null>(null);
  const [focusZoom, setFocusZoom] = useState<number | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [activePhotoTab, setActivePhotoTab] = useState<"after" | "before">("after");
  const [legendCollapsed, setLegendCollapsed] = useState<boolean>(false);

  // Live Map Telemetry State
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);

  // Street View & Fullscreen States
  const [streetViewFeature, setStreetViewFeature] = useState<GeoFeature | null>(null);
  const [isStreetViewFullscreen, setIsStreetViewFullscreen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [streetViewMode, setStreetViewMode] = useState<"pano" | "map">("pano");

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
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

  // Unique branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => {
      if (f.properties.branchName) set.add(f.properties.branchName);
    });
    return Array.from(set).sort();
  }, [rawFeatures]);

  // Category counts
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
      if (selectedBranch !== "ALL" && p.branchName !== selectedBranch) return false;

      if (selectedCategory !== "ALL") {
        const cat = getAccessoryCategory(p.categoryName, p.itemName);
        if (cat !== selectedCategory) return false;
      }

      const hasAnomaly = p.locationMismatch || Boolean(p.isCrossDistrict);
      if (selectedStatus === "VERIFIED" && hasAnomaly) return false;
      if (selectedStatus === "MISMATCH" && !hasAnomaly) return false;

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

  /* ─── Zoom-Adaptive Screen-Space Decluttering & Spiderfy Engine ─── */
  const { displacedNodes, clusterMap } = useMemo(() => {
    const degPerPixel = 360 / (256 * Math.pow(2, currentZoom));
    const collisionThresholdPx = 36;

    const sorted = [...filteredFeatures].sort(
      (a, b) => a.properties.evidenceId - b.properties.evidenceId
    );

    interface ClusterBucket {
      id: string;
      features: GeoFeature[];
      sumLat: number;
      sumLon: number;
    }

    const clusters: ClusterBucket[] = [];

    sorted.forEach((feat) => {
      const lon = feat.geometry.coordinates[0];
      const lat = feat.geometry.coordinates[1];
      const cosLat = Math.cos((lat * Math.PI) / 180) || 1;

      let matchedCluster: ClusterBucket | null = null;
      for (const c of clusters) {
        const cLat = c.sumLat / c.features.length;
        const cLon = c.sumLon / c.features.length;
        const dLatPx = (lat - cLat) / degPerPixel;
        const dLonPx = ((lon - cLon) * cosLat) / degPerPixel;
        const distPx = Math.sqrt(dLatPx * dLatPx + dLonPx * dLonPx);

        if (distPx < collisionThresholdPx) {
          matchedCluster = c;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.features.push(feat);
        matchedCluster.sumLat += lat;
        matchedCluster.sumLon += lon;
      } else {
        clusters.push({
          id: `cluster-${feat.properties.evidenceId}`,
          features: [feat],
          sumLat: lat,
          sumLon: lon,
        });
      }
    });

    const nodes: DisplacedNode[] = [];
    const cMap = new Map<string, GeoFeature[]>();

    clusters.forEach((c) => {
      const total = c.features.length;
      const centerLat = c.sumLat / total;
      const centerLon = c.sumLon / total;
      const cosLat = Math.cos((centerLat * Math.PI) / 180) || 1;
      cMap.set(c.id, c.features);

      if (total === 1) {
        const f = c.features[0];
        const rawLatLng: [number, number] = [
          f.geometry.coordinates[1],
          f.geometry.coordinates[0],
        ];
        nodes.push({
          feature: f,
          rawLatLng,
          displayLatLng: rawLatLng,
          clusterAnchorLatLng: rawLatLng,
          clusterId: c.id,
          clusterTotal: 1,
          clusterIndex: 0,
          isDisplaced: false,
        });
      } else {
        const radiusPx = Math.min(44, Math.max(28, 22 + total * 5));
        const offsetDeg = radiusPx * degPerPixel;

        c.features.forEach((f, idx) => {
          const angle = (2 * Math.PI * idx) / total - Math.PI / 4;
          const dispLat = centerLat + offsetDeg * Math.cos(angle);
          const dispLon = centerLon + (offsetDeg * Math.sin(angle)) / cosLat;

          nodes.push({
            feature: f,
            rawLatLng: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
            displayLatLng: [dispLat, dispLon],
            clusterAnchorLatLng: [centerLat, centerLon],
            clusterId: c.id,
            clusterTotal: total,
            clusterIndex: idx,
            isDisplaced: true,
          });
        });
      }
    });

    return { displacedNodes: nodes, clusterMap: cMap };
  }, [filteredFeatures, currentZoom]);

  // Co-located features in the same cluster as selectedFeature
  const coLocatedFeatures = useMemo(() => {
    if (!selectedFeature) return [];
    const node = displacedNodes.find(
      (n) => n.feature.properties.evidenceId === selectedFeature.properties.evidenceId
    );
    if (!node) return [selectedFeature];
    return clusterMap.get(node.clusterId) || [selectedFeature];
  }, [selectedFeature, displacedNodes, clusterMap]);

  // Summary counts
  const anomalyCount = useMemo(
    () =>
      rawFeatures.filter(
        (f) => f.properties.locationMismatch || Boolean(f.properties.isCrossDistrict)
      ).length,
    [rawFeatures]
  );
  const verifiedCount = useMemo(
    () => rawFeatures.length - anomalyCount,
    [rawFeatures.length, anomalyCount]
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
    toast.success("Koordinat WGS84 disalin", { description: text });
  };

  const handleOpenGoogleMaps = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, "_blank");
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

-- 2. Buat Tabel Titik Material (Kompatibel 100% QGIS & Monitoring Aksesoris)
CREATE TABLE IF NOT EXISTS pdam_material_gis (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER DEFAULT 1,
    branch_name VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100),
    photo_url TEXT,
    location_mismatch BOOLEAN DEFAULT FALSE,
    deviation_meters NUMERIC(8,2) DEFAULT 0,
    geom GEOMETRY(Point, 4326),
    geom_plan GEOMETRY(Point, 4326),
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
    <div className="p-3 md:p-4 space-y-2.5 h-[calc(100vh-3.5rem)] flex flex-col">
      <style>{GIS_CARTOGRAPHY_CSS}</style>

      {/* ─── Clean White GIS Command Bar ─── */}
      <div className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
        {/* Left: Title & Status Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-foreground">
              Peta Material (GIS)
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-medium border-slate-200 text-slate-600 bg-slate-50"
            >
              Lombok Tengah
            </Badge>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Clean Light Segmented Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-muted p-0.5 rounded-lg border border-slate-200/80 dark:border-border text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedStatus === "ALL"
                  ? "bg-white dark:bg-background text-slate-900 dark:text-foreground shadow-2xs"
                  : "text-slate-600 dark:text-muted-foreground hover:text-slate-900"
              }`}
            >
              Semua ({rawFeatures.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("VERIFIED")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                selectedStatus === "VERIFIED"
                  ? "bg-white dark:bg-background text-emerald-700 shadow-2xs"
                  : "text-slate-600 dark:text-muted-foreground hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Terverifikasi ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("MISMATCH")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                selectedStatus === "MISMATCH"
                  ? "bg-white dark:bg-background text-rose-700 shadow-2xs"
                  : "text-slate-600 dark:text-muted-foreground hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Anomali ({anomalyCount})
            </button>
          </div>
        </div>

        {/* Right: Search, Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Cari material, kode, SPK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 h-8 text-xs bg-white dark:bg-background border-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-[150px]">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-background border-slate-200 px-2.5">
                <SelectValue placeholder="Semua Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Cabang</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[168px]">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-background border-slate-200 px-2.5">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori ({rawFeatures.length})</SelectItem>
                <SelectItem value="valve">Gate Valve ({categoryCounts.valve})</SelectItem>
                <SelectItem value="pipa">Pipa HDPE/PVC ({categoryCounts.pipa})</SelectItem>
                <SelectItem value="meter">Meter Air ({categoryCounts.meter})</SelectItem>
                <SelectItem value="fitting">Aksesoris &amp; Fitting ({categoryCounts.fitting})</SelectItem>
                {categoryCounts.other > 0 && (
                  <SelectItem value="other">Lainnya ({categoryCounts.other})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900 gap-1"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFitTrigger((prev) => prev + 1)}
            className="h-8 px-2.5 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
            title="Pusatkan seluruh titik material"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Pusatkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTempExtConfig(extConfig);
              setPingStatus({ testing: false });
              setQgisDialogOpen(true);
            }}
            className={`h-8 px-2.5 text-xs gap-1.5 ${
              extConfig.enabled
                ? "border-emerald-500/50 text-emerald-700 bg-emerald-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
            title="Integrasi QGIS & PostGIS"
          >
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden xl:inline">QGIS &amp; PostGIS</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleMapFullscreen}
            className="h-8 w-8 p-0 border-slate-200 bg-white hover:bg-slate-50"
            title={isMapFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isMapFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* ─── Map Workspace Container ─── */}
      <div
        ref={mapWrapperRef}
        className={`flex-1 overflow-hidden border border-slate-200/90 dark:border-border shadow-xs relative bg-slate-100 flex ${
          isMapFullscreen ? "h-screen w-screen rounded-none z-[9999]" : "rounded-xl"
        }`}
      >
        {/* ─── Map Canvas ─── */}
        <div className="relative flex-1 h-full min-w-0 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-[1000] bg-white/70 flex items-center justify-center backdrop-blur-xs">
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-md text-slate-700 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Memuat data geospasial Lombok Tengah...</span>
              </div>
            </div>
          )}

          {filteredFeatures.length === 0 && !isLoading && (
            <div className="absolute inset-0 z-[500] pointer-events-none flex items-center justify-center">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg max-w-xs text-center pointer-events-auto">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Tidak Ada Titik yang Cocok
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Sesuaikan filter cabang, kategori, atau kata kunci pencarian.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-3 h-8 text-xs"
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          )}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full z-0"
            style={{ minHeight: 420 }}
            scrollWheelZoom
            zoomControl={false}
            attributionControl={false}
          >
            {/* Active Basemap Tile Layers (Zero API Key Required) */}
            {BASEMAP_CONFIGS[activeBasemap].layers.map((layerSpec, idx) => (
              <TileLayer
                key={`${activeBasemap}-${idx}`}
                url={layerSpec.url}
                maxZoom={BASEMAP_CONFIGS[activeBasemap].maxZoom}
                maxNativeZoom={layerSpec.maxNativeZoom ?? 19}
                opacity={layerSpec.opacity ?? 1}
                {...(layerSpec.subdomains ? { subdomains: layerSpec.subdomains as any } : {})}
              />
            ))}

            <MapController
              focusCoords={focusedCoords}
              focusZoom={focusZoom}
              fitFeatures={fitTrigger > 0 ? filteredFeatures : null}
              onZoomChange={setCurrentZoom}
              onCursorMove={setCursorCoords}
              inspectorOpen={Boolean(selectedFeature)}
            />

            {/* ─── Render Zoom-Adaptive Decluttered Ring-Dot Markers ─── */}
            {displacedNodes.map((node) => {
              const {
                feature,
                rawLatLng,
                displayLatLng,
                clusterTotal,
                clusterIndex,
                isDisplaced,
              } = node;
              const props = feature.properties;
              const isMismatch = props.locationMismatch;
              const isCrossDistrict = Boolean(props.isCrossDistrict);
              const isSelected =
                selectedFeature?.properties.evidenceId === props.evidenceId;
              const category = getAccessoryCategory(props.categoryName, props.itemName);

              return (
                <div key={`feat-${props.evidenceId}`}>
                  {/* Leader Line & True GPS Pin when multiple points are close */}
                  {isDisplaced && (
                    <>
                      <Polyline
                        positions={[rawLatLng, displayLatLng]}
                        pathOptions={{
                          color: isSelected ? "#2563eb" : "#64748b",
                          dashArray: "3 3",
                          weight: isSelected ? 2 : 1.5,
                          opacity: 0.9,
                        }}
                      />
                      {clusterIndex === 0 && (
                        <Marker
                          position={rawLatLng}
                          icon={trueGpsAnchorIcon}
                          interactive={false}
                        />
                      )}
                    </>
                  )}

                  {/* Spatial Deviation Geofence Circle */}
                  {isMismatch && (
                    <Circle
                      center={rawLatLng}
                      radius={
                        props.deviationMeters ? Math.max(props.deviationMeters, 30) : 35
                      }
                      pathOptions={{
                        color: "#e11d48",
                        dashArray: "4 4",
                        fillColor: "#e11d48",
                        fillOpacity: 0.1,
                        weight: 1.5,
                      }}
                    />
                  )}

                  {/* Planned vs Actual Vector Line */}
                  {isMismatch && props.plannedCoordinates && (
                    <>
                      <Polyline
                        positions={[
                          [props.plannedCoordinates[1], props.plannedCoordinates[0]],
                          rawLatLng,
                        ]}
                        pathOptions={{
                          color: "#d97706",
                          dashArray: "4 4",
                          weight: 1.5,
                        }}
                      />
                      <Marker
                        position={[
                          props.plannedCoordinates[1],
                          props.plannedCoordinates[0],
                        ]}
                        icon={plannedLocationDotIcon}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>
                          <div className="text-[11px]">
                            <p className="font-semibold text-amber-700">
                              Titik Rencana SPK
                            </p>
                            <p className="font-mono text-[10px] text-slate-500">
                              {props.plannedCoordinates[1].toFixed(6)},{" "}
                              {props.plannedCoordinates[0].toFixed(6)}
                            </p>
                          </div>
                        </Tooltip>
                      </Marker>
                    </>
                  )}

                  {/* High-Visibility Ring-Dot Marker */}
                  <Marker
                    position={displayLatLng}
                    icon={createCategoryDotIcon({
                      category,
                      isMismatch,
                      isCrossDistrict,
                      isSelected,
                      clusterTotal,
                      clusterIndex,
                    })}
                    eventHandlers={{
                      click: () => {
                        setSelectedFeature(feature);
                        setFocusZoom(null);
                        setFocusedCoords(rawLatLng);
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -14]}>
                      <div className="space-y-0.5 min-w-[140px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[category].color }}
                            />
                            <span className="text-xs font-semibold text-slate-900">
                              {props.itemName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{props.evidenceId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {props.branchName} &bull; {props.quantity} Unit
                        </div>
                        {clusterTotal > 1 && (
                          <div className="text-[10px] font-medium text-blue-600">
                            Titik gabungan ({clusterIndex + 1} dari {clusterTotal})
                          </div>
                        )}
                        {isCrossDistrict ? (
                          <div className="text-[10px] font-semibold text-rose-600">
                            Lintas Wilayah: {props.detectedDistrict}
                          </div>
                        ) : isMismatch ? (
                          <div className="text-[10px] font-semibold text-rose-600">
                            Deviasi{" "}
                            {props.deviationMeters
                              ? `${Math.round(props.deviationMeters)}m`
                              : "Lokasi"}
                          </div>
                        ) : null}
                      </div>
                    </Tooltip>
                  </Marker>
                </div>
              );
            })}
          </MapContainer>

          {/* ─── Top-Right: Clean White Basemap Switcher (No API Key Required) ─── */}
          <div className="absolute top-3 right-3 z-[400] flex items-center bg-white/95 dark:bg-card/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/90 dark:border-border shadow-md text-xs gap-1 flex-wrap">
            {(
              [
                "esri_hybrid",
                "osm",
                "google_streets",
                "esri_topo",
                "google_satellite",
              ] as BasemapType[]
            ).map((bmKey) => {
              const cfg = BASEMAP_CONFIGS[bmKey];
              const isActive = activeBasemap === bmKey;
              return (
                <button
                  key={bmKey}
                  type="button"
                  onClick={() => setActiveBasemap(bmKey)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-slate-600 dark:text-muted-foreground hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title={cfg.name}
                >
                  {cfg.shortName}
                </button>
              );
            })}
          </div>

          {/* ─── Bottom-Left: Clean White Legenda GIS Card (Restored Light Style) ─── */}
          <div className="absolute bottom-3 left-3 z-[400] w-64 bg-white/95 dark:bg-card/95 text-slate-800 dark:text-foreground backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-border shadow-lg text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setLegendCollapsed(!legendCollapsed)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between border-b border-slate-200/70 dark:border-border hover:bg-slate-50/80 transition-colors"
            >
              <span className="font-semibold text-slate-800 dark:text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Legenda GIS
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-500">
                  {filteredFeatures.length} Titik
                </span>
                {legendCollapsed ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {!legendCollapsed && (
              <div className="p-3 space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block px-1">
                    Kategori Aksesoris
                  </span>
                  {(["valve", "pipa", "meter", "fitting"] as AccessoryCategory[]).map(
                    (catKey) => {
                      const conf = CATEGORY_CONFIG[catKey];
                      const count = categoryCounts[catKey] || 0;
                      const isCatActive = selectedCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() =>
                            setSelectedCategory(
                              selectedCategory === catKey ? "ALL" : catKey
                            )
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all text-left ${
                            isCatActive
                              ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                              : "hover:bg-slate-100 text-slate-700 dark:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="relative inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white shadow-2xs shrink-0"
                              style={{ border: `2px solid ${conf.color}` }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: conf.color }}
                              />
                            </span>
                            <span className="text-[11px] truncate">{conf.label}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 ml-1">
                            {count}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/70 dark:border-border space-y-1.5 text-[11px]">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block px-1">
                    Status &amp; Simbol
                  </span>
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shadow-2xs shrink-0" />
                    <span className="text-slate-700 dark:text-foreground">
                      Anomali Lokasi ({anomalyCount})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center border border-white shrink-0">
                      2
                    </span>
                    <span className="text-slate-600 dark:text-muted-foreground">
                      Multi-Aksesoris (Titik Gabungan)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="w-3 h-3 rounded-full border border-dashed border-amber-600 bg-amber-500/20 shrink-0" />
                    <span className="text-slate-600 dark:text-muted-foreground">
                      Titik Rencana SPK Awal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Bottom-Right: Clean White Coordinate Readout Bar ─── */}
          <div className="hidden sm:flex absolute bottom-3 right-3 z-[400] items-center gap-2 bg-white/95 dark:bg-card/95 text-slate-700 dark:text-foreground backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-border text-[11px] font-mono shadow-md pointer-events-none">
            <span>
              {cursorCoords
                ? `${cursorCoords[0].toFixed(6)}, ${cursorCoords[1].toFixed(6)}`
                : `${DEFAULT_CENTER[0].toFixed(4)}, ${DEFAULT_CENTER[1].toFixed(4)}`}
            </span>
            <span className="text-slate-300">|</span>
            <span>Zoom {currentZoom}</span>
            <span className="text-slate-300">|</span>
            <span className="text-primary font-semibold">WGS84</span>
          </div>
        </div>

        {/* ─── Right Pane: Clean White Detail Inspector Panel ─── */}
        {selectedFeature && (
          <aside className="w-full sm:w-80 md:w-[370px] h-full bg-white dark:bg-card border-l border-slate-200 dark:border-border flex flex-col z-[450] shrink-0">
            {/* Inspector Header */}
            {(() => {
              const currentCat = getAccessoryCategory(
                selectedFeature.properties.categoryName,
                selectedFeature.properties.itemName
              );
              const catConf = CATEGORY_CONFIG[currentCat];
              const isCross = Boolean(selectedFeature.properties.isCrossDistrict);
              const isDev = selectedFeature.properties.locationMismatch;

              return (
                <div className="p-3.5 border-b border-slate-200/80 dark:border-border bg-slate-50/60 dark:bg-muted/20 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {isCross ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 border-rose-300 bg-rose-50 text-rose-700 font-semibold"
                        >
                          Lintas Kecamatan
                        </Badge>
                      ) : isDev ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 border-amber-300 bg-amber-50 text-amber-700 font-semibold"
                        >
                          Deviasi Lokasi
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold"
                        >
                          Terverifikasi
                        </Badge>
                      )}

                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 font-medium ${catConf.badgeClass}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mr-1 inline-block"
                          style={{ backgroundColor: catConf.color }}
                        />
                        {catConf.shortLabel}
                      </Badge>

                      <span className="font-mono text-slate-400 ml-auto">
                        #{selectedFeature.properties.evidenceId}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-foreground leading-tight truncate">
                      {selectedFeature.properties.itemName}
                    </h3>
                    <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                      <span>Kode: {selectedFeature.properties.itemCode}</span>
                      <span>&bull;</span>
                      <span>SPK: {selectedFeature.properties.referenceNo}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedFeature(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-900 transition-colors"
                    title="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

            {/* Cluster Node Switcher */}
            {coLocatedFeatures.length > 1 && (
              <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-muted/35 border-b border-slate-200/80 dark:border-border space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-foreground">
                    Titik Gabungan ({coLocatedFeatures.length} Aksesoris)
                  </span>
                  <span className="text-[10px] text-slate-400">Pilih titik</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {coLocatedFeatures.map((item, idx) => {
                    const itemCat = getAccessoryCategory(
                      item.properties.categoryName,
                      item.properties.itemName
                    );
                    const isCurrent =
                      item.properties.evidenceId ===
                      selectedFeature.properties.evidenceId;
                    return (
                      <button
                        key={item.properties.evidenceId}
                        type="button"
                        onClick={() => {
                          setSelectedFeature(item);
                          setFocusZoom(null);
                          setFocusedCoords([
                            item.geometry.coordinates[1],
                            item.geometry.coordinates[0],
                          ]);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 shrink-0 border transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_CONFIG[itemCat].color }}
                        />
                        <span>#{idx + 1}</span>
                        <span className="truncate max-w-[100px]">
                          {item.properties.itemName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inspector Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
              {/* Evidence Photo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-foreground">
                    Foto Bukti Lapangan
                  </span>
                  {selectedFeature.properties.photoBeforeUrl &&
                    selectedFeature.properties.photoAfterUrl && (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setActivePhotoTab("after")}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            activePhotoTab === "after"
                              ? "bg-white text-slate-900 font-medium shadow-2xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          Terpasang
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePhotoTab("before")}
                          className={`px-2 py-0.5 rounded-md transition-all ${
                            activePhotoTab === "before"
                              ? "bg-white text-slate-900 font-medium shadow-2xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          Sebelum
                        </button>
                      </div>
                    )}
                </div>

                {(() => {
                  const displayPhotoUrl =
                    activePhotoTab === "before"
                      ? selectedFeature.properties.photoBeforeUrl ||
                        selectedFeature.properties.photoUrl
                      : selectedFeature.properties.photoAfterUrl ||
                        selectedFeature.properties.photoUrl;

                  return displayPhotoUrl ? (
                    <div
                      className="relative rounded-xl overflow-hidden border border-slate-200 group cursor-pointer aspect-[16/10] bg-slate-100"
                      onClick={() => setPreviewPhoto(displayPhotoUrl)}
                    >
                      <img
                        src={displayPhotoUrl}
                        alt="Foto Pemasangan"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2.5 flex items-end justify-between text-[11px] text-white">
                        <div>
                          <p className="font-mono font-semibold">
                            {selectedFeature.geometry.coordinates[1].toFixed(6)},{" "}
                            {selectedFeature.geometry.coordinates[0].toFixed(6)}
                          </p>
                          <p className="text-[10px] text-white/80">
                            {selectedFeature.properties.branchName}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-300">
                          GPS Terverifikasi
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-400">
                        Foto fisik belum dilampirkan
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Clean Anomaly Notice (If applicable) */}
              {(selectedFeature.properties.isCrossDistrict ||
                selectedFeature.properties.locationMismatch) && (
                <div className="border-l-3 border-rose-500 bg-rose-50/70 dark:bg-rose-950/20 px-3 py-2.5 rounded-r-lg border border-rose-200/70 space-y-1">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    {selectedFeature.properties.isCrossDistrict
                      ? "Anomali Lintas Kecamatan"
                      : "Deviasi Lokasi SPK"}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedFeature.properties.isCrossDistrict ? (
                      <>
                        Material milik{" "}
                        <strong>{selectedFeature.properties.branchName}</strong>{" "}
                        terdeteksi berada di{" "}
                        <strong>
                          {selectedFeature.properties.detectedDistrict ||
                            "Kecamatan Lain"}
                        </strong>
                        .
                      </>
                    ) : (
                      <>
                        Bergeser{" "}
                        <strong>
                          {selectedFeature.properties.deviationMeters
                            ? `${Math.round(selectedFeature.properties.deviationMeters)} meter`
                            : "cukup jauh"}
                        </strong>{" "}
                        dari titik rencana awal.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Clean White Attribute Table */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-foreground block">
                  Informasi Teknis &amp; Lokasi
                </span>

                <div className="border border-slate-200/90 dark:border-border rounded-xl divide-y divide-slate-100 dark:divide-border bg-white dark:bg-background text-xs overflow-hidden">
                  <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                    <span className="text-slate-500">Cabang</span>
                    <span className="font-semibold text-slate-900 dark:text-foreground text-right truncate">
                      {selectedFeature.properties.branchName}
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                    <span className="text-slate-500">Petugas Pasang</span>
                    <span className="font-medium text-slate-800 dark:text-foreground text-right truncate">
                      {selectedFeature.properties.technicianNames ||
                        selectedFeature.properties.capturedByName ||
                        "Tim Lapangan Cabang"}
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                    <span className="text-slate-500">Jumlah Pasang</span>
                    <span className="font-semibold text-slate-900 dark:text-foreground text-right">
                      {selectedFeature.properties.quantity} Unit
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                    <span className="text-slate-500">Waktu Pasang</span>
                    <span className="font-medium text-slate-800 dark:text-foreground text-right">
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
                          })}`;
                        } catch {
                          return String(dateVal);
                        }
                      })()}
                    </span>
                  </div>

                  {selectedFeature.properties.detectedDistrict && (
                    <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                      <span className="text-slate-500">Wilayah GPS</span>
                      <span className="font-medium text-slate-800 dark:text-foreground text-right">
                        {selectedFeature.properties.detectedDistrict}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-[115px_1fr] px-3 py-2 items-center">
                    <span className="text-slate-500">Akurasi GPS</span>
                    <span className="font-medium text-emerald-600 text-right">
                      {selectedFeature.properties.gpsAccuracy
                        ? `±${selectedFeature.properties.gpsAccuracy.toFixed(1)} meter`
                        : "Presisi Tinggi (<5m)"}
                    </span>
                  </div>

                  <div className="px-3 py-2.5 bg-slate-50/70 dark:bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Koordinat WGS84</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCoords(
                            selectedFeature.geometry.coordinates[1],
                            selectedFeature.geometry.coordinates[0]
                          )
                        }
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Copy className="w-3 h-3" /> Salin
                      </button>
                    </div>
                    <div className="font-mono text-xs text-slate-800 dark:text-foreground select-all">
                      {selectedFeature.geometry.coordinates[1].toFixed(7)},{" "}
                      {selectedFeature.geometry.coordinates[0].toFixed(7)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Footer Actions */}
            <div className="p-3 border-t border-slate-200/80 dark:border-border bg-slate-50/50 dark:bg-muted/15 flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                onClick={() => setStreetViewFeature(selectedFeature)}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Street View 360&deg;
              </Button>

              <Button
                variant="default"
                size="sm"
                className="flex-1 h-8 text-xs gap-1.5"
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
                className="h-8 w-8 p-0 shrink-0 border-slate-200 bg-white hover:bg-slate-50"
                onClick={() => {
                  setFocusZoom(18);
                  setFocusedCoords([
                    selectedFeature.geometry.coordinates[1],
                    selectedFeature.geometry.coordinates[0],
                  ]);
                }}
                title="Perbesar ke titik ini"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </Button>
            </div>
          </aside>
        )}

        {/* ─── Street View 360° Modal ─── */}
        {streetViewFeature && (
          <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
            <div
              className={`relative bg-white dark:bg-card rounded-xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden ${
                isStreetViewFullscreen
                  ? "w-full h-full rounded-none"
                  : "w-full max-w-5xl h-[86vh]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-slate-50 dark:bg-muted/40 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">
                      Street View 360&deg; Panorama
                    </h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {streetViewFeature.geometry.coordinates[1].toFixed(6)},{" "}
                      {streetViewFeature.geometry.coordinates[0].toFixed(6)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {streetViewFeature.properties.itemName} &bull;{" "}
                    {streetViewFeature.properties.branchName}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setStreetViewMode("pano")}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs ${
                        streetViewMode === "pano"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Panorama 360&deg;
                    </button>
                    <button
                      type="button"
                      onClick={() => setStreetViewMode("map")}
                      className={`px-2.5 py-1 rounded-md font-medium text-xs ${
                        streetViewMode === "map"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Peta Detail
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() =>
                      handleOpenGoogleStreetView(
                        streetViewFeature.geometry.coordinates[1],
                        streetViewFeature.geometry.coordinates[0]
                      )
                    }
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Google Maps
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsStreetViewFullscreen(!isStreetViewFullscreen)}
                  >
                    {isStreetViewFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setStreetViewFeature(null);
                      setIsStreetViewFullscreen(false);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 relative bg-black">
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
              </div>
            </div>
          </div>
        )}

        {/* ─── Photo Lightbox Modal ─── */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              className="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl bg-white border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewPhoto}
                alt="Observasi Pemasangan"
                className="w-full h-auto max-h-[82vh] object-contain"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-3 right-3 rounded-full h-8 w-8 bg-black/70 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Dialog Integrasi QGIS & Server Database PostGIS ─── */}
        <Dialog open={qgisDialogOpen} onOpenChange={setQgisDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    Integrasi Server PostGIS &amp; QGIS Desktop
                    <Badge variant="outline" className="text-[10px] font-mono py-0">
                      EPSG:4326
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Sinkronisasi dua arah antara QGIS Desktop, PostgreSQL/PostGIS, dan Peta Monitoring Aksesoris.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="server" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pt-2.5 border-b border-border bg-card">
                <TabsList className="grid grid-cols-3 h-8 text-xs">
                  <TabsTrigger value="server" className="gap-1.5 text-xs">
                    <Server className="w-3.5 h-3.5" />
                    Server GIS IT
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

              <TabsContent
                value="server"
                className="flex-1 overflow-y-auto p-4 space-y-3.5 m-0 text-xs"
              >
                <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-xs">
                      Gunakan Endpoint Server GIS Eksternal
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Baca layer GeoJSON langsung dari server PostGIS / GeoServer instansi.
                    </p>
                  </div>
                  <Switch
                    checked={tempExtConfig.enabled}
                    onCheckedChange={(checked) =>
                      setTempExtConfig({ ...tempExtConfig, enabled: checked })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Tipe Layanan Spasial</label>
                    <Select
                      value={tempExtConfig.serverType}
                      onValueChange={(val: any) =>
                        setTempExtConfig({ ...tempExtConfig, serverType: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="postgis_api">
                          REST API PostgreSQL / PostGIS (GeoJSON)
                        </SelectItem>
                        <SelectItem value="geoserver_wfs">
                          GeoServer WFS Output (GeoJSON)
                        </SelectItem>
                        <SelectItem value="custom_geojson">
                          Custom GeoJSON Endpoint
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">URL Endpoint GeoJSON</label>
                    <Input
                      placeholder="https://gis.pdam.go.id/api/gis/materials"
                      value={tempExtConfig.serverUrl}
                      onChange={(e) =>
                        setTempExtConfig({ ...tempExtConfig, serverUrl: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Bearer Token / API Key (Opsional)
                    </label>
                    <Input
                      placeholder="Token otorisasi..."
                      value={tempExtConfig.apiKey || ""}
                      onChange={(e) =>
                        setTempExtConfig({ ...tempExtConfig, apiKey: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-medium text-muted-foreground text-[11px]">
                        Diagnostik Koneksi
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestPing}
                        disabled={pingStatus.testing}
                        className="h-7 text-xs gap-1.5"
                      >
                        {pingStatus.testing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span>Test Ping</span>
                      </Button>
                    </div>

                    {pingStatus.message && (
                      <div
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          pingStatus.success
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        {pingStatus.success ? (
                          <Wifi className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        )}
                        <p className="text-[11px]">{pingStatus.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="qgis"
                className="flex-1 overflow-y-auto p-4 space-y-3 m-0 text-xs"
              >
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <p className="font-semibold text-foreground text-xs">
                    Live GeoJSON Protocol Feed (QGIS Desktop)
                  </p>
                  <div className="flex items-center gap-1.5">
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
                      className="h-8 text-xs shrink-0 gap-1"
                    >
                      {copiedQgisUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Salin
                        </>
                      )}
                    </Button>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] space-y-1 text-muted-foreground pt-1">
                    <li>
                      Buka <strong>QGIS Desktop</strong> &rarr;{" "}
                      <strong>Layer &rarr; Add Vector Layer</strong>.
                    </li>
                    <li>
                      Pilih <strong>Protocol: HTTP(S), cloud, etc.</strong> dan tipe{" "}
                      <strong>GeoJSON</strong>.
                    </li>
                    <li>Tempelkan URI di atas lalu klik Add.</li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent
                value="sql"
                className="flex-1 overflow-y-auto p-4 space-y-2.5 m-0 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs">
                    DDL Tabel Spasial PostGIS (EPSG:4326)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopySql}
                    className="h-7 text-xs gap-1.5"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3" /> Disalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Salin SQL
                      </>
                    )}
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-slate-950 p-3 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-64">
                  <pre>{POSTGIS_SQL_SCHEMA}</pre>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Status: {tempExtConfig.enabled ? "Server Eksternal Aktif" : "Database Lokal Aktif"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQgisDialogOpen(false)}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveExtConfig}
                  className="text-xs h-8"
                >
                  Simpan
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
