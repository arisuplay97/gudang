import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Sun,
  Moon,
  Search,
  Bell,
  User,
  Keyboard,
  ShieldCheck,
  AlertTriangle,
  Timer,
  Layers,
  Activity,
  Archive,
  BookOpen,
  Wrench,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth-context";
import NotificationCenter from "@/components/notification-center";

/* ── Navigation Types & Config ── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "DASHBOARD",
    items: [
      {
        label: "Dashboard Utama",
        href: "/",
        icon: LayoutDashboard,
        roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
      },
    ],
  },
  {
    title: "MASTER",
    items: [
      { label: "Material", href: "/master/barang", icon: Package, roles: ["ADMIN", "GUDANG"] },
      { label: "Kategori", href: "/master/kategori", icon: Tags, roles: ["ADMIN", "GUDANG"] },
      { label: "Satuan", href: "/master/satuan", icon: Ruler, roles: ["ADMIN", "GUDANG"] },
      { label: "Cabang", href: "/master/gudang", icon: Warehouse, roles: ["ADMIN"] },
    ],
  },
  {
    title: "INVENTARIS CABANG",
    items: [
      {
        label: "Sisa Stok Cabang",
        href: "/cabang/stok-material",
        icon: Layers,
        roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
      },
    ],
  },
  {
    title: "TRANSAKSI",
    items: [
      { label: "Distribusi (Keluar)", href: "/transaksi/keluar", icon: PackageMinus, roles: ["ADMIN", "GUDANG"] },
      { label: "Penerimaan (Scan QR)", href: "/cabang/receive", icon: ScanBarcode, roles: ["ADMIN", "CABANG"] },
      { label: "Pemasangan Material", href: "/cabang/pemasangan", icon: Ruler, roles: ["ADMIN", "CABANG"] },
      { label: "Retur Material", href: "/transaksi/retur", icon: RotateCcw, roles: ["ADMIN", "GUDANG", "CABANG"] },
    ],
  },
  {
    title: "TRACKING",
    items: [
      { label: "Material Tracking", href: "/cabang/tracking", icon: MapPin, roles: ["ADMIN", "GUDANG", "CABANG"] },
    ],
  },
  {
    title: "AUDIT / SPI",
    items: [
      { label: "Dashboard Audit", href: "/spi/dashboard", icon: BarChart3, roles: ["ADMIN", "SPI"] },
      { label: "Verifikasi", href: "/spi/verifikasi", icon: ScrollText, roles: ["ADMIN", "SPI"] },
      { label: "Peta Material", href: "/spi/gis", icon: MapPin, roles: ["ADMIN", "SPI"] },
      { label: "Laporan Audit SPI", href: "/spi/laporan-audit", icon: ClipboardList, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    title: "LAPORAN",
    items: [
      { label: "Stok Cabang", href: "/laporan/stok", icon: BarChart3, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Produktivitas Teknisi", href: "/laporan/teknisi", icon: Users, roles: ["ADMIN", "GUDANG", "CABANG", "SPI"] },
      { label: "Transaksi", href: "/laporan/transaksi", icon: FileSpreadsheet, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Pemasangan Aksesoris", href: "/laporan/pemasangan-aksesoris", icon: Wrench, roles: ["ADMIN", "GUDANG", "CABANG", "SPI"] },
      { label: "Nilai Inventaris", href: "/laporan/nilai", icon: ScrollText, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Audit Log", href: "/laporan/log", icon: ClipboardList, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    title: "LAINNYA",
    items: [
      {
        label: "Tiara Assistant",
        href: "/ai-assistant",
        icon: Sparkles,
        roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
        badge: "AI",
      },
      {
        label: "Pengguna",
        href: "/pengguna",
        icon: Users,
        roles: ["ADMIN"],
      },
    ],
  },
];

/* ── Breadcrumb Route Map ── */
const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard Utama",
  "/master/barang": "Material",
  "/master/kategori": "Kategori",
  "/master/satuan": "Satuan",
  "/master/supplier": "Supplier",
  "/master/gudang": "Cabang & Gudang",
  "/master/departemen": "Departemen",
  "/master/lokasi": "Lokasi Gudang",
  "/cabang/stok-material": "Sisa Stok Cabang",
  "/inventaris/cabang": "Sisa Stok Cabang",
  "/transaksi/masuk": "Material Masuk",
  "/transaksi/keluar": "Distribusi",
  "/transaksi/opname": "Stock Opname",
  "/transaksi/retur": "Retur",
  "/transaksi/mutasi": "Mutasi Stok",
  "/transaksi/penyesuaian": "Penyesuaian",
  "/cabang/dashboard": "Dashboard Cabang",
  "/cabang/receive": "Penerimaan",
  "/cabang/pemasangan": "Pemasangan",
  "/cabang/tracking": "Material Tracking",
  "/spi/dashboard": "Dashboard Audit",
  "/spi/verifikasi": "Verifikasi",
  "/spi/gis": "Peta Material",
  "/spi/laporan-audit": "Laporan Audit SPI",
  "/laporan/stok": "Laporan Stok",
  "/laporan/teknisi": "Laporan Produktivitas Teknisi",
  "/laporan/transaksi": "Laporan Transaksi",
  "/laporan/pemasangan-aksesoris": "Laporan Pemasangan Aksesoris",
  "/laporan/nilai": "Nilai Inventaris",
  "/laporan/log": "Audit Log",
  "/ai-assistant": "Tiara Assistant",
  "/pengguna": "Pengguna",
  "/pengaturan": "Pengaturan Sistem",
  "/profil": "Profil Pengguna",
};

const ROUTE_GROUPS: Record<string, string> = {
  "/master": "Master",
  "/cabang/stok-material": "Inventaris Cabang",
  "/transaksi": "Transaksi",
  "/cabang": "Operasional",
  "/spi": "Audit SPI",
  "/laporan": "Laporan",
};

/* ── NavLink Component ── */
function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  if (!user || !item.roles.includes(user.role)) return null;

  const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);

  const linkContent = (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigate(item.href);
        onNavigate?.();
      }}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg text-sm transition-all duration-150 select-none",
        collapsed ? "justify-center p-2.5" : "px-3 py-2",
        isActive
          ? "bg-primary/10 text-primary font-semibold shadow-2xs"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground font-normal"
      )}
    >
      <item.icon className={cn("shrink-0 transition-colors", collapsed ? "w-5 h-5" : "w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
      {item.badge && !collapsed && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-2xs leading-none">
          {item.badge}
        </span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

/* ── Main Layout ── */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /* ── Breadcrumb computation ── */
  const breadcrumbItems = useMemo(() => {
    if (location === "/") return [{ label: "Dashboard", href: "/" }];
    const parts = location.split("/").filter(Boolean);
    const items: { label: string; href: string }[] = [];

    // Find group
    if (location === "/cabang/stok-material" || location === "/inventaris/cabang") {
      items.push({ label: "Inventaris Cabang", href: "/cabang/stok-material" });
    } else {
      const firstSegment = `/${parts[0]}`;
      if (ROUTE_GROUPS[firstSegment]) {
        items.push({ label: ROUTE_GROUPS[firstSegment], href: firstSegment });
      }
    }

    // Full path label
    const fullLabel = ROUTE_LABELS[location];
    if (fullLabel) {
      items.push({ label: fullLabel, href: location });
    }

    return items;
  }, [location]);

  /* ── Sidebar content ── */
  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex flex-col h-full bg-white dark:bg-card">
      <div className={cn("border-b border-border/80", isCollapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 rounded-xl bg-white p-1 border border-border/80 shadow-xs flex items-center justify-center shrink-0">
            <img
              src="/logo-perumdam.png"
              alt="Logo SIMONA"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight text-foreground">SIMONA</p>
              <p className="text-[11px] text-muted-foreground truncate">Perumdam Tirta Ardhia Rinjani</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isCollapsed ? "Perbesar Sidebar" : "Kecilkan Sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <nav className={cn("flex-1 overflow-y-auto space-y-3", isCollapsed ? "p-2" : "px-3 py-2.5")}>
        {NAV_SECTIONS.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) => user && item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 select-none">
                  {section.title}
                </div>
              ) : (
                sIdx > 0 && <div className="my-1.5 border-t border-border/50 mx-1.5" />
              )}

              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={isCollapsed}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex border-r border-border/80 bg-white dark:bg-card flex-col shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 bg-white dark:bg-card border-r border-border/80 flex flex-col">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── TOPBAR ── */}
        <header className="flex items-center gap-3 h-14 px-4 border-b border-border/80 bg-white dark:bg-card z-30 shrink-0">
          {/* Left: sidebar toggle + breadcrumb */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              {breadcrumbItems.map((item, i) => (
                <BreadcrumbItem key={item.href}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {i === breadcrumbItems.length - 1 ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(item.href)}
                    >
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile: show page title */}
          <div className="flex sm:hidden items-center gap-2">
            <img src="/logo-perumdam.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold text-sm">
              {ROUTE_LABELS[location] || "SIMONA"}
            </span>
          </div>

          <div className="flex-1" />

          {/* Center-Right: Global Search trigger */}
          <button
            id="global-search-trigger"
            onClick={() => {
              // Dispatch event for GlobalSearch component to handle
              window.dispatchEvent(new CustomEvent("open-command-palette"));
            }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/40 hover:bg-muted text-sm text-muted-foreground transition-colors max-w-[260px] w-full"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left truncate">Cari material, transaksi...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-medium bg-background border rounded px-1.5 py-0.5">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Search icon for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Active Notification Center */}
          <NotificationCenter />

          {/* Branch badge for Cabang users */}
          {user.branchName && (
            <Badge variant="outline" className="hidden md:flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 font-medium">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              {user.branchName}
            </Badge>
          )}

          {/* Dark mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? "Mode Terang" : "Mode Gelap"}</TooltipContent>
          </Tooltip>

          {/* User avatar / menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 h-9 shrink-0">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
                  {user.fullName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground font-normal">@{user.username}</p>
                <Badge variant="secondary" className="text-xs h-4 px-1.5 mt-1">
                  {roleLabel(user.role)}
                </Badge>
                {user.branchName && (
                  <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-1.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {user.branchName}
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate("/pengaturan?tab=profil")}
              >
                <User className="w-4 h-4 mr-2" />
                Profil Pengguna
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => navigate("/pengaturan?tab=instansi")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Pengaturan Sistem
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
