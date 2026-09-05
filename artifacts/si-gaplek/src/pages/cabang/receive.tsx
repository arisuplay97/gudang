import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatNumber } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine,
  CheckCircle2,
  PackageOpen,
  Camera,
  Clock,
  Truck,
  ArrowRight,
  Search,
  Check,
  Building2,
  ScanBarcode,
  ChevronDown,
  ChevronUp,
  FileText,
  Boxes,
  ShieldCheck,
} from "lucide-react";

interface ShipmentItemSummary {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  quantity: number;
  unitName?: string;
}

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
  items?: ShipmentItemSummary[];
  units: TrackingUnit[];
}

function DashCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-white dark:bg-card border border-[#eae8e0] dark:border-border transition-colors duration-200 ${className}`}>
      {children}
    </div>
  );
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
  const [showUnitsDetail, setShowUnitsDetail] = useState(false);

  // 1. Fetch all shipments for this branch
  const { data: shipmentsData, isLoading: loadingShipments } = useQuery<{ data: Shipment[] }>({
    queryKey: ["branch-shipments"],
    queryFn: () => apiFetch<{ data: Shipment[] }>("/api/branch/shipments"),
  });

  const shipments = shipmentsData?.data || [];

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
  }, [shipments.length]);

  // If filterSearch is set, find matching shipment and select it automatically
  useEffect(() => {
    if (filterSearch && shipments.length > 0) {
      const matched = shipments.find(
        (s) =>
          s.referenceNo.toLowerCase() === filterSearch.toLowerCase() ||
          s.qrToken === filterSearch ||
          filterSearch.toLowerCase().includes(s.referenceNo.toLowerCase())
      );
      if (matched) {
        setActiveShipmentId(matched.id);
      }
    } else if (!activeShipmentId && shipments.length > 0) {
      const firstPending = shipments.find((s) => !s.isFullyReceived);
      if (firstPending) {
        setActiveShipmentId(firstPending.id);
      } else {
        setActiveShipmentId(shipments[0].id);
      }
    }
  }, [filterSearch, shipments]);

  const activeShipment = shipments.find((s) => s.id === activeShipmentId);

  // 2. Mutation to receive ENTIRE SHIPMENT (SURAT JALAN / BPB)
  const receiveShipmentMutation = useMutation({
    mutationFn: async ({ qrToken }: { qrToken: string }) => {
      return apiFetch<{
        message: string;
        receipt: any;
        referenceNo: string;
        totalItems: number;
        totalQuantity: number;
        items: any[];
      }>("/api/branch/receive", {
        method: "POST",
        body: JSON.stringify({ qrToken }),
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-shipments"] });
      qc.invalidateQueries({ queryKey: ["branch-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["cabang-tracking"] });

      toast({
        title: "🎉 Surat Jalan / BPB Berhasil Diterima!",
        description: `Seluruh material pada Surat Jalan ${data.referenceNo} (${data.totalQuantity} unit) telah resmi diterima di inventaris cabang.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Gagal Menerima Surat Jalan",
        description: err.message || "Terjadi kesalahan saat memproses penerimaan.",
        variant: "destructive",
      });
    },
  });

  // 3. Fallback mutation for individual unit if needed
  const receiveUnitMutation = useMutation({
    mutationFn: async ({ trackingId }: { trackingId: number }) => {
      return apiFetch<{
        message: string;
        unit: any;
        totalUnits: number;
        receivedUnits: number;
        remainingUnits: number;
        isFullyReceived: boolean;
      }>("/api/branch/receive-unit", {
        method: "POST",
        body: JSON.stringify({ trackingId }),
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["branch-shipments"] });
      qc.invalidateQueries({ queryKey: ["branch-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["cabang-tracking"] });

      toast({
        title: data.isFullyReceived ? "🎉 Pengiriman Lengkap Diterima!" : "✓ Unit Diterima",
        description: data.message,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Gagal Menerima Unit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Handle scanned code from camera QR scanner or input
  const handleCodeDetected = async (code: string) => {
    setScannerOpen(false);
    const cleanCode = code.trim();

    // Check if code matches a shipment QR or reference number
    const matchedShipment = shipments.find(
      (s) =>
        s.qrToken === cleanCode ||
        s.referenceNo.toLowerCase() === cleanCode.toLowerCase() ||
        cleanCode.toLowerCase().includes(s.referenceNo.toLowerCase()) ||
        s.referenceNo.toLowerCase() === cleanCode.replace(/^qr-/i, "").toLowerCase()
    );

    if (matchedShipment) {
      setActiveShipmentId(matchedShipment.id);
      if (matchedShipment.isFullyReceived) {
        toast({
          title: "Surat Jalan Sudah Lengkap Diterima",
          description: `Surat Jalan ${matchedShipment.referenceNo} sudah pernah diterima sebelumnya.`,
        });
      } else {
        toast({
          title: "Surat Jalan / BPB Ditemukan!",
          description: `Memuat rincian kuantitas ${matchedShipment.referenceNo}. Silakan konfirmasi penerimaan barang.`,
        });
      }
      return;
    }

    // Check if code matches single unit UUID (legacy/fallback)
    let targetUnit: TrackingUnit | null = null;
    let targetShipmentId: number | null = null;

    for (const sh of shipments) {
      const u = sh.units?.find((unit) => unit.trackingUuid === cleanCode || String(unit.trackingId) === cleanCode);
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
          title: "⚠️ Sudah Pernah Diterima",
          description: `Unit "${targetUnit.itemName}" sudah tercatat diterima sebelumnya.`,
          variant: "destructive",
        });
        return;
      }
      receiveUnitMutation.mutate({ trackingId: targetUnit.trackingId });
    } else {
      toast({
        title: "Kode Tidak Dikenali",
        description: "Kode QR Surat Jalan / BPB tidak cocok dengan pengiriman aktif cabang Anda.",
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

  // Calculate items breakdown for active shipment
  const itemsList = activeShipment?.items || [];
  const totalItemQty = itemsList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || activeShipment?.totalUnits || 0;

  return (
    <div className="min-h-screen bg-[#f7f6f3] dark:bg-background transition-colors duration-200">
      <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f5e3] dark:bg-green-950/50 text-[#5b7553] dark:text-green-400 border border-[#a3b899]/40">
                <Building2 className="w-3.5 h-3.5" /> {branchTitle}
              </span>
              <span className="text-xs text-[#8a8a7a] dark:text-muted-foreground font-mono">
                Logistik Masuk
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-[#2d2d2a] dark:text-foreground tracking-tight">
              Penerimaan Material (Scan Surat Jalan / BPB)
            </h1>
            <p className="text-sm text-[#8a8a7a] dark:text-muted-foreground">
              Pindai kode QR pada Surat Jalan / Bukti Pengeluaran Barang (BPB) fisik dari gudang pusat untuk memverifikasi seluruh kuantitas secara otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[#5b7553] hover:bg-[#4d6346] text-white transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4" />
              Scan QR Surat Jalan / BPB
            </button>
          </div>
        </div>

        {/* ── Quick Scan Barcode or Search Input ── */}
        <DashCard className="p-4">
          <form onSubmit={handleManualCodeSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8a8a7a] dark:text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Scan / ketik Nomor SPK Surat Jalan (misal: BK-20260811-0025)..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pl-10 font-mono text-sm bg-white dark:bg-card border-[#eae8e0] dark:border-border h-11 rounded-xl"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl text-sm font-medium bg-white dark:bg-card hover:bg-[#f0efe9] dark:hover:bg-muted text-[#2d2d2a] dark:text-foreground border border-[#eae8e0] dark:border-border transition-colors shadow-xs shrink-0"
            >
              <ScanLine className="w-4 h-4 text-[#5b7553]" /> Cari / Proses Kode
            </button>
          </form>
        </DashCard>

        {/* ── Main Layout: Left: Shipments List, Right: Active Shipment BPB Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: List of Shipments (5 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-[#2d2d2a] dark:text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#5b7553]" />
                Daftar Surat Jalan Menuju Cabang
              </p>
              <span className="text-xs font-mono text-[#8a8a7a] dark:text-muted-foreground px-2 py-0.5 rounded-full bg-[#f0efe9] dark:bg-muted">
                {shipments.length} Surat Jalan
              </span>
            </div>

            {loadingShipments ? (
              <DashCard className="p-6 text-center text-xs text-[#8a8a7a]">
                Memuat daftar surat jalan cabang...
              </DashCard>
            ) : shipments.length === 0 ? (
              <DashCard className="py-8 text-center text-xs text-[#8a8a7a]">
                <PackageOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#8a8a7a]" />
                Tidak ada pengiriman aktif menuju cabang ini.
              </DashCard>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {shipments.map((s) => {
                  const isActive = s.id === activeShipmentId;
                  const pct = s.totalUnits > 0 ? Math.round((s.receivedUnits / s.totalUnits) * 100) : 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setActiveShipmentId(s.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? "border-[#5b7553] bg-white dark:bg-card shadow-sm ring-1 ring-[#5b7553]"
                          : "border-[#eae8e0] dark:border-border hover:border-[#a3b899] bg-white dark:bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-[#5b7553]" />
                            <span className="font-mono font-bold text-sm text-[#2d2d2a] dark:text-foreground">
                              {s.referenceNo}
                            </span>
                          </div>
                          <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">
                            {formatDate(s.transactionDate)} • {s.warehouseName || "Gudang Pusat"}
                          </p>
                        </div>

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
                            ? "✓ Lengkap"
                            : `${s.receivedUnits}/${s.totalUnits} Diterima`}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#8a8a7a] dark:text-muted-foreground">
                          <span>Status Penerimaan:</span>
                          <span className="font-mono font-semibold text-[#2d2d2a] dark:text-foreground">
                            {s.receivedUnits} dari {s.totalUnits} unit ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#f0efe9] dark:bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: s.isFullyReceived ? "#5b7553" : pct > 0 ? "#e8c468" : "#c27c5a",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Shipment Detail (BPB & Quantity Breakdown) (8 cols) */}
          <div className="lg:col-span-8">
            {!activeShipment ? (
              <DashCard className="h-full min-h-[360px] flex items-center justify-center text-center">
                <div className="text-[#8a8a7a] dark:text-muted-foreground py-12">
                  <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#8a8a7a]" />
                  <p className="font-semibold text-sm text-[#2d2d2a] dark:text-foreground">Pilih Surat Jalan / BPB</p>
                  <p className="text-xs mt-1">Pilih dari daftar di sebelah kiri atau scan QR Code Surat Jalan fisik Anda.</p>
                </div>
              </DashCard>
            ) : (
              <div className="space-y-4">
                {/* Main BPB Verification Card */}
                <DashCard className="space-y-5">
                  {/* Top info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#eae8e0] dark:border-border">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-xl text-[#2d2d2a] dark:text-foreground">
                          {activeShipment.referenceNo}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                            activeShipment.isFullyReceived
                              ? "bg-[#e8f5e3] text-[#5b7553] border border-[#a3b899]/50"
                              : "bg-[#f5f0e0] text-[#8b6b4a] border border-[#e8c468]/50"
                          }`}
                        >
                          {activeShipment.isFullyReceived ? "✓ LENGKAP DITERIMA" : "MENUNGGU VERIFIKASI CABANG"}
                        </span>
                      </div>
                      <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-1">
                        Dari: <strong>{activeShipment.warehouseName || "Gudang Pusat"}</strong> • Tujuan: <strong>{activeShipment.destinationBranchName}</strong> • Tgl SPK: {formatDate(activeShipment.transactionDate)}
                      </p>
                    </div>

                    {activeShipment.isFullyReceived && (
                      <button
                        onClick={() => setLocation("/cabang/pemasangan")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#5b7553] hover:bg-[#4d6346] text-white transition-colors shadow-xs shrink-0"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Lanjut Alokasi Pasang
                      </button>
                    )}
                  </div>

                  {/* Prominent Action Banner for Single-Scan Confirmation */}
                  {!activeShipment.isFullyReceived ? (
                    <div className="p-4 rounded-2xl bg-[#fffdf5] dark:bg-card border border-[#eae8e0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#2d2d2a] dark:text-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#5b7553]" />
                          Konfirmasi Penerimaan Fisik Surat Jalan
                        </p>
                        <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground">
                          Dengan mengklik tombol ini, seluruh kuantitas ({totalItemQty} unit) pada lembar Surat Jalan / BPB ini otomatis tercatat diterima di cabang.
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          receiveShipmentMutation.mutate({
                            qrToken: activeShipment.qrToken || activeShipment.referenceNo,
                          })
                        }
                        disabled={receiveShipmentMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#5b7553] hover:bg-[#4d6346] text-white transition-all shadow-md shrink-0 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {receiveShipmentMutation.isPending
                          ? "Memproses Penerimaan..."
                          : `Konfirmasi Terima Seluruh Barang (${totalItemQty} Unit)`}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#e8f5e3]/60 dark:bg-green-950/20 border border-[#a3b899]/40 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#5b7553] dark:text-green-400 shrink-0" />
                      <div className="text-xs text-[#2d2d2a] dark:text-foreground">
                        <p className="font-semibold">Seluruh material telah lengkap diterima!</p>
                        <p className="text-[#8a8a7a] dark:text-muted-foreground mt-0.5">
                          Barang telah tercatat di inventaris cabang dan siap dialokasikan ke pelanggan melalui menu <strong>Alokasi Pemasangan</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Items Breakdown Table (Otomatis Muncul Jumlah Kuantitasnya!) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#2d2d2a] dark:text-foreground flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-[#5b7553]" />
                        Daftar Barang & Kuantitas Fisik Sesuai Surat Jalan / BPB
                      </h3>
                      <span className="text-xs font-mono text-[#8a8a7a] dark:text-muted-foreground">
                        {itemsList.length > 0 ? `${itemsList.length} Jenis Barang` : `${activeShipment.totalUnits} Unit Material`}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#eae8e0] dark:border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fbfbf9] dark:bg-muted/40 text-[#6b6b5e] dark:text-muted-foreground font-semibold border-b border-[#eae8e0] dark:border-border">
                          <tr>
                            <th className="p-3 w-12 text-center">No</th>
                            <th className="p-3">Kode & Nama Barang</th>
                            <th className="p-3 text-center w-32">Kuantitas Fisik</th>
                            <th className="p-3 text-center w-32">Status Barang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eae8e0] dark:divide-border bg-white dark:bg-card">
                          {itemsList.length > 0 ? (
                            itemsList.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3 text-center font-mono text-[#8a8a7a]">{idx + 1}</td>
                                <td className="p-3">
                                  <p className="font-semibold text-sm text-[#2d2d2a] dark:text-foreground">
                                    {item.itemName}
                                  </p>
                                  <p className="text-[11px] font-mono text-[#8a8a7a] dark:text-muted-foreground">
                                    {item.itemCode}
                                  </p>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center font-mono font-bold text-sm text-[#2d2d2a] dark:text-foreground px-2.5 py-1 rounded-lg bg-[#f0efe9] dark:bg-muted">
                                    {formatNumber(item.quantity)} {item.unitName || "Unit"}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {activeShipment.isFullyReceived ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5b7553] dark:text-green-400">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Diterima
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8b6b4a] dark:text-yellow-500">
                                      <Clock className="w-3.5 h-3.5" /> Siap Diterima
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            // Fallback jika belum terkelompokkan: ambil dari units
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-[#8a8a7a]">
                                Total Kuantitas: <strong>{activeShipment.totalUnits} Unit</strong>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-[#fbfbf9] dark:bg-muted/40 font-bold border-t border-[#eae8e0] dark:border-border text-[#2d2d2a] dark:text-foreground">
                          <tr>
                            <td colSpan={2} className="p-3 text-right">
                              TOTAL KUANTITAS FISIK:
                            </td>
                            <td className="p-3 text-center font-mono text-sm text-[#5b7553]">
                              {formatNumber(totalItemQty)} Unit
                            </td>
                            <td className="p-3 text-center text-xs text-[#8a8a7a] font-normal">
                              {activeShipment.isFullyReceived ? "100% Selesai" : "Siap Dikonfirmasi"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Expandable Section: Rincian Nomor Seri Unit (Opsional) */}
                  <div className="pt-2 border-t border-[#eae8e0] dark:border-border">
                    <button
                      onClick={() => setShowUnitsDetail(!showUnitsDetail)}
                      className="w-full flex items-center justify-between text-xs text-[#8a8a7a] hover:text-[#2d2d2a] dark:hover:text-foreground py-2 transition-colors font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <ScanBarcode className="w-4 h-4 text-[#5b7553]" />
                        Lihat Rincian Nomor Seri / Unit Pelacakan ({activeShipment.units?.length || 0} Unit)
                      </span>
                      {showUnitsDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showUnitsDetail && (
                      <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {activeShipment.units?.map((unit, index) => {
                          const isReceived = unit.status !== "MENUNGGU_DITERIMA" || !!unit.receivedAt;
                          return (
                            <div
                              key={unit.trackingId}
                              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                isReceived
                                  ? "bg-[#fcfdfa] dark:bg-card border-[#c8d6c0] dark:border-green-950/40"
                                  : "bg-white dark:bg-card border-[#eae8e0] dark:border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-[#f0efe9] dark:bg-muted text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                                  #{index + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-[#2d2d2a] dark:text-foreground">{unit.itemName}</p>
                                  <p className="font-mono text-[10px] text-[#8a8a7a]">
                                    UUID: {unit.trackingUuid.slice(0, 10)}... | {unit.itemCode}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isReceived ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5b7553] dark:text-green-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Diterima
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => receiveUnitMutation.mutate({ trackingId: unit.trackingId })}
                                    disabled={receiveUnitMutation.isPending}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#5b7553] text-white hover:bg-[#4d6346] transition-colors"
                                  >
                                    Terima Satuan
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DashCard>

                {/* SOP Info Box */}
                <div className="p-4 rounded-2xl bg-[#fffdf5] dark:bg-card border border-[#eae8e0] text-xs text-[#6b6b5e] dark:text-muted-foreground flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f5e3] dark:bg-green-950/50 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-[#5b7553] dark:text-green-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#2d2d2a] dark:text-foreground">SOP Penerimaan Cabang Per Surat Jalan / BPB:</p>
                    <p className="leading-relaxed">
                      1. Petugas cabang cukup memindai kode QR pada lembar Surat Jalan / BPB fisik.<br />
                      2. Sistem otomatis memvalidasi keaslian dokumen dan memunculkan kuantitas seluruh barang.<br />
                      3. Klik <strong>Konfirmasi Terima</strong> untuk memasukkan seluruh material ke inventaris cabang.
                    </p>
                  </div>
                </div>
              </div>
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
    </div>
  );
}
