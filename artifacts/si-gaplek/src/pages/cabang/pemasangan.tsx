import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Camera, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";


export default function CabangPemasanganPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedAllocation, setSelectedAllocation] = useState<any>(null);

    // Evidence state
    const [photoBase64, setPhotoBase64] = useState<string>("");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    // 1. Fetch ALLOCATIONS for CABANG
    const { data: allocationsData, isLoading } = useQuery({
        queryKey: ["cabang-allocations"],
        queryFn: () => apiFetch<{ data: any[] }>("/api/branch/my-allocations"),
    });

    const allocations = allocationsData?.data || [];

    // 2. Submit Evidence
    const submitMutation = useMutation({
        mutationFn: async (payload: any) => {
            return apiFetch("/api/branch/evidence", {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        onSuccess: (data: any) => {
            toast({
                title: "Bukti Pemasangan Terkirim",
                description: data.locationMismatch
                    ? "Terkirim, namun terdeteksi ketidakcocokan lokasi (mismatch)."
                    : "Bukti sukses terkirim dan menunggu verifikasi SPI.",
            });
            queryClient.invalidateQueries({ queryKey: ["cabang-allocations"] });
            setSelectedAllocation(null);
            resetEvidenceState();
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Gagal Kirim Bukti",
                description: error.message,
            });
        },
    });

    const resetEvidenceState = () => {
        setPhotoBase64("");
        setLatitude(null);
        setLongitude(null);
        setGpsAccuracy(null);
    };

    const handleCaptureSimulation = () => {
        // Simulate taking a photo (we'll just use a base64 encoded dummy string)
        setPhotoBase64("data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQBQCQJV/IAgEA");

        // Simulate getting GPS coords (using Math.random for small variance around an assumed location)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLatitude(pos.coords.latitude);
                    setLongitude(pos.coords.longitude);
                    setGpsAccuracy(pos.coords.accuracy);
                },
                (err) => {
                    console.warn("Geolocation failed", err);
                    // Fallback simulation
                    setLatitude(-8.6705 + (Math.random() * 0.001));
                    setLongitude(116.1155 + (Math.random() * 0.001));
                    setGpsAccuracy(5.0);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            // Fallback fallback
            setLatitude(-8.6705);
            setLongitude(116.1155);
            setGpsAccuracy(10.0);
        }
    };

    const handleSubmit = () => {
        if (!selectedAllocation) return;
        if (!photoBase64 || !latitude || !longitude) {
            toast({
                title: "Data Belum Lengkap",
                description: "Pastikan foto dan koordinat GPS telah didapatkan.",
            });
            return;
        }

        submitMutation.mutate({
            allocationId: selectedAllocation.allocationId,
            photoBase64,
            latitude,
            longitude,
            gpsAccuracy,
            clientCaptureTime: new Date().toISOString(),
            idempotencyKey: crypto.randomUUID(),
        });
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground flex items-center justify-center"><Camera className="animate-pulse w-6 h-6 mr-2" /> Memuat data...</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Pemasangan</h1>
                <p className="text-muted-foreground">Kirim bukti foto dan koordinat GPS setelah material terpasang.</p>
            </div>

            {!selectedAllocation ? (
                <div className="space-y-4">
                    <h2 className="font-semibold text-lg">Pilih Material Yang Akan Dipasang</h2>
                    {allocations.length === 0 ? (
                        <Card className="bg-muted shadow-none border-dashed text-center py-6">
                            <p className="text-sm text-muted-foreground">Belum ada alokasi material yang siap dipasang.</p>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {allocations.map((alloc) => (
                                <Card
                                    key={alloc.allocationId}
                                    className={`cursor-pointer transition-colors hover:border-primary/50 relative overflow-hidden ${alloc.status === 'VERIFIED' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    onClick={() => alloc.status !== 'VERIFIED' && setSelectedAllocation(alloc)}
                                >
                                    {alloc.status === "VERIFIED" && <div className="absolute inset-0 bg-green-500/5 backdrop-blur-[1px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><CheckCircle2 className="text-green-600 w-12 h-12" /></div>}
                                    <CardHeader className="py-3 px-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle className="text-sm">{alloc.itemName}</CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    Ref: {alloc.referenceNo} | Qty: {alloc.quantity}
                                                </CardDescription>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${alloc.status === "VERIFIED" ? "bg-green-100 text-green-800" :
                                                    alloc.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                                        "bg-blue-100 text-blue-800"
                                                    }`}>
                                                    {alloc.status}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedAllocation(null); resetEvidenceState(); }} className="-ml-3">
                        <RotateCcw className="w-4 h-4 mr-2" /> Batal Pilih
                    </Button>

                    <Card className="border-2 border-primary/20">
                        <CardHeader className="bg-primary/5 mb-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                Target: {selectedAllocation.itemName} (Qty: {selectedAllocation.quantity})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-4 bg-muted/30">
                                {photoBase64 ? (
                                    <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center group">
                                        <span className="text-white/50 text-xs uppercase tracking-widest absolute">Simulated Photo Captured</span>
                                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm p-2 rounded text-[10px] text-white space-y-1 font-mono flex flex-col">
                                            <span className="text-green-400">SI_GAPLEK_VER_1.8</span>
                                            <span>LAT: {latitude?.toFixed(6) ?? "N/A"}</span>
                                            <span>LON: {longitude?.toFixed(6) ?? "N/A"}</span>
                                            <span>TIME: {new Date().toISOString()}</span>
                                        </div>
                                        <Button variant="secondary" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={resetEvidenceState}>
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">Buka kamera dan ambil foto pemasangan di titik lokasi (wajib menyalakan GPS device).</p>
                                        <Button onClick={handleCaptureSimulation} variant="outline" className="mt-2">Simulasi Ambil Foto & GPS</Button>
                                    </>
                                )}
                            </div>

                            {latitude && (
                                <div className="flex gap-2 items-start p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-900">
                                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="font-semibold block mb-1">Koordinat Terkunci</span>
                                        <span className="font-mono text-xs opacity-80">{latitude}, {longitude} (Acc: {gpsAccuracy?.toFixed(1) || '?'}m)</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={submitMutation.isPending || !photoBase64 || !latitude}
                                className="w-full"
                                size="lg"
                            >
                                {submitMutation.isPending ? "Mengunggah..." : "Kirim Bukti ke SPI"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
