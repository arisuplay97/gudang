import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine,
  CheckCircle2,
  PackageOpen,
  Camera,
  ShieldCheck,
  Clock,
  MapPin,
  AlertCircle,
  Truck,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  Ban,
  Building2,
} from "lucide-react";

interface TrackingUnit {
  trackingId: number;
  trackingUuid: string;
  status: string;
  receivedAt: string | null;
  receivedBy: number | null;
  receivedByName: string | null;
  itemId: number;
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
  units: TrackingUnit[];
}

export default function CabangReceivePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeShipmentId, setActiveShipmentId] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Read URL query params on mount (e.g. ?shipment=BK-509105 or ?scan=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shipmentRef = params.get("shipment");
    const scanParam = params.get("scan");
    if (scanParam) {
      handleCodeDetected(scanParam);
    }
    if (shipmentRef) {
      setFilterSearch(shipmentRef);
    }
  }, []);

  // 1. Fetch all shipments for this branch
  const { data: shipmentsData, isLoading: loadingShipments } = useQuery<{ data: Shipment[] }>({
    queryKey: ["branch-shipments"],
    queryFn: () => apiFetch<{ data: Shipment[] }>("/api/branch/shipments"),
  });

  const shipments = shipmentsData?.data || [];

  // If filterSearch is set, find matching shipment and select it automatically
  useEffect(() => {
    if (filterSearch && shipments.length > 0) {
      const matched = shipments.find(
        (s) =>
          s.referenceNo.toLowerCase() === filterSearch.toLowerCase() ||
          s.qrToken === filterSearch
      );
      if (matched) {
        setActiveShipmentId(matched.id);
      }
    } else if (!activeShipmentId && shipments.length > 0) {
      // Default to first shipment that has pending units
      const firstPending = shipments.find((s) => !s.isFullyReceived);
      if (firstPending) {
        setActiveShipmentId(firstPending.id);
      } else {
        setActiveShipmentId(shipments[0].id);
      }
    }
  }, [filterSearch, shipments]);

  const activeShipment = shipments.find((s) => s.id === activeShipmentId);

  // 2. Mutation to receive a single unit
  const receiveUnitMutation = useMutation({
    mutationFn: async ({ trackingId, trackingUuid }: { trackingId?: number; trackingUuid?: string }) => {
      return apiFetch<{
        message: string;
        unit: any;
        totalUnits: number;
        receivedUnits: number;
        remainingUnits: number;
        isFullyReceived: boolean;
      }>("/api/branch/receive-unit", {
        method: "POST",
        body: JSON.stringify({ trackingId, trackingUuid }),
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-shipments"] });
      qc.invalidateQueries({ queryKey: ["branch-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["cabang-tracking"] });

      if (data.isFullyReceived) {
        toast({
          title: "🎉 Pengiriman Lengkap Diterima!",
          description: `Seluruh ${data.totalUnits} unit dalam surat jalan telah berhasil diverifikasi dan diterima di cabang.`,
        });
      } else {
        toast({
          title: "✓ Unit Berhasil Diterima",
          description: `${data.message} Sisa ${data.remainingUnits} unit lagi yang perlu di-scan.`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Gagal Menerima Unit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Handle scanned code (can be Surat Jalan QR, or unit UUID)
  const handleCodeDetected = async (code: string) => {
    setScannerOpen(false);
    const cleanCode = code.trim();

    // Check if code matches a shipment QR or reference number
    const matchedShipment = shipments.find(
      (s) => s.qrToken === cleanCode || s.referenceNo.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedShipment) {
      setActiveShipmentId(matchedShipment.id);
      toast({
        title: "Surat Jalan Ditemukan",
        description: `Membuka daftar material untuk ${matchedShipment.referenceNo}. Silakan scan atau konfirmasi setiap unit.`,
      });
      return;
    }

    // Otherwise, check if code matches any pending unit tracking UUID
    let targetUnit: TrackingUnit | null = null;
    let targetShipmentId: number | null = null;

    for (const sh of shipments) {
      const u = sh.units.find((unit) => unit.trackingUuid === cleanCode || String(unit.trackingId) === cleanCode);
      if (u) {
        targetUnit = u;
        targetShipmentId = sh.id;
        break;
      }
    }

    if (targetUnit) {
      setActiveShipmentId(targetShipmentId);
      if (targetUnit.status !== "MENUNGGU_DITERIMA" || targetUnit.receivedAt) {
        toast({
          title: "⚠️ Sudah Diterima",
          description: `Unit "${targetUnit.itemName}" sudah pernah di-scan sebelumnya (tidak dapat di-scan ulang).`,
          variant: "destructive",
        });
        return;
      }
      receiveUnitMutation.mutate({ trackingId: targetUnit.trackingId });
    } else {
      toast({
        title: "Kode Tidak Dikenali",
        description: "Kode QR atau barcode tidak cocok dengan pengiriman aktif cabang Anda.",
        variant: "destructive",
      });
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    handleCodeDetected(tokenInput.trim());
    setTokenInput("");
  };

  const branchTitle = user?.branchName || "Cabang Lombok Tengah";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-400 font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5" /> {branchTitle}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Penerimaan Barang Masuk (Scan QR)
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Verifikasi fisik setiap unit material yang dikirim dari gudang pusat ke cabang Anda satu per satu.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="lg"
            onClick={() => setScannerOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md h-11"
          >
            <Camera className="w-5 h-5" />
            Buka Kamera Scan QR
          </Button>
        </div>
      </motion.div>

      {/* ── Quick Scan Barcode or Search ── */}
      <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/30 dark:bg-sky-950/20 shadow-xs">
        <CardContent className="p-4">
          <form onSubmit={handleManualCodeSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Scan / ketik No. SPK (misal: BK-509105) atau token QR..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pl-9 font-mono text-sm bg-background"
              />
            </div>
            <Button type="submit" variant="secondary" className="gap-1.5 shrink-0">
              <ScanLine className="w-4 h-4" /> Cari / Proses Kode
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Main Layout: Left: Shipments List, Right: Active Shipment Unit Checklist ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Shipments (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-600" />
              Daftar Pengiriman Cabang
            </h3>
            <Badge variant="outline" className="text-xs">
              {shipments.length} Transaksi
            </Badge>
          </div>

          {loadingShipments ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Memuat daftar pengiriman...</div>
          ) : shipments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-xs text-muted-foreground">
                Tidak ada pengiriman aktif menuju cabang ini.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {shipments.map((s) => {
                const isActive = s.id === activeShipmentId;
                const pct = s.totalUnits > 0 ? Math.round((s.receivedUnits / s.totalUnits) * 100) : 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveShipmentId(s.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/40 shadow-sm ring-1 ring-sky-600"
                        : "border-border hover:border-sky-300 dark:hover:border-sky-700 bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {s.referenceNo}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(s.transactionDate)} • {s.warehouseName || "Gudang Pusat"}
                        </p>
                      </div>

                      <Badge
                        variant={s.isFullyReceived ? "default" : s.receivedUnits > 0 ? "secondary" : "outline"}
                        className={`text-[10px] ${
                          s.isFullyReceived
                            ? "bg-emerald-600 text-white"
                            : s.receivedUnits > 0
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        }`}
                      >
                        {s.isFullyReceived
                          ? "✓ Lengkap"
                          : `${s.receivedUnits}/${s.totalUnits} Diterima`}
                      </Badge>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Progress Fisik</span>
                        <span className="font-mono font-semibold text-foreground">
                          {s.receivedUnits} dari {s.totalUnits} unit ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Shipment Detail & Unit-by-Unit Scanning (7 cols) */}
        <div className="lg:col-span-7">
          {!activeShipment ? (
            <Card className="border-dashed h-full min-h-[300px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground py-12">
                <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-sm">Pilih Pengiriman untuk Memulai Scan</p>
                <p className="text-xs mt-1">Pilih dari daftar di sebelah kiri atau scan kode QR Surat Jalan.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-md">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-foreground">
                        {activeShipment.referenceNo}
                      </span>
                      <Badge
                        variant={activeShipment.isFullyReceived ? "default" : "secondary"}
                        className={activeShipment.isFullyReceived ? "bg-emerald-600 text-white" : ""}
                      >
                        {activeShipment.isFullyReceived ? "✓ SEMUA DITERIMA" : "DALAM PROSES PENERIMAAN"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Gudang: <strong>{activeShipment.warehouseName || "Gudang Pusat"}</strong> | Tujuan: <strong>{activeShipment.destinationBranchName}</strong>
                    </CardDescription>
                  </div>

                  {activeShipment.isFullyReceived && (
                    <Button
                      size="sm"
                      onClick={() => setLocation("/cabang/pemasangan")}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 text-xs"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Lanjut Alokasi Pasang
                    </Button>
                  )}
                </div>

                {/* Progress banner */}
                <div className="mt-4 p-3 rounded-xl bg-background border space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <ScanLine className="w-4 h-4 text-sky-600" />
                      Status Scan Penerimaan:
                    </span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      {activeShipment.receivedUnits} / {activeShipment.totalUnits} Unit Selesai
                    </span>
                  </div>
                  <Progress
                    value={
                      activeShipment.totalUnits > 0
                        ? (activeShipment.receivedUnits / activeShipment.totalUnits) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>
                      {activeShipment.pendingUnits > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠️ Sisa {activeShipment.pendingUnits} unit lagi yang perlu di-scan
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Seluruh unit material telah lengkap diterima!
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Anti Re-scan Protection Active</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Daftar Unit Fisik ({activeShipment.units.length} Unit)
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Klik atau scan setiap unit untuk mengonfirmasi
                  </span>
                </div>

                {activeShipment.units.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Tidak ada unit material yang terdaftar.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeShipment.units.map((unit, index) => {
                      const isReceived = unit.status !== "MENUNGGU_DITERIMA" || !!unit.receivedAt;
                      return (
                        <div
                          key={unit.trackingId}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isReceived
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                              : "bg-card border-border hover:border-sky-300"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono">
                                #{index + 1}
                              </span>
                              <span className="font-bold text-sm text-foreground">
                                {unit.itemName}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                                {unit.itemCode}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-8">
                              <span className="font-mono text-[11px]">
                                UUID: {unit.trackingUuid.slice(0, 8)}...
                              </span>
                              {isReceived ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Diterima:{" "}
                                  {unit.receivedAt ? new Date(unit.receivedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Tercatat"}
                                  {unit.receivedByName && ` (${unit.receivedByName})`}
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Menunggu Scan Fisik
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 sm:self-center pl-8 sm:pl-0">
                            {isReceived ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/50 cursor-not-allowed opacity-90"
                              >
                                <Check className="w-3.5 h-3.5" /> Sudah Diterima
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => receiveUnitMutation.mutate({ trackingId: unit.trackingId })}
                                disabled={receiveUnitMutation.isPending}
                                className="h-8 text-xs gap-1.5 bg-sky-700 hover:bg-sky-800 text-white shadow-xs"
                              >
                                <ScanBarcode className="w-3.5 h-3.5" />
                                {receiveUnitMutation.isPending ? "Memproses..." : "Scan / Terima Unit"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCodeDetected}
      />
    </div>
  );
}
