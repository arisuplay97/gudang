import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Camera, CameraOff, CheckCircle2, Search, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
    open: boolean;
    onClose: () => void;
    onDetected: (barcode: string) => void | Promise<void>;
    /** If true, scanner stays open after detection for continuous scanning */
    continuous?: boolean;
    /** If true, renders inline without full-screen modal overlay */
    embedded?: boolean;
}

type ScanState = "init" | "scanning" | "success" | "error";

export function BarcodeScanner({
    open,
    onClose,
    onDetected,
    continuous = false,
    embedded = false,
}: BarcodeScannerProps) {
    const rawId = useId();
    const elementId = `barcode-scanner-view-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const [state, setState] = useState<ScanState>("init");
    const [errorMsg, setErrorMsg] = useState("");
    const [lastBarcode, setLastBarcode] = useState("");
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const cooldownRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startScanner = useCallback(async () => {
        setState("init");
        setErrorMsg("");

        const el = document.getElementById(elementId);
        if (!el) return;

        try {
            // Clean up any existing instance first
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch {}
                try {
                    scannerRef.current.clear();
                } catch {}
                scannerRef.current = null;
            }

            const scanner = new Html5Qrcode(elementId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: 250,
                    aspectRatio: 1.0,
                },
                async (decodedText) => {
                    if (cooldownRef.current) return;
                    cooldownRef.current = true;

                    setLastBarcode(decodedText);

                    try {
                        await onDetected(decodedText);
                        setState("success");
                        // Cooldown: 800ms before next scan
                        setTimeout(() => {
                            cooldownRef.current = false;
                            if (continuous) {
                                setState("scanning");
                            }
                        }, 800);
                    } catch (err: any) {
                        setErrorMsg(err.message || "Barcode tidak cocok atau tidak ditemukan.");
                        setState("error");
                        cooldownRef.current = false;
                    }
                },
                () => {
                    // ignore scan errors (no barcode in frame)
                }
            );

            setState("scanning");
        } catch (err: any) {
            const msg = err?.message || String(err);
            if (
                msg.includes("NotAllowedError") ||
                msg.includes("Permission") ||
                msg.includes("denied")
            ) {
                setErrorMsg(
                    "Kamera diperlukan untuk melakukan scan barcode. Izinkan akses kamera pada browser/perangkat."
                );
            } else if (
                msg.includes("NotFoundError") ||
                msg.includes("not found") ||
                msg.includes("Requested device not found")
            ) {
                setErrorMsg(
                    "Kamera tidak tersedia pada perangkat ini. Gunakan pencarian material manual."
                );
            } else {
                setErrorMsg(`Gagal membuka kamera: ${msg}`);
            }
            setState("error");
        }
    }, [onDetected, continuous]);

    const stopScanner = useCallback(async () => {
        try {
            if (
                scannerRef.current &&
                scannerRef.current.getState() === 2 /* SCANNING */
            ) {
                await scannerRef.current.stop();
            }
            scannerRef.current?.clear();
        } catch {
            // ignore
        }
        scannerRef.current = null;
    }, []);

    useEffect(() => {
        if (open) {
            // Small delay so the DOM element is rendered
            const t = setTimeout(() => startScanner(), 200);
            return () => clearTimeout(t);
        }
        stopScanner();
        setState("init");
        return undefined;
    }, [open, startScanner, stopScanner]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    if (!open) return null;

    if (embedded) {
        return (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black text-white">
                {/* Scanner viewport */}
                <div className="relative bg-black min-h-[240px] flex items-center justify-center">
                    <div id={elementId} ref={containerRef} className="w-full" />

                    {/* Scanning line animation */}
                    {state === "scanning" && (
                        <motion.div
                            className="absolute left-6 right-6 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] pointer-events-none"
                            initial={{ top: "20%" }}
                            animate={{ top: ["20%", "75%", "20%"] }}
                            transition={{
                                duration: 2.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    )}

                    {/* Success overlay */}
                    <AnimatePresence>
                        {state === "success" && (
                            <motion.div
                                className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-10"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                                <p className="text-white font-mono text-xs mt-2 font-bold">{lastBarcode}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Embedded error or status helper */}
                {state === "error" && (
                    <div className="p-3 bg-red-950/40 border-t border-red-900/50 text-red-200 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                            <CameraOff className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                            <p className="leading-snug text-[11px]">{errorMsg}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                            onClick={() => {
                                stopScanner();
                                setTimeout(() => startScanner(), 200);
                            }}
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Coba Nyalakan Lagi
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div
                    className="relative w-full max-w-md mx-4 bg-background rounded-2xl overflow-hidden shadow-2xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">Scan Barcode</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Scanner viewport */}
                    <div className="relative bg-black" style={{ minHeight: 280 }}>
                        <div id={elementId} ref={containerRef} className="w-full" />

                        {/* Scanning line animation */}
                        {state === "scanning" && (
                            <motion.div
                                className="absolute left-8 right-8 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                initial={{ top: "20%" }}
                                animate={{ top: ["20%", "75%", "20%"] }}
                                transition={{
                                    duration: 2.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            />
                        )}

                        {/* Success overlay */}
                        <AnimatePresence>
                            {state === "success" && (
                                <motion.div
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            damping: 12,
                                            stiffness: 200,
                                        }}
                                    >
                                        <CheckCircle2 className="w-16 h-16 text-green-400" />
                                    </motion.div>
                                    <motion.p
                                        className="text-white font-mono text-sm mt-2"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        {lastBarcode}
                                    </motion.p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="p-4 space-y-2">
                        {state === "scanning" && (
                            <p className="text-sm text-muted-foreground text-center">
                                Arahkan barcode ke frame kamera
                            </p>
                        )}

                        {state === "success" && !continuous && (
                            <motion.p
                                className="text-sm text-green-600 font-medium text-center"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                Barcode terdeteksi!
                            </motion.p>
                        )}

                        {state === "success" && continuous && (
                            <motion.p
                                className="text-sm text-green-600 font-medium text-center"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                ✓ {lastBarcode} — Scanner siap untuk scan berikutnya
                            </motion.p>
                        )}

                        {state === "error" && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    <CameraOff className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p>{errorMsg}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            stopScanner();
                                            setTimeout(() => startScanner(), 200);
                                        }}
                                    >
                                        Coba Lagi
                                    </Button>
                                    <Button variant="secondary" className="flex-1" onClick={handleClose}>
                                        <Search className="w-4 h-4 mr-2" />
                                        Pencarian Manual
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleClose}
                        >
                            Tutup Scanner
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
