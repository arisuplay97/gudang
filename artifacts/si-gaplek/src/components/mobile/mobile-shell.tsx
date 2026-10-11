/**
 * MobileShell — Completely replaces Layout.tsx for CABANG mobile users.
 * No sidebar, no desktop chrome. Pure native app feel.
 * Inspired by: Linear, Folio, iOS native apps.
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { roleLabel, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Layers,
  ScanBarcode,
  MapPin,
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  User,
  ChevronLeft,
} from "lucide-react";
import NotificationCenter from "@/components/notification-center";

/* ── Tab Bar Config ── */
const TAB_ITEMS = [
  { label: "Beranda", href: "/", icon: LayoutDashboard },
  { label: "Stok", href: "/cabang/stok-material", icon: Layers },
  { label: "Terima", href: "/cabang/receive", icon: ScanBarcode },
  { label: "Lacak", href: "/cabang/tracking", icon: MapPin },
] as const;

/* ── Page Titles ── */
const PAGE_TITLES: Record<string, string> = {
  "/": "",
  "/cabang/stok-material": "Stok Material",
  "/cabang/receive": "Penerimaan",
  "/cabang/tracking": "Lacak Material",
  "/cabang/pemasangan": "Pemasangan",
  "/transaksi/retur": "Retur Material",
};

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark"
      );
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

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  const isHome = location === "/";
  const isSubPage =
    location === "/cabang/pemasangan" || location === "/transaksi/retur";
  const pageTitle = PAGE_TITLES[location] || "";

  const isTabActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden select-none">
      {/* ── TOP HEADER ── */}
      {isHome ? (
        /* Home Header: Avatar + Greeting + Actions */
        <header className="shrink-0 px-5 pt-3 pb-2.5 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 focus:outline-none">
                    <Avatar className="w-10 h-10 rounded-2xl border-2 border-primary/20 shadow-sm">
                      <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground rounded-2xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-52 rounded-2xl shadow-xl p-1.5"
                >
                  <DropdownMenuLabel className="text-xs">
                    <p className="font-semibold">{user.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      @{user.username} • {user.branchName || roleLabel(user.role)}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDark(!isDark)}
                    className="text-xs cursor-pointer"
                  >
                    {isDark ? (
                      <Sun className="w-3.5 h-3.5 mr-2 text-amber-500" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 mr-2" />
                    )}
                    {isDark ? "Mode Terang" : "Mode Gelap"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/pengaturan?tab=profil")}
                    className="text-xs cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 mr-2" />
                    Profil Saya
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-xs text-rose-600 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground leading-none">
                  {greetingText},
                </p>
                <h1 className="text-base font-bold text-foreground leading-snug truncate">
                  {user.fullName?.split(" ")[0]}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <NotificationCenter />
              <button
                onClick={() => navigate("/pengaturan?tab=profil")}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <Settings className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* Sub-Page Header: Back Arrow + Title */
        <header className="shrink-0 h-12 px-4 flex items-center gap-3 bg-background border-b border-border/60">
          <button
            onClick={() => {
              if (isSubPage) {
                window.history.back();
              } else {
                navigate("/");
              }
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-foreground truncate">
            {pageTitle}
          </h1>
          <div className="flex-1" />
          <NotificationCenter />
        </header>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        <div className={cn(isHome ? "px-5 pt-2 pb-24" : "pb-24")}>{children}</div>
      </main>

      {/* ── BOTTOM TAB BAR (iOS-style fixed) ── */}
      <nav className="shrink-0 bg-background/95 backdrop-blur-xl border-t border-border/60 px-2 pb-[env(safe-area-inset-bottom,8px)]">
        <div className="flex items-center justify-around h-14">
          {TAB_ITEMS.map((tab) => {
            const active = isTabActive(tab.href);
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                onClick={() => navigate(tab.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 active:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all",
                    active ? "stroke-[2.25]" : "stroke-[1.75]"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
