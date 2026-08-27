import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { MapPin, Layers, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ─── Fix default Leaflet marker icons (broken in bundlers) ─── */
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Custom icons */
const greenIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface GeoFeature {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: {
        evidenceId: number;
        itemName: string;
        itemCode: string;
        quantity: number;
        referenceNo: string;
        branchName: string;
        verifiedAt: string | null;
        locationMismatch: boolean;
        deviationMeters: number | null;
    };
}

interface GeoCollection {
    type: "FeatureCollection";
    features: GeoFeature[];
}

/** Auto-fit map bounds to markers */
function FitBounds({ features }: { features: GeoFeature[] }) {
    const map = useMap();
    useMemo(() => {
        if (features.length === 0) return;
        const bounds = L.latLngBounds(
            features.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [features, map]);
    return null;
}

// Default center: Lombok area
const DEFAULT_CENTER: [number, number] = [-8.584, 116.109];
const DEFAULT_ZOOM = 10;

export default function SpiGisPage() {
    const { data: gisData, isLoading } = useQuery({
        queryKey: ["gis-materials"],
        queryFn: () => apiFetch<GeoCollection>("/api/gis/material-locations"),
    });

    const features = gisData?.features || [];
    const mismatchCount = features.filter((f) => f.properties.locationMismatch).length;

    return (
        <div className="p-4 md:p-8 space-y-4 h-[calc(100vh-3.5rem)] flex flex-col animate-page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Peta Material (GIS)</h1>
                    <p className="text-sm text-muted-foreground">
                        Lokasi pemasangan material terverifikasi
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1.5">
                        <Layers className="w-3 h-3" /> OpenStreetMap
                    </Badge>
                    <Badge className="bg-[#e8f5e3] text-[#5b7553] hover:bg-[#e8f5e3] gap-1.5 border border-[#5b7553]/20">
                        <CheckCircle className="w-3 h-3" />
                        {features.length} Titik Terverifikasi
                    </Badge>
                    {mismatchCount > 0 && (
                        <Badge variant="destructive" className="gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            {mismatchCount} Location Mismatch
                        </Badge>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-border shadow-sm relative bg-muted">
                {isLoading && (
                    <div className="absolute inset-0 z-[1000] bg-background/60 flex items-center justify-center backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Memuat peta...</p>
                        </div>
                    </div>
                )}

                {features.length === 0 && !isLoading && (
                    <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Belum Ada Data Lokasi</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Titik lokasi akan muncul setelah evidence pemasangan diverifikasi SPI.
                        </p>
                    </div>
                )}

                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    className="w-full h-full z-0"
                    style={{ minHeight: 400 }}
                    scrollWheelZoom
                    zoomControl
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {features.length > 0 && <FitBounds features={features} />}

                    {features.map((feature, idx) => {
                        const { coordinates } = feature.geometry;
                        const props = feature.properties;
                        const isMismatch = props.locationMismatch;
                        const position: [number, number] = [coordinates[1], coordinates[0]];

                        return (
                            <Marker
                                key={`${props.evidenceId}-${idx}`}
                                position={position}
                                icon={isMismatch ? redIcon : greenIcon}
                            >
                                <Popup maxWidth={280}>
                                    <div className="space-y-1.5 text-sm">
                                        <p className="font-semibold text-base">{props.itemName}</p>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                            <span className="text-gray-500">Kode</span>
                                            <span className="font-mono">{props.itemCode}</span>
                                            <span className="text-gray-500">Jumlah</span>
                                            <span>{props.quantity}</span>
                                            <span className="text-gray-500">Cabang</span>
                                            <span>{props.branchName}</span>
                                            <span className="text-gray-500">Ref No</span>
                                            <span className="font-mono">{props.referenceNo}</span>
                                            {props.verifiedAt && (
                                                <>
                                                    <span className="text-gray-500">Verifikasi</span>
                                                    <span>{new Date(props.verifiedAt).toLocaleDateString("id-ID")}</span>
                                                </>
                                            )}
                                            {isMismatch && (
                                                <>
                                                    <span className="text-red-500 font-medium">⚠ Deviasi</span>
                                                    <span className="text-red-600 font-medium">
                                                        {props.deviationMeters ? `${Math.round(props.deviationMeters)}m` : "Ya"}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {isMismatch && (
                                            <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                                                Lokasi pemasangan tidak sesuai rencana
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>

                {/* Legend overlay */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-card/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border text-xs space-y-1.5">
                    <p className="font-semibold text-foreground">Legenda</p>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#2AAD27]" />
                        <span className="text-muted-foreground">Terverifikasi</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#CB2B3E]" />
                        <span className="text-muted-foreground">Location Mismatch</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
