import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

/**
 * Reusable table skeleton for loading state (Section 37 — skeleton states).
 * Shows shimmering rows while data loads.
 */
export default function TableSkeleton({
    rows = 5,
    columns = 6,
}: TableSkeletonProps) {
    return (
        <div className="space-y-3 p-4">
            {/* Header row */}
            <div className="flex gap-4">
                {Array.from({ length: columns }).map((_, c) => (
                    <Skeleton key={`h-${c}`} className="h-4 flex-1 rounded skeleton-shimmer" />
                ))}
            </div>

            {/* Data rows */}
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4" style={{ animationDelay: `${r * 80}ms` }}>
                    {Array.from({ length: columns }).map((_, c) => (
                        <Skeleton
                            key={`${r}-${c}`}
                            className="h-8 flex-1 rounded skeleton-shimmer"
                            style={{ animationDelay: `${(r * columns + c) * 40}ms` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
