import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Clock, AlertTriangle, CheckCircle, BarChart3, Activity } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function SpiDashboardPage() {
    // Fetch SPI Stats
    const { data: statsData, isLoading } = useQuery({
        queryKey: ["spi-stats"],
        queryFn: () => apiFetch<{ data: any }>("/api/spi/stats"),
    });

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    const stats = statsData?.data || { pending: 0, verified: 0, rejected: 0, criticalSla: 0, overdueSla: 0 };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard SPI</h1>
                <p className="text-muted-foreground">Satuan Pengawasan Intern - Ringkasan Audit dan Verifikasi Pemasangan.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                <Card className="bg-orange-50/50 border-orange-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-900">Menunggu Verifikasi</CardTitle>
                        <Clock className="w-4 h-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-700">{stats.pending}</div>
                        <p className="text-xs text-orange-600/80 mt-1">Bukti fisik masuk, butuh review</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Selesai Diverifikasi</CardTitle>
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">{stats.verified}</div>
                        <p className="text-xs text-green-600/80 mt-1">Sesuai dengan standard</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">SLA Kritis & Overdue</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700">{stats.criticalSla + stats.overdueSla}</div>
                        <p className="text-xs text-red-600/80 mt-1">Material terancam denda vendor</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Temuan Ditolak (Mismatch)</CardTitle>
                        <Activity className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700">{stats.rejected}</div>
                        <p className="text-xs text-blue-600/80 mt-1">Tidak memenuhi syarat / GPS Mismatch</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" /> Distribusi Cabang (Mock)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center border-t border-dashed">
                        <div className="text-center text-muted-foreground text-sm">
                            [ Chart Placeholder ]<br />Membutuhkan library seperti Recharts.
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" /> Cabang SLA Rendah
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="border-t border-dashed">
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium">Cabang Selatan</span>
                                <span className="text-red-500 font-bold">45% Overdue</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium">Cabang Barat</span>
                                <span className="text-yellow-600 font-bold">20% Kritis</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
