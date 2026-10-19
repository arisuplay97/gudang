import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Truck,
  Settings,
  ChevronLeft,
  Camera,
} from "lucide-react";
import NotificationCenter from "@/components/notification-center";
import { MobileCameraModal } from "./mobile-camera-modal";

/* ── Page Titles ── */
const PAGE_TITLES: Record<string, string> = {
  "/": "",
  "/cabang/stok-material": "Stok Material Cabang",
  "/cabang/receive": "Penerimaan Material",
  "/cabang/tracking": "Lacak Distribusi",
  "/cabang/pemasangan": "Catat Pemasangan",
  "/transaksi/retur": "Retur Material",
  "/scan/material": "Pindai Barcode Material",
  "/pengaturan": "Pengaturan Akun",
  "/profil": "Profil Pengguna",
};

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const isHome = location === "/";
  const isSubPage =
    location === "/cabang/pemasangan" ||
    location === "/transaksi/retur" ||
    location === "/scan/material" ||
    location.startsWith("/pengaturan");
  const pageTitle = PAGE_TITLES[location] || "Aplikasi Aksesoris";

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden select-none">
      {/* ── Sub-Page Header (Only when NOT on Home) ── */}
      {!isHome && (
        <header className="shrink-0 h-13 px-4 flex items-center gap-3 bg-background/90 backdrop-blur-2xl border-b border-border/60 sticky top-0 z-30">
          <button
            onClick={() => {
              if (isSubPage) {
                window.history.back();
              } else {
                navigate("/");
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-bold text-foreground truncate flex-1">
            {pageTitle}
          </h1>
          <NotificationCenter />
        </header>
      )}

      {/* ── MAIN CONTENT (Padding bottom for floating dock) ── */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      {/* ── CLEAN SOLID FLOATING BOTTOM DOCK ── */}
      <div className="fixed bottom-3 inset-x-0 z-40 pointer-events-none px-4">
        <nav className="pointer-events-auto max-w-[360px] mx-auto h-[62px] rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_28px_rgba(15,23,42,0.08)] px-2.5 flex items-center justify-between">
          {/* Beranda */}
          <button
            onClick={() => navigate("/")}
            title="Beranda"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all",
              location === "/"
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <LayoutDashboard className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] leading-none">Beranda</span>
          </button>

          {/* Stok */}
          <button
            onClick={() => navigate("/cabang/stok-material")}
            title="Stok Material"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all",
              location.startsWith("/cabang/stok-material")
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Layers className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] leading-none">Stok</span>
          </button>

          {/* Center Clean Solid Camera / Scan Button (Zero Gradient AI Slop) */}
          <button
            onClick={() => setCameraModalOpen(true)}
            className="w-12 h-12 -my-2.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-md shadow-slate-900/20 flex items-center justify-center active:scale-95 transition-all shrink-0"
            aria-label="Pindai Barcode / QR Kamera"
            title="Pindai Barcode / QR"
          >
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Lacak */}
          <button
            onClick={() => navigate("/cabang/tracking")}
            title="Lacak Distribusi"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all",
              location.startsWith("/cabang/tracking")
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Truck className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] leading-none">Lacak</span>
          </button>

          {/* Pengaturan / Profil */}
          <button
            onClick={() => navigate("/pengaturan?tab=profil")}
            title="Pengaturan"
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all",
              location.startsWith("/pengaturan") || location.startsWith("/profil")
                ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Settings className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] leading-none">Profil</span>
          </button>
        </nav>
      </div>

      {/* ── Universal Camera Scanner Modal ── */}
      <MobileCameraModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
      />
    </div>
  );
}
