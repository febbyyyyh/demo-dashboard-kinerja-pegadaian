import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { NavAnchor } from "@/components/fk/NavAnchor";
import type { NavTarget } from "@/lib/formkanwil/navigation";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  hint: ReactNode;
  to: NavTarget;
  hero?: boolean;
  trend?: number | null;
}

export function KpiCard({ label, value, hint, to, hero = false, trend }: KpiCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <NavAnchor
      nav={to}
      className={cn(
        "group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
        hero ? "bg-gradient-hero-card text-on-hero shadow-brand" : "panel text-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-sm font-semibold", hero ? "text-on-hero-muted" : "text-muted-foreground")}>
          {label}
        </span>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:rotate-45",
            hero ? "bg-on-hero text-primary-deep" : "border border-border bg-card text-foreground",
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div>
        <div className="font-display text-4xl font-extrabold tabular-nums tracking-tight">{value}</div>
        <div className={cn("mt-2 flex flex-wrap items-center gap-2 text-xs", hero ? "text-on-hero-muted" : "text-muted-foreground")}>
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                "pill",
                hero ? "bg-lime text-primary-deep" : up ? "bg-mint-soft text-mint-foreground" : "bg-warning-soft text-gold-foreground",
              )}
            >
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {up ? "+" : ""}
              {Math.round(trend)}%
            </span>
          )}
          {hint}
        </div>
      </div>
      {hero && (
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 size-44 rounded-full border-[28px] border-on-hero/10" />
      )}
    </NavAnchor>
  );
}
