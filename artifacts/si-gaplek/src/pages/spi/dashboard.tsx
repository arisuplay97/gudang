import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Package,
  Truck,
  MapPin,
  Timer,
  Eye,
  ArrowUpRight,
  ClipboardList,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
    branchId?: number;
    branchName: string;
    total: number;
    verified?: number;
    overdue?: number;
  }>;
}

const DONUT_COLORS = [
  "#3b82f6", // Biru - Menunggu Diterima
  "#06b6d4", // Cyan - Diterima Cabang
  "#f59e0b", // Amber - Menunggu Pemasangan
  "#10b981", // Emerald - Terpasang
  "#8b5cf6", // Purple - Menunggu Verifikasi
  "#14b8a6", // Teal - Terverifikasi
];

/* ── Premium Card Container ── */
function DashCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-5 bg-card text-card-foreground border border-border/80 shadow-xs dark:shadow-none transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Minimalist Tooltip for Charts ── */
function SpiTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl p-3 bg-card/95 backdrop-blur-md border border-border shadow-xl text-card-foreground text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground border-b border-border/60 pb-1">
        {payload[0].name || payload[0].payload?.branchName || payload[0].payload?.name}
      </p>
      {payload.map((item: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: item.color || item.fill }}
            />
            {item.name || "Kuantitas"}:
          </span>
          <span className="font-mono font-bold text-foreground">
            {Number(item.value).toLocaleString("id-ID")}
          </span>
        </div>
      ))}
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
    totalTracked: 0,
    menungguDiterima: 0,
    diterimaCabang: 0,
    menungguPemasangan: 0,
    terpasang: 0,
    menungguVerifikasi: 0,
    terverifikasi: 0,
    overdue: 0,
    locationMismatch: 0,
    terpasangSebagian: 0,
  };
  const branchPerformance = data?.branchPerformance || [];

  const statusChartData = [
    { name: "Menunggu Diterima", value: cards.menungguDiterima },
    { name: "Diterima Cabang", value: cards.diterimaCabang },
    { name: "Menunggu Pemasangan", value: cards.menungguPemasangan },
    { name: "Terpasang", value: cards.terpasang },
    { name: "Menunggu Verifikasi", value: cards.menungguVerifikasi },
    { name: "Terverifikasi", value: cards.terverifikasi },
  ].filter((d) => d.value > 0);

  // SLA compliance calculation
  const total = cards.totalTracked || 1;
  const onTimeCount = cards.terverifikasi + cards.terpasang + cards.menungguVerifikasi;
  const compliance = Math.min(100, Math.max(0, Math.round((onTimeCount / total) * 100)));

  // SLA Status distribution
  const normalCount = cards.diterimaCabang + cards.menungguPemasangan;
  const partialCount = cards.terpasangSebagian ?? 0;
  const inReviewCount = cards.menungguVerifikasi;
  const overdueCount = cards.overdue;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Satuan Pengawasan Intern (SPI)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Dashboard Pengawasan Aksesoris
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Monitoring real-time kepatuhan SLA 7 hari, anomali koordinat GPS, dan verifikasi fisik pemasangan
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate("/spi/verifikasi")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Verifikasi Lapangan
              {cards.menungguVerifikasi > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {cards.menungguVerifikasi}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/spi/laporan-audit")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Laporan Audit
            </button>
            <button
              onClick={() => navigate("/spi/gis")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary" />
              Peta GIS
            </button>
          </div>
        </div>

        {/* ── Section 1: Executive KPI Cards (Unified, Clean, Non-AI-Slop) ── */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Card 1: Total Tracked */}
          <DashCard className="relative overflow-hidden group hover:border-border transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Tracked
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : cards.totalTracked.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 flex items-center justify-center text-foreground shrink-0">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Unit dalam pengawasan</span>
              <span className="font-semibold text-foreground font-mono">{compliance}% patuh SLA</span>
            </div>
          </DashCard>

          {/* Card 2: Diterima Cabang */}
          <DashCard className="relative overflow-hidden group hover:border-border transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Diterima Cabang
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : cards.diterimaCabang.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 flex items-center justify-center text-foreground shrink-0">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Fisik ada di cabang</span>
              <span className="font-semibold text-foreground font-mono">{cards.menungguPemasangan} antre pasang</span>
            </div>
          </DashCard>

          {/* Card 3: Terpasang */}
          <DashCard className="relative overflow-hidden group hover:border-border transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Terpasang Fisik
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 inline-block" />
                    ) : (
                      cards.terpasang.toLocaleString("id-ID")
                    )}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 flex items-center justify-center text-foreground shrink-0">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Selesai di pelanggan</span>
              <span className="font-semibold text-foreground font-mono">
                +{cards.terpasangSebagian ?? 0} parsial
              </span>
            </div>
          </DashCard>

          {/* Card 4: Terverifikasi */}
          <DashCard className="relative overflow-hidden group hover:border-border transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Terverifikasi SPI
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {isLoading ? <Skeleton className="h-8 w-16 inline-block" /> : cards.terverifikasi.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 flex items-center justify-center text-foreground shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Valid &amp; Lolos Audit</span>
              <span className="font-semibold text-foreground font-mono">
                {cards.menungguVerifikasi} antre review
              </span>
            </div>
          </DashCard>

          {/* Card 5: Overdue / Anomali */}
          <DashCard
            className={`relative overflow-hidden group transition-colors ${
              cards.overdue > 0 || cards.locationMismatch > 0
                ? "border-rose-500/30 bg-rose-500/[0.02]"
                : "hover:border-border"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Perlu Perhatian
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 inline-block" />
                    ) : (
                      (cards.overdue + cards.locationMismatch).toLocaleString("id-ID")
                    )}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 text-foreground flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className={cards.overdue > 0 ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>
                {cards.overdue} SLA Terlewat
              </span>
              <span
                className={`font-semibold ${
                  cards.locationMismatch > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                }`}
              >
                {cards.locationMismatch} Anomali GPS
              </span>
            </div>
          </DashCard>
        </div>

        {/* ── Section 2: SLA Analysis, Status Pipeline, and Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: SLA Overview & Compliance */}
          <DashCard className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">SLA Overview</h3>
                  <p className="text-xs text-muted-foreground">Kepatuhan batas 7 hari kerja</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tingkat Kepatuhan SLA</span>
                  <span
                    className={`font-bold font-mono text-sm ${
                      compliance >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : compliance >= 60
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {compliance}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${cards.totalTracked ? Math.round((normalCount / cards.totalTracked) * 100) : 0}%`,
                    }}
                    title="Normal"
                  />
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{
                      width: `${cards.totalTracked ? Math.round((partialCount / cards.totalTracked) * 100) : 0}%`,
                    }}
                    title="Parsial / Warning"
                  />
                  <div
                    className="h-full bg-sky-500 transition-all duration-500"
                    style={{
                      width: `${cards.totalTracked ? Math.round((inReviewCount / cards.totalTracked) * 100) : 0}%`,
                    }}
                    title="Verifikasi"
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{
                      width: `${cards.totalTracked ? Math.round((overdueCount / cards.totalTracked) * 100) : 0}%`,
                    }}
                    title="Overdue"
                  />
                </div>
              </div>

              {/* Breakdown List */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-medium text-foreground">Sesuai SLA (Normal)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {normalCount} unit
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-medium text-foreground">Terpasang Parsial</span>
                  </div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {partialCount} unit
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span className="font-medium text-foreground">Menunggu Verifikasi</span>
                  </div>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {inReviewCount} unit
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-medium text-foreground">Melewati Batas (Overdue)</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {overdueCount} unit
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Target resolusi SLA: 7 hari kerja
              </span>
              <button
                onClick={() => navigate("/spi/laporan-audit")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Detail Audit <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </DashCard>

          {/* Card 2: Status Pelacakan Detail */}
          <DashCard className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Status Pelacakan Detail</h3>
                  <p className="text-xs text-muted-foreground">Posisi material dalam alur operasional</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {/* Menunggu Diterima */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Menunggu Diterima</p>
                      <p className="text-[11px] text-muted-foreground">Belum di-scan barcode cabang</p>
                    </div>
                  </div>
                  <Badge variant={cards.menungguDiterima > 0 ? "destructive" : "secondary"}>
                    {cards.menungguDiterima}
                  </Badge>
                </div>

                {/* Menunggu Pemasangan */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Menunggu Pemasangan</p>
                      <p className="text-[11px] text-muted-foreground">Sudah di cabang, antre pasang</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{cards.menungguPemasangan}</Badge>
                </div>

                {/* Sebagian Terpasang */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Sebagian Terpasang</p>
                      <p className="text-[11px] text-muted-foreground">Pemasangan bertahap di lapangan</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{cards.terpasangSebagian ?? 0}</Badge>
                </div>

                {/* Location Mismatch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Lokasi Tidak Sesuai (GPS)</p>
                      <p className="text-[11px] text-muted-foreground">Koordinat beda &gt; 150m dari SPK</p>
                    </div>
                  </div>
                  <Badge variant={cards.locationMismatch > 0 ? "destructive" : "secondary"}>
                    {cards.locationMismatch}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Status real-time dari database</span>
              <button
                onClick={() => navigate("/cabang/tracking")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Pelacakan Detail <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </DashCard>

          {/* Card 3: Aksi Audit Cepat SPI */}
          <DashCard className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Aksi Audit & Verifikasi</h3>
                  <p className="text-xs text-muted-foreground">Pintas tugas dan pengawasan prioritas</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {/* Action 1: Verifikasi Pending */}
                <button
                  onClick={() => navigate("/spi/verifikasi")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/60 text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        Verifikasi Bukti Pemasangan
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {cards.menungguVerifikasi} berkas foto &amp; koordinat menunggu review
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>

                {/* Action 2: Material Overdue */}
                <button
                  onClick={() => navigate("/cabang/tracking")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-border transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/60 text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground transition-colors">
                        Investigasi Material Overdue
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {cards.overdue} material melewati batas 7 hari
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground transition-colors shrink-0" />
                </button>

                {/* Action 3: Peta GIS */}
                <button
                  onClick={() => navigate("/spi/gis")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-border transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/60 text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground transition-colors">
                        Inspeksi Peta GIS Material
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Sebaran koordinat GPS dan kepatuhan radius pemasangan
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground transition-colors shrink-0" />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>SOP Audit SPI Perumdam</span>
              <button
                onClick={() => navigate("/spi/laporan-audit")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Unduh Berita Acara <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </DashCard>
        </div>

        {/* ── Section 3: Visual Analytics & Performance Charts ── */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Chart 1: Donut Chart Distribusi Status */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Distribusi Status Material
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Komposisi seluruh material yang tercatat
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                Total: {cards.totalTracked} Unit
              </span>
            </div>

            <div className="h-60">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : statusChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Belum ada data tracking tersimpan.
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
                      innerRadius={55}
                      outerRadius={85}
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {statusChartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<SpiTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Clean Grid Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border/50">
              {statusChartData.map((d, i) => (
                <div
                  key={d.name}
                  className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <div className="truncate">
                    <p className="truncate text-muted-foreground text-[11px]">{d.name}</p>
                    <p className="font-mono font-bold text-foreground text-xs">{d.value} unit</p>
                  </div>
                </div>
              ))}
            </div>
          </DashCard>

          {/* Chart 2: Performa & Kepatuhan Cabang */}
          <DashCard className="p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Performa &amp; Kepatuhan Cabang
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Perbandingan kuantitas total, verifikasi lolos, dan terlambat
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Total
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Terverifikasi
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Overdue
                </span>
              </div>
            </div>

            <div className="h-60">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : branchPerformance.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Belum ada data performa cabang yang tercatat.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="branchName"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<SpiTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name="Total Unit"
                    />
                    <Bar
                      dataKey="verified"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Terverifikasi"
                    />
                    <Bar
                      dataKey="overdue"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      name="Overdue SLA"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
              <span>Diperbarui otomatis dari aktivitas transaksi cabang</span>
              <button
                onClick={() => navigate("/spi/laporan-audit")}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Lihat Rekapitulasi <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </DashCard>
        </div>
      </div>
    </div>
  );
}
