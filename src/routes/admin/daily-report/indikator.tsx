import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Target, Users } from "lucide-react";

import { AchievementBar, AchievementPill, achievementTone } from "@/components/fk/report/AchievementBar";
import { useDailyReport } from "@/components/fk/report/DailyReportContext";
import { ExportableReportFrame } from "@/components/fk/report/ExportableReportFrame";
import { ReportEmptyState } from "@/components/fk/report/ReportEmptyState";
import { ReportToolbar } from "@/components/fk/report/ReportToolbar";
import {
  achievement,
  AGGREGATION_LABEL,
  formatCompact,
  formatMetricValue,
  metricsForView,
  metricTarget,
  summarizeRows,
} from "@/lib/formkanwil/daily-report";
import { exportNodeJpeg, exportTableCsv, exportTablePdf } from "@/lib/formkanwil/report-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report/indikator")({
  head: () => ({
    meta: [
      { title: "Kartu Indikator — Daily Report FormKanwil" },
      { name: "description", content: "Kartu metrik harian Daily Report Pegadaian Kanwil Manado." },
      { property: "og:title", content: "Kartu Indikator — Daily Report FormKanwil" },
      { property: "og:description", content: "Kartu metrik harian Daily Report Kanwil Manado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndicatorView,
});

function IndicatorView() {
  const { db, rows, days, periodLabel, ready } = useDailyReport();
  const frameRef = useRef<HTMLDivElement>(null);
  if (!ready) return <ReportEmptyState />;

  const metrics = metricsForView(db.dailyReport, "indicator");
  const total = summarizeRows("total", rows, metrics);
  const cards = metrics.map((metric) => {
    const value = total.values[metric.id] ?? null;
    const target = metricTarget(metric, rows.length, days);
    return { metric, value, target, percent: achievement(value, target) };
  });
  const title = `${db.dailyReport.title} — Kartu Indikator`;
  const filename = `daily-report-indikator-${format(new Date(), "yyyyMMdd-HHmm")}`;
  const table = {
    filename,
    title,
    period: periodLabel,
    columns: ["Metrik", "Capaian", "Satuan", "Target", "Capaian %", "Agregasi"],
    rows: cards.map(({ metric, value, target, percent }) => [
      metric.name,
      value === null ? "" : String(Math.round(value * 100) / 100),
      metric.unit,
      target === null ? "" : String(target),
      percent === null ? "" : `${Math.round(percent)}%`,
      AGGREGATION_LABEL[metric.aggregation],
    ]),
  };

  return (
    <div className="space-y-4">
      <ReportToolbar
        onExportJpeg={async () => {
          if (frameRef.current) await exportNodeJpeg(frameRef.current, filename);
        }}
        onExportCsv={() => exportTableCsv(table)}
        onExportPdf={() => exportTablePdf(table)}
      />
      <ExportableReportFrame
        ref={frameRef}
        title={title}
        subtitle={`${total.reportingUnits} dari ${total.units} unit melapor`}
        period={periodLabel}
      >
        {cards.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Belum ada metrik yang dicentang untuk Kartu Indikator.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ metric, value, target, percent }) => {
              const tone = achievementTone(percent);
              return (
                <article
                  key={metric.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-5",
                    tone === "great"
                      ? "border-transparent bg-gradient-hero-card text-on-hero"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={cn("text-sm font-semibold", tone === "great" ? "text-on-hero-muted" : "text-muted-foreground")}>
                        {metric.name}
                      </div>
                      <div className="mt-2 font-display text-3xl font-extrabold tabular-nums tracking-tight">
                        {formatCompact(value, metric.unit)}
                      </div>
                    </div>
                    <AchievementPill percent={percent} />
                  </div>
                  <AchievementBar percent={percent} className={cn("mt-5", tone === "great" && "bg-on-hero/20")} />
                  <div className={cn("mt-3 flex items-center justify-between text-xs", tone === "great" ? "text-on-hero-muted" : "text-muted-foreground")}>
                    <span className="inline-flex items-center gap-1">
                      <Target className="size-3.5" />
                      {target === null ? "Tanpa target" : `Target ${formatCompact(target, metric.unit)}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" /> {AGGREGATION_LABEL[metric.aggregation]}
                    </span>
                  </div>
                  <div className="sr-only">{formatMetricValue(value, metric.unit)}</div>
                </article>
              );
            })}
          </div>
        )}
      </ExportableReportFrame>
    </div>
  );
}
