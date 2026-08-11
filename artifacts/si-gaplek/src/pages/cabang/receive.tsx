import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScanLine, CheckCircle2, ArrowRight, PackageOpen } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function CabangReceivePage() {
    const [qrToken, setQrToken] = useState("");
    const { toast } = useToast();

    const receiveMutation = useMutation({
        mutationFn: async (token: string) => {
            return apiFetch("/api/branch/receive", {
                method: "POST",
                body: JSON.stringify({
                    qrToken: token,
                    idempotencyKey: uuidv4(),
                }),
            });
        },
        onSuccess: (data: any) => {
            toast({
                title: "Penerimaan Berhasil",
                description: data.message || "Barang telah tercatat di cabang.",
            });
            setQrToken("");
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Gagal Menerima Barang",
                description: error.message,
            });
        },
    });

    const handleScanSimulation = () => {
        // In a real app, this would open the native device camera.
        // For this blueprint implementation, we'll prompt for manual input if it's empty,
        // or submit the current input.
        if (!qrToken.trim()) {
            toast({
                title: "QR Code Token Dibutuhkan",
                description: "Masukkan token QR transaksi yang sedang berstatus DIKIRIM ke cabang Anda.",
            });
            return;
        }

        receiveMutation.mutate(qrToken);
    };

    return (
        <div className="p-4 md:p-8 max-w-md mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Terima Barang</h1>
                <p className="text-muted-foreground">Pindai QR Surat Jalan untuk konfirmasi penerimaan di cabang.</p>
            </div>

            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6 pb-6 text-center">
                    <div className="mx-auto w-24 h-24 bg-background rounded-2xl flex items-center justify-center shadow-inner mb-6 relative overflow-hidden group">
                        <ScanLine className="w-10 h-10 text-primary z-10" />
                        <div className="absolute inset-0 bg-primary/10 -translate-y-full group-hover:animate-scan" />
                    </div>
                    <p className="text-sm font-medium mb-2">Simulasi Scanner Hardware</p>
                    <p className="text-xs text-muted-foreground mb-4 text-balance">
                        Di lapangan, petugas dapat menggunakan kamera HP arahan PDA scanner.
                    </p>

                    <div className="space-y-3">
                        <div className="relative">
                            <Input
                                placeholder="QR Token (Manual Entry)"
                                value={qrToken}
                                onChange={(e) => setQrToken(e.target.value)}
                                className="pl-10 text-center font-mono text-sm tracking-wider"
                            />
                            <PackageOpen className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        </div>
                        <Button
                            className="w-full relative overflow-hidden"
                            size="lg"
                            onClick={handleScanSimulation}
                            disabled={receiveMutation.isPending || !qrToken}
                        >
                            {receiveMutation.isPending ? (
                                "Memproses..."
                            ) : (
                                <>
                                    <ScanLine className="w-4 h-4 mr-2" />
                                    Pindai & Terima
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="pt-6 border-t">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Data Material Diterima
                </h3>
                {receiveMutation.isSuccess && receiveMutation.data && (
                    <Card className="bg-green-50/50 border-green-200">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm text-green-800">
                                Resi #{receiveMutation.data.receipt?.id || "-"}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Berhasil dicatat pada {new Date().toLocaleString()}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
                {!receiveMutation.isSuccess && (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                        Belum ada data penerimaan terbaru.
                    </div>
                )}
            </div>

        </div>
    );
}
