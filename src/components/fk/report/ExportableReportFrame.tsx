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
      <div ref={ref} className={cn("@container panel overflow-hidden", className)}>
        <div className="h-1.5 bg-gradient-progress" />
        <header
          data-export-header="true"
          className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-4 sm:px-6 sm:py-4"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <PegadaianLogo className="h-8 shrink-0 sm:h-9" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow leading-snug">Dashboard Kinerja Regional · Demo Portofolio</div>
              <h2 className="mt-0.5 break-words font-display text-base font-extrabold leading-snug tracking-tight sm:text-lg">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <dl
            data-export-meta="true"
            className="grid shrink-0 gap-0.5 border-t border-border/60 pt-2 text-left text-[11px] @2xl:border-t-0 @2xl:pt-0 @2xl:text-right sm:text-xs"
          >
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
        <div className="p-3.5 sm:p-6">{children}</div>
      </div>
    );
  },
);
