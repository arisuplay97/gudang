import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  KeyRound,
  Archive,
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
      { label: "Peminjaman Tools", href: "/transaksi/peminjaman", icon: KeyRound, roles: ["admin", "gudang"] },
      { label: "Barang Titipan", href: "/transaksi/titipan", icon: Archive, roles: ["admin", "gudang"] },
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
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">SI GAPLEK</p>
            <p className="text-xs text-muted-foreground truncate">Logistik Kantor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.label} item={item} onNavigate={() => setSidebarOpen(false)} />
        ))}
      </nav>

      <div className="p-3 border-t">
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
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 border-r flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 bg-background border-r flex flex-col">
            <SidebarContent />
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
