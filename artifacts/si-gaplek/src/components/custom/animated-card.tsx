import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedCard({ children, className, delay = 0, ...props }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1",
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
      {children}
    </div>
  );
}
