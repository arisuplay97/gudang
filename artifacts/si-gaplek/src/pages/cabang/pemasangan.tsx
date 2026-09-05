import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  FileSpreadsheet,
  Check,
  ArrowRight,
  Image as ImageIcon,
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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("allocations");
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [selectedTrackingForAlloc, setSelectedTrackingForAlloc] = useState<TrackingItem | null>(null);

  // Form allocation
  const [allocQuantity, setAllocQuantity] = useState<string>("1");
  const [plannedLat, setPlannedLat] = useState<string>("");
  const [plannedLon, setPlannedLon] = useState<string>("");
  const [isGettingGpsForAlloc, setIsGettingGpsForAlloc] = useState(false);

  // Camera Studio State (Dual Photos: Before & After with WebP Compression)
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null);
  const [photoStage, setPhotoStage] = useState<"BEFORE" | "AFTER" | "REVIEW">("BEFORE");
  const [capturedPhotoBefore, setCapturedPhotoBefore] = useState<string>("");
  const [capturedPhotoAfter, setCapturedPhotoAfter] = useState<string>("");
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
    setPhotoStage("BEFORE");
    setCapturedPhotoBefore("");
    setCapturedPhotoAfter("");
    setCameraModalOpen(true);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCameraModalOpen(false);
    setSelectedAllocation(null);
    setCapturedPhotoBefore("");
    setCapturedPhotoAfter("");
    setPhotoStage("BEFORE");
  };

  useEffect(() => {
    if (cameraModalOpen && photoStage !== "REVIEW") {
      const t = setTimeout(() => startCamera(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cameraModalOpen, photoStage, startCamera]);

  // Helper: Get human-readable KB size of Base64 WebP
  const getApproxKb = (b64: string) => {
    if (!b64) return "0 KB";
    const sizeInBytes = (b64.length * 3) / 4;
    return `${Math.round(sizeInBytes / 1024)} KB (.webp)`;
  };

  // Capture & Draw Official Watermark on Canvas with WebP Compression (0.78 quality, max 1280px)
  const captureAndWatermark = (stage: "BEFORE" | "AFTER") => {
    if (!videoRef.current || !selectedAllocation) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    // Scale down dimensions if greater than 1280px to optimize storage (70GB HDD server safety)
    const MAX_WIDTH = 1280;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
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
    const bannerHeight = Math.max(130, height * 0.22);
    const bannerY = height - bannerHeight;

    // Gradient background
    const grad = ctx.createLinearGradient(0, bannerY, 0, height);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.82)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.97)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, width, bannerHeight);

    // Stage-specific accent bar
    const isBefore = stage === "BEFORE";
    const accentColor = isBefore ? "#f59e0b" : "#10b981"; // Amber for Before, Emerald for After
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, bannerY, width, 4);

    // Text configuration
    ctx.fillStyle = "#ffffff";
    const fontSizeTitle = Math.max(15, Math.round(width * 0.021));
    const fontSizeBody = Math.max(12, Math.round(width * 0.015));

    let yOffset = bannerY + fontSizeTitle + 14;

    // Header line
    ctx.font = `bold ${fontSizeTitle}px sans-serif`;
    ctx.fillText("PERUMDAM TIRTA ARDHIA RINJANI — SI GAPLEK", 24, yOffset);

    // Stage Badge right aligned
    ctx.textAlign = "right";
    ctx.fillStyle = accentColor;
    ctx.font = `bold ${fontSizeBody + 2}px sans-serif`;
    const stageBadge = isBefore
      ? "[ 1. SEBELUM PEMASANGAN / KONDISI AWAL ]"
      : "[ 2. SESUDAH PEMASANGAN / HASIL AKHIR ]";
    ctx.fillText(stageBadge, width - 24, yOffset);
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

    // 4. Export as WebP format with quality 0.78 (target size ~80-140 KB)
    const dataUrl = canvas.toDataURL("image/webp", 0.78);

    if (isBefore) {
      setCapturedPhotoBefore(dataUrl);
      setPhotoStage("AFTER");
      toast({
        title: "Foto 1 (Sebelum) Berhasil",
        description: "Lanjutkan jepret Foto 2 (Sesudah Pemasangan).",
      });
    } else {
      setCapturedPhotoAfter(dataUrl);
      setPhotoStage("REVIEW");
      stopCamera();
      toast({
        title: "Foto 2 (Sesudah) Berhasil",
        description: "Kedua foto telah siap. Silakan periksa kembali sebelum kirim verifikasi.",
      });
    }
  };

  // Submit Dual Evidence Photos (Before & After WebP)
  const handleSubmitEvidence = () => {
    if (!selectedAllocation || !capturedPhotoBefore || !capturedPhotoAfter) {
      toast({
        variant: "destructive",
        title: "Foto Belum Lengkap",
        description: "Wajib mengambil kedua foto (Sebelum & Sesudah pemasangan).",
      });
      return;
    }

    // Fallback GPS if not available
    const lat = currentGps?.lat ?? (selectedAllocation.plannedLatitude ? parseFloat(selectedAllocation.plannedLatitude) : -8.584);
    const lon = currentGps?.lon ?? (selectedAllocation.plannedLongitude ? parseFloat(selectedAllocation.plannedLongitude) : 116.109);

    submitEvidenceMutation.mutate({
      allocationId: selectedAllocation.allocationId,
      photoBeforeBase64: capturedPhotoBefore,
      photoBase64: capturedPhotoAfter,
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
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto text-xs"
          onClick={() => setLocation("/laporan/pemasangan-aksesoris")}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          Format Laporan Pemasangan (Excel)
        </Button>
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

      {/* ─── LIVE CAMERA & DUAL PHOTO STUDIO MODAL ─── */}
      <Dialog open={cameraModalOpen} onOpenChange={(o) => !o && closeCameraModal()}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card max-h-[92vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-base flex items-center gap-2 text-foreground">
                  <Camera className="w-4 h-4 text-primary" />
                  Kamera Dokumentasi Fisik (Wajib 2x Foto)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target: <strong className="text-foreground">{selectedAllocation?.itemName}</strong> (Qty: {selectedAllocation?.quantity} unit)
                </p>
              </div>
              {currentGps ? (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 text-emerald-600 border-emerald-300">
                  <Compass className="w-3 h-3" />
                  GPS ±{currentGps.accuracy.toFixed(0)}m
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-mono gap-1 text-amber-600 border-amber-300">
                  <Compass className="w-3 h-3 animate-spin" />
                  Mencari GPS...
                </Badge>
              )}
            </div>

            {/* Stepper Wizard */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <div
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  photoStage === "BEFORE"
                    ? "bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400"
                    : capturedPhotoBefore
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  capturedPhotoBefore ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {capturedPhotoBefore ? <Check className="w-3 h-3" /> : "1"}
                </span>
                <span className="truncate">Foto Sebelum</span>
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  photoStage === "AFTER"
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                    : capturedPhotoAfter
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  capturedPhotoAfter ? "bg-emerald-600 text-white" : "bg-muted-foreground/30 text-foreground"
                }`}>
                  {capturedPhotoAfter ? <Check className="w-3 h-3" /> : "2"}
                </span>
                <span className="truncate">Foto Sesudah</span>
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-colors ${
                  photoStage === "REVIEW"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  photoStage === "REVIEW" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30 text-foreground"
                }`}>
                  3
                </span>
                <span className="truncate">Review & Kirim</span>
              </div>
            </div>
          </DialogHeader>

          {/* Dialog Scrollable Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {photoStage !== "REVIEW" ? (
              <>
                {/* Stage Banner */}
                {photoStage === "BEFORE" ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <div>
                        <strong>Tahap 1: Foto Sebelum Pemasangan (Kondisi Awal)</strong>
                        <p className="text-[11px] opacity-90">Arahkan kamera ke titik/pipa sebelum meteran & aksesoris dipasang.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-[10px]">
                      WebP ~100KB
                    </Badge>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div>
                        <strong>Tahap 2: Foto Sesudah Pemasangan (Hasil Akhir)</strong>
                        <p className="text-[11px] opacity-90">Arahkan ke meteran yang sudah terpasang rapi. Pastikan nomor seri & angka register terbaca tajam.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300 text-[10px]">
                      WebP ~100KB
                    </Badge>
                  </div>
                )}

                {/* Viewfinder Camera */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
                  {cameraError ? (
                    <div className="p-6 text-center text-white space-y-3">
                      <CameraOff className="w-12 h-12 mx-auto text-rose-400" />
                      <p className="text-sm font-medium text-rose-200">{cameraError}</p>
                      <Button variant="secondary" size="sm" onClick={startCamera}>
                        Coba Lagi
                      </Button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Viewfinder Frame Guides */}
                      <div className="absolute inset-5 border border-white/30 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <span className="w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                          <span className="w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                        </div>
                        <div className="text-center text-[10px] text-white/80 font-mono tracking-wider uppercase drop-shadow bg-black/40 py-0.5 px-2 rounded self-center">
                          PERUMDAM TIRTA ARDHIA RINJANI — {photoStage === "BEFORE" ? "SEBELUM PASANG" : "SESUDAH PASANG"}
                        </div>
                        <div className="flex justify-between">
                          <span className="w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                          <span className="w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* GPS Status Pill */}
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
                    <span>Mengunci koordinat GPS perangkat untuk watermark...</span>
                  </div>
                )}
              </>
            ) : (
              /* ─── REVIEW SCREEN: DUAL PHOTOS & CUSTOMER FORM ─── */
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kedua foto berhasil dikompresi ke <strong>.webp</strong> dan siap dikirim ke SPI.</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-400 text-emerald-700 dark:text-emerald-300 text-[10px]">
                    Siap Dikirim
                  </Badge>
                </div>

                {/* Side-by-Side Dual Photo Comparison */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Photo Before Card */}
                  <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        1. Sebelum Pemasangan
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {getApproxKb(capturedPhotoBefore)}
                      </Badge>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                      <img
                        src={capturedPhotoBefore}
                        alt="Foto Sebelum Pemasangan"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5 h-8"
                      onClick={() => {
                        setPhotoStage("BEFORE");
                        startCamera();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Foto Ulang Sebelum
                    </Button>
                  </div>

                  {/* Photo After Card */}
                  <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        2. Sesudah Pemasangan
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                        {getApproxKb(capturedPhotoAfter)}
                      </Badge>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-black flex items-center justify-center">
                      <img
                        src={capturedPhotoAfter}
                        alt="Foto Sesudah Pemasangan"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5 h-8"
                      onClick={() => {
                        setPhotoStage("AFTER");
                        startCamera();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Foto Ulang Sesudah
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <DialogFooter className="p-4 border-t bg-muted/20 gap-2 sm:gap-0 shrink-0">
            {photoStage === "BEFORE" && (
              <>
                <Button variant="outline" size="sm" onClick={closeCameraModal}>
                  Batal
                </Button>
                <Button
                  onClick={() => captureAndWatermark("BEFORE")}
                  disabled={!cameraStreaming}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Jepret Foto 1 (Sebelum Pasang)
                </Button>
              </>
            )}

            {photoStage === "AFTER" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPhotoStage("BEFORE");
                  }}
                  className="gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Ulangi Foto Sebelum
                </Button>
                <Button
                  onClick={() => captureAndWatermark("AFTER")}
                  disabled={!cameraStreaming}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Jepret Foto 2 (Sesudah Pasang)
                </Button>
              </>
            )}

            {photoStage === "REVIEW" && (
              <>
                <Button variant="outline" size="sm" onClick={closeCameraModal}>
                  Batal
                </Button>
                <Button
                  onClick={handleSubmitEvidence}
                  disabled={submitEvidenceMutation.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitEvidenceMutation.isPending ? "Mengunggah WebP..." : "Kirim 2 Bukti Foto ke Auditor SPI"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
