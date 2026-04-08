import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GlassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function GlassModal({ open, onOpenChange, title, description, children, footer, className }: GlassModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-background/80 border-white/20 shadow-2xl", className)}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
        {footer && <DialogFooter className="mt-4">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
