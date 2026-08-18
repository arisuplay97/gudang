import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ShieldCheck, Clock, AlertTriangle, CheckCircle, BarChart3, Activity,
    Package, Truck, MapPin, Timer, Loader2
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";

interface SpiDashboardData {
    cards: {
        totalTracked: number;
        menungguDiterima: number;
        diterimaCabang: number;
        menungguPemasangan: number;
        terpasang: number;
        menungguVerifikasi: number;
        terverifikasi: number;
        overdue: number;
        locationMismatch: number;
        terpasangSebagian?: number;
    };
    branchPerformance: Array<{
        branchName: string;
        total: number;
    }>;
}

const STATUS_COLORS = [
    "#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#06b6d4",
    "#eab308", "#ef4444", "#6366f1",
];

export default function SpiDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["spi-dashboard"],
        queryFn: () => apiFetch<SpiDashboardData>("/api/spi/dashboard"),
    });

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const cards = data?.cards || {
        totalTracked: 0, menungguDiterima: 0, diterimaCabang: 0,
        menungguPemasangan: 0, terpasang: 0, menungguVerifikasi: 0,
        terverifikasi: 0, overdue: 0, locationMismatch: 0, terpasangSebagian: 0,
    };

    const branchPerformance = data?.branchPerformance || [];

    // Status distribution chart data
    const statusChartData = [
        { name: "Menunggu Diterima", value: cards.menungguDiterima },
        { name: "Diterima Cabang", value: cards.diterimaCabang },
        { name: "Menunggu Pemasangan", value: cards.menungguPemasangan },
        { name: "Terpasang", value: cards.terpasang },
        { name: "Menunggu Verifikasi", value: cards.menungguVerifikasi },
        { name: "Terverifikasi", value: cards.terverifikasi },
    ].filter(d => d.value > 0);

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard SPI</h1>
                <p className="text-muted-foreground">
                    Satuan Pengawasan Intern — Ringkasan Audit dan Verifikasi Pemasangan.
                </p>
            </div>

            {/* Row 1: Overview cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="bg-slate-50/50 border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-900">Total Tracked</CardTitle>
                        <Package className="w-4 h-4 text-slate-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-700">{cards.totalTracked}</div>
                        <p className="text-xs text-slate-600/80 mt-1">Material dalam pelacakan</p>
                    </CardContent>
                </Card>

                <Card className="bg-yellow-50/50 border-yellow-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-900">Menunggu Diterima</CardTitle>
                        <Truck className="w-4 h-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-700">{cards.menungguDiterima}</div>
                        <p className="text-xs text-yellow-600/80 mt-1">Belum di-scan cabang</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50/50 border-orange-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-orange-900">Menunggu Verifikasi</CardTitle>
                        <Clock className="w-4 h-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-700">{cards.menungguVerifikasi}</div>
                        <p className="text-xs text-orange-600/80 mt-1">Bukti fisik, butuh review</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Terverifikasi</CardTitle>
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">{cards.terverifikasi}</div>
                        <p className="text-xs text-green-600/80 mt-1">Sesuai standard</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">Overdue</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700">{cards.overdue}</div>
                        <p className="text-xs text-red-600/80 mt-1">Melewati SLA 7 hari</p>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Secondary cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Diterima Cabang</CardTitle>
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cards.diterimaCabang}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Belum Terpasang</CardTitle>
                        <Timer className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cards.menungguPemasangan}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Terpasang Sebagian</CardTitle>
                        <Activity className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cards.terpasangSebagian ?? 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Terpasang</CardTitle>
                        <CheckCircle className="w-4 h-4 text-teal-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cards.terpasang}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Location Mismatch</CardTitle>
                        <MapPin className="w-4 h-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{cards.locationMismatch}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" /> Distribusi Status Material
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {statusChartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Belum ada data tracking material.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {statusChartData.map((_, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" /> Performa Cabang (Jumlah Tracking)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                        {branchPerformance.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Belum ada data performa cabang.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="branchName" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Tracking" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
