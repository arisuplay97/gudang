import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Skeleton } from "@/components/ui/skeleton";
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
  Building2,
  Activity,
  FolderOpen,
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

function DashCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-white dark:bg-card border border-[#eae8e0] dark:border-border transition-colors duration-200 ${className}`}>
      {children}
    </div>
  );
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
    setLocation(`/cabang/receive?scan=${encodeURIComponent(code)}`);
  };

  // Siklus progress calculation
  const totalMaterial =
    (statsData?.pendingUnitsCount ?? 0) +
    (statsData?.receivedUnitsCount ?? 0) +
    (statsData?.installedUnitsCount ?? 0);
  const completedMaterial =
    (statsData?.installedUnitsCount ?? 0) + (statsData?.verifiedUnitsCount ?? 0);
  const completionRate = totalMaterial > 0 ? Math.min(100, Math.round((completedMaterial / totalMaterial) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-background transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f5e3] dark:bg-green-950/50 text-[#5b7553] dark:text-green-400 border border-[#a3b899]/40">
                <Building2 className="w-3.5 h-3.5" /> Unit Cabang
              </span>
              <span className="text-xs text-[#8a8a7a] dark:text-muted-foreground font-mono">
                Lombok Tengah
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#2d2d2a] dark:text-foreground tracking-tight">
              Dashboard Cabang {branchName}
            </h1>
            <p className="text-sm text-[#8a8a7a] dark:text-muted-foreground">
              Penerimaan material digital per unit dengan pemindaian QR Code resmi Perumdam Tirta Ardhia Rinjani
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#5b7553] hover:bg-[#4d6346] text-white transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4" />
              Scan QR Terima Barang
            </button>
            <button
              onClick={() => setLocation("/cabang/pemasangan")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-card hover:bg-[#f0efe9] dark:hover:bg-muted text-[#2d2d2a] dark:text-foreground border border-[#eae8e0] dark:border-border transition-colors shadow-xs"
            >
              <Wrench className="w-4 h-4 text-[#8b6b4a]" />
              Alokasi Pemasangan
            </button>
          </div>
        </div>

        {/* ── Row 1: KPI Cards (5 Columns matching SPI) ── */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Card 1: Pengiriman Masuk (Highlighted Solid Olive) */}
          <div className="rounded-2xl p-5 bg-[#5b7553] text-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium opacity-80">Pengiriman Masuk</p>
              <Truck className="w-4 h-4 opacity-60" />
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16 bg-white/20" />
            ) : (
              <>
                <p className="text-3xl font-bold">{statsData?.activeShipmentsCount ?? 0}</p>
                <p className="text-xs opacity-60 mt-1">Surat jalan menuju cabang</p>
              </>
            )}
          </div>

          {/* Card 2: Perlu Di-Scan */}
          <DashCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Perlu Di-Scan</p>
              <ScanBarcode className="w-4 h-4 text-[#c27c5a] dark:text-orange-400" />
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className={`text-2xl font-bold ${(statsData?.pendingUnitsCount ?? 0) > 0 ? "text-[#c27c5a] dark:text-orange-400" : "text-[#2d2d2a] dark:text-foreground"}`}>
                  {statsData?.pendingUnitsCount ?? 0}
                </p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Unit belum di-scan fisik</p>
              </>
            )}
          </DashCard>

          {/* Card 3: Telah Diterima */}
          <DashCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Telah Diterima</p>
              <PackageCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[#2d2d2a] dark:text-foreground">{statsData?.receivedUnitsCount ?? 0}</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Tersimpan di gudang cabang</p>
              </>
            )}
          </DashCard>

          {/* Card 4: Terpasang Lapangan */}
          <DashCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Terpasang</p>
              <Activity className="w-4 h-4 text-[#8b6b4a] dark:text-yellow-500" />
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[#2d2d2a] dark:text-foreground">{statsData?.installedUnitsCount ?? 0}</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Foto & koordinat terdata</p>
              </>
            )}
          </DashCard>

          {/* Card 5: Terverifikasi SPI */}
          <DashCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#8a8a7a] dark:text-muted-foreground">Terverifikasi</p>
              <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
            </div>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[#5b7553] dark:text-green-500">{statsData?.verifiedUnitsCount ?? 0}</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">Lolos audit pengawasan SPI</p>
              </>
            )}
          </DashCard>
        </div>

        {/* ── Row 2: Siklus Material, Aksi Cepat Cabang, & SOP Operasional ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Siklus Material Cabang */}
          <DashCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">Siklus Material Cabang</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Status siklus unit di cabang</p>
              </div>
              <Clock className="w-4 h-4 text-[#8b6b4a] dark:text-yellow-500" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#c27c5a]" />
                  <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground">Menunggu Scan Fisik</span>
                </div>
                <span className="text-sm font-bold text-[#c27c5a] dark:text-orange-400">
                  {statsData?.pendingUnitsCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground">Diterima di Cabang</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {statsData?.receivedUnitsCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#e8c468]" />
                  <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground">Terpasang Lapangan</span>
                </div>
                <span className="text-sm font-bold text-[#d4a55a] dark:text-yellow-400">
                  {statsData?.installedUnitsCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#5b7553]" />
                  <span className="text-sm text-[#6b6b5e] dark:text-muted-foreground">Terverifikasi SPI</span>
                </div>
                <span className="text-sm font-bold text-[#5b7553] dark:text-green-400">
                  {statsData?.verifiedUnitsCount ?? 0}
                </span>
              </div>
            </div>

            {/* Completion rate bar */}
            <div className="mt-4 pt-3 border-t border-[#eae8e0] dark:border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Realisasi Terpasang</p>
                <p className={`text-sm font-bold ${completionRate >= 80 ? "text-[#5b7553]" : completionRate >= 50 ? "text-[#d4a55a]" : "text-[#c27c5a]"}`}>
                  {completionRate}%
                </p>
              </div>
              <div className="w-full h-2 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${completionRate}%`,
                    background: completionRate >= 80 ? "#5b7553" : completionRate >= 50 ? "#e8c468" : "#c27c5a",
                  }}
                />
              </div>
            </div>
          </DashCard>

          {/* Column 2: Aksi Cepat Cabang */}
          <DashCard>
            <p className="text-sm font-semibold mb-4 text-[#2d2d2a] dark:text-foreground">Aksi Cepat Operasional</p>
            <div className="space-y-2">
              <button
                onClick={() => setScannerOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#e8f5e3] dark:bg-green-950/50">
                  <Camera className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Scan QR Terima Barang</p>
                  <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Pindai QR fisik material yang tiba</p>
                </div>
              </button>

              <button
                onClick={() => setLocation("/cabang/pemasangan")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#f5f0e0] dark:bg-yellow-950/50">
                  <Wrench className="w-4 h-4 text-[#8b6b4a] dark:text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Alokasi Pemasangan</p>
                  <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Catat foto & koordinat GPS lapangan</p>
                </div>
              </button>

              <button
                onClick={() => setLocation("/cabang/tracking")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#f0efe9] dark:hover:bg-muted transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/50">
                  <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2d2d2a] dark:text-foreground">Pelacakan Material Unit</p>
                  <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Riwayat status per nomor seri unit</p>
                </div>
              </button>
            </div>
          </DashCard>

          {/* Column 3: SOP Pengendalian Material (Warm DashCard matching SPI style) */}
          <DashCard className="bg-[#fffdf5] dark:bg-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#e8f5e3] dark:bg-green-950/50 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground">SOP Material Cabang</p>
                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">Pengendalian Fisik & Audit SPI</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-[#6b6b5e] dark:text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-muted/20 border border-[#eae8e0]/60 dark:border-border/40">
                <span className="w-4 h-4 rounded-full bg-[#5b7553] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span><strong>Scan QR Surat Jalan / BPB:</strong> Cukup pindai kode QR pada lembar Surat Jalan / BPB resmi dari gudang pusat. Rincian dan kuantitas seluruh barang otomatis terverifikasi.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-muted/20 border border-[#eae8e0]/60 dark:border-border/40">
                <span className="w-4 h-4 rounded-full bg-[#5b7553] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span><strong>Anti-Rescan Terkunci:</strong> Unit yang telah tercatat diterima terkunci secara sistemik dari potensi rescan atau duplikasi.</span>
              </div>
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/60 dark:bg-muted/20 border border-[#eae8e0]/60 dark:border-border/40">
                <span className="w-4 h-4 rounded-full bg-[#5b7553] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span><strong>Geotagging & SPI:</strong> Pemasangan di pelanggan wajib melampirkan koordinat GPS dan foto fisik untuk audit verifikasi tim SPI.</span>
              </div>
            </div>
          </DashCard>
        </div>

        {/* ── Row 3: Daftar Pengiriman Material Masuk ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-[#2d2d2a] dark:text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#5b7553]" />
                Daftar Pengiriman Material Masuk
              </p>
              <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">
                Surat jalan logistik menuju kantor cabang {branchName} yang memerlukan penerimaan fisik
              </p>
            </div>
            <button
              onClick={() => setLocation("/cabang/receive")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-card hover:bg-[#f0efe9] dark:hover:bg-muted text-[#2d2d2a] dark:text-foreground border border-[#eae8e0] dark:border-border transition-colors shadow-xs"
            >
              Buka Halaman Penerimaan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingShipments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DashCard className="h-44 flex items-center justify-center">
                <Skeleton className="h-28 w-full rounded-xl" />
              </DashCard>
              <DashCard className="h-44 flex items-center justify-center">
                <Skeleton className="h-28 w-full rounded-xl" />
              </DashCard>
            </div>
          ) : shipments.length === 0 ? (
            <DashCard className="py-12 text-center text-[#8a8a7a] dark:text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#8a8a7a]" />
              <p className="font-semibold text-sm text-[#2d2d2a] dark:text-foreground">Tidak Ada Pengiriman Aktif</p>
              <p className="text-xs mt-1">Saat ini belum ada pengiriman material keluar dari gudang pusat yang ditujukan ke {branchName}.</p>
            </DashCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {shipments.map((s) => {
                const pct = s.totalUnits > 0 ? Math.round((s.receivedUnits / s.totalUnits) * 100) : 0;
                return (
                  <DashCard
                    key={s.id}
                    className={`transition-all hover:border-[#a3b899] ${
                      s.isFullyReceived ? "bg-[#fcfdfa] dark:bg-card border-[#c8d6c0] dark:border-green-950/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#2d2d2a] dark:text-foreground">
                            {s.referenceNo}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              s.isFullyReceived
                                ? "bg-[#e8f5e3] text-[#5b7553] border border-[#a3b899]/50"
                                : s.receivedUnits > 0
                                ? "bg-[#f5f0e0] text-[#8b6b4a] border border-[#e8c468]/50"
                                : "bg-[#fff0e6] text-[#c27c5a] border border-[#c27c5a]/30"
                            }`}
                          >
                            {s.isFullyReceived
                              ? "Lengkap Diterima"
                              : s.receivedUnits > 0
                              ? `Sebagian (${s.receivedUnits}/${s.totalUnits})`
                              : `Belum Di-Scan (0/${s.totalUnits})`}
                          </span>
                        </div>
                        <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">
                          Dari: <span className="font-medium text-[#2d2d2a] dark:text-foreground">{s.warehouseName || "Gudang Pusat"}</span> • Tanggal: {formatDate(s.transactionDate)}
                        </p>
                      </div>

                      <button
                        onClick={() => setLocation(`/cabang/receive?shipment=${encodeURIComponent(s.referenceNo)}`)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-xs ${
                          s.isFullyReceived
                            ? "bg-[#f0efe9] dark:bg-muted text-[#6b6b5e] dark:text-muted-foreground hover:bg-[#e4e2d8]"
                            : "bg-[#5b7553] hover:bg-[#4d6346] text-white"
                        }`}
                      >
                        <ScanBarcode className="w-3.5 h-3.5" />
                        {s.isFullyReceived ? "Lihat Rincian" : "Scan Terima"}
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5 my-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8a8a7a] dark:text-muted-foreground font-medium">Progress Scan Fisik:</span>
                        <span className="font-semibold text-[#2d2d2a] dark:text-foreground font-mono">
                          {s.receivedUnits} / {s.totalUnits} unit ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: s.isFullyReceived ? "#5b7553" : pct > 0 ? "#e8c468" : "#c27c5a",
                          }}
                        />
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="bg-[#f7f6f3] dark:bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs border border-[#eae8e0]/60 dark:border-border/40">
                      {s.units.slice(0, 3).map((u, i) => (
                        <div key={u.trackingId} className="flex items-center justify-between py-0.5">
                          <span className="font-medium text-[#2d2d2a] dark:text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                            {i + 1}. {u.itemName}
                          </span>
                          {u.receivedAt ? (
                            <span className="text-[11px] font-medium text-[#5b7553] dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Diterima
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-[#c27c5a] dark:text-orange-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Belum Scan
                            </span>
                          )}
                        </div>
                      ))}
                      {s.units.length > 3 && (
                        <div className="text-[11px] text-[#8a8a7a] dark:text-muted-foreground text-center pt-1 border-t border-[#eae8e0] dark:border-border">
                          +{s.units.length - 3} unit lainnya dalam surat jalan ini
                        </div>
                      )}
                    </div>
                  </DashCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onDetected={handleScannerDetected}
        />
      </div>
    </div>
  );
}
