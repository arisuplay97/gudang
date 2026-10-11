import React from "react";
import { useLocation } from "wouter";
import {
  IconStokMaterial,
  IconTerimaBarang,
  IconLacakKiriman,
  IconCatatPasang,
  IconReturMaterial,
  IconScanBarcode,
} from "./dashboard-service-icons";

interface ServiceItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardServiceGrid() {
  const [, navigate] = useLocation();

  const services: ServiceItem[] = [
    {
      id: "stok",
      label: "Stok Material",
      href: "/cabang/stok-material",
      icon: <IconStokMaterial className="w-12 h-12" />,
    },
    {
      id: "terima",
      label: "Terima Barang",
      href: "/cabang/receive",
      icon: <IconTerimaBarang className="w-12 h-12" />,
    },
    {
      id: "tracking",
      label: "Lacak Kiriman",
      href: "/cabang/tracking",
      icon: <IconLacakKiriman className="w-12 h-12" />,
    },
    {
      id: "pasang",
      label: "Catat Pasang",
      href: "/cabang/pemasangan",
      icon: <IconCatatPasang className="w-12 h-12" />,
    },
    {
      id: "retur",
      label: "Retur Material",
      href: "/transaksi/retur",
      icon: <IconReturMaterial className="w-12 h-12" />,
    },
    {
      id: "scan",
      label: "Scan Barcode",
      href: "/scan/material",
      icon: <IconScanBarcode className="w-12 h-12" />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* ── Main Service Container Card ── */}
      <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3.5">
        {/* Card Header: Section title + hint */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            LAYANAN OPERASIONAL
          </p>
          <span className="text-xs text-muted-foreground/80 font-normal">
            Pintasan Cepat
          </span>
        </div>

        {/* 3x2 Grid of Icon Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {services.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.href)}
              className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-background/90 dark:bg-muted/30 border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-primary/40 hover:bg-accent/40 active:scale-95 transition-all duration-150 aspect-[0.95/1] text-center"
            >
              <div className="relative mb-2 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
                {item.icon}
              </div>
              <span className="text-[12px] font-semibold text-foreground leading-tight tracking-tight text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Subtext / Branding (Matches Reference Image) ── */}
      <div className="text-center pt-1 pb-2 space-y-1">
        <p className="text-[11px] text-muted-foreground font-medium">
          Aplikasi Monitoring Aksesoris · Perumdam Tirta Ardhia Rinjani
        </p>
        <p className="text-[12px] font-bold text-foreground">
          Inovasi Digital - Tim IT Sekretariat
        </p>
      </div>
    </div>
  );
}
