import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Compass,
  Plus,
  Layers,
  Clock,
  ShieldCheck,
  FolderOpen,
  CameraOff,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TrackingItem {
  id: number;
  uuid: string;
  itemName: string;
  itemCode: string;
  referenceNo: string;
  status: string;
  totalQuantity: number;
  installedQuantity: number;
  remainingQuantity: number;
  branchName?: string;
  isPartial: boolean;
}

interface AllocationItem {
  allocationId: number;
  allocationUuid: string;
  quantity: number;
  plannedLatitude: string | null;
  plannedLongitude: string | null;
  status: string;
  createdAt: string;
  trackingId: number;
  trackingUuid: string;
  trackingStatus: string;
  itemName: string;
  itemCode: string;
  referenceNo: string;
  branchName?: string;
}

export default function CabangPemasanganPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("allocations");
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [selectedTrackingForAlloc, setSelectedTrackingForAlloc] = useState<TrackingItem | null>(null);

  // Form allocation
  const [allocQuantity, setAllocQuantity] = useState<string>("1");
  const [plannedLat, setPlannedLat] = useState<string>("");
  const [plannedLon, setPlannedLon] = useState<string>("");
  const [isGettingGpsForAlloc, setIsGettingGpsForAlloc] = useState(false);

  // Camera Studio State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null);
  const [capturedWatermarkedPhoto, setCapturedWatermarkedPhoto] = useState<string>("");
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Fetch Active Trackings for Cabang (to create allocations)
  const { data: trackingsData, isLoading: isTrackingsLoading } = useQuery({
    queryKey: ["cabang-tracking"],
    queryFn: () => apiFetch<{ data: TrackingItem[] }>("/api/tracking"),
  });

  const readyForAllocTrackings = useMemo(() => {
    const list = trackingsData?.data || [];
    return list.filter(
      (t) =>
        (t.status === "DITERIMA_CABANG" || t.status === "MENUNGGU_PEMASANGAN") &&
        t.remainingQuantity > 0
    );
  }, [trackingsData]);

  // 2. Fetch Allocations (to submit photo evidence)
  const { data: allocationsData, isLoading: isAllocationsLoading } = useQuery({
    queryKey: ["cabang-allocations"],
    queryFn: () => apiFetch<{ data: AllocationItem[] }>("/api/branch/my-allocations"),
  });

  const allocations = allocationsData?.data || [];
  const pendingEvidenceAllocations = allocations.filter(
    (a) => a.status === "PENDING" || !a.status || a.status === "REJECTED"
  );
  const completedAllocations = allocations.filter(
    (a) => a.status === "VERIFIED" || a.status === "MENUNGGU_VERIFIKASI"
  );

  // Mutation: Create Allocation
  const createAllocationMutation = useMutation({
    mutationFn: async (payload: { trackingUuid: string; quantity: number; plannedLatitude?: number; plannedLongitude?: number }) => {
      return apiFetch("/api/branch/allocations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({
        title: "Alokasi Berhasil Dibuat",
        description: "Titik alokasi pemasangan baru telah ditambahkan.",
      });
      queryClient.invalidateQueries({ queryKey: ["cabang-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["cabang-allocations"] });
      setAllocationModalOpen(false);
      setSelectedTrackingForAlloc(null);
      setAllocQuantity("1");
      setPlannedLat("");
      setPlannedLon("");
      setActiveTab("camera");
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Gagal Membuat Alokasi", description: err.message });
    },
  });

  // Mutation: Submit Evidence
  const submitEvidenceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch("/api/branch/evidence", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bukti Pemasangan Terkirim",
        description: data.locationMismatch
          ? "Terkirim. Terdeteksi deviasi lokasi pemasangan (mismatch)."
          : "Bukti sukses terkirim dan menunggu verifikasi auditor SPI.",
      });
      queryClient.invalidateQueries({ queryKey: ["cabang-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["cabang-tracking"] });
      closeCameraModal();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Gagal Kirim Bukti", description: err.message });
    },
  });

  // Helper: Open Allocation Modal
  const openAllocationDialog = (t: TrackingItem) => {
    setSelectedTrackingForAlloc(t);
    setAllocQuantity(String(Math.min(1, t.remainingQuantity)));
    setPlannedLat("");
    setPlannedLon("");
    setAllocationModalOpen(true);
  };

  // Helper: Detect Current GPS for Allocation
  const detectGpsForAllocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "GPS Tidak Didukung", description: "Browser tidak mendukung geolocation." });
      return;
    }
    setIsGettingGpsForAlloc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlannedLat(pos.coords.latitude.toFixed(6));
        setPlannedLon(pos.coords.longitude.toFixed(6));
        setIsGettingGpsForAlloc(false);
        toast({ title: "GPS Terkunci", description: `Akurasi: ±${pos.coords.accuracy.toFixed(1)}m` });
      },
      (err) => {
        setIsGettingGpsForAlloc(false);
        toast({ variant: "destructive", title: "Gagal Mengunci GPS", description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Helper: Handle Allocation Save
  const handleSaveAllocation = () => {
    if (!selectedTrackingForAlloc) return;
    const qty = parseInt(allocQuantity);
    if (!qty || qty <= 0) {
      toast({ variant: "destructive", title: "Kuantitas Tidak Valid", description: "Jumlah harus lebih dari 0." });
      return;
    }
    if (qty > selectedTrackingForAlloc.remainingQuantity) {
      toast({
        variant: "destructive",
        title: "Melebihi Sisa",
        description: `Maksimal kuantitas yang dapat dialokasikan adalah ${selectedTrackingForAlloc.remainingQuantity}.`,
      });
      return;
    }

    createAllocationMutation.mutate({
      trackingUuid: selectedTrackingForAlloc.uuid,
      quantity: qty,
      plannedLatitude: plannedLat ? parseFloat(plannedLat) : undefined,
      plannedLongitude: plannedLon ? parseFloat(plannedLon) : undefined,
    });
  };

  // ─── Camera Studio Methods ───
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraStreaming(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau browser ini tidak mendukung akses kamera langsung.");
      }

      // Try environment (back) camera first, fallback to user (front/webcam)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraStreaming(true);
        };
      }
    } catch (err: any) {
      setCameraError(err.message || "Gagal mengaktifkan kamera.");
    }

    // Also get live GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGps({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn("GPS error during camera start:", err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStreaming(false);
  }, []);

  const openCameraModal = (alloc: AllocationItem) => {
    setSelectedAllocation(alloc);
    setCapturedWatermarkedPhoto("");
    setCameraModalOpen(true);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCameraModalOpen(false);
    setSelectedAllocation(null);
    setCapturedWatermarkedPhoto("");
  };

  useEffect(() => {
    if (cameraModalOpen && !capturedWatermarkedPhoto) {
      const t = setTimeout(() => startCamera(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cameraModalOpen, capturedWatermarkedPhoto, startCamera]);

  // Capture & Draw Official Watermark on Canvas
  const captureAndWatermark = async () => {
    if (!videoRef.current || !selectedAllocation) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw camera video frame
    ctx.drawImage(video, 0, 0, width, height);

    // 2. Prepare Watermark Info
    const dateStr = new Date().toLocaleString("id-ID", {
      timeZoneName: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const lat = currentGps ? currentGps.lat.toFixed(6) : "Tidak Tersedia";
    const lon = currentGps ? currentGps.lon.toFixed(6) : "Tidak Tersedia";
    const acc = currentGps ? `±${currentGps.accuracy.toFixed(1)}m` : "N/A";
    const officer = user?.fullName || user?.username || "Petugas Lapangan";
    const branch = selectedAllocation.branchName || "Cabang PDAM";

    // 3. Draw Watermark Bottom Bar
    const bannerHeight = Math.max(120, height * 0.2);
    const bannerY = height - bannerHeight;

    // Gradient background for legibility
    const grad = ctx.createLinearGradient(0, bannerY, 0, height);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, width, bannerHeight);

    // Accent line
    ctx.fillStyle = "#10b981"; // Emerald
    ctx.fillRect(0, bannerY, width, 4);

    // Text configuration
    ctx.fillStyle = "#ffffff";
    const fontSizeTitle = Math.max(16, Math.round(width * 0.022));
    const fontSizeBody = Math.max(13, Math.round(width * 0.016));

    let yOffset = bannerY + fontSizeTitle + 14;

    // Header line
    ctx.font = `bold ${fontSizeTitle}px sans-serif`;
    ctx.fillText("PERUMDAM TIRTA ARDHIA RINJANI — SI GAPLEK", 24, yOffset);

    // Badge text right aligned
    ctx.textAlign = "right";
    ctx.fillStyle = "#34d399";
    ctx.font = `bold ${fontSizeBody}px sans-serif`;
    ctx.fillText("BUKTI DOKUMENTASI FISIK", width - 24, yOffset);
    ctx.textAlign = "left";

    // Metadata lines
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `normal ${fontSizeBody}px sans-serif`;
    yOffset += fontSizeBody + 8;
    ctx.fillText(
      `Material: ${selectedAllocation.itemName} (Qty: ${selectedAllocation.quantity}) | Ref: ${selectedAllocation.referenceNo}`,
      24,
      yOffset
    );

    yOffset += fontSizeBody + 6;
    ctx.fillText(`Petugas: ${officer} | Cabang: ${branch} | Waktu: ${dateStr}`, 24, yOffset);

    yOffset += fontSizeBody + 6;
    ctx.fillStyle = "#67e8f9"; // Cyan accent for GPS
    ctx.fillText(`GPS: Lat ${lat}, Lon ${lon} (Akurasi: ${acc})`, 24, yOffset);

    // 4. Export as image data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedWatermarkedPhoto(dataUrl);
    stopCamera();
  };

  // Submit Final Captured Photo
  const handleSubmitEvidence = () => {
    if (!selectedAllocation || !capturedWatermarkedPhoto) return;

    // Fallback GPS if not available
    const lat = currentGps?.lat ?? (selectedAllocation.plannedLatitude ? parseFloat(selectedAllocation.plannedLatitude) : -8.584);
    const lon = currentGps?.lon ?? (selectedAllocation.plannedLongitude ? parseFloat(selectedAllocation.plannedLongitude) : 116.109);

    submitEvidenceMutation.mutate({
      allocationId: selectedAllocation.allocationId,
      photoBase64: capturedWatermarkedPhoto,
      latitude: lat,
      longitude: lon,
      gpsAccuracy: currentGps?.accuracy ?? 5.0,
      clientCaptureTime: new Date().toISOString(),
      idempotencyKey: crypto.randomUUID(),
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pemasangan & Dokumentasi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola alokasi titik pemasangan material dan unggah bukti fisik dengan watermark resmi.
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/60 p-1">
          <TabsTrigger value="allocations" className="text-xs font-medium">
            1. Alokasi Titik
          </TabsTrigger>
          <TabsTrigger value="camera" className="text-xs font-medium">
            2. Foto Pemasangan
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-medium">
            3. Riwayat
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: ALOKASI TITIK ─── */}
        <TabsContent value="allocations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Material Diterima (Siap Dialokasikan)</h2>
              <p className="text-xs text-muted-foreground">Pilih material untuk membagi pemasangan ke satu atau beberapa titik fisik.</p>
            </div>
          </div>

          {isTrackingsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : readyForAllocTrackings.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-muted/20">
              <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-medium text-sm text-foreground">Belum Ada Material yang Membutuhkan Alokasi</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Pastikan transaksi pengeluaran gudang sudah berstatus diterima pada menu "Terima Barang".
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {readyForAllocTrackings.map((track) => (
                <Card key={track.id} className="p-4 shadow-sm border-border/80 hover:border-primary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base text-foreground">{track.itemName}</span>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {track.itemCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">Ref Transaksi: {track.referenceNo}</p>
                      <div className="flex items-center gap-3 text-xs pt-1">
                        <span className="text-muted-foreground">
                          Total: <strong className="text-foreground">{track.totalQuantity}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Terpasang/Alokasi: <strong className="text-foreground">{track.installedQuantity}</strong>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Sisa: {track.remainingQuantity}
                        </span>
                      </div>
                    </div>

                    <Button onClick={() => openAllocationDialog(track)} className="gap-2 shrink-0 shadow-sm">
                      <Plus className="w-4 h-4" />
                      Buat Alokasi Titik
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 2: FOTO PEMASANGAN ─── */}
        <TabsContent value="camera" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Alokasi Siap Didokumentasikan</h2>
            <p className="text-xs text-muted-foreground">
              Pilih titik alokasi di bawah untuk mengaktifkan kamera dan mencetak watermark bukti fisik.
            </p>
          </div>

          {isAllocationsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : pendingEvidenceAllocations.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-muted/20">
              <Camera className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-medium text-sm text-foreground">Tidak Ada Alokasi yang Menunggu Foto</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Silakan buat alokasi terlebih dahulu pada tab "1. Alokasi Titik".
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {pendingEvidenceAllocations.map((alloc) => (
                <Card
                  key={alloc.allocationId}
                  className="p-4 shadow-sm border-border/80 hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{alloc.itemName}</h3>
                      <Badge variant="secondary" className="text-[11px] font-mono">
                        Qty: {alloc.quantity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">Ref: {alloc.referenceNo}</p>
                    {alloc.plannedLatitude && alloc.plannedLongitude && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono pt-1">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        Target: {alloc.plannedLatitude}, {alloc.plannedLongitude}
                      </div>
                    )}
                    {alloc.status === "REJECTED" && (
                      <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 mt-1">
                        Bukti sebelumnya ditolak SPI. Harap foto ulang dengan sudut & GPS yang jelas.
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => openCameraModal(alloc)}
                    className="mt-4 w-full gap-2 bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Buka Kamera Dokumentasi
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 3: RIWAYAT ─── */}
        <TabsContent value="history" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Status Verifikasi Evidence</h2>
            <p className="text-xs text-muted-foreground">Pantau status persetujuan auditor SPI terhadap bukti yang telah dikirim.</p>
          </div>

          {completedAllocations.length === 0 ? (
            <Card className="border-dashed p-8 text-center bg-muted/20">
              <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-medium text-sm text-foreground">Belum Ada Bukti yang Terkirim</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {completedAllocations.map((alloc) => {
                const isVerified = alloc.status === "VERIFIED";
                return (
                  <Card key={alloc.allocationId} className="p-4 shadow-sm border-border/80">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm text-foreground">{alloc.itemName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          Ref: {alloc.referenceNo} | Qty: {alloc.quantity}
                        </div>
                      </div>
                      <Badge
                        variant={isVerified ? "default" : "secondary"}
                        className={
                          isVerified
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1"
                            : "bg-amber-100 text-amber-800 border-amber-200 gap-1"
                        }
                      >
                        {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isVerified ? "TERVERIFIKASI (GIS)" : "MENUNGGU VERIFIKASI SPI"}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL BUAT ALOKASI ─── */}
      <Dialog open={allocationModalOpen} onOpenChange={setAllocationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Alokasi Titik Pemasangan</DialogTitle>
          </DialogHeader>

          {selectedTrackingForAlloc && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/60 space-y-1">
                <p className="text-xs text-muted-foreground">Material Terpilih:</p>
                <p className="font-semibold text-sm text-foreground">{selectedTrackingForAlloc.itemName}</p>
                <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                  <span>Ref: {selectedTrackingForAlloc.referenceNo}</span>
                  <span className="text-emerald-600 font-semibold">
                    Sisa Tersedia: {selectedTrackingForAlloc.remainingQuantity}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Jumlah yang Dipasang di Titik Ini *</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedTrackingForAlloc.remainingQuantity}
                  value={allocQuantity}
                  onChange={(e) => setAllocQuantity(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label>Titik Koordinat Rencana (Opsional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-primary"
                    onClick={detectGpsForAllocation}
                    disabled={isGettingGpsForAlloc}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {isGettingGpsForAlloc ? "Mengunci GPS..." : "Kunci GPS Saat Ini"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Latitude (Contoh: -8.584)"
                    value={plannedLat}
                    onChange={(e) => setPlannedLat(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Input
                    placeholder="Longitude (Contoh: 116.109)"
                    value={plannedLon}
                    onChange={(e) => setPlannedLon(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAllocationModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSaveAllocation}
              disabled={createAllocationMutation.isPending || !allocQuantity || parseInt(allocQuantity) <= 0}
            >
              {createAllocationMutation.isPending ? "Menyimpan..." : "Simpan Alokasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── LIVE CAMERA & WATERMARK STUDIO MODAL ─── */}
      <Dialog open={cameraModalOpen} onOpenChange={(o) => !o && closeCameraModal()}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-2 border-primary/20 bg-background">
          <DialogHeader className="p-4 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Kamera Dokumentasi Fisik
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: {selectedAllocation?.itemName} (Qty: {selectedAllocation?.quantity})
                </p>
              </div>
              {currentGps && (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 text-emerald-600 border-emerald-300">
                  <Compass className="w-3 h-3" />
                  GPS Terkunci (±{currentGps.accuracy.toFixed(0)}m)
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {/* Viewport or Preview */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
              {capturedWatermarkedPhoto ? (
                // Captured Watermarked Preview
                <img
                  src={capturedWatermarkedPhoto}
                  alt="Bukti Terpindai"
                  className="w-full h-full object-contain"
                />
              ) : cameraError ? (
                // Camera Error State
                <div className="p-6 text-center text-white space-y-3">
                  <CameraOff className="w-12 h-12 mx-auto text-rose-400" />
                  <p className="text-sm font-medium text-rose-200">{cameraError}</p>
                  <Button variant="secondary" size="sm" onClick={startCamera}>
                    Coba Lagi
                  </Button>
                </div>
              ) : (
                // Live Viewfinder
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Viewfinder Frame Guides */}
                  <div className="absolute inset-6 border border-white/30 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <span className="w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                      <span className="w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    <div className="text-center text-[10px] text-white/70 font-mono tracking-wider uppercase drop-shadow">
                      PERUMDAM TIRTA ARDHIA RINJANI
                    </div>
                    <div className="flex justify-between">
                      <span className="w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                      <span className="w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* GPS & Status Summary */}
            {currentGps ? (
              <div className="p-2.5 rounded-lg bg-muted/40 border text-xs flex items-center justify-between text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {currentGps.lat.toFixed(6)}, {currentGps.lon.toFixed(6)}
                </span>
                <span>Akurasi: ±{currentGps.accuracy.toFixed(1)}m</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Menunggu sinyal GPS perangkat untuk penempelan watermark akurat...</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 pt-0 gap-2 sm:gap-0">
            {capturedWatermarkedPhoto ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedWatermarkedPhoto("");
                    startCamera();
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Foto Ulang
                </Button>
                <Button
                  onClick={handleSubmitEvidence}
                  disabled={submitEvidenceMutation.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitEvidenceMutation.isPending ? "Mengunggah..." : "Kirim Bukti ke Auditor SPI"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeCameraModal}>
                  Batal
                </Button>
                <Button
                  onClick={captureAndWatermark}
                  disabled={!cameraStreaming}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  Jepret Foto & Tempel Watermark
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
