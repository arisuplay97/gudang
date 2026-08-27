import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Package,
    ArrowLeftRight,
    MapPin,
    Building2,
    Search,
    ScanBarcode,
    PackageMinus,
    ShieldCheck,
    Map,
    ClipboardList,
} from "lucide-react";

interface SearchResult {
    group: string;
    id: number;
    title: string;
    subtitle: string;
    href: string;
}

const GROUP_ICONS: Record<string, React.ElementType> = {
    MATERIAL: Package,
    TRANSAKSI: ArrowLeftRight,
    TRACKING: MapPin,
    CABANG: Building2,
};

const QUICK_ACTIONS = [
    { label: "Cari Material", icon: Package, href: "/master/barang" },
    { label: "Scan Barcode", icon: ScanBarcode, href: "/cabang/receive" },
    { label: "Buat Barang Keluar", icon: PackageMinus, href: "/transaksi/keluar" },
    { label: "Buka Tracking", icon: MapPin, href: "/cabang/tracking" },
    { label: "Buka Verifikasi", icon: ShieldCheck, href: "/spi/verifikasi" },
    { label: "Buka GIS", icon: Map, href: "/spi/gis" },
    { label: "Buka Stock Opname", icon: ClipboardList, href: "/transaksi/opname" },
];

export default function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [, navigate] = useLocation();

    // Listen for open-command-palette event from topbar
    useEffect(() => {
        const handler = () => setOpen(true);
        window.addEventListener("open-command-palette", handler);
        return () => window.removeEventListener("open-command-palette", handler);
    }, []);

    // Ctrl+K / Cmd+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Debounced server search
    const [debouncedQuery, setDebouncedQuery] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: searchResults, isLoading } = useQuery({
        queryKey: ["global-search", debouncedQuery],
        queryFn: () => apiFetch<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`),
        enabled: debouncedQuery.length >= 2,
        staleTime: 10_000,
    });

    const results = searchResults?.results ?? [];

    // Group results
    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        (acc[r.group] = acc[r.group] || []).push(r);
        return acc;
    }, {});

    const handleSelect = useCallback((href: string) => {
        setOpen(false);
        setQuery("");
        navigate(href);
    }, [navigate]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Cari material, transaksi, barcode, tracking..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    {isLoading ? "Mencari..." : query.length < 2 ? "Ketik minimal 2 karakter..." : "Tidak ditemukan."}
                </CommandEmpty>

                {/* Search Results */}
                {Object.entries(grouped).map(([group, items]) => {
                    const Icon = GROUP_ICONS[group] || Package;
                    return (
                        <CommandGroup key={group} heading={group}>
                            {items.map((item) => (
                                <CommandItem
                                    key={`${group}-${item.id}`}
                                    value={`${item.title} ${item.subtitle}`}
                                    onSelect={() => handleSelect(item.href)}
                                    className="flex items-center gap-3 py-2"
                                >
                                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    );
                })}

                {/* Quick Actions (shown when no search query) */}
                {query.length < 2 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Aksi Cepat">
                            {QUICK_ACTIONS.map((action) => (
                                <CommandItem
                                    key={action.href}
                                    value={action.label}
                                    onSelect={() => handleSelect(action.href)}
                                    className="flex items-center gap-3 py-2"
                                >
                                    <action.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm">{action.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
