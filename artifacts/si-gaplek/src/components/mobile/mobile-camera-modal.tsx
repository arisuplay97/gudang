import { useState } from "react";
import { useLocation } from "wouter";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Boxes, PackageCheck, ScanLine, X, Search, Camera } from "lucide-react";

interface MobileCameraModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "check_stock" | "receive";
}

export function MobileCameraModal({
  open,
  onClose,
  defaultMode = "check_stock",
}: MobileCameraModalProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [scanMode, setScanMode] = useState<"check_stock" | "receive">(defaultMode);
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(true);

  const handleDetected = (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;
    onClose();

    if (scanMode === "check_stock") {
      const branchParam = user?.branchId ? `&branch=${user.branchId}` : "";
      navigate(`/scan/material?code=${encodeURIComponent(clean)}${branchParam}`);
    } else {
      navigate(`/cabang/receive?shipment=${encodeURIComponent(clean)}`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
    setManualCode("");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[92vw] p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Pindai Barcode / QR
            </DialogTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/70 mt-3 text-xs">
            <button
              type="button"
              onClick={() => setScanMode("check_stock")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold transition-all ${
                scanMode === "check_stock"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-blue-500" />
              Cek Jumlah Stok
            </button>
            <button
              type="button"
              onClick={() => setScanMode("receive")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold transition-all ${
                scanMode === "receive"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
              Terima Surat Jalan
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Subtext info */}
          <p className="text-xs text-muted-foreground text-center">
            {scanMode === "check_stock"
              ? "Arahkan kamera ke barcode/QR material untuk cek sisa fisik di cabang."
              : "Arahkan kamera ke QR Surat Jalan (SPK) untuk konfirmasi penerimaan barang."}
          </p>

          {/* Camera Scanner View */}
          <div className="relative rounded-2xl overflow-hidden bg-black/90 min-h-[220px] flex items-center justify-center border border-border">
            {isScanning ? (
              <BarcodeScanner
                open={open}
                onClose={() => setIsScanning(false)}
                onDetected={handleDetected}
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <ScanLine className="w-10 h-10 mx-auto text-muted-foreground/40 animate-pulse" />
                <p className="text-xs text-muted-foreground">Kamera dijeda</p>
                <Button size="sm" variant="outline" onClick={() => setIsScanning(true)}>
                  Nyalakan Kamera
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Atau Masukkan Kode Manual
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={
                    scanMode === "check_stock"
                      ? "Kode material (misal: MAT-001)"
                      : "No. SPK (misal: BK-2026-001)"
                  }
                  className="pl-9 h-10 text-xs rounded-xl bg-muted/40 font-mono"
                />
              </div>
              <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold">
                Proses
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
