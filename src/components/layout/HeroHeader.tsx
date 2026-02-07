import * as React from "react";

import { cn } from "@/lib/utils";

type HeroHeaderSize = "md" | "lg";
type HeroHeaderAlign = "left" | "center";

export function HeroHeader({
  title,
  subtitle,
  icon,
  align = "left",
  size = "md",
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  align?: HeroHeaderAlign;
  size?: HeroHeaderSize;
  className?: string;
}) {
  const isCenter = align === "center";
  const titleClasses =
    size === "lg"
      ? "text-4xl md:text-5xl"
      : "text-3xl md:text-4xl";

  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/60 shadow-lg backdrop-blur-sm",
        "px-6 py-6 md:px-8 md:py-8",
        isCenter ? "text-center" : "text-left",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 pointer-events-none opacity-70",
          "bg-[radial-gradient(700px_280px_at_0%_0%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(700px_280px_at_100%_0%,hsl(var(--accent)/0.16),transparent_60%)]"
        )}
      />

      <div className="relative">
        <div
          className={cn(
            "flex items-start gap-4",
            isCenter ? "flex-col items-center" : "flex-row items-start"
          )}
        >
          {icon ? (
            <div
              className={cn(
                "shrink-0 rounded-2xl border border-border/70 bg-background/40 shadow-sm",
                "p-3",
                isCenter ? "" : "mt-1"
              )}
            >
              <div className="text-primary">{icon}</div>
            </div>
          ) : null}

          <div className={cn("min-w-0", isCenter ? "flex flex-col items-center" : "")}>
            <h1 className={cn("font-headline font-bold text-primary", titleClasses)}>
              {title}
            </h1>
            <div
              className={cn(
                "mt-3 h-1 rounded-full",
                isCenter ? "mx-auto w-24" : "w-20",
                "bg-gradient-to-r from-primary/80 via-accent/70 to-primary/20"
              )}
            />
            {subtitle ? (
              <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

