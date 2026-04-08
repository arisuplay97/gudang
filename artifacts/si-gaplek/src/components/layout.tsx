import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Warehouse,
  Tags,
  Building2,
  Ruler,
  Truck,
  MapPin,
  ScanBarcode,
  FileSpreadsheet,
  ScrollText,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth-context";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  roles: Role[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "gudang", "keuangan", "pimpinan"],
  },
  {
    label: "Master Data",
    icon: Settings,
    roles: ["admin", "gudang"],
    children: [
      { label: "Barang", href: "/master/barang", icon: Package, roles: ["admin", "gudang"] },
      { label: "Kategori", href: "/master/kategori", icon: Tags, roles: ["admin", "gudang"] },
      { label: "Satuan", href: "/master/satuan", icon: Ruler, roles: ["admin", "gudang"] },
      { label: "Supplier", href: "/master/supplier", icon: Truck, roles: ["admin", "gudang"] },
      { label: "Gudang", href: "/master/gudang", icon: Warehouse, roles: ["admin"] },
      { label: "Lokasi", href: "/master/lokasi", icon: MapPin, roles: ["admin"] },
      { label: "Departemen", href: "/master/departemen", icon: Building2, roles: ["admin"] },
    ],
  },
  {
    label: "Transaksi",
    icon: ArrowLeftRight,
    roles: ["admin", "gudang"],
    children: [
      { label: "Barang Masuk", href: "/transaksi/masuk", icon: PackagePlus, roles: ["admin", "gudang"] },
      { label: "Barang Keluar", href: "/transaksi/keluar", icon: PackageMinus, roles: ["admin", "gudang"] },
      { label: "Mutasi Barang", href: "/transaksi/mutasi", icon: ArrowLeftRight, roles: ["admin", "gudang"] },
      { label: "Penyesuaian Stok", href: "/transaksi/penyesuaian", icon: ClipboardList, roles: ["admin", "gudang"] },
      { label: "Stock Opname", href: "/transaksi/opname", icon: ScanBarcode, roles: ["admin", "gudang"] },
      { label: "Retur Barang", href: "/transaksi/retur", icon: RotateCcw, roles: ["admin", "gudang"] },
    ],
  },
  {
    label: "Laporan",
    icon: BarChart3,
    roles: ["admin", "keuangan", "pimpinan"],
    children: [
      { label: "Laporan Stok", href: "/laporan/stok", icon: BarChart3, roles: ["admin", "keuangan", "pimpinan"] },
      { label: "Laporan Transaksi", href: "/laporan/transaksi", icon: ScrollText, roles: ["admin", "keuangan", "pimpinan"] },
      { label: "Nilai Inventaris", href: "/laporan/nilai", icon: FileSpreadsheet, roles: ["admin", "keuangan", "pimpinan"] },
      { label: "Log Aktivitas", href: "/laporan/log", icon: ScrollText, roles: ["admin"] },
    ],
  },
  {
    label: "Pengguna",
    href: "/pengguna",
    icon: Users,
    roles: ["admin"],
  },
];

function NavLink({ item, depth = 0, onNavigate }: { item: NavItem; depth?: number; onNavigate?: () => void }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  if (!user || !item.roles.includes(user.role)) return null;

  const isActive = item.href
    ? item.href === "/" ? location === "/" : location.startsWith(item.href)
    : item.children?.some((c) => c.href && location.startsWith(c.href));

  if (item.children) {
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 border border-transparent",
            isActive
              ? "nav-item-active font-medium"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/[0.05] hover:border-white/[0.06]"
          )}
        >
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
            isActive ? "bg-primary/20" : "bg-white/[0.05]"
          )}>
            <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
          </div>
          <span className="flex-1 text-left font-medium">{item.label}</span>
          <ChevronRight className={cn(
            "w-3.5 h-3.5 transition-transform duration-200 opacity-50",
            open && "rotate-90"
          )} />
        </button>
        {open && (
          <div className="ml-3 pl-3 border-l border-white/[0.06] space-y-0.5 mt-1">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href!}>
      <button
        onClick={onNavigate}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 border border-transparent",
          depth > 0 ? "py-2" : "",
          isActive
            ? "nav-item-active font-medium"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/[0.05] hover:border-white/[0.06]"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
          depth > 0 ? "w-6 h-6" : "",
          isActive ? "bg-primary/20" : "bg-white/[0.05]"
        )}>
          <item.icon className={cn(
            "w-3.5 h-3.5",
            depth > 0 ? "w-3 h-3" : "",
            isActive ? "text-primary" : "text-sidebar-foreground/50"
          )} />
        </div>
        <span className={depth > 0 ? "text-xs" : ""}>{item.label}</span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse-glow" />
        )}
      </button>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleBadgeColor: Record<Role, string> = {
    admin: "bg-primary/15 text-primary border-primary/20",
    gudang: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    keuangan: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    pimpinan: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-foreground/90 tracking-wide">SI GAPLEK</p>
              <Sparkles className="w-3 h-3 text-primary/60" />
            </div>
            <p className="text-[10px] text-muted-foreground/70 font-medium tracking-wider uppercase">
              Sistem Logistik
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">
          Menu Utama
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.label} item={item} onNavigate={() => setSidebarOpen(false)} />
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] group">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate text-foreground/90">{user.fullName}</p>
                <span className={cn(
                  "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border font-semibold tracking-wide",
                  roleBadgeColor[user.role as Role] ?? "bg-muted text-muted-foreground border-border"
                )}>
                  {roleLabel(user.role)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 glass-card border-white/[0.08] text-foreground/90"
          >
            <DropdownMenuLabel className="pb-2">
              <p className="font-semibold text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground font-normal">@{user.username}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              onClick={logout}
              className="text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-blue-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 glass-sidebar relative z-10">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 flex flex-col glass-sidebar">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] glass">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-white/[0.08] border border-transparent hover:border-white/[0.08] text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-wide">SI GAPLEK</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
