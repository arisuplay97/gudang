import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Package,
  Clock,
  ShieldAlert,
  ArrowRight,
  Activity,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Calendar,
  Building2,
  Truck,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const STEPS = [
  { key: "BARANG_KELUAR", label: "Keluar Gudang", desc: "Barang dikeluarkan dari gudang pusat" },
  { key: "DITERIMA_CABANG", label: "Diterima Cabang", desc: "Surat jalan & QR telah discan cabang" },
  { key: "MENUNGGU_PEMASANGAN", label: "Alokasi Titik", desc: "Kuantitas dibagi ke titik pemasangan" },
  { key: "MENUNGGU_VERIFIKASI", label: "Pemasangan Selesai", desc: "Foto & GPS terkirim ke SPI" },
  { key: "TERVERIFIKASI", label: "Terverifikasi (GIS)", desc: "Diverifikasi SPI & tampil di peta resmi" },
];

export default function CabangTrackingPage() {
  const [, setLocation] = useLocation();
  const [selectedTrackingUuid, setSelectedTrackingUuid] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cabang-tracking"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/tracking"),
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ["tracking-detail", selectedTrackingUuid],
    queryFn: () => apiFetch<any>(`/api/tracking/${selectedTrackingUuid}`),
    enabled: !!selectedTrackingUuid,
  });

  const trackings = data?.data || [];

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center min-h-[300px]">
        <Activity className="w-6 h-6 animate-pulse mr-2 text-primary" />
        Memuat data material tracking...
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "MENUNGGU_DITERIMA":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
      case "DITERIMA_CABANG":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400";
      case "MENUNGGU_PEMASANGAN":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400";
      case "MENUNGGU_VERIFIKASI":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400";
      case "TERVERIFIKASI":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSlaIndicator = (slaStatus: string) => {
    switch (slaStatus) {
      case "NORMAL":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> SLA Aman
          </Badge>
        );
      case "WARNING":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <Clock className="w-3 h-3 mr-1" /> &lt; 48 Jam
          </Badge>
        );
      case "KRITIS":
        return (
          <Badge variant="destructive" className="bg-rose-500">
            <ShieldAlert className="w-3 h-3 mr-1" /> &lt; 24 Jam
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="destructive" className="bg-black text-white border-black">
            <ShieldAlert className="w-3 h-3 mr-1" /> Lewat SLA
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "BARANG_KELUAR":
      case "MENUNGGU_DITERIMA":
        return 0;
      case "DITERIMA_CABANG":
        return 1;
      case "MENUNGGU_PEMASANGAN":
        return 2;
      case "TERPASANG":
      case "MENUNGGU_VERIFIKASI":
        return 3;
      case "TERVERIFIKASI":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Material Tracking</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pantau perjalanan fisik barang dari gudang sampai titik pemasangan terverifikasi.
          </p>
        </div>
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
      </div>

      {trackings.length === 0 ? (
        <Card className="border-dashed text-center py-14 bg-muted/20">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Tidak Ada Material Tracking Aktif</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Hanya material bertipe TRACKED (pipa, valve, meteran) yang memiliki tracking QR dan audit GIS.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trackings.map((track: any) => {
            const currentStepIdx = getStepIndex(track.status);

            return (
              <Card
                key={track.id}
                className="overflow-hidden border-border/80 shadow-sm hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setSelectedTrackingUuid(track.uuid)}
              >
                <div className="p-4 bg-muted/30 border-b flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base text-foreground">{track.itemName}</span>
                      {track.isPartial && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-purple-100 text-purple-800">
                          PARSIAL
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {track.itemCode} | Ref Transaksi: {track.referenceNo}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${getStatusColor(track.status)}`}>
                      {track.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Progress Qty & SLA */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground text-xs">Progress Alokasi Fisik</p>
                      <p className="font-semibold text-foreground">
                        {track.installedQuantity} / {track.totalQuantity}{" "}
                        <span className="text-xs text-muted-foreground font-normal">dialokasikan</span>
                      </p>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <p className="text-muted-foreground text-xs">Batas Waktu SLA (7 Hari)</p>
                      <div className="flex items-center justify-end gap-1.5">
                        {track.slaDeadlineAt ? (
                          <>
                            <span className="text-xs font-mono font-medium text-foreground">
                              {new Date(track.slaDeadlineAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            {track.status !== "TERVERIFIKASI" && getSlaIndicator(track.slaStatus)}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Step Bar */}
                  <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Tahapan: <strong className="text-foreground">{STEPS[currentStepIdx]?.label}</strong>
                    </span>
                    <span className="text-primary font-medium flex items-center gap-1 hover:underline">
                      Lihat Detail Journey <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── MATERIAL JOURNEY DETAIL MODAL ─── */}
      <Dialog open={selectedTrackingUuid !== null} onOpenChange={(o) => !o && setSelectedTrackingUuid(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Perjalanan Material (Material Journey)
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Memuat perjalanan material...</div>
          ) : detailData ? (
            <div className="space-y-6 py-2">
              {/* Material Info Card */}
              <div className="p-3.5 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">{detailData.item?.itemName}</h3>
                  <Badge variant="outline" className="text-xs font-mono">
                    {detailData.item?.itemCode}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div>
                    Ref: <strong className="text-foreground font-mono">{detailData.item?.referenceNo}</strong>
                  </div>
                  <div>
                    Total Keluar: <strong className="text-foreground">{detailData.item?.quantity} unit</strong>
                  </div>
                  <div>
                    Gudang Asal: <strong className="text-foreground">{detailData.item?.warehouseName || "Gudang Pusat"}</strong>
                  </div>
                  <div>
                    Cabang Tujuan: <strong className="text-foreground">{detailData.branch?.name || "Cabang"}</strong>
                  </div>
                </div>
              </div>

              {/* Vertical Step Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Alur End-to-End Logistik
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {STEPS.map((step, idx) => {
                    const currentIdx = getStepIndex(detailData.tracking?.status || "");
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.key} className="relative">
                        <div
                          className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-background border-muted-foreground/40"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3 h-3" />}
                        </div>

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allocations breakdown if any */}
              {Array.isArray(detailData.allocations) && detailData.allocations.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Titik Alokasi Fisik ({detailData.allocations.length} Titik)
                  </h4>
                  <div className="grid gap-2">
                    {detailData.allocations.map((alloc: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border text-xs flex justify-between items-center bg-card">
                        <div>
                          <p className="font-semibold text-foreground">Titik #{i + 1} — {alloc.quantity} unit</p>
                          {alloc.plannedLatitude && (
                            <p className="text-muted-foreground font-mono text-[11px]">
                              Target: {alloc.plannedLatitude}, {alloc.plannedLongitude}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={alloc.status === "VERIFIED" ? "default" : "secondary"}
                          className={alloc.status === "VERIFIED" ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}
                        >
                          {alloc.status === "VERIFIED" ? "Terverifikasi" : "Belum / Proses"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Data detail tidak ditemukan.</div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedTrackingUuid(null)}>
              Tutup
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                setSelectedTrackingUuid(null);
                setLocation("/cabang/pemasangan");
              }}
            >
              Ke Menu Pemasangan <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
