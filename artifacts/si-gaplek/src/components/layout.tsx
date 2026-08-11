import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
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
    roles: ["ADMIN", "GUDANG", "CABANG", "SPI"],
  },
  {
    label: "Admin Gudang",
    icon: Settings,
    roles: ["ADMIN", "GUDANG"],
    children: [
      { label: "Master Barang", href: "/master/barang", icon: Package, roles: ["ADMIN", "GUDANG"] },
      { label: "Kategori", href: "/master/kategori", icon: Tags, roles: ["ADMIN", "GUDANG"] },
      { label: "Satuan", href: "/master/satuan", icon: Ruler, roles: ["ADMIN", "GUDANG"] },
      { label: "Supplier", href: "/master/supplier", icon: Truck, roles: ["ADMIN", "GUDANG"] },
      { label: "Departemen", href: "/master/departemen", icon: Building2, roles: ["ADMIN", "GUDANG"] },
      { label: "Lokasi & Rak", href: "/master/lokasi", icon: MapPin, roles: ["ADMIN", "GUDANG"] },
      { label: "Cabang & Gudang", href: "/master/gudang", icon: Warehouse, roles: ["ADMIN"] },
      { label: "Barang Masuk", href: "/transaksi/masuk", icon: PackagePlus, roles: ["ADMIN", "GUDANG"] },
      { label: "Distribusi (Keluar)", href: "/transaksi/keluar", icon: PackageMinus, roles: ["ADMIN", "GUDANG"] },
      { label: "Stok Opname", href: "/transaksi/opname", icon: ClipboardList, roles: ["ADMIN", "GUDANG"] },
      { label: "Retur Barang", href: "/transaksi/retur", icon: RotateCcw, roles: ["ADMIN", "GUDANG"] },
      { label: "Mutasi Stok", href: "/transaksi/mutasi", icon: ArrowLeftRight, roles: ["ADMIN", "GUDANG"] },
      { label: "Penyesuaian", href: "/transaksi/penyesuaian", icon: Settings, roles: ["ADMIN", "GUDANG"] },
    ],
  },
  {
    label: "Operasional Cabang",
    icon: ArrowLeftRight,
    roles: ["ADMIN", "CABANG"],
    children: [
      { label: "Penerimaan (Scan QR)", href: "/cabang/receive", icon: ScanBarcode, roles: ["ADMIN", "CABANG"] },
      { label: "Pemasangan Material", href: "/cabang/pemasangan", icon: Ruler, roles: ["ADMIN", "CABANG"] },
      { label: "Tracking Status", href: "/cabang/tracking", icon: MapPin, roles: ["ADMIN", "CABANG"] },
    ],
  },
  {
    label: "Audit SPI",
    icon: ClipboardList,
    roles: ["ADMIN", "SPI"],
    children: [
      { label: "Dashboard Audit", href: "/spi/dashboard", icon: BarChart3, roles: ["ADMIN", "SPI"] },
      { label: "Verifikasi Pemasangan", href: "/spi/verifikasi", icon: ScrollText, roles: ["ADMIN", "SPI"] },
      { label: "Peta Material (GIS)", href: "/spi/gis", icon: MapPin, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    label: "Laporan",
    icon: FileSpreadsheet,
    roles: ["ADMIN", "GUDANG", "SPI"],
    children: [
      { label: "Laporan Stok", href: "/laporan/stok", icon: BarChart3, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Laporan Transaksi", href: "/laporan/transaksi", icon: FileSpreadsheet, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Nilai Inventaris", href: "/laporan/nilai", icon: ScrollText, roles: ["ADMIN", "GUDANG", "SPI"] },
      { label: "Audit Log", href: "/laporan/log", icon: ClipboardList, roles: ["ADMIN", "SPI"] },
    ],
  },
  {
    label: "Pengguna",
    href: "/pengguna",
    icon: Users,
    roles: ["ADMIN"],
  },
];

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
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  if (!user || !item.roles.includes(user.role)) return null;

  const isActive = item.href
    ? item.href === "/" ? location === "/" : location.startsWith(item.href)
    : item.children?.some((c) => c.href && location.startsWith(c.href));

  if (item.children) {
    if (collapsed && depth === 0) {
      // When collapsed, show a dropdown menu for group items
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
              const childActive = child.href && location.startsWith(child.href);
              return (
                <DropdownMenuItem key={child.href} asChild>
                  <Link href={child.href!}>
                    <button
                      onClick={onNavigate}
                      className={cn("w-full flex items-center gap-2 text-sm", childActive && "font-medium text-primary")}
                    >
                      <child.icon className="w-4 h-4" />
                      <span>{child.label}</span>
                    </button>
                  </Link>
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
          <ChevronRight className={cn("w-4 h-4 transition-transform", open && "rotate-90")} />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} depth={depth + 1} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf nav item
  const linkContent = (
    <button
      onClick={onNavigate}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        collapsed && depth === 0 ? "justify-center p-2.5" : "px-3 py-2",
        isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
      )}
    >
      <item.icon className={cn("shrink-0", collapsed && depth === 0 ? "w-5 h-5" : "w-4 h-4")} />
      {(!collapsed || depth > 0) && <span>{item.label}</span>}
    </button>
  );

  if (collapsed && depth === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href!}>{linkContent}</Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Link href={item.href!}>{linkContent}</Link>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex flex-col h-full">
      <div className={cn("border-b", isCollapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight">SI GAPLEK</p>
              <p className="text-xs text-muted-foreground truncate">Logistik Kantor</p>
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

      <nav className={cn("flex-1 overflow-y-auto space-y-1", isCollapsed ? "p-2" : "p-3")}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            collapsed={isCollapsed}
            onNavigate={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      <div className={cn("border-t", isCollapsed ? "p-2" : "p-3")}>

        {/* User profile */}
        {isCollapsed ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {user.fullName}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground font-normal">@{user.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-3">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user.fullName}</p>
                  <Badge variant="secondary" className="text-xs h-4 px-1.5 mt-0.5">
                    {roleLabel(user.role)}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground font-normal">@{user.username}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
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
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 p-4 border-b bg-background">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">SI GAPLEK</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
