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
import { Card } from "@/components/ui/card";
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
  Clock,
  ShieldCheck,
  FolderOpen,
  CameraOff,
  FileSpreadsheet,
  Check,
  RotateCw,
  SwitchCamera,
  Grid,
  Users,
  Maximize2,
  Trash2,
  Pencil,
} from "lucide-react";

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

// ─── Local Storage Draft Persistence ───
const DRAFT_PREFIX = "sigaplek_evidence_draft_";

interface EvidenceDraft {
  allocationId: number;
  itemName: string;
  referenceNo: string;
  photoBeforeBase64?: string;
  photoAfterBase64?: string;
  photoStage: "BEFORE" | "AFTER" | "REVIEW";
  selectedTechIds?: number[];
  customTechNames?: string;
  savedAt: string;
}

const getEvidenceDraft = (allocId: number): EvidenceDraft | null => {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${allocId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveEvidenceDraft = (allocId: number, data: Partial<EvidenceDraft>) => {
  try {
    const existing = getEvidenceDraft(allocId) || {
      allocationId: allocId,
      itemName: "",
      referenceNo: "",
      photoStage: "BEFORE" as const,
      savedAt: new Date().toISOString(),
    };
    const updated: EvidenceDraft = {
      ...existing,
      ...data,
      allocationId: allocId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${allocId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn("Storage quota exceeded or error saving draft", err);
  }
};

const removeEvidenceDraft = (allocId: number) => {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${allocId}`);
  } catch {}
};

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

  // Camera Studio State (Clean Dual Photos with Auto-Save Persistence)
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null);
  const [photoStage, setPhotoStage] = useState<"BEFORE" | "AFTER" | "REVIEW">("BEFORE");
  const [capturedPhotoBefore, setCapturedPhotoBefore] = useState<string>("");
  const [capturedPhotoAfter, setCapturedPhotoAfter] = useState<string>("");
  const [cameraStreaming, setCameraStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [showGridLines, setShowGridLines] = useState<boolean>(false);
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; title: string } | null>(null);
  const [draftVersion, setDraftVersion] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Petugas yang mengerjakan
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [customTechNames, setCustomTechNames] = useState<string>("");

  const { data: techniciansData } = useQuery<{ id: number; fullName: string; username: string; role: string }[]>({
    queryKey: ["technicians-list"],
    queryFn: () => apiFetch<{ id: number; fullName: string; username: string; role: string }[]>("/api/users/technicians"),
  });
  const technicians = techniciansData || [];

  // 1. Fetch Active Trackings for Cabang
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

  // 2. Fetch Allocations
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
      if (selectedAllocation) {
        removeEvidenceDraft(selectedAllocation.allocationId);
        setDraftVersion((v) => v + 1);
      }
      toast({
        title: "Bukti Pemasangan Terkirim",
        description: data.locationMismatch
          ? "Terkirim. Terdeteksi deviasi lokasi pemasangan (mismatch)."
          : "Bukti sukses terkirim dan menunggu verifikasi auditor SPI.",
      });
      queryClient.invalidateQueries({ queryKey: ["cabang-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["cabang-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["branch-stocks"] });
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

  // ─── Camera Methods ───
  const startCamera = useCallback(async (facing: "environment" | "user" = cameraFacingMode) => {
    setCameraError(null);
    setCameraStreaming(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau browser ini tidak mendukung akses kamera langsung.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 360 },
            aspectRatio: { ideal: 1.7777777778 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
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

    // Live GPS
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
  }, [cameraFacingMode]);

  const toggleFacingMode = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStreaming(false);
  }, []);

  // Open modal with automatic draft restoration
  const openCameraModal = (alloc: AllocationItem) => {
    setSelectedAllocation(alloc);
    setRotationAngle(0);

    const draft = getEvidenceDraft(alloc.allocationId);
    if (draft && draft.photoBeforeBase64) {
      setCapturedPhotoBefore(draft.photoBeforeBase64);
      if (draft.photoAfterBase64) {
        setCapturedPhotoAfter(draft.photoAfterBase64);
        setPhotoStage("REVIEW");
      } else {
        setCapturedPhotoAfter("");
        setPhotoStage("AFTER");
      }
      if (draft.selectedTechIds) setSelectedTechIds(draft.selectedTechIds);
      if (draft.customTechNames) setCustomTechNames(draft.customTechNames);

      toast({
        title: "Draf Pekerjaan Dimuat",
        description: "Foto sebelum yang tersimpan otomatis berhasil dipulihkan.",
      });
    } else {
      setCapturedPhotoBefore("");
      setCapturedPhotoAfter("");
      setPhotoStage("BEFORE");
    }

    setCameraModalOpen(true);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCameraModalOpen(false);
    setSelectedAllocation(null);
  };

  const handleDiscardDraft = () => {
    if (!selectedAllocation) return;
    removeEvidenceDraft(selectedAllocation.allocationId);
    setDraftVersion((v) => v + 1);
    setCapturedPhotoBefore("");
    setCapturedPhotoAfter("");
    setPhotoStage("BEFORE");
    toast({
      title: "Draf Direset",
      description: "Data draf foto untuk titik ini telah dihapus.",
    });
    startCamera();
  };

  useEffect(() => {
    if (cameraModalOpen && photoStage !== "REVIEW") {
      const t = setTimeout(() => startCamera(), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [cameraModalOpen, photoStage, startCamera]);

  const getApproxKb = (b64: string) => {
    if (!b64) return "0 KB";
    const sizeInBytes = (b64.length * 3) / 4;
    return `${Math.round(sizeInBytes / 1024)} KB (.webp)`;
  };

  // ─── Professional Minimalist Watermark Generator (Live Camera Only) ───
  const generateWatermarkedImage = (
    video: HTMLVideoElement,
    stage: "BEFORE" | "AFTER"
  ): string => {
    const targetWidth = 1280;
    const targetHeight = 720;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const rawWidth = video.videoWidth || 1280;
    const rawHeight = video.videoHeight || 720;

    const isRotated90or270 = rotationAngle === 90 || rotationAngle === 270;

    if (isRotated90or270) {
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);
      ctx.drawImage(video, -targetHeight / 2, -targetWidth / 2, targetHeight, targetWidth);
      ctx.restore();
    } else {
      if (rawHeight > rawWidth) {
        const cropHeight = Math.round(rawWidth * (9 / 16));
        const cropY = Math.max(0, Math.round((rawHeight - cropHeight) / 2));
        if (rotationAngle === 180) {
          ctx.save();
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(video, 0, cropY, rawWidth, cropHeight, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, cropY, rawWidth, cropHeight, 0, 0, targetWidth, targetHeight);
        }
      } else {
        if (rotationAngle === 180) {
          ctx.save();
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(video, 0, 0, rawWidth, rawHeight, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, rawWidth, rawHeight, 0, 0, targetWidth, targetHeight);
        }
      }
    }

    // Watermark Info
    const isBefore = stage === "BEFORE";
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
    const branch = selectedAllocation?.branchName || "Cabang PDAM";
    const itemName = selectedAllocation?.itemName || "Material";
    const qty = selectedAllocation?.quantity || 1;
    const refNo = selectedAllocation?.referenceNo || "-";

    // Clean, modern frosted dark container (no cyber neon lines)
    const padX = 22;
    const padY = 22;
    const boxWidth = Math.min(targetWidth - padX * 2, 580);
    const boxHeight = 112;
    const boxX = padX;
    const boxY = targetHeight - boxHeight - padY;
    const radius = 10;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }

    // Clean pill badge for Stage
    const stageBadgeText = isBefore ? "SEBELUM PEMASANGAN" : "SESUDAH PEMASANGAN";
    const badgeColor = isBefore ? "#d97706" : "#059669";
    const badgeWidth = 146;
    const badgeHeight = 22;
    const badgeX = boxX + boxWidth - badgeWidth - 14;
    const badgeY = boxY + 14;

    ctx.fillStyle = badgeColor;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
    }

    ctx.font = "bold 9.5px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(stageBadgeText, badgeX + badgeWidth / 2, badgeY + 15);

    // Text Lines
    const textX = boxX + 16;
    ctx.textAlign = "left";

    // Line 1: Header Instansi
    ctx.font = "bold 12.5px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("PERUMDAM TIRTA ARDHIA RINJANI", textX, boxY + 28);

    // Line 2: Material & Ref
    ctx.font = "normal 10.5px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`Material: ${itemName} (${qty} unit) • Ref: ${refNo}`, textX, boxY + 52);

    // Line 3: Petugas & Waktu
    ctx.font = "normal 10px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`Petugas: ${officer} • Cabang: ${branch} • ${dateStr}`, textX, boxY + 74);

    // Line 4: Koordinat GPS
    ctx.font = "normal 10px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`GPS: Lat ${lat}, Lon ${lon} (Akurasi: ${acc})`, textX, boxY + 95);

    ctx.restore();

    return canvas.toDataURL("image/webp", 0.78);
  };

  // Capture from live camera
  const handleCapture = (stage: "BEFORE" | "AFTER") => {
    if (!videoRef.current || !selectedAllocation) return;
    const dataUrl = generateWatermarkedImage(videoRef.current, stage);
    if (!dataUrl) return;

    if (stage === "BEFORE") {
      setCapturedPhotoBefore(dataUrl);
      setPhotoStage("AFTER");
      // AUTO SAVE DRAFT TO LOCALSTORAGE
      saveEvidenceDraft(selectedAllocation.allocationId, {
        itemName: selectedAllocation.itemName,
        referenceNo: selectedAllocation.referenceNo,
        photoBeforeBase64: dataUrl,
        photoStage: "AFTER",
        selectedTechIds,
        customTechNames,
      });
      setDraftVersion((v) => v + 1);
      toast({
        title: "Foto 1 (Sebelum) Berhasil",
        description: "Draf tersimpan otomatis. Lanjutkan ke Foto 2 (Sesudah).",
      });
    } else {
      setCapturedPhotoAfter(dataUrl);
      setPhotoStage("REVIEW");
      stopCamera();
      // AUTO SAVE DRAFT TO LOCALSTORAGE
      saveEvidenceDraft(selectedAllocation.allocationId, {
        photoAfterBase64: dataUrl,
        photoStage: "REVIEW",
        selectedTechIds,
        customTechNames,
      });
      setDraftVersion((v) => v + 1);
      toast({
        title: "Foto 2 (Sesudah) Berhasil",
        description: "Kedua foto tersimpan. Silakan periksa sebelum mengirim.",
      });
    }
  };

  // Submit Evidence Photos
  const handleSubmitEvidence = () => {
    if (!selectedAllocation || !capturedPhotoBefore || !capturedPhotoAfter) {
      toast({
        variant: "destructive",
        title: "Foto Belum Lengkap",
        description: "Wajib mengambil kedua foto (Sebelum & Sesudah pemasangan).",
      });
      return;
    }

    const lat = currentGps?.lat ?? (selectedAllocation.plannedLatitude ? parseFloat(selectedAllocation.plannedLatitude) : -8.584);
    const lon = currentGps?.lon ?? (selectedAllocation.plannedLongitude ? parseFloat(selectedAllocation.plannedLongitude) : 116.109);

    const selectedTechObjects = (techniciansData || []).filter((t) => selectedTechIds.includes(t.id));
    const selectedNames = selectedTechObjects.map((t) => t.fullName);
    const customNames = customTechNames.split(",").map((n) => n.trim()).filter(Boolean);
    const allNames = Array.from(new Set([...selectedNames, ...customNames]));

    if (allNames.length === 0) {
      toast({
        variant: "destructive",
        title: "Petugas Belum Diisi",
        description: "Pilih atau ketik minimal 1 nama petugas yang mengerjakan pemasangan ini.",
      });
      return;
    }

    submitEvidenceMutation.mutate({
      allocationId: selectedAllocation.allocationId,
      photoBeforeBase64: capturedPhotoBefore,
      photoBase64: capturedPhotoAfter,
      latitude: lat,
      longitude: lon,
      gpsAccuracy: currentGps?.accuracy ?? 5.0,
      clientCaptureTime: new Date().toISOString(),
      idempotencyKey: crypto.randomUUID(),
      technicianNames: allNames.join(", "),
      technicianIds: selectedTechIds.join(","),
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
                <Card key={track.id} className="p-4 shadow-sm border-0 bg-card hover:bg-muted/30 transition-colors">
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
              Pilih titik alokasi di bawah untuk mengambil atau melanjutkan foto dokumentasi fisik.
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
            <div className="grid sm:grid-cols-2 gap-3" key={`draft-grid-${draftVersion}`}>
              {pendingEvidenceAllocations.map((alloc) => {
                const draft = getEvidenceDraft(alloc.allocationId);
                const hasDraftBefore = !!draft?.photoBeforeBase64;
                const hasDraftAfter = !!draft?.photoAfterBase64;

                return (
                  <Card
                    key={alloc.allocationId}
                    className="p-4 shadow-sm border-0 bg-card hover:bg-muted/30 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{alloc.itemName}</h3>
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          Qty: {alloc.quantity}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground font-mono">Ref: {alloc.referenceNo}</p>

                      {alloc.plannedLatitude && alloc.plannedLongitude && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          Target: {alloc.plannedLatitude}, {alloc.plannedLongitude}
                        </div>
                      )}

                      {/* Status Draf Tersimpan Otomatis */}
                      {hasDraftBefore && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>Draf: Foto Sebelum Tersimpan {hasDraftAfter ? "& Sesudah Siap" : ""}</span>
                        </div>
                      )}

                      {alloc.status === "REJECTED" && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-[11px] text-rose-700 dark:text-rose-300">
                          Bukti sebelumnya ditolak SPI. Harap foto ulang dengan sudut & GPS yang jelas.
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => openCameraModal(alloc)}
                      className="mt-4 w-full gap-2 bg-primary hover:bg-primary/90 shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      {hasDraftBefore ? "Lanjutkan Dokumentasi (Draf)" : "Buka Kamera Dokumentasi"}
                    </Button>
                  </Card>
                );
              })}
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
                  <Card key={alloc.allocationId} className="p-4 shadow-sm border-0 bg-card">
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
        <DialogContent className="max-w-md border-0 shadow-xl bg-card rounded-2xl">
          <DialogHeader>
            <DialogTitle>Buat Alokasi Titik Pemasangan</DialogTitle>
          </DialogHeader>

          {selectedTrackingForAlloc && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
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

      {/* ─── LIVE CAMERA STUDIO & DRAFT PERSISTENCE MODAL (CLEAN & MINIMALIST) ─── */}
      <Dialog open={cameraModalOpen} onOpenChange={(o) => !o && closeCameraModal()}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl bg-neutral-950 text-neutral-100 rounded-2xl md:rounded-3xl max-h-[94vh] flex flex-col w-[96vw]">
          {/* Header Bar */}
          <div className="p-4 pb-2 bg-neutral-900/60 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Dokumentasi Pemasangan</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs sm:max-w-md">
                  {selectedAllocation?.itemName} (Qty: {selectedAllocation?.quantity})
                </p>
              </div>

              {/* GPS Telemetry Pill */}
              <div className="flex items-center gap-2">
                {currentGps ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 text-[11px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>GPS ±{currentGps.accuracy.toFixed(0)}m</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-400 text-[11px] font-mono">
                    <Compass className="w-3 h-3 animate-spin shrink-0" />
                    <span>Mencari GPS...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Segmented Step Indicator */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-900 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPhotoStage("BEFORE");
                  startCamera();
                }}
                className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1.5 ${
                  photoStage === "BEFORE"
                    ? "bg-white text-neutral-950 shadow-sm"
                    : capturedPhotoBefore
                    ? "text-emerald-400 hover:bg-neutral-800"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                {capturedPhotoBefore && <Check className="w-3.5 h-3.5" />}
                <span className="truncate">1. Sebelum</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (capturedPhotoBefore) {
                    setPhotoStage("AFTER");
                    startCamera();
                  }
                }}
                disabled={!capturedPhotoBefore}
                className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1.5 ${
                  photoStage === "AFTER"
                    ? "bg-white text-neutral-950 shadow-sm"
                    : capturedPhotoAfter
                    ? "text-emerald-400 hover:bg-neutral-800"
                    : capturedPhotoBefore
                    ? "text-neutral-300 hover:bg-neutral-800"
                    : "text-neutral-600 cursor-not-allowed"
                }`}
              >
                {capturedPhotoAfter && <Check className="w-3.5 h-3.5" />}
                <span className="truncate">2. Sesudah</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (capturedPhotoBefore && capturedPhotoAfter) {
                    setPhotoStage("REVIEW");
                    stopCamera();
                  }
                }}
                disabled={!capturedPhotoBefore || !capturedPhotoAfter}
                className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1.5 ${
                  photoStage === "REVIEW"
                    ? "bg-white text-neutral-950 shadow-sm"
                    : capturedPhotoBefore && capturedPhotoAfter
                    ? "text-neutral-300 hover:bg-neutral-800"
                    : "text-neutral-600 cursor-not-allowed"
                }`}
              >
                <span className="truncate">3. Konfirmasi</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {photoStage !== "REVIEW" ? (
              <>
                {/* Viewfinder Studio (Clean 16:9 Viewport) */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-lg">
                  {cameraError ? (
                    <div className="p-6 text-center text-white space-y-3">
                      <CameraOff className="w-10 h-10 mx-auto text-neutral-500" />
                      <p className="text-xs text-neutral-400">{cameraError}</p>
                      <div className="flex items-center justify-center">
                        <Button variant="secondary" size="sm" onClick={() => startCamera()} className="text-xs">
                          Coba Lagi
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={
                          rotationAngle !== 0
                            ? {
                                transform: `rotate(${rotationAngle}deg)`,
                                transformOrigin: "center center",
                                width: rotationAngle === 90 || rotationAngle === 270 ? "56.25%" : "100%",
                                height: rotationAngle === 90 || rotationAngle === 270 ? "177.78%" : "100%",
                                objectFit: "cover",
                              }
                            : { width: "100%", height: "100%", objectFit: "cover" }
                        }
                        className="transition-transform duration-200"
                      />

                      {/* Subtle Grid Lines (Optional) */}
                      {showGridLines && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
                          <div className="absolute inset-y-0 right-1/3 w-px bg-white/15" />
                          <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
                          <div className="absolute inset-x-0 bottom-1/3 h-px bg-white/15" />
                        </div>
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              photoStage === "BEFORE" ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                          />
                          <span>
                            {photoStage === "BEFORE" ? "Foto 1: Kondisi Sebelum Pasang" : "Foto 2: Hasil Sesudah Pasang"}
                          </span>
                        </div>

                        {rotationAngle !== 0 && (
                          <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-neutral-300 font-mono">
                            {rotationAngle}°
                          </div>
                        )}
                      </div>

                      {/* Floating Thumbnail: Foto Sebelum (jika sedang di tahap AFTER) */}
                      {photoStage === "AFTER" && capturedPhotoBefore && (
                        <div className="absolute bottom-3 left-3 pointer-events-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoStage("BEFORE");
                              startCamera();
                            }}
                            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-black/75 backdrop-blur-md text-white hover:bg-black/90 transition-all text-left shadow-lg group"
                            title="Klik untuk melihat atau mengubah foto sebelum"
                          >
                            <img
                              src={capturedPhotoBefore}
                              alt="Foto Sebelum"
                              className="w-12 h-8 rounded-lg object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <Check className="w-3 h-3" />
                                <span>Sebelum Tersimpan</span>
                              </div>
                              <span className="text-[10px] text-neutral-400 group-hover:text-white transition-colors flex items-center gap-0.5">
                                <Pencil className="w-2.5 h-2.5" /> Ganti / Foto Ulang
                              </span>
                            </div>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Shutter & Studio Camera Controls */}
                <div className="flex items-center justify-between px-2 pt-1">
                  {/* Left: Flip camera */}
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={toggleFacingMode}
                      className="w-10 h-10 rounded-full bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                      title="Ganti Kamera Belakang / Depan"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Center: Tactile Shutter Button */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCapture(photoStage)}
                      disabled={!cameraStreaming}
                      className={`w-16 h-16 rounded-full border-2 border-white/80 p-1 flex items-center justify-center transition-all ${
                        cameraStreaming
                          ? "opacity-100 hover:scale-105 active:scale-90"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-full h-full rounded-full transition-colors ${
                          photoStage === "BEFORE" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </button>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {photoStage === "BEFORE" ? "Jepret Foto 1" : "Jepret Foto 2"}
                    </span>
                  </div>

                  {/* Right: Rotate & Grid options */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
                      className="w-10 h-10 rounded-full bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                      title="Putar Orientasi 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGridLines(!showGridLines)}
                      className={`w-10 h-10 rounded-full transition-colors ${
                        showGridLines
                          ? "bg-white text-neutral-950"
                          : "bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800"
                      }`}
                      title="Bantuan Garis Grid"
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Subtext info */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-2 pt-1">
                  <span>Draf tersimpan otomatis saat foto diambil</span>
                  {capturedPhotoBefore && (
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="text-neutral-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus Draf
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* ─── REVIEW & CONFIRMATION SCREEN ─── */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-neutral-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Kedua foto bukti fisik telah siap dan tersimpan di draf.</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-0 bg-emerald-950/40">
                    Siap Kirim
                  </Badge>
                </div>

                {/* Side-by-Side Dual Photos */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Foto 1: Sebelum */}
                  <div className="p-3 rounded-2xl bg-neutral-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        1. Sebelum Pemasangan
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {getApproxKb(capturedPhotoBefore)}
                      </span>
                    </div>

                    <div
                      className="relative aspect-video rounded-xl overflow-hidden bg-black cursor-pointer group"
                      onClick={() =>
                        setZoomPhoto({
                          url: capturedPhotoBefore,
                          title: "Foto 1: Sebelum Pemasangan (Kondisi Awal)",
                        })
                      }
                    >
                      <img
                        src={capturedPhotoBefore}
                        alt="Foto Sebelum Pemasangan"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 h-8 gap-1.5"
                      onClick={() => {
                        setPhotoStage("BEFORE");
                        startCamera();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Ganti / Foto Ulang Sebelum
                    </Button>
                  </div>

                  {/* Foto 2: Sesudah */}
                  <div className="p-3 rounded-2xl bg-neutral-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        2. Sesudah Pemasangan
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {getApproxKb(capturedPhotoAfter)}
                      </span>
                    </div>

                    <div
                      className="relative aspect-video rounded-xl overflow-hidden bg-black cursor-pointer group"
                      onClick={() =>
                        setZoomPhoto({
                          url: capturedPhotoAfter,
                          title: "Foto 2: Sesudah Pemasangan (Hasil Akhir)",
                        })
                      }
                    >
                      <img
                        src={capturedPhotoAfter}
                        alt="Foto Sesudah Pemasangan"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 h-8 gap-1.5"
                      onClick={() => {
                        setPhotoStage("AFTER");
                        startCamera();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Ganti / Foto Ulang Sesudah
                    </Button>
                  </div>
                </div>

                {/* Petugas / Teknisi yang Mengerjakan */}
                <div className="p-3.5 rounded-2xl bg-neutral-900 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      Petugas / Teknisi Lapangan
                    </Label>
                    <span className="text-[10px] text-neutral-400">Wajib Diisi</span>
                  </div>

                  {technicians.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-28 overflow-y-auto p-1 rounded-xl bg-neutral-950">
                      {technicians.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer hover:bg-neutral-800 text-neutral-300 transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
                            checked={selectedTechIds.includes(t.id)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...selectedTechIds, t.id]
                                : selectedTechIds.filter((id) => id !== t.id);
                              setSelectedTechIds(updated);
                              if (selectedAllocation) {
                                saveEvidenceDraft(selectedAllocation.allocationId, {
                                  selectedTechIds: updated,
                                  customTechNames,
                                });
                              }
                            }}
                          />
                          <span className="truncate">{t.fullName}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <Input
                    placeholder="Nama teknisi / tim lapangan tambahan (pisahkan koma)..."
                    value={customTechNames}
                    onChange={(e) => {
                      setCustomTechNames(e.target.value);
                      if (selectedAllocation) {
                        saveEvidenceDraft(selectedAllocation.allocationId, {
                          selectedTechIds,
                          customTechNames: e.target.value,
                        });
                      }
                    }}
                    className="text-xs h-9 bg-neutral-950 border-0 text-white placeholder:text-neutral-500 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-neutral-900/60 shrink-0 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCameraModal}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Tutup
            </Button>

            {photoStage === "REVIEW" && (
              <Button
                onClick={handleSubmitEvidence}
                disabled={submitEvidenceMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md text-xs h-9 px-4 rounded-xl"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitEvidenceMutation.isPending ? "Mengunggah..." : "Kirim Bukti ke Auditor SPI"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── IMAGE ZOOM PREVIEW LIGHTBOX ─── */}
      <Dialog open={!!zoomPhoto} onOpenChange={(o) => !o && setZoomPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-0 rounded-2xl">
          <div className="p-3 bg-neutral-900 flex items-center justify-between text-white text-xs">
            <span>{zoomPhoto?.title}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomPhoto(null)}
              className="h-7 px-2 text-neutral-400 hover:text-white"
            >
              Tutup
            </Button>
          </div>
          {zoomPhoto && (
            <div className="p-2 flex items-center justify-center bg-black">
              <img
                src={zoomPhoto.url}
                alt={zoomPhoto.title}
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
