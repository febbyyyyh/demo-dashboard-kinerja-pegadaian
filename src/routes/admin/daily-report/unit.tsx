import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

import { AchievementBar } from "@/components/fk/report/AchievementBar";
import { useDailyReport } from "@/components/fk/report/DailyReportContext";
import { ExportableReportFrame } from "@/components/fk/report/ExportableReportFrame";
import { ReportEmptyState } from "@/components/fk/report/ReportEmptyState";
import { ReportToolbar } from "@/components/fk/report/ReportToolbar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCompact,
  formatMetricValue,
  metricsForView,
  metricTarget,
  unitScore,
} from "@/lib/formkanwil/daily-report";
import { exportNodeJpeg, exportTableCsv, exportTablePdf } from "@/lib/formkanwil/report-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report/unit")({
  head: () => ({
    meta: [
      { title: "Kinerja Unit — Daily Report FormKanwil" },
      { name: "description", content: "Perbandingan dan leaderboard kinerja unit Pegadaian Kanwil Manado." },
      { property: "og:title", content: "Kinerja Unit — Daily Report FormKanwil" },
      { property: "og:description", content: "Grafik perbandingan dan leaderboard kinerja unit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnitView,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function shortName(unit: string) {
  return unit.replace(/^\d+\s*-\s*/, "").replace(/^UPC\s+/i, "");
}

function UnitView() {
  const { db, rows, days, periodLabel, ready } = useDailyReport();
  const frameRef = useRef<HTMLDivElement>(null);
  const metrics = metricsForView(db.dailyReport, "unit");
  const [metricId, setMetricId] = useState<string | null>(null);
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const leaderboard = useMemo(
    () =>
      rows
        .map((row) => ({ row, score: unitScore(row, metrics, days) }))
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [rows, metrics, days],
  );

  if (!ready) return <ReportEmptyState />;

  const chartData = metric
    ? rows
        .map((row) => ({ name: shortName(row.unit), value: row.values[metric.id] ?? 0 }))
        .sort((a, b) => b.value - a.value)
    : [];
  const perUnitTarget = metric ? metricTarget(metric, 1, days) : null;
  const chartConfig = { value: { label: metric?.name ?? "Nilai", color: "var(--primary)" } } satisfies ChartConfig;

  const title = `${db.dailyReport.title} — Kinerja Unit`;
  const filename = `daily-report-kinerja-unit-${format(new Date(), "yyyyMMdd-HHmm")}`;
  const table = {
    filename,
    title,
    period: periodLabel,
    columns: ["Peringkat", "Unit / UPC", "Cabang", "Area", "Skor capaian %", ...metrics.map((m) => `${m.name} (${m.unit})`)],
    rows: leaderboard.map(({ row, score }, index) => [
      String(index + 1),
      row.unit,
      row.branch,
      row.area,
      score === null ? "" : String(Math.round(score)),
      ...metrics.map((m) => {
        const value = row.values[m.id] ?? null;
        return value === null ? "" : String(Math.round(value * 100) / 100);
      }),
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
      >
        {metric && (
          <Select value={metric.id} onValueChange={setMetricId}>
            <SelectTrigger className="h-9 w-52 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  Grafik: {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </ReportToolbar>

      <ExportableReportFrame ref={frameRef} title={title} period={periodLabel} subtitle="Skor = rata-rata capaian (%) terhadap target harian per unit">
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">{metric?.name ?? "Perbandingan unit"}</h3>
              {perUnitTarget !== null && metric && (
                <span className="pill bg-mint-soft text-mint-foreground">
                  Target/unit {formatCompact(perUnitTarget, metric.unit)}
                </span>
              )}
            </div>
            {chartData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Belum ada data unit.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 40 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} height={60} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} width={64} fontSize={11} tickFormatter={(v: number) => formatCompact(v, "")} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatMetricValue(Number(value), metric?.unit ?? "")} />}
                  />
                  {perUnitTarget !== null && (
                    <ReferenceLine y={perUnitTarget} ifOverflow="extendDomain" stroke="var(--primary-glow)" strokeDasharray="6 4" strokeWidth={2} />
                  )}
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index < 3 ? "var(--primary-deep)" : "var(--primary)"}
                        fillOpacity={index < 3 ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </section>

          <section className="rounded-2xl border border-border p-4">
            <h3 className="mb-3 font-display text-base font-bold">Leaderboard unit</h3>
            <ol className="space-y-2">
              {leaderboard.map(({ row, score }, index) => (
                <li
                  key={row.unit}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2",
                    index === 0 ? "bg-gradient-hero-card text-on-hero" : index < 3 ? "bg-mint-soft" : "",
                  )}
                >
                  <span className="grid w-7 shrink-0 place-items-center text-sm font-bold tabular-nums">
                    {MEDALS[index] ?? index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{shortName(row.unit)}</span>
                    <span className={cn("block truncate text-xs", index === 0 ? "text-on-hero-muted" : "text-muted-foreground")}>
                      {row.branch} · {row.submissions} laporan
                    </span>
                    <AchievementBar percent={score} className={cn("mt-1.5 h-1.5", index === 0 && "bg-on-hero/20")} />
                  </span>
                  <span className="w-12 text-right font-display text-sm font-extrabold tabular-nums">
                    {score === null ? "–" : `${Math.round(score)}%`}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ExportableReportFrame>
    </div>
  );
}
