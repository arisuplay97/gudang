import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import {
    PackageMinus,
    CheckCircle,
    Wrench,
    ShieldCheck,
    CircleDot,
} from "lucide-react";

/** Material journey step status */
export type JourneyStep = {
    label: string;
    status: "completed" | "active" | "pending";
    timestamp?: string | null;
    description?: string;
};

const STEP_ICONS = [PackageMinus, CheckCircle, Wrench, ShieldCheck];

interface MaterialJourneyProps {
    steps: JourneyStep[];
    className?: string;
}

/**
 * Vertical timeline for material lifecycle:
 * Barang Keluar → Diterima Cabang → Pemasangan → Verifikasi
 */
export default function MaterialJourney({ steps, className }: MaterialJourneyProps) {
    return (
        <div className={cn("relative", className)}>
            {steps.map((step, i) => {
                const Icon = STEP_ICONS[i] ?? CircleDot;
                const isLast = i === steps.length - 1;
                const isCompleted = step.status === "completed";
                const isActive = step.status === "active";

                return (
                    <div key={step.label} className="flex gap-4">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 transition-all duration-300",
                                    isCompleted && "bg-[#5b7553] border-[#5b7553] text-white",
                                    isActive && "bg-white dark:bg-card border-[#5b7553] text-[#5b7553] shadow-[0_0_0_4px_rgba(91,117,83,0.15)]",
                                    !isCompleted && !isActive && "bg-[#f0efe9] dark:bg-muted border-[#ddd] dark:border-border text-[#b0b0a0]"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            {!isLast && (
                                <div
                                    className={cn(
                                        "w-0.5 flex-1 my-1 transition-colors",
                                        isCompleted ? "bg-[#5b7553]" : "bg-[#e0dfd8] dark:bg-border"
                                    )}
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className={cn("pb-6", isLast && "pb-0")}>
                            <p
                                className={cn(
                                    "text-sm font-medium pt-2",
                                    isCompleted && "text-[#2d2d2a] dark:text-foreground",
                                    isActive && "text-[#5b7553] dark:text-green-400 font-semibold",
                                    !isCompleted && !isActive && "text-[#b0b0a0] dark:text-muted-foreground"
                                )}
                            >
                                {step.label}
                            </p>
                            {step.timestamp && (
                                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-0.5">
                                    {formatDateTime(step.timestamp)}
                                </p>
                            )}
                            {step.description && (
                                <p className="text-xs text-[#8a8a7a] dark:text-muted-foreground mt-0.5">
                                    {step.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Helper to build JourneyStep[] from tracking data.
 * Pass the tracking record and it returns the 4-step journey.
 */
export function buildJourneySteps(tracking: {
    status: string;
    createdAt?: string | null;
    receivedAt?: string | null;
    installedAt?: string | null;
    verifiedAt?: string | null;
}): JourneyStep[] {
    const STATUS_ORDER = ["MENUNGGU_DITERIMA", "DITERIMA_CABANG", "MENUNGGU_PEMASANGAN", "TERPASANG", "MENUNGGU_VERIFIKASI", "TERVERIFIKASI"];
    const currentIdx = STATUS_ORDER.indexOf(tracking.status);

    return [
        {
            label: "Barang Keluar",
            status: currentIdx >= 0 ? "completed" : "active",
            timestamp: tracking.createdAt,
        },
        {
            label: "Diterima Cabang",
            status: currentIdx >= 1 ? "completed" : currentIdx === 0 ? "active" : "pending",
            timestamp: tracking.receivedAt,
        },
        {
            label: "Pemasangan",
            status: currentIdx >= 3 ? "completed" : [2, 3].includes(currentIdx) ? "active" : "pending",
            timestamp: tracking.installedAt,
        },
        {
            label: "Verifikasi SPI",
            status: currentIdx >= 5 ? "completed" : currentIdx === 4 ? "active" : "pending",
            timestamp: tracking.verifiedAt,
        },
    ];
}
