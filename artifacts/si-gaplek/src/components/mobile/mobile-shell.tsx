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
  const pageTitle = PAGE_TITLES[location] || "SIMONA Mobile";

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

      {/* ── FLOATING BOTTOM DOCK (ala Image 2) ── */}
      <div className="fixed bottom-4 inset-x-0 z-40 pointer-events-none px-4">
        <nav className="pointer-events-auto max-w-sm mx-auto h-16 rounded-full bg-background/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-border/80 shadow-[0_12px_36px_rgba(0,0,0,0.14)] p-1.5 flex items-center justify-between">
          {/* Beranda */}
          <button
            onClick={() => navigate("/")}
            title="Beranda"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all",
              location === "/"
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>

          {/* Stok */}
          <button
            onClick={() => navigate("/cabang/stok-material")}
            title="Stok Material"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all",
              location.startsWith("/cabang/stok-material")
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Center Elevated Camera / Scan Button */}
          <button
            onClick={() => setCameraModalOpen(true)}
            className="w-13 h-13 -my-2 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            aria-label="Scan Barcode / QR Kamera"
            title="Pindai Barcode / QR"
          >
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Lacak */}
          <button
            onClick={() => navigate("/cabang/tracking")}
            title="Lacak Distribusi"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all",
              location.startsWith("/cabang/tracking")
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <Truck className="w-5 h-5" />
          </button>

          {/* Pengaturan / Profil */}
          <button
            onClick={() => navigate("/pengaturan?tab=profil")}
            title="Pengaturan"
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all",
              location.startsWith("/pengaturan") || location.startsWith("/profil")
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <Settings className="w-5 h-5" />
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
