import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Layers,
  ScanBarcode,
  MapPin,
  Plus,
  Wrench,
  RotateCcw,
  QrCode,
  X,
  Package,
  PackageMinus,
  BarChart3,
  ScrollText,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface FloatingBottomDockProps {
  onOpenQrPrint?: () => void;
}

export function FloatingBottomDock({ onOpenQrPrint }: FloatingBottomDockProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);

  if (!user) return null;

  // Role-based dock items
  let navItems: { label: string; href: string; icon: React.ElementType }[] = [];

  if (user.role === "CABANG") {
    navItems = [
      { label: "Beranda", href: "/", icon: LayoutDashboard },
      { label: "Stok", href: "/cabang/stok-material", icon: Layers },
      { label: "Terima", href: "/cabang/receive", icon: ScanBarcode },
      { label: "Lacak", href: "/cabang/tracking", icon: MapPin },
    ];
  } else if (user.role === "SPI") {
    navItems = [
      { label: "Audit", href: "/spi/dashboard", icon: BarChart3 },
      { label: "Verifikasi", href: "/spi/verifikasi", icon: ScrollText },
      { label: "Peta GIS", href: "/spi/gis", icon: MapPin },
      { label: "Stok", href: "/cabang/stok-material", icon: Layers },
    ];
  } else {
    navItems = [
      { label: "Beranda", href: "/", icon: LayoutDashboard },
      { label: "Material", href: "/master/barang", icon: Package },
      { label: "Distribusi", href: "/transaksi/keluar", icon: PackageMinus },
      { label: "Stok Cabang", href: "/cabang/stok-material", icon: Layers },
    ];
  }

  return (
    <>
      {/* FAB Quick Action Backdrop & Sheet */}
      <AnimatePresence>
        {fabOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabOpen(false)}
              className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="sm:hidden fixed bottom-24 right-4 left-4 z-50 max-w-sm mx-auto bg-slate-900/95 dark:bg-slate-900/95 text-white border border-white/10 rounded-3xl p-4 shadow-2xl backdrop-blur-xl space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Aksi Cepat Lapangan
                </span>
                <button
                  onClick={() => setFabOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setFabOpen(false);
                    navigate("/cabang/pemasangan");
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">Catat Pasang</span>
                  <span className="text-[10px] text-slate-400">Bukti foto & teknisi</span>
                </button>

                <button
                  onClick={() => {
                    setFabOpen(false);
                    navigate("/cabang/receive");
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ScanBarcode className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">Scan Terima SJ</span>
                  <span className="text-[10px] text-slate-400">Barang dari pusat</span>
                </button>

                <button
                  onClick={() => {
                    setFabOpen(false);
                    if (onOpenQrPrint) onOpenQrPrint();
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">Label Rak (QR)</span>
                  <span className="text-[10px] text-slate-400">Cetak kartu fisik</span>
                </button>

                <button
                  onClick={() => {
                    setFabOpen(false);
                    navigate("/transaksi/retur");
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold">Retur Material</span>
                  <span className="text-[10px] text-slate-400">Kembalikan ke pusat</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Island Dock (Bottom of Screen) */}
      <div className="sm:hidden fixed bottom-4 inset-x-0 z-40 flex items-center justify-center gap-2.5 px-4 pointer-events-none">
        {/* Main Pill Dock */}
        <nav className="pointer-events-auto bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/15 text-white rounded-full p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center gap-1">
          {navItems.map((it) => {
            const isActive = it.href === "/" ? location === "/" : location.startsWith(it.href);
            const Icon = it.icon;

            return (
              <button
                key={it.href}
                onClick={() => navigate(it.href)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all select-none",
                  isActive
                    ? "bg-white/15 text-white shadow-inner font-semibold"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "stroke-[2.25] text-sky-400" : "stroke-[1.75]")} />
                {isActive && (
                  <span className="text-[11px] tracking-tight">{it.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Floating Quick Action Button (+) */}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          aria-label="Aksi Cepat"
          className={cn(
            "pointer-events-auto w-11 h-11 rounded-full bg-slate-950/95 dark:bg-slate-900/95 border border-white/20 text-white shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform active:scale-90",
            fabOpen ? "rotate-45 bg-rose-600 border-rose-500" : "hover:scale-105"
          )}
        >
          <Plus className="w-5 h-5 stroke-[2.25]" />
        </button>
      </div>
    </>
  );
}
