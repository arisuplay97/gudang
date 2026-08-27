import { cn } from "@/lib/utils";
import ErrorBoundary from "@/components/error-boundary";

interface PageWrapperProps {
    children: React.ReactNode;
    className?: string;
    /** max-width constraint — defaults to 1600px */
    maxWidth?: string;
}

/**
 * Consistent page wrapper for all route pages.
 * Provides: page-enter animation, error boundary, max-width, padding.
 * Blueprint Section 38 (page transitions) + Section 39 (error states).
 */
export default function PageWrapper({
    children,
    className,
    maxWidth = "max-w-[1600px]",
}: PageWrapperProps) {
    return (
        <ErrorBoundary>
            <div
                className={cn(
                    "min-h-[calc(100vh-3.5rem)] animate-page-enter",
                    "p-5 md:p-8",
                    maxWidth,
                    "mx-auto",
                    className
                )}
            >
                {children}
            </div>
        </ErrorBoundary>
    );
}
