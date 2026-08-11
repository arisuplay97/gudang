import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Layers, Loader2 } from "lucide-react";

export default function SpiGisPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { data: gisData, isLoading } = useQuery({
        queryKey: ["gis-materials"],
        queryFn: () => apiFetch<{ type: string, features: any[] }>("/api/gis/material-locations"),
    });

    // Mock Map Rendering for sandbox context
    useEffect(() => {
        if (!canvasRef.current || isLoading || !gisData) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear
        ctx.fillStyle = "#e2e8f0"; // slate-200 map background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw pseudo grid to look like a map
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        // "Render" GeoJSON points
        const features = gisData.features || [];

        features.forEach(feature => {
            // Very crude projection just to show points on the canvas
            // Assuming coordinates around Lombok (-8.6, 116.1)
            const lon = feature.geometry.coordinates[0];
            const lat = feature.geometry.coordinates[1];

            const x = ((lon - 116.0) / 0.5) * canvas.width;
            const y = ((lat + 8.8) / 0.5) * canvas.height; // inverted for simple pseudo projection

            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = "#16a34a"; // green-600
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "white";
            ctx.stroke();

            // Label
            ctx.fillStyle = "#000";
            ctx.font = "10px sans-serif";
            ctx.fillText(feature.properties.itemName, x + 8, y + 4);
        });

        // Draw Map attribution/overlay
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(10, canvas.height - 30, 200, 20);
        ctx.fillStyle = "#000";
        ctx.fillText("Simulated GeoJSON Map Render", 15, canvas.height - 15);

    }, [gisData, isLoading]);

    return (
        <div className="p-4 md:p-8 space-y-4 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Peta Material (GIS)</h1>
                    <p className="text-muted-foreground">Geographic Information System untuk pergerakan material TERVERIFIKASI.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-white"><Layers className="w-3 h-3 mr-1" /> Base Layer</Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{gisData?.features?.length || 0} Material Map Points</Badge>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden relative border-2 shadow-inner">
                {isLoading && (
                    <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Placeholder instruction since we cannot npm install leaflet mid-sandbox safely without restart */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded-lg shadow max-w-sm border backdrop-blur">
                    <h3 className="font-bold flex items-center gap-2 mb-1"><Map className="w-4 h-4" /> Integrasi Peta</h3>
                    <p className="text-xs text-muted-foreground">
                        Dalam produksi, ganti canvas ini dengan <code>React-Leaflet</code>. SI GAPLEK Backend sudah dikonfigurasi untuk mengeluarkan endpoint GIS standard:
                        <br /><code className="text-[10px] mt-1 block bg-muted p-1 rounded">/api/gis/material-locations</code>
                        dalam struktur GeoJSON murni.
                    </p>
                </div>

                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="w-full h-full object-cover cursor-crosshair"
                    title="SIMULATED MAP"
                />
            </Card>
        </div>
    );
}
