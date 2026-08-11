import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, XCircle, MapPin, Camera, Clock, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SpiVerifikasiPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedPending, setSelectedPending] = useState<any>(null);
    const [notes, setNotes] = useState("");

    const { data: pendingData, isLoading } = useQuery({
        queryKey: ["spi-pending"],
        queryFn: () => apiFetch<{ data: any[] }>("/api/spi/pending"),
    });

    const pendingList = pendingData?.data || [];

    const verifyMutation = useMutation({
        mutationFn: async ({ id, status, notes }: { id: number, status: string, notes: string }) => {
            return apiFetch("/api/spi/verify", {
                method: "POST",
                body: JSON.stringify({ trackingId: id, status, notes }),
            });
        },
        onSuccess: (res, vars) => {
            toast({
                title: vars.status === "VERIFIED" ? "Verifikasi Disetujui" : "Verifikasi Ditolak",
                description: "Status material telah diupdate.",
            });
            queryClient.invalidateQueries({ queryKey: ["spi-pending"] });
            queryClient.invalidateQueries({ queryKey: ["spi-stats"] });
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
                        {pendingList.map(item => (
                            <Card
                                key={item.trackingId}
                                className={`cursor-pointer transition-colors ${selectedPending?.trackingId === item.trackingId ? 'border-primary shadow-sm bg-primary/5' : 'hover:border-primary/50'}`}
                                onClick={() => setSelectedPending(item)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-semibold">{item.itemName}</CardTitle>
                                        {item.locationMismatch && <Badge variant="destructive" className="text-[10px]">MISMATCH</Badge>}
                                    </div>
                                    <CardDescription className="text-xs">Cabang: {item.branchName}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-2">
                                    <div className="flex gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(item.installedAt).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
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
                    <div className="flex-1 overflow-y-auto pr-4">
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">{selectedPending.itemName}</h2>
                                <p className="text-muted-foreground font-mono text-sm">Ref: {selectedPending.referenceNo} | Qty: {selectedPending.installedQuantity}</p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">MENUNGGU VERIFIKASI</Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4" /> Bukti Foto</h3>
                                <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                                    <img src={selectedPending.evidence.photoUrl} alt="Bukti Pemasangan" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                                        <div className="text-white font-mono text-xs space-y-1">
                                            <p>LAT: {selectedPending.evidence.latitude}</p>
                                            <p>LON: {selectedPending.evidence.longitude}</p>
                                            <p>CHECKSUM: {selectedPending.evidence.checksum.substring(0, 16)}...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Validasi Lokasi</h3>

                                <Card className={selectedPending.locationMismatch ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}>
                                    <CardContent className="p-4 flex gap-3">
                                        {selectedPending.locationMismatch ? (
                                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                        )}

                                        <div>
                                            <p className={`font-semibold text-sm ${selectedPending.locationMismatch ? "text-red-900" : "text-green-900"}`}>
                                                {selectedPending.locationMismatch ? "TERDETEKSI MISMATCH KOORDINAT" : "LOKASI SESUAI"}
                                            </p>
                                            <p className={`text-xs mt-1 ${selectedPending.locationMismatch ? "text-red-700" : "text-green-700"}`}>
                                                {selectedPending.locationMismatch
                                                    ? `Jarak deviasi: ${(selectedPending.deviationMeters || 0).toFixed(1)} meter dari target cabang. Harap periksa apakah titik ini valid atau fraud.`
                                                    : "Jarak deviasi berada dalam batas wajar sistem."}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Separator />

                                <div className="space-y-3 pt-2">
                                    <h3 className="font-semibold text-sm">Keputusan Auditor (SPI)</h3>
                                    <Textarea
                                        placeholder="Catatan temuan atau alasan penolakan..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => verifyMutation.mutate({ id: selectedPending.trackingId, status: "REJECTED", notes })}
                                            variant="destructive"
                                            className="flex-1"
                                            disabled={verifyMutation.isPending}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Tolak & Ulangi
                                        </Button>
                                        <Button
                                            onClick={() => verifyMutation.mutate({ id: selectedPending.trackingId, status: "VERIFIED", notes })}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            disabled={verifyMutation.isPending}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Setujui & Kunci
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
