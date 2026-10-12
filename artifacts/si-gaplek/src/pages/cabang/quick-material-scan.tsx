import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  ChevronLeft,
  RefreshCw,
  Flame,
  AlertTriangle,
  Camera,
  ExternalLink,
  ScanLine,
  ArrowRight,
  MapPin,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { cn, formatNumber } from "@/lib/utils";

interface QuickScanData {
  item: {
    id: number;
    code: string;
    name: string;
    categoryName?: string;
    unitName?: string;
  };
  stock: {
    id: number;
    branchId: number;
    branchName: string;
    quantity: number;
    minimumStock: number;
    maximumStock: number;
    updatedAt: string;
  } | null;
  analytics: {
    usage30d: number;
    dailyBurnRate: number;
    runoutDays: number | null;
  };
  recentMovements: Array<{
    id: number;
    movementType: string;
    direction: "in" | "out";
    quantity: number;
    movementDate: string;
    referenceNo?: string;
    notes?: string;
  }>;
}

export default function QuickMaterialScanPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuickScanData | null>(null);

  // Parse query params safely
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const initialCode = searchParams.get("code") || "";
  const branchId = searchParams.get("branch") || "";

  const [currentCode, setCurrentCode] = useState(initialCode);
  const [scannerActive, setScannerActive] = useState(!initialCode);
  const [inputCode, setInputCode] = useState(initialCode);

  const fetchData = async (targetCode?: string) => {
    const activeCode = targetCode || currentCode;
    if (!activeCode) {
      setScannerActive(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const url = `/api/branch-stocks/quick-scan?code=${encodeURIComponent(activeCode)}${
        branchId ? `&branchId=${branchId}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Material tidak ditemukan dalam database cabang.");
      }
      const json = await res.json();
      setData(json);
      setCurrentCode(activeCode);
      setScannerActive(false);
    } catch (err: any) {
      setError(err.message || "Gagal memuat informasi material");
      setScannerActive(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchData(initialCode);
    } else {
      setLoading(false);
      setScannerActive(true);
    }
  }, [initialCode, branchId]);

  const stock = data?.stock;
  const item = data?.item;
  const analytics = data?.analytics;
  const isLow = stock ? stock.quantity > 0 && stock.quantity <= stock.minimumStock : false;
  const isOut = stock ? stock.quantity <= 0 : false;
  const isSafe = stock ? stock.quantity > stock.minimumStock : false;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-5 font-sans">
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* ── Top Clean SaaS Header (Zero Slop, Zero Water Drop) ── */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition-all shadow-2xs"
              title="Kembali ke Beranda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Cek Sisa Fisik Aksesoris
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Monitoring Stok Gudang Cabang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!scannerActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScannerActive(true)}
                className="h-9 px-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                Scan Ulang
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchData()}
              disabled={loading}
              className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* ── Scanner Active State (Camera + Manual Input) ── */}
        {scannerActive && !loading && (
          <div className="space-y-4 pt-1">
            <div className="p-5 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <div className="text-center space-y-1">
                <div className="w-11 h-11 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 border border-blue-100 dark:border-blue-900/40">
                  <Camera className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Arahkan Kamera ke Barcode Material
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Posisikan label barcode atau QR aksesoris di dalam kotak pemindai
                </p>
              </div>

              {/* Camera Scanner Viewport with Embedded Engine */}
              <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[220px] relative shadow-inner">
                <BarcodeScanner
                  open={scannerActive}
                  onClose={() => {}}
                  onDetected={(scanned) => {
                    setInputCode(scanned);
                    fetchData(scanned);
                  }}
                  embedded={true}
                />
              </div>

              {/* Manual input fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputCode.trim()) fetchData(inputCode.trim());
                }}
                className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800"
              >
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Atau Cari Berdasarkan Kode Material
                </label>
                <div className="flex gap-2">
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Contoh: MAT-001 / Stop Kran..."
                    className="h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-10 px-4 rounded-xl text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0 shadow-xs"
                  >
                    Periksa
                  </Button>
                </div>
              </form>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center">
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-48 w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80" />
            <Skeleton className="h-28 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80" />
          </div>
        )}

        {/* ── Content State: Scanned Material Results ── */}
        {!loading && data && item && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
          >
            {/* Main Physical Stock Card (Light Clean Executive Style) */}
            <div className="p-5 rounded-[26px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                  {item.code}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {stock?.branchName || "Cabang Praya"}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {item.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Kategori: {item.categoryName || "Aksesoris"} • Satuan: {item.unitName || "Pcs"}
                </p>
              </div>

              {/* Physical Stock Counter Box */}
              <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Sisa Fisik di Rak Cabang
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                      {formatNumber(stock?.quantity ?? 0)}
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                      {item.unitName || "Pcs"}
                    </span>
                  </div>
                </div>

                <div>
                  {isSafe && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Stok Aman
                    </span>
                  )}
                  {isLow && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      Stok Menipis
                    </span>
                  )}
                  {isOut && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Stok Habis
                    </span>
                  )}
                </div>
              </div>

              {/* Safety stock threshold info */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Batas Minimum (Safety Stock):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {stock?.minimumStock ?? 5} {item.unitName || "Pcs"}
                </span>
              </div>
            </div>

            {/* Consumption & Runout Forecast Card */}
            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Analisis Laju Pemakaian Cabang
                </span>
                <span className="text-[10px] text-slate-400 font-medium">30 Hari Terakhir</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Laju Pemasangan
                  </span>
                  <span className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                    {analytics?.dailyBurnRate ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">unit/hari</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Estimasi Hari Habis
                  </span>
                  {analytics?.runoutDays !== null && analytics?.runoutDays !== undefined ? (
                    <span
                      className={cn(
                        "font-mono font-extrabold text-base",
                        analytics.runoutDays <= 3
                          ? "text-rose-600 dark:text-rose-400"
                          : analytics.runoutDays <= 7
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      ±{analytics.runoutDays} Hari
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">Stok Terjaga</span>
                  )}
                </div>
              </div>

              {typeof analytics?.runoutDays === "number" && analytics.runoutDays <= 3 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Stok diperkirakan menipis dalam 3 hari. Ajukan surat permintaan ke Gudang Utama.</span>
                </div>
              )}
            </div>

            {/* Recent Movements Mini Log */}
            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs space-y-2.5 shadow-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Riwayat Mutasi Fisik Terakhir
              </span>

              {data.recentMovements.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada riwayat mutasi.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentMovements.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {m.movementType === "INSTALLATION"
                            ? "Pemasangan Lapangan"
                            : m.movementType === "RECEIPT"
                            ? "Penerimaan Surat Jalan"
                            : m.movementType === "REJECTION_ROLLBACK"
                            ? "Rollback SPI"
                            : m.movementType}
                        </span>
                        {m.referenceNo && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                            {m.referenceNo}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-mono font-bold text-xs",
                          m.direction === "in"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {m.direction === "in" ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={() => setScannerActive(true)}
                className="h-11 rounded-2xl font-bold text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 gap-1.5 shadow-2xs"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                Scan Item Lain
              </Button>
              <Button
                onClick={() => navigate(`/cabang/stok-material`)}
                className="h-11 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white gap-1.5 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Inventaris Lengkap
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 pt-6">
        Aplikasi Monitoring Aksesoris • Perumdam Tirta Ardhia Rinjani
      </div>
    </div>
  );
}
