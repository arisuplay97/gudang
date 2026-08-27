import { cn } from "@/lib/utils";
import { PackageOpen, Search, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type StateType = "empty" | "no-results" | "error";

interface EmptyStateProps {
    type?: StateType;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: { label: string; onClick: () => void };
    className?: string;
}

const DEFAULTS: Record<StateType, { title: string; description: string; icon: React.ReactNode }> = {
    empty: {
        title: "Belum Ada Data",
        description: "Data akan muncul setelah Anda menambahkan entri baru.",
        icon: <PackageOpen className="w-10 h-10 text-muted-foreground/50" />,
    },
    "no-results": {
        title: "Tidak Ditemukan",
        description: "Coba ubah kata kunci pencarian atau filter Anda.",
        icon: <Search className="w-10 h-10 text-muted-foreground/50" />,
    },
    error: {
        title: "Gagal Memuat Data",
        description: "Terjadi kesalahan saat mengambil data. Silakan coba lagi.",
        icon: <AlertCircle className="w-10 h-10 text-destructive/50" />,
    },
};

/**
 * Reusable empty/error state component (Section 38–39).
 * Three modes: empty, no-results, error. With optional action button.
 */
export default function EmptyState({
    type = "empty",
    title,
    description,
    icon,
    action,
    className,
}: EmptyStateProps) {
    const defaults = DEFAULTS[type];

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in-up",
                className
            )}
        >
            <div className="mb-4">{icon ?? defaults.icon}</div>
            <h3 className="text-base font-semibold text-foreground mb-1">
                {title ?? defaults.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {description ?? defaults.description}
            </p>
            {action && (
                <Button variant="outline" size="sm" onClick={action.onClick} className="gap-2">
                    {type === "error" && <RefreshCw className="w-4 h-4" />}
                    {action.label}
                </Button>
            )}
        </div>
    );
}
