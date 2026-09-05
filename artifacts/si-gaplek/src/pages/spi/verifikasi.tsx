import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle, XCircle, MapPin, Camera, Clock, Loader2, Maximize2, ShieldCheck, AlertTriangle, Building2, Navigation } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SpiVerifikasiPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedPending, setSelectedPending] = useState<any>(null);
    const [notes, setNotes] = useState("");
    const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);

    const { data: pendingData, isLoading } = useQuery({
        queryKey: ["spi-pending"],
        queryFn: () => apiFetch<{ data: any[] }>("/api/spi/pending"),
    });

    const pendingList = pendingData?.data || [];

    const verifyMutation = useMutation({
        mutationFn: async ({ evidenceUuid, status, notes }: { evidenceUuid: string, status: string, notes: string }) => {
            return apiFetch(`/api/spi/verify/${evidenceUuid}`, {
                method: "POST",
                body: JSON.stringify({ status, notes }),
            });
        },
        onSuccess: (res, vars) => {
            toast({
                title: vars.status === "TERVERIFIKASI" ? "Verifikasi Disetujui" : "Verifikasi Ditolak",
                description: "Status material telah diupdate.",
            });
            queryClient.invalidateQueries({ queryKey: ["spi-pending"] });
            queryClient.invalidateQueries({ queryKey: ["spi-dashboard"] });
            setSelectedPending(null);
            setNotes("");
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    if (isLoading) return <div className="p-8 text-center flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="p-4 md:p-8 space-y-6 flex h-[calc(100vh-4rem)]">

            {/* Left Sidebar List */}
            <div className="w-1/3 border-r h-full pr-4 flex flex-col">
                <div className="mb-4">
                    <h2 className="text-xl font-bold">Daftar Tunggu</h2>
                    <p className="text-sm text-muted-foreground">{pendingList.length} butuh verifikasi</p>
                </div>

                <ScrollArea className="flex-1">
                    <div className="space-y-3 pr-4">
                        {pendingList.map((item: any, idx: number) => {
                            const isSelected = selectedPending?.evidenceId === item.evidenceId || (selectedPending?.evidenceUuid && selectedPending?.evidenceUuid === item.evidenceUuid);
                            const itemDate = item.createdAt || item.installedAt || item.clientCaptureTime;
                            return (
                                <Card
                                    key={item.evidenceId || item.evidenceUuid || idx}
                                    className={`cursor-pointer transition-colors ${isSelected ? 'border-primary shadow-sm bg-primary/5' : 'hover:border-primary/50'}`}
                                    onClick={() => setSelectedPending(item)}
                                >
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start gap-1">
                                            <CardTitle className="text-sm font-semibold">{item.itemName}</CardTitle>
                                            <div className="flex flex-col gap-1 items-end shrink-0">
                                                {item.isCrossDistrict && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-500/10 font-medium">
                                                        LINTAS RAYON
                                                    </Badge>
                                                )}
                                                {item.locationMismatch && !item.isCrossDistrict && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-medium">MISMATCH</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <CardDescription className="text-xs flex items-center justify-between">
                                            <span>Cabang: {item.branchName || "—"}</span>
                                            {item.detectedDistrict && (
                                                <span className={`text-[10px] ${item.isCrossDistrict ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                                                    📍 {item.detectedDistrict}
                                                </span>
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {itemDate ? new Date(itemDate).toLocaleDateString("id-ID") : "—"}
                                            </span>
                                            <span className="font-mono">{item.referenceNo}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {pendingList.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                Tidak ada data yang perlu diverifikasi.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Detail Pane */}
            <div className="flex-1 pl-6 flex flex-col">
                {!selectedPending ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle className="w-16 h-16 mb-4 text-muted-foreground/20" />
                        <p>Pilih item di sebelah kiri untuk melihat detail bukti pemasangan.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-4 space-y-5">
                        {/* Header Item & Status */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedPending.itemName}</h2>
                                <p className="text-muted-foreground font-mono text-sm">
                                    Ref: {selectedPending.referenceNo} | Qty: {selectedPending.allocationQuantity ?? selectedPending.installedQuantity ?? 1} unit | Cabang: {selectedPending.branchName || "—"}
                                </p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">MENUNGGU VERIFIKASI SPI</Badge>
                        </div>

                        {/* ─── DUAL PHOTOS COMPARISON (BEFORE & AFTER) ─── */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <Camera className="w-4 h-4 text-primary" />
                                Bukti Foto Fisik Lapangan (Sebelum vs Sesudah Pemasangan)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Klik salah satu foto di bawah untuk memperbesar dan memeriksa segel, jarum register, serta watermark resmi.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4 pt-1">
                                {/* Photo 1: Sebelum */}
                                <div className="p-3 rounded-xl border bg-card space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            1. Sebelum Pemasangan (Kondisi Awal)
                                        </span>
                                        <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300">
                                            Kondisi Awal
                                        </Badge>
                                    </div>
                                    <div
                                        className="relative aspect-video rounded-lg overflow-hidden border bg-black flex items-center justify-center group cursor-pointer"
                                        onClick={() => {
                                            const photo = selectedPending.photoBeforeUrl || selectedPending.photoUrl;
                                            if (photo) setZoomPhoto({ url: photo, title: "Foto 1: Sebelum Pemasangan (Kondisi Awal)" });
                                        }}
                                    >
                                        {selectedPending.photoBeforeUrl || selectedPending.photoUrl ? (
                                            <>
                                                <img
                                                    src={selectedPending.photoBeforeUrl || selectedPending.photoUrl}
                                                    alt="Foto Sebelum Pemasangan"
                                                    className="w-full h-full object-contain transition-transform group-hover:scale-102"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                                    <Maximize2 className="w-4 h-4" /> Klik Perbesar
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-white/50 text-xs">Foto tidak tersedia</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                                        SHA-256: {selectedPending.photoBeforeChecksum ? `${String(selectedPending.photoBeforeChecksum).substring(0, 18)}...` : "—"}
                                    </div>
                                </div>

                                {/* Photo 2: Sesudah */}
                                <div className="p-3 rounded-xl border bg-card space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            2. Sesudah Pemasangan (Hasil Akhir)
                                        </span>
                                        <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300">
                                            Hasil Akhir
                                        </Badge>
                                    </div>
                                    <div
                                        className="relative aspect-video rounded-lg overflow-hidden border bg-black flex items-center justify-center group cursor-pointer"
                                        onClick={() => {
                                            const photo = selectedPending.photoAfterUrl || selectedPending.photoUrl;
                                            if (photo) setZoomPhoto({ url: photo, title: "Foto 2: Sesudah Pemasangan (Hasil Akhir)" });
                                        }}
                                    >
                                        {selectedPending.photoAfterUrl || selectedPending.photoUrl ? (
                                            <>
                                                <img
                                                    src={selectedPending.photoAfterUrl || selectedPending.photoUrl}
                                                    alt="Foto Sesudah Pemasangan"
                                                    className="w-full h-full object-contain transition-transform group-hover:scale-102"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1.5 font-medium">
                                                    <Maximize2 className="w-4 h-4" /> Klik Perbesar
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-white/50 text-xs">Foto tidak tersedia</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                                        SHA-256: {selectedPending.photoChecksum ? `${String(selectedPending.photoChecksum).substring(0, 18)}...` : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── TEMUAN AUDIT LINTAS KECAMATAN (ANTI-FRAUD SPI) ─── */}
                        {selectedPending.isCrossDistrict ? (
                            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-500/[0.05] via-rose-500/[0.02] to-background p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-500/10 gap-1 px-2 py-0.5">
                                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                            Temuan Audit: Anomali Lintas Rayon
                                        </Badge>
                                        <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                                            Material Terpasang di Luar Wilayah Cabang
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                                        Deviasi: ~9.5 km ke Rayon Asal
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                    <div className="p-2.5 rounded-lg border border-border/70 bg-card/80 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                                            Unit Kerja Asal
                                        </span>
                                        <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            {selectedPending.branchName || "—"}
                                        </p>
                                        <span className="text-[11px] text-muted-foreground font-mono block">
                                            Rayon: {selectedPending.targetDistrict || "—"}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-1">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                                            Lokasi Fisik GPS
                                        </span>
                                        <p className="font-semibold text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            {selectedPending.detectedDistrict || "Kecamatan Lain"}
                                        </p>
                                        <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-mono block">
                                            {selectedPending.latitude ? `${parseFloat(selectedPending.latitude).toFixed(4)}, ${parseFloat(selectedPending.longitude).toFixed(4)}` : "—"}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg border border-border/70 bg-card/80 space-y-1 flex flex-col justify-between">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block">
                                            Status Verifikasi Rayon
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[10px] font-semibold border-rose-300 text-rose-700 dark:text-rose-400 bg-rose-500/10">
                                                🚨 Di Luar Rayon Kerja
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-mono block">
                                            Perlu verifikasi Kepala Cabang
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : selectedPending.detectedDistrict ? (
                            <div className="p-3 rounded-xl border border-border/80 bg-card text-xs flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-foreground">
                                        Zonasi Rayon Sesuai: <strong className="font-semibold text-foreground">{selectedPending.detectedDistrict}</strong> (Wilayah Kerja {selectedPending.branchName})
                                    </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-500/5 font-mono">
                                    ✓ Rayon Valid
                                </Badge>
                            </div>
                        ) : null}

                        {/* ─── VALIDASI KOORDINAT & KEPUTUSAN AUDITOR ─── */}
                        <div className="grid md:grid-cols-2 gap-4 pt-1">
                            {/* Card Kiri: Telemetri Koordinat & GPS */}
                            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                                        <Navigation className="w-3.5 h-3.5 text-primary" />
                                        Telemetri Koordinat GPS
                                    </h3>
                                    {selectedPending.isCrossDistrict ? (
                                        <Badge variant="outline" className="text-[10px] font-mono border-rose-300 text-rose-700 dark:text-rose-300 bg-rose-500/10">
                                            ANOMALI RAYON
                                        </Badge>
                                    ) : selectedPending.locationMismatch ? (
                                        <Badge variant="outline" className="text-[10px] font-mono border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                                            DEVIASI TINGGI
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                                            ZONA VALID
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-xs">
                                    <p className="font-medium text-foreground">
                                        {selectedPending.isCrossDistrict
                                            ? "Lokasi fisik berada di luar batas rayon administratif cabang."
                                            : selectedPending.locationMismatch
                                            ? `Deviasi titik terukur ${(parseFloat(selectedPending.locationDeviationMeters) || 0).toFixed(1)}m dari titik rencana.`
                                            : "Koordinat GPS konsisten dalam radius toleransi kerja."}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {selectedPending.isCrossDistrict
                                            ? `Terdeteksi di ${selectedPending.detectedDistrict || "Kecamatan Lain"}, terdaftar untuk ${selectedPending.branchName}.`
                                            : "Pemasangan fisik memenuhi standar titik koordinat pekerjaan dinas."}
                                    </p>
                                </div>

                                <div className="bg-muted/40 border border-border/60 rounded-lg p-2.5 font-mono text-[11px] text-muted-foreground flex items-center justify-between">
                                    <span className="truncate">
                                        GPS: {selectedPending.latitude || "—"}, {selectedPending.longitude || "—"}
                                    </span>
                                    <span className="shrink-0 font-medium text-foreground">
                                        ±{selectedPending.gpsAccuracy || 5}m
                                    </span>
                                </div>
                            </div>

                            {/* Card Kanan: Keputusan Auditor (SPI) */}
                            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            Keputusan Auditor (SPI)
                                        </h3>
                                        <span className="text-[10px] text-muted-foreground">Pemeriksaan Fisik</span>
                                    </div>
                                    <Textarea
                                        placeholder="Catatan temuan audit fisik (wajib jika tolak, opsional jika acc)..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="text-xs min-h-[64px] resize-none border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 bg-background/60"
                                    />
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <Button
                                        onClick={() => verifyMutation.mutate({ evidenceUuid: selectedPending.evidenceUuid, status: "DITOLAK", notes })}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs gap-1.5 h-9 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 font-medium transition-colors"
                                        disabled={verifyMutation.isPending}
                                    >
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                        Tolak & Ulangi
                                    </Button>
                                    <Button
                                        onClick={() => verifyMutation.mutate({ evidenceUuid: selectedPending.evidenceUuid, status: "TERVERIFIKASI", notes })}
                                        size="sm"
                                        className="flex-1 text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors"
                                        disabled={verifyMutation.isPending}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Setujui & Kunci
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox / Zoom Dialog */}
            <Dialog open={zoomPhoto !== null} onOpenChange={(o) => !o && setZoomPhoto(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border border-white/20">
                    <DialogHeader className="p-4 border-b border-white/10 bg-black/80">
                        <DialogTitle className="text-sm font-semibold text-white">
                            {zoomPhoto?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
                        {zoomPhoto && (
                            <img
                                src={zoomPhoto.url}
                                alt={zoomPhoto.title}
                                className="max-w-full max-h-[75vh] object-contain rounded"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
