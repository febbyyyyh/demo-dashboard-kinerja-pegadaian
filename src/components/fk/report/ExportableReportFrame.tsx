import { forwardRef, type ReactNode } from "react";

import { PegadaianLogo } from "@/components/fk/Logo";
import { printedAt } from "@/lib/formkanwil/report-export";
import { cn } from "@/lib/utils";

interface ExportableReportFrameProps {
  title: string;
  subtitle?: string;
  period: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a report view so the JPEG export always carries the official header:
 * report title, period, institution logo (from Theme & Branding) and print timestamp.
 */
export const ExportableReportFrame = forwardRef<HTMLDivElement, ExportableReportFrameProps>(
  function ExportableReportFrame({ title, subtitle, period, children, className }, ref) {
    return (
      <div ref={ref} className={cn("panel overflow-hidden", className)}>
        <div className="h-1.5 bg-gradient-progress" />
        <header className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-4 sm:px-6">
          <PegadaianLogo className="h-9" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow">PT Pegadaian · Kantor Wilayah Manado</div>
            <h2 className="truncate font-display text-lg font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <dl className="grid gap-0.5 text-right text-xs">
            <div>
              <dt className="inline text-muted-foreground">Periode </dt>
              <dd className="inline font-semibold tabular-nums">{period}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Dicetak </dt>
              <dd className="inline tabular-nums">{printedAt()}</dd>
            </div>
          </dl>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    );
  },
);
