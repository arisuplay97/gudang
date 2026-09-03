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

/* ── Navigation Types & Config ── */
interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  roles: Role[];
  children?: NavItem[];
  group?: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
  },
  {
    label: "MASTER",
    icon: Package,
    roles: ["ADMIN", "GUDANG"],
    group: "MASTER",
    children: [
      { label: "Material", href: "/master/barang", icon: Package, roles: ["ADMIN", "GUDANG"] },
      { label: "Kategori", href: "/master/kategori", icon: Tags, roles: ["ADMIN", "GUDANG"] },
      { label: "Satuan", href: "/master/satuan", icon: Ruler, roles: ["ADMIN", "GUDANG"] },
      { label: "Supplier", href: "/master/supplier", icon: Truck, roles: ["ADMIN", "GUDANG"] },
      { label: "Cabang & Gudang", href: "/master/gudang", icon: Warehouse, roles: ["ADMIN"] },
      { label: "Lokasi Gudang", href: "/master/lokasi", icon: MapPin, roles: ["ADMIN", "GUDANG"] },
      { label: "Departemen", href: "/master/departemen", icon: Building2, roles: ["ADMIN", "GUDANG"] },
    ],
  },
  {
    label: "PERSEDIAAN",
    icon: Archive,
    roles: ["ADMIN", "GUDANG"],
    group: "PERSEDIAAN",
    children: [
      { label: "Stock Opname", href: "/transaksi/opname", icon: ClipboardList, roles: ["ADMIN", "GUDANG"] },
      { label: "Penyesuaian", href: "/transaksi/penyesuaian", icon: Settings, roles: ["ADMIN", "GUDANG"] },
      { label: "Retur", href: "/transaksi/retur", icon: RotateCcw, roles: ["ADMIN", "GUDANG"] },
      { label: "Mutasi Stok", href: "/transaksi/mutasi", icon: ArrowLeftRight, roles: ["ADMIN", "GUDANG"] },
    ],
  },
  {
    label: "TRANSAKSI",
    icon: ArrowLeftRight,
    roles: ["ADMIN", "GUDANG", "CABANG"],
    group: "TRANSAKSI",
    children: [
      { label: "Material Masuk", href: "/transaksi/masuk", icon: PackagePlus, roles: ["ADMIN", "GUDANG"] },
      { label: "Distribusi (Keluar)", href: "/transaksi/keluar", icon: PackageMinus, roles: ["ADMIN", "GUDANG"] },
      { label: "Penerimaan (Scan QR)", href: "/cabang/receive", icon: ScanBarcode, roles: ["ADMIN", "CABANG"] },
      { label: "Pemasangan Material", href: "/cabang/pemasangan", icon: Ruler, roles: ["ADMIN", "CABANG"] },
    ],
  },
  {
    label: "TRACKING",
    icon: Activity,
    roles: ["ADMIN", "GUDANG", "CABANG"],
    group: "TRACKING",
    children: [
      { label: "Material Tracking", href: "/cabang/tracking", icon: MapPin, roles: ["ADMIN", "GUDANG", "CABANG"] },
    ],
  },
  {
    label: "AUDIT / SPI",
    icon: ShieldCheck,
    roles: ["ADMIN", "SPI"],
    group: "AUDIT",
    children: [
      { label: "Dashboard Audit", href: "/spi/dashboard", icon: BarChart3, roles: ["ADMIN", "SPI"] },
      { label: "Verifikasi", href: "/spi/verifikasi", icon: ScrollText, roles: ["ADMIN", "SPI"] },
      { label: "Peta Material", href: "/spi/gis", icon: MapPin, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    label: "LAPORAN",
    icon: FileSpreadsheet,
    roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
    group: "LAPORAN",
    children: [
      { label: "Stok", href: "/laporan/stok", icon: BarChart3, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Transaksi", href: "/laporan/transaksi", icon: FileSpreadsheet, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Pemasangan Aksesoris", href: "/laporan/pemasangan-aksesoris", icon: Wrench, roles: ["ADMIN", "GUDANG", "CABANG", "SPI"] },
      { label: "Nilai Inventaris", href: "/laporan/nilai", icon: ScrollText, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Audit Log", href: "/laporan/log", icon: ClipboardList, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    label: "TIARA AI",
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
];

/* ── Breadcrumb Route Map ── */
const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/master/barang": "Material",
  "/master/kategori": "Kategori",
  "/master/satuan": "Satuan",
  "/master/supplier": "Supplier",
  "/master/gudang": "Cabang & Gudang",
  "/master/departemen": "Departemen",
  "/master/lokasi": "Lokasi Gudang",
  "/transaksi/masuk": "Material Masuk",
  "/transaksi/keluar": "Distribusi",
  "/transaksi/opname": "Stock Opname",
  "/transaksi/retur": "Retur",
  "/transaksi/mutasi": "Mutasi Stok",
  "/transaksi/penyesuaian": "Penyesuaian",
  "/cabang/receive": "Penerimaan",
  "/cabang/pemasangan": "Pemasangan",
  "/cabang/tracking": "Material Tracking",
  "/spi/dashboard": "Dashboard Audit",
  "/spi/verifikasi": "Verifikasi",
  "/spi/gis": "Peta Material",
  "/laporan/stok": "Laporan Stok",
  "/laporan/transaksi": "Laporan Transaksi",
  "/laporan/pemasangan-aksesoris": "Laporan Pemasangan Aksesoris",
  "/laporan/nilai": "Nilai Inventaris",
  "/laporan/log": "Audit Log",
  "/ai-assistant": "TIARA AI",
  "/pengguna": "Pengguna",
};

const ROUTE_GROUPS: Record<string, string> = {
  "/master": "Master",
  "/transaksi": "Transaksi",
  "/cabang": "Operasional",
  "/spi": "Audit SPI",
  "/laporan": "Laporan",
};

/* ── NavLink Component ── */
function NavLink({
  item,
  depth = 0,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  depth?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Auto-expand if child is active
  useEffect(() => {
    if (item.children?.some((c) => c.href && (c.href === "/" ? location === "/" : location.startsWith(c.href)))) {
      setOpen(true);
    }
  }, [location, item.children]);

  if (!user || !item.roles.includes(user.role)) return null;

  const isActive = item.href
    ? item.href === "/" ? location === "/" : location.startsWith(item.href)
    : item.children?.some((c) => c.href && (c.href === "/" ? location === "/" : location.startsWith(c.href)));

  if (item.children) {
    if (collapsed && depth === 0) {
      return (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-lg text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-48">
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.children.map((child) => {
              if (!user || !child.roles.includes(user.role)) return null;
              const childActive = child.href && (child.href === "/" ? location === "/" : location.startsWith(child.href));
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(child.href!);
                      onNavigate?.();
                    }}
                    className={cn("w-full flex items-center gap-2 text-sm", childActive && "font-medium text-primary")}
                  >
                    <child.icon className="w-4 h-4" />
                    <span>{child.label}</span>
                  </button>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div>

        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", open && "rotate-90")} />
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="ml-4 mt-1 space-y-0.5">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} depth={depth + 1} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Leaf nav item
  const linkContent = (
    <button
      onClick={(e) => {
        e.preventDefault();
        navigate(item.href!);
        onNavigate?.();
      }}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        collapsed && depth === 0 ? "justify-center p-2.5" : "px-3 py-2",
        isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
      )}
    >
      <item.icon className={cn("shrink-0", collapsed && depth === 0 ? "w-5 h-5" : "w-4 h-4")} />
      {(!collapsed || depth > 0) && <span className="flex-1 text-left">{item.label}</span>}
      {item.badge && (!collapsed || depth > 0) && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-2xs leading-none">
          {item.badge}
        </span>
      )}
    </button>
  );

  if (collapsed && depth === 0) {
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
    const firstSegment = `/${parts[0]}`;
    if (ROUTE_GROUPS[firstSegment]) {
      items.push({ label: ROUTE_GROUPS[firstSegment], href: firstSegment });
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
    <div className="flex flex-col h-full">
      <div className={cn("border-b", isCollapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 rounded-xl bg-white p-1 border border-border shadow-xs flex items-center justify-center shrink-0">
            <img
              src="/logo-perumdam.png"
              alt="Logo SI GAPLEK"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight text-foreground">SI GAPLEK</p>
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

      <nav className={cn("flex-1 overflow-y-auto space-y-0.5", isCollapsed ? "p-2" : "p-3")}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            collapsed={isCollapsed}
            onNavigate={() => setSidebarOpen(false)}
          />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex border-r flex-col shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 bg-background border-r flex flex-col">
            <SidebarContent isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── TOPBAR ── */}
        <header className="flex items-center gap-3 h-14 px-4 border-b bg-background/95 backdrop-blur-sm z-30 shrink-0">
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
              {ROUTE_LABELS[location] || "SI GAPLEK"}
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

          {/* Notification bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative shrink-0"
                id="notification-trigger"
                onClick={() => window.dispatchEvent(new CustomEvent("open-notifications"))}
              >
                <Bell className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifikasi</TooltipContent>
          </Tooltip>

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
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Pengaturan
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
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
