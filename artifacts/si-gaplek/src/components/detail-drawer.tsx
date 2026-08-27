import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface DetailField {
    label: string;
    value: string | number | null | undefined;
    badge?: boolean;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface DetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    fields: DetailField[];
    detailHref?: string;
    children?: React.ReactNode;
}

/**
 * Reusable Sheet/Drawer for quick row preview from data tables.
 * Shows summary fields + link to full detail page.
 */
export default function DetailDrawer({
    open,
    onOpenChange,
    title,
    description,
    fields,
    detailHref,
    children,
}: DetailDrawerProps) {
    const [, navigate] = useLocation();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-lg">{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {fields.map((field) => (
                        <div key={field.label} className="flex justify-between items-start gap-4">
                            <span className="text-sm text-muted-foreground shrink-0">{field.label}</span>
                            {field.badge ? (
                                <Badge variant={field.badgeVariant ?? "secondary"} className="text-xs">
                                    {field.value ?? "-"}
                                </Badge>
                            ) : (
                                <span className="text-sm font-medium text-right">{field.value ?? "-"}</span>
                            )}
                        </div>
                    ))}

                    {children && (
                        <>
                            <Separator />
                            {children}
                        </>
                    )}

                    {detailHref && (
                        <>
                            <Separator />
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    navigate(detailHref);
                                    onOpenChange(false);
                                }}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Lihat Detail Lengkap
                            </Button>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
