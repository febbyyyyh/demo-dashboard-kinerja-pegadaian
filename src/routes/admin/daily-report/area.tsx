import { Fragment, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";

import { useDailyReport } from "@/components/fk/report/DailyReportContext";
import { ExportableReportFrame } from "@/components/fk/report/ExportableReportFrame";
import { ReportEmptyState } from "@/components/fk/report/ReportEmptyState";
import { ReportToolbar } from "@/components/fk/report/ReportToolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatMetricValue,
  groupUnitRows,
  metricsForView,
  summarizeRows,
  type GroupRow,
} from "@/lib/formkanwil/daily-report";
import { exportNodeJpeg, exportTableCsv, exportTablePdf } from "@/lib/formkanwil/report-export";
import type { DailyMetric } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report/area")({
  head: () => ({
    meta: [
      { title: "Rekap Area — Daily Report FormKanwil" },
      { name: "description", content: "Rekapitulasi Daily Report per area dengan subtotal dan grand total." },
      { property: "og:title", content: "Rekap Area — Daily Report FormKanwil" },
      { property: "og:description", content: "Rekap Daily Report per area, cabang, subtotal, dan grand total." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaView,
});

function raw(value: number | null) {
  return value === null ? "" : String(Math.round(value * 100) / 100);
}

function GroupCells({ row, metrics }: { row: GroupRow; metrics: DailyMetric[] }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {row.reportingUnits}/{row.units}
      </TableCell>
      {metrics.map((metric) => (
        <TableCell key={metric.id} className="text-right tabular-nums">
          {formatMetricValue(row.values[metric.id] ?? null, metric.unit)}
        </TableCell>
      ))}
    </>
  );
}

function AreaView() {
  const { db, rows, periodLabel, ready } = useDailyReport();
  const frameRef = useRef<HTMLDivElement>(null);
  if (!ready) return <ReportEmptyState />;

  const metrics = metricsForView(db.dailyReport, "area");
  const areas = groupUnitRows(rows, metrics, "area").map((area) => ({
    area,
    branches: groupUnitRows(
      rows.filter((row) => row.area === area.area),
      metrics,
      "branch",
    ),
  }));
  const total = summarizeRows("total", rows, metrics);
  const title = `${db.dailyReport.title} — Rekap Area`;
  const filename = `daily-report-area-${format(new Date(), "yyyyMMdd-HHmm")}`;
  const table = {
    filename,
    title,
    period: periodLabel,
    columns: ["Area", "Cabang", "Unit melapor", ...metrics.map((m) => `${m.name} (${m.unit})`)],
    rows: [
      ...areas.flatMap(({ area, branches }) => [
        ...branches.map((branch) => [
          area.area,
          branch.branch ?? "",
          `${branch.reportingUnits}/${branch.units}`,
          ...metrics.map((m) => raw(branch.values[m.id] ?? null)),
        ]),
        [
          `Subtotal ${area.area}`,
          "",
          `${area.reportingUnits}/${area.units}`,
          ...metrics.map((m) => raw(area.values[m.id] ?? null)),
        ],
      ]),
      ["Grand Total", "", `${total.reportingUnits}/${total.units}`, ...metrics.map((m) => raw(total.values[m.id] ?? null))],
    ],
  };

  return (
    <div className="space-y-4">
      <ReportToolbar
        showBranch={false}
        onExportJpeg={async () => {
          if (frameRef.current) await exportNodeJpeg(frameRef.current, filename);
        }}
        onExportCsv={() => exportTableCsv(table)}
        onExportPdf={() => exportTablePdf(table)}
      />
      <ExportableReportFrame ref={frameRef} title={title} period={periodLabel} subtitle={`${areas.length} area · ${total.units} unit`}>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="min-w-44">Area / Cabang</TableHead>
                <TableHead className="text-right">Unit melapor</TableHead>
                {metrics.map((metric) => (
                  <TableHead key={metric.id} className="whitespace-nowrap text-right">
                    {metric.name}
                    <span className="ml-1 font-normal text-muted-foreground">({metric.unit})</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map(({ area, branches }) => (
                <Fragment key={area.key}>
                  <TableRow className="bg-mint-soft/50 hover:bg-mint-soft/50">
                    <TableCell colSpan={2 + metrics.length} className="py-2 text-xs font-bold uppercase tracking-wide text-mint-foreground">
                      {area.area}
                    </TableCell>
                  </TableRow>
                  {branches.map((branch) => (
                    <TableRow key={branch.key}>
                      <TableCell className="pl-6">{branch.branch}</TableCell>
                      <GroupCells row={branch} metrics={metrics} />
                    </TableRow>
                  ))}
                  <TableRow className="border-b-2 font-semibold">
                    <TableCell className="pl-6 text-mint-foreground">Subtotal {area.area}</TableCell>
                    <GroupCells row={area} metrics={metrics} />
                  </TableRow>
                </Fragment>
              ))}
              <TableRow className={cn("bg-primary font-bold text-primary-foreground hover:bg-primary")}>
                <TableCell>Grand Total</TableCell>
                <GroupCells row={total} metrics={metrics} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </ExportableReportFrame>
    </div>
  );
}
