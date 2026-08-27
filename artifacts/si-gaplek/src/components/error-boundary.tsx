import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary (Section 39 — error state).
 * Catches render-time errors and shows a recovery UI.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-page-enter">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
                        <AlertOctagon className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                        Terjadi Kesalahan
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md mb-6">
                        Halaman mengalami error. Silakan coba muat ulang.
                    </p>
                    {this.state.error && (
                        <pre className="text-xs text-muted-foreground bg-muted rounded-lg p-3 max-w-md overflow-auto mb-4">
                            {this.state.error.message}
                        </pre>
                    )}
                    <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Coba Lagi
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
