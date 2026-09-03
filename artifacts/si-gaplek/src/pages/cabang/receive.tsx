import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScanLine, CheckCircle2, ArrowRight, PackageOpen, Camera, ShieldCheck, Clock, MapPin, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CabangReceivePage() {
  const [qrToken, setQrToken] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Query recent tracking to show status
  const { data: trackingData } = useQuery({
    queryKey: ["cabang-tracking"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/tracking"),
  });

  const incomingTrackings = (trackingData?.data || []).filter(
    (t: any) => t.status === "MENUNGGU_DITERIMA"
  );

  const receiveMutation = useMutation({
    mutationFn: async (token: string) => {
      return apiFetch<{ message: string; receipt: any }>("/api/branch/receive", {
        method: "POST",
        body: JSON.stringify({
          qrToken: token.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Penerimaan Berhasil",
        description: data.message || "Material barang keluar telah berhasil diterima di cabang.",
      });
      setLatestReceipt(data.receipt);
      setQrToken("");
      qc.invalidateQueries({ queryKey: ["cabang-tracking"] });
      qc.invalidateQueries({ queryKey: ["cabang-allocations"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Menerima Barang",
        description: error.message,
      });
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) {
      toast({
        title: "Token QR Diperlukan",
        description: "Masukkan token QR transaksi barang keluar yang dikirim ke cabang Anda.",
        variant: "destructive",
      });
      return;
    }
    receiveMutation.mutate(qrToken.trim());
  };

  const handleCameraDetected = async (detectedToken: string) => {
    setScannerOpen(false);
    setQrToken(detectedToken);
    receiveMutation.mutate(detectedToken);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Terima Barang (Cabang)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pindai kode QR pada Surat Jalan / Bukti Pengeluaran Barang untuk konfirmasi penerimaan fisik.
        </p>
      </motion.div>

      {/* Main Scanner Card */}
      <Card className="shadow-md border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />
        <CardHeader className="pb-4 pt-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary relative group">
            <ScanLine className="w-10 h-10" />
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-pulse" />
          </div>
          <CardTitle className="text-xl">Pemindai QR Surat Jalan</CardTitle>
          <CardDescription className="text-xs max-w-sm mx-auto">
            Arahkan kamera smartphone atau webcam ke kode QR yang tercetak pada dokumen pengeluaran gudang.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-6 px-6">
          <Button
            size="lg"
            className="w-full h-12 text-base font-medium shadow-md gap-2"
            onClick={() => setScannerOpen(true)}
            disabled={receiveMutation.isPending}
          >
            <Camera className="w-5 h-5" />
            Buka Kamera Pemindai QR
          </Button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border" />
            <span className="flex-shrink mx-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Atau Input Manual
            </span>
            <div className="flex-grow border-t border-border" />
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Tempel / ketik token QR transaksi..."
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="font-mono text-center text-sm tracking-wider h-11"
                disabled={receiveMutation.isPending}
              />
              <PackageOpen className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={receiveMutation.isPending || !qrToken.trim()}
            >
              {receiveMutation.isPending ? "Memverifikasi & Menerima..." : "Konfirmasi Penerimaan Manual"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Camera Scanner Modal Component */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCameraDetected}
      />

      {/* Success Notification Card */}
      <AnimatePresence>
        {latestReceipt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                      Material Berhasil Diterima
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-700 dark:text-emerald-400">
                      Tercatat pada {new Date(latestReceipt.createdAt || Date.now()).toLocaleString("id-ID")}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
                  Resi #{latestReceipt.id}
                </Badge>
              </CardHeader>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Trackings Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Pengiriman Sedang Menuju Cabang Anda
          </span>
          <Badge variant="outline" className="text-xs">
            {incomingTrackings.length} Transaksi
          </Badge>
        </h3>

        {incomingTrackings.length === 0 ? (
          <div className="border border-dashed rounded-xl p-6 text-center text-muted-foreground text-xs bg-muted/20">
            Tidak ada pengiriman barang keluar yang sedang dalam perjalanan menuju cabang Anda.
          </div>
        ) : (
          <div className="grid gap-2">
            {incomingTrackings.map((t: any) => (
              <Card key={t.id} className="p-3 shadow-none hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{t.itemName}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Ref: {t.referenceNo} | Qty: <span className="font-semibold text-foreground">{t.totalQuantity}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                    DIKIRIM
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
