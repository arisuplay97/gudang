import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, ShieldAlert, ArrowRight, Activity } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

export default function CabangTrackingPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["cabang-tracking"],
        queryFn: () => apiFetch<{ data: any[] }>("/api/tracking"),
    });

    const trackings = data?.data || [];

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Memuat data tracking...</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "MENUNGGU_DITERIMA": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "DITERIMA_CABANG": return "bg-blue-100 text-blue-800 border-blue-200";
            case "MENUNGGU_PEMASANGAN": return "bg-purple-100 text-purple-800 border-purple-200";
            case "MENUNGGU_VERIFIKASI": return "bg-orange-100 text-orange-800 border-orange-200";
            case "TERVERIFIKASI": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getSlaIndicator = (slaStatus: string) => {
        switch (slaStatus) {
            case "NORMAL": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" /> Aman</Badge>;
            case "WARNING": return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50"><Clock className="w-3 h-3 mr-1" /> < 48 Jam</Badge>;
            case "KRITIS": return <Badge variant="destructive" className="bg-red-500"><ShieldAlert className="w-3 h-3 mr-1" /> < 24 Jam</Badge>;
            case "OVERDUE": return <Badge variant="destructive" className="bg-black text-white border-black"><ShieldAlert className="w-3 h-3 mr-1" /> SLA LEWAT</Badge>;
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tracking Material</h1>
                    <p className="text-muted-foreground">Pantau status material dan sisa waktu SLA pemasangan.</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                </div>
            </div>

            {trackings.length === 0 ? (
                <Card className="bg-muted shadow-none border-dashed text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Tidak ada material tracking yang aktif untuk cabang Anda.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {trackings.map((track) => (
                        <Card key={track.id} className="overflow-hidden">
                            <div className="p-4 bg-muted/30 border-b flex justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-base">{track.itemName}</span>
                                        {track.isPartial && <Badge variant="secondary" className="text-[10px]">PARSIAL</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">{track.itemCode} | Ref: {track.referenceNo}</div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${getStatusColor(track.status)}`}>
                                        {track.status.replace("_", " ")}
                                    </span>
                                </div>
                            </div>

                            <CardContent className="p-4">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs">Progress Fisik (Qty)</p>
                                        <p className="font-medium">
                                            {track.installedQuantity} / {track.totalQuantity} <span className="text-xs text-muted-foreground font-normal ml-1">terpasang</span>
                                        </p>
                                    </div>

                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30" />

                                    <div className="space-y-1 text-right">
                                        <p className="text-muted-foreground text-xs leading-none mb-1.5 flex justify-end gap-1 items-center">
                                            Deadline SLA
                                        </p>
                                        <div className="flex items-center justify-end gap-2">
                                            {track.slaDeadlineAt ? (
                                                <>
                                                    <span className="text-sm font-medium">{new Date(track.slaDeadlineAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                    {track.status !== "TERVERIFIKASI" && getSlaIndicator(track.slaStatus)}
                                                </>
                                            ) : <span className="text-xs text-muted-foreground">N/A</span>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
