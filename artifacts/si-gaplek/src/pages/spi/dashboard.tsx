import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck, Clock, AlertTriangle, CheckCircle, BarChart3, Activity,
    Package, Truck, MapPin, Timer, Eye, XCircle,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts";
import { useLocation } from "wouter";

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
        verified?: number;
        overdue?: number;
    }>;
}

const PIE_COLORS = ["#e8c468", "#5b7553", "#8b6b4a", "#a3b899", "#c27c5a", "#6b9080"];

function DashCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl p-5 bg-white dark:bg-card border border-[#eae8e0] dark:border-border transition-colors duration-200 ${className}`}>
            {children}
        </div>
    );
}

export default function SpiDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["spi-dashboard"],
        queryFn: () => apiFetch<SpiDashboardData>("/api/spi/dashboard"),
    });
    const [, navigate] = useLocation();

    const cards = data?.cards || {
        totalTracked: 0, menungguDiterima: 0, diterimaCabang: 0,
        menungguPemasangan: 0, terpasang: 0, menungguVerifikasi: 0,
        terverifikasi: 0, overdue: 0, locationMismatch: 0, terpasangSebagian: 0,
    };
    const branchPerformance = data?.branchPerformance || [];

    const statusChartData = [
        { name: "Menunggu Diterima", value: cards.menungguDiterima },
        { name: "Diterima Cabang", value: cards.diterimaCabang },
        { name: "Menunggu Pemasangan", value: cards.menungguPemasangan },
        { name: "Terpasang", value: cards.terpasang },
        { name: "Menunggu Verifikasi", value: cards.menungguVerifikasi },
        { name: "Terverifikasi", value: cards.terverifikasi },
    ].filter(d => d.value > 0);

    // SLA compliance calculation
    const total = cards.totalTracked || 1;
    const onTimeCount = cards.terverifikasi + cards.terpasang + cards.menungguVerifikasi;
    const compliance = Math.round((onTimeCount / total) * 100);

    // SLA Overview breakdown
    const slaItems = [
        { label: "Normal", count: cards.diterimaCabang + cards.menungguPemasangan, color: "bg-[#5b7553]", textColor: "text-[#5b7553] dark:text-green-400" },
        { label: "Warning", count: cards.terpasangSebagian ?? 0, color: "bg-[#e8c468]", textColor: "text-[#d4a55a] dark:text-yellow-400" },
        { label: "Kritis", count: cards.menungguVerifikasi, color: "bg-[#c27c5a]", textColor: "text-[#c27c5a] dark:text-orange-400" },
        { label: "Overdue", count: cards.overdue, color: "bg-red-600", textColor: "text-red-600 dark:text-red-400" },
    ];

    return (
        <div className="min-h-screen bg-[#f7f6f3] dark:bg-background transition-colors duration-200">
            <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-[#2d2d2a] dark:text-foreground">Dashboard SPI</h1>
                    <p className="text-sm text-[#8a8a7a] dark:text-muted-foreground">
                        Satuan Pengawasan Intern — Audit dan Verifikasi
                    </p>
                </div>

                {/* Row 1: KPI Cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {/* Total Tracked */}
                    <div className="rounded-2xl p-5 bg-[#5b7553] text-white">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium opacity-80">Total Tracked</p>
                            <Package className="w-4 h-4 opacity-60" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16 bg-white/20" /> : (
                            <>
                                <p className="text-3xl font-bold">{cards.totalTracked}</p>
                                <p className="text-xs opacity-60 mt-1">Material dalam pelacakan</p>
                            </>
                        )}
                    </div>

                    {/* Diterima */}
                    <DashCard>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Diterima</p>
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-[#2d2d2a] dark:text-foreground">{cards.diterimaCabang}</p>
                        )}
                    </DashCard>

                    {/* Terpasang */}
                    <DashCard>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Terpasang</p>
                            <Activity className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-[#2d2d2a] dark:text-foreground">{cards.terpasang}</p>
                        )}
                    </DashCard>

                    {/* Terverifikasi */}
                    <DashCard>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Terverifikasi</p>
                            <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-[#5b7553] dark:text-green-500">{cards.terverifikasi}</p>
                        )}
                    </DashCard>

                    {/* Overdue */}
                    <DashCard>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Overdue</p>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className={`text-2xl font-bold ${cards.overdue > 0 ? "text-red-600 dark:text-red-500" : "text-[#2d2d2a] dark:text-foreground"}`}>
                                {cards.overdue}
                            </p>
                        )}
                    </DashCard>
                </div>

                {/* Row 2: SLA Overview + SLA Compliance + Detail cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* SLA Overview */}
                    <DashCard>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">SLA Overview</p>
                                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Status SLA 7 hari</p>
                            </div>
                            <Timer className="w-4 h-4 text-[#d4a55a] dark:text-yellow-500" />
                        </div>
                        <div className="space-y-2.5">
                            {slaItems.map(item => (
                                <div key={item.label} className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                        <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground">{item.label}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                        {/* Compliance bar */}
                        <div className="mt-4 pt-3 border-t border-[#eae8e0] dark:border-border">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Compliance</p>
                                <p className={`text-sm font-bold ${compliance >= 80 ? "text-[#5b7553]" : compliance >= 60 ? "text-[#d4a55a]" : "text-[#c27c5a]"}`}>
                                    {compliance}%
                                </p>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${compliance}%`,
                                        background: compliance >= 80 ? "#5b7553" : compliance >= 60 ? "#e8c468" : "#c27c5a",
                                    }}
                                />
                            </div>
                        </div>
                    </DashCard>

                    {/* Detail secondary cards */}
                    <DashCard>
                        <p className="text-sm font-semibold mb-4 text-[#2d2d2a] dark:text-foreground">Status Detail</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 py-1.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#fff0e6] dark:bg-orange-950/50">
                                    <Truck className="w-4 h-4 text-[#c27c5a] dark:text-orange-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Menunggu Diterima</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Belum di-scan cabang</p>
                                </div>
                                <Badge variant={cards.menungguDiterima > 0 ? "destructive" : "secondary"}>{cards.menungguDiterima}</Badge>
                            </div>
                            <div className="flex items-center gap-3 py-1.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f5f0e0] dark:bg-yellow-950/50">
                                    <Timer className="w-4 h-4 text-[#8b6b4a] dark:text-yellow-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Menunggu Pemasangan</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Sudah diterima, belum dipasang</p>
                                </div>
                                <Badge variant="secondary">{cards.menungguPemasangan}</Badge>
                            </div>
                            <div className="flex items-center gap-3 py-1.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950/50">
                                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Sebagian Terpasang</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Partial installation</p>
                                </div>
                                <Badge variant="secondary">{cards.terpasangSebagian ?? 0}</Badge>
                            </div>
                            <div className="flex items-center gap-3 py-1.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#fff0e6] dark:bg-rose-950/50">
                                    <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Location Mismatch</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Lokasi tidak sesuai</p>
                                </div>
                                <Badge variant={cards.locationMismatch > 0 ? "destructive" : "secondary"}>{cards.locationMismatch}</Badge>
                            </div>
                        </div>
                    </DashCard>

                    {/* Quick actions */}
                    <DashCard className="bg-[#fffdf5] dark:bg-card">
                        <p className="text-sm font-semibold mb-4 text-[#2d2d2a] dark:text-foreground">Aksi Cepat SPI</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate("/spi/verifikasi")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#e8f5e3] dark:bg-green-950/50">
                                    <Eye className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Verifikasi Pending</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">{cards.menungguVerifikasi} menunggu review</p>
                                </div>
                            </button>
                            <button
                                onClick={() => navigate("/cabang/tracking")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#fff0e6] dark:bg-red-950/50">
                                    <AlertTriangle className="w-4 h-4 text-[#c27c5a] dark:text-red-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Material Overdue</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">{cards.overdue} melewati SLA</p>
                                </div>
                            </button>
                            <button
                                onClick={() => navigate("/spi/gis")}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/50">
                                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Peta Material (GIS)</p>
                                    <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Lokasi pemasangan terverifikasi</p>
                                </div>
                            </button>
                        </div>
                    </DashCard>
                </div>

                {/* Row 3: Charts */}
                <div className="grid gap-5 md:grid-cols-2">
                    {/* Status Distribution Pie */}
                    <DashCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#8a8a7a] dark:text-muted-foreground" />
                            <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Distribusi Status Material</p>
                        </div>
                        <div className="h-56">
                            {isLoading ? (
                                <Skeleton className="h-full w-full rounded-xl" />
                            ) : statusChartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-[#8a8a7a] dark:text-muted-foreground">
                                    Belum ada data tracking.
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
                                            innerRadius={50}
                                            outerRadius={80}
                                            strokeWidth={3}
                                            stroke="var(--color-card, #fff)"
                                        >
                                            {statusChartData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eae8e0", fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {statusChartData.map((d, i) => (
                                <span key={d.name} className="flex items-center gap-1.5 text-xs text-[#6b6b5e] dark:text-muted-foreground">
                                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    {d.name}: <b>{d.value}</b>
                                </span>
                            ))}
                        </div>
                    </DashCard>

                    {/* Branch Performance Bar */}
                    <DashCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-[#8a8a7a] dark:text-muted-foreground" />
                            <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Performa Cabang</p>
                        </div>
                        <div className="h-56">
                            {isLoading ? (
                                <Skeleton className="h-full w-full rounded-xl" />
                            ) : branchPerformance.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-[#8a8a7a] dark:text-muted-foreground">
                                    Belum ada data performa cabang.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={branchPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eae8e0" strokeOpacity={0.5} />
                                        <XAxis dataKey="branchName" tick={{ fontSize: 11, fill: "#8a8a7a" }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a8a7a" }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eae8e0", fontSize: 12 }} />
                                        <Bar dataKey="total" fill="#5b7553" radius={[6, 6, 0, 0]} name="Total" />
                                        <Bar dataKey="verified" fill="#a3b899" radius={[6, 6, 0, 0]} name="Terverifikasi" />
                                        <Bar dataKey="overdue" fill="#c27c5a" radius={[6, 6, 0, 0]} name="Overdue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs text-[#6b6b5e] dark:text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-[#5b7553]" /> Total
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-[#6b6b5e] dark:text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-[#a3b899]" /> Terverifikasi
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-[#6b6b5e] dark:text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-[#c27c5a]" /> Overdue
                            </span>
                        </div>
                    </DashCard>
                </div>
            </div>
        </div>
    );
}
