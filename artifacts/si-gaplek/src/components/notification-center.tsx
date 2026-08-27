import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Bell,
    AlertTriangle,
    Package,
    PackageMinus,
    ShieldCheck,
    Timer,
    CheckCheck,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    category: string;
    title: string;
    description: string;
    severity: "critical" | "warning" | "info";
    href?: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    SLA: Timer,
    STOCK: Package,
    DISTRIBUSI: PackageMinus,
    VERIFIKASI: ShieldCheck,
};

const SEVERITY_STYLES: Record<string, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
};

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [, navigate] = useLocation();

    // Listen for open-notifications event from topbar
    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener("open-notifications", handler);
        return () => window.removeEventListener("open-notifications", handler);
    }, []);

    // Fetch computed notifications from existing data
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => apiFetch<Notification[]>("/api/notifications"),
        refetchInterval: 60_000, // Refresh every minute
        staleTime: 30_000,
    });

    const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));
    const unreadCount = visibleNotifications.length;

    const handleDismiss = (id: string) => {
        setDismissed((prev) => new Set([...prev, id]));
    };

    const handleDismissAll = () => {
        setDismissed(new Set(notifications.map((n) => n.id)));
    };

    const handleClick = (notification: Notification) => {
        if (notification.href) {
            navigate(notification.href);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative shrink-0"
                    aria-label="Notifikasi"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="text-sm font-semibold">Notifikasi</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={handleDismissAll}
                        >
                            <CheckCheck className="w-3.5 h-3.5 mr-1" />
                            Tandai semua dibaca
                        </Button>
                    )}
                </div>
                <ScrollArea className="max-h-80">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            Memuat...
                        </div>
                    ) : visibleNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">Tidak ada notifikasi</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {visibleNotifications.map((n) => {
                                const Icon = CATEGORY_ICONS[n.category] || AlertTriangle;
                                return (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "flex gap-3 px-4 py-3 transition-colors",
                                            n.href && "cursor-pointer hover:bg-muted/50"
                                        )}
                                        onClick={() => handleClick(n)}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", SEVERITY_STYLES[n.severity])}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-1">
                                                        {n.category}
                                                    </Badge>
                                                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDismiss(n.id);
                                                    }}
                                                    className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground"
                                                    aria-label="Dismiss"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
