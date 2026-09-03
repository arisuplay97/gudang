import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  ScanBarcode,
  PackageCheck,
  Wrench,
  ShieldCheck,
  ArrowRight,
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Activity,
  FolderOpen
} from "lucide-react";

interface ShipmentItem {
  trackingId: number;
  trackingUuid: string;
  status: string;
  receivedAt: string | null;
  itemName: string;
  itemCode: string;
}

interface Shipment {
  id: number;
  referenceNo: string;
  destinationBranchId: number;
  destinationBranchName: string;
  warehouseName: string;
  qrToken: string;
  notes: string | null;
  transactionDate: string;
  totalUnits: number;
  receivedUnits: number;
  pendingUnits: number;
  receiptStatus: "PENDING" | "PARTIAL" | "COMPLETED";
  isFullyReceived: boolean;
  units: ShipmentItem[];
}

interface DashboardStats {
  branchId: number | null;
  branchName: string;
  activeShipmentsCount: number;
  pendingUnitsCount: number;
  receivedUnitsCount: number;
  installedUnitsCount: number;
  verifiedUnitsCount: number;
}

export default function CabangDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [scannerOpen, setScannerOpen] = useState(false);

  const { data: statsData, isLoading: loadingStats } = useQuery<DashboardStats>({
    queryKey: ["branch-dashboard-stats"],
    queryFn: () => apiFetch<DashboardStats>("/api/branch/dashboard-stats"),
  });

  const { data: shipmentsData, isLoading: loadingShipments } = useQuery<{ data: Shipment[] }>({
    queryKey: ["branch-shipments"],
    queryFn: () => apiFetch<{ data: Shipment[] }>("/api/branch/shipments"),
  });

  const shipments = shipmentsData?.data || [];
  const branchName = user?.branchName || statsData?.branchName || "Unit Cabang";

  const handleScannerDetected = (code: string) => {
    setScannerOpen(false);
    // Navigate to receive page with token parameter
    setLocation(`/cabang/receive?scan=${encodeURIComponent(code)}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header Cabang ── */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/30 text-sky-200 border border-sky-400/30 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Portal Operasional Cabang
            </span>
            <span className="text-xs text-sky-200/80 font-mono">
              Lombok Tengah
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {branchName}
          </h1>
          <p className="text-sky-100/80 text-sm max-w-xl">
            Sistem penerimaan material digital per unit dengan pemindaian QR Code resmi Perumdam Tirta Ardhia Rinjani.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setScannerOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md h-11 px-5"
          >
            <Camera className="w-4 h-4" />
            Scan QR Terima Barang
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/cabang/pemasangan")}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2 h-11"
          >
            <Wrench className="w-4 h-4" />
            Alokasi Pemasangan
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Metrik Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pengiriman Menuju Cabang
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-foreground">
              {statsData?.activeShipmentsCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">Surat Jalan</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Dalam perjalanan logistik
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Material Perlu Di-Scan
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-foreground">
              {statsData?.pendingUnitsCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">unit fisik</span>
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Menunggu scan terima fisik
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Material Telah Diterima
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-foreground">
              {statsData?.receivedUnitsCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">unit</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Siap dialokasikan ke pelanggan
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Terpasang & Terverifikasi
            </CardTitle>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-foreground">
              {statsData?.installedUnitsCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">unit</span>
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Dilengkapi foto & titik GPS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Section: Pengiriman Masuk Sedang Menuju Cabang ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Daftar Pengiriman Material Masuk
            </h2>
            <p className="text-xs text-muted-foreground">
              Setiap unit material wajib dipindai (scan) satu per satu saat diterima secara fisik di kantor cabang.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/cabang/receive")}
            className="text-xs gap-1.5"
          >
            Buka Halaman Penerimaan <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {loadingShipments ? (
          <div className="p-8 text-center text-muted-foreground">Memuat data pengiriman cabang...</div>
        ) : shipments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-sm">Tidak Ada Pengiriman Aktif</p>
              <p className="text-xs mt-1">Saat ini belum ada material keluar dari gudang pusat yang ditujukan ke {branchName}.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shipments.map((s) => {
              const pct = s.totalUnits > 0 ? Math.round((s.receivedUnits / s.totalUnits) * 100) : 0;
              return (
                <Card
                  key={s.id}
                  className={`border shadow-xs hover:border-sky-500/50 transition-all ${
                    s.isFullyReceived ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800" : ""
                  }`}
                >
                  <CardHeader className="pb-3 pt-4 px-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {s.referenceNo}
                          </span>
                          <Badge
                            variant={s.isFullyReceived ? "default" : s.receivedUnits > 0 ? "secondary" : "outline"}
                            className={`text-[10px] font-semibold ${
                              s.isFullyReceived
                                ? "bg-emerald-600 text-white"
                                : s.receivedUnits > 0
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 border-sky-300"
                                : "bg-amber-50 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300"
                            }`}
                          >
                            {s.isFullyReceived
                              ? "LENGKAP DITERIMA"
                              : s.receivedUnits > 0
                              ? `SEBAGIAN (${s.receivedUnits}/${s.totalUnits})`
                              : `BELUM DI-SCAN (0/${s.totalUnits})`}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Dari: <span className="font-medium text-foreground">{s.warehouseName || "Gudang Pusat"}</span> | Tanggal: {formatDate(s.transactionDate)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setLocation(`/cabang/receive?shipment=${encodeURIComponent(s.referenceNo)}`)}
                        className={`gap-1 text-xs h-8 ${
                          s.isFullyReceived
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-sky-700 hover:bg-sky-800 text-white"
                        }`}
                      >
                        <ScanBarcode className="w-3.5 h-3.5" />
                        {s.isFullyReceived ? "Lihat Rincian" : "Scan Terima"}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-4 space-y-3">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Progress Scan Fisik:</span>
                        <span className="font-bold text-foreground font-mono">
                          {s.receivedUnits} / {s.totalUnits} unit ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    {/* Items preview preview */}
                    <div className="bg-muted/40 rounded-lg p-2.5 space-y-1 text-xs">
                      {s.units.slice(0, 3).map((u, i) => (
                        <div key={u.trackingId} className="flex items-center justify-between py-0.5">
                          <span className="font-medium truncate max-w-[200px]">
                            {i + 1}. {u.itemName}
                          </span>
                          {u.receivedAt ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Diterima
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Belum Scan
                            </span>
                          )}
                        </div>
                      ))}
                      {s.units.length > 3 && (
                        <div className="text-[11px] text-muted-foreground text-center pt-1 border-t">
                          +{s.units.length - 3} unit lainnya
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Guidance / Workflow Guide ── */}
      <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                SOP Pengendalian Material Cabang (Anti-Rescan & Audit SPI)
              </h3>
              <p className="text-xs text-sky-900/80 dark:text-sky-300/80 leading-relaxed">
                1. Setiap fisik material yang tiba di cabang wajib di-scan satu per satu. Sistem akan otomatis menghitung sisa barang yang belum di-scan.<br />
                2. Unit yang sudah di-scan tidak dapat di-scan ulang untuk mencegah duplikasi penerimaan.<br />
                3. Setelah barang lengkap diterima, lanjutkan ke menu <strong>Alokasi Pemasangan</strong> untuk mencatat titik koordinat GPS dan foto bukti pemasangan di lapangan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScannerDetected}
      />
    </div>
  );
}
