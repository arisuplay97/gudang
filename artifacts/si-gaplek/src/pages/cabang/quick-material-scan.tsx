import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Package,
  Boxes,
  Building2,
  Clock,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { cn } from "@/lib/utils";

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
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
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
        throw new Error(errJson.error || "Material tidak ditemukan dalam database.");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      <div className="max-w-md mx-auto w-full space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
              💧
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-wider uppercase text-sky-400">
                SIMONA Quick Check
              </h1>
              <p className="text-[10px] text-slate-400">Perumdam Tirta Ardhia Rinjani</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData()}
            disabled={loading}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Scanner Active State */}
        {scannerActive && !loading && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-center space-y-1">
                <h2 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-400" />
                  Pindai Barcode Material
                </h2>
                <p className="text-xs text-slate-400">
                  Arahkan kamera ke label barcode material untuk cek sisa fisik di cabang
                </p>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[220px] relative">
                <BarcodeScanner
                  open={scannerActive}
                  onClose={() => {}}
                  onDetected={(scanned) => {
                    setInputCode(scanned);
                    fetchData(scanned);
                  }}
                />
              </div>

              {/* Manual input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputCode.trim()) fetchData(inputCode.trim());
                }}
                className="space-y-2 pt-2"
              >
                <div className="flex gap-2">
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Ketik kode (misal: MAT-001)..."
                    className="h-10 text-xs bg-slate-950 border-slate-800 font-mono text-white rounded-xl"
                  />
                  <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold">
                    Cek
                  </Button>
                </div>
              </form>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-xs text-rose-300 font-medium">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-44 w-full rounded-2xl bg-slate-900 border border-slate-800" />
            <Skeleton className="h-28 w-full rounded-2xl bg-slate-900 border border-slate-800" />
          </div>
        )}

        {/* Content State */}
        {!loading && data && item && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
          >
            {/* Main Physical Stock Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                  {item.code}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  {stock?.branchName || "Seluruh Cabang"}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight mb-1">
                {item.name}
              </h2>
              <p className="text-xs text-slate-400">
                {item.categoryName || "Aksesoris"} • Satuan: {item.unitName || "Pcs"}
              </p>

              {/* Stock Value & Status */}
              <div className="mt-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Sisa Fisik di Rak Gudang
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-black text-white">
                      {stock?.quantity ?? 0}
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {item.unitName || "Pcs"}
                    </span>
                  </div>
                </div>

                <div>
                  {isSafe && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                      Aman
                    </span>
                  )}
                  {isLow && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                      </span>
                      Menipis
                    </span>
                  )}
                  {isOut && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                      Habis
                    </span>
                  )}
                </div>
              </div>

              {/* Safety stock threshold info */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Batas Min (Safety Stock):</span>
                <span className="font-mono font-semibold text-slate-200">
                  {stock?.minimumStock ?? 5} {item.unitName || "Pcs"}
                </span>
              </div>
            </div>

            {/* Consumption & Runout Forecast Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Analisis Laju Pemakaian
                </span>
                <span className="text-[10px] text-slate-400">30 Hari Terakhir</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Laju Pemasangan</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {analytics?.dailyBurnRate ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">unit/hari</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Estimasi Hari Habis</span>
                  {analytics?.runoutDays !== null && analytics?.runoutDays !== undefined ? (
                    <span
                      className={cn(
                        "font-mono font-bold text-sm",
                        analytics.runoutDays <= 3
                          ? "text-rose-400"
                          : analytics.runoutDays <= 7
                          ? "text-amber-400"
                          : "text-emerald-400"
                      )}
                    >
                      ±{analytics.runoutDays} Hari
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Stok Pasif</span>
                  )}
                </div>
              </div>

              {typeof analytics?.runoutDays === "number" && analytics.runoutDays <= 3 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Stok diperkirakan habis dalam 3 hari. Segera ajukan restock ke Gudang Pusat.</span>
                </div>
              )}
            </div>

            {/* Recent Movements Mini Log */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
              <span className="font-semibold text-slate-300 block mb-1">
                Riwayat Mutasi Terakhir
              </span>

              {data.recentMovements.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada riwayat mutasi.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentMovements.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-medium text-slate-200">
                          {m.movementType === "INSTALLATION"
                            ? "Pemasangan Lapangan"
                            : m.movementType === "RECEIPT"
                            ? "Penerimaan Surat Jalan"
                            : m.movementType === "REJECTION_ROLLBACK"
                            ? "Rollback SPI"
                            : m.movementType}
                        </span>
                        {m.referenceNo && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {m.referenceNo}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-mono font-bold",
                          m.direction === "in" ? "text-emerald-400" : "text-slate-300"
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
            <div className="pt-2 space-y-2">
              <Button
                onClick={() => navigate(`/cabang/stok-material`)}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs h-10 rounded-xl gap-1.5 shadow-lg shadow-sky-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka SIMONA Lengkap
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 pt-6">
        SIMONA Mobile • Perumdam Tirta Ardhia Rinjani
      </div>
    </div>
  );
}
