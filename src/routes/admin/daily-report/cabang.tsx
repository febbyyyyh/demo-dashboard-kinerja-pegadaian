import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";

import { useDailyReport } from "@/components/fk/report/DailyReportContext";
import { ExportableReportFrame } from "@/components/fk/report/ExportableReportFrame";
import { ReportEmptyState } from "@/components/fk/report/ReportEmptyState";
import { ReportToolbar } from "@/components/fk/report/ReportToolbar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMetricValue, metricsForView } from "@/lib/formkanwil/daily-report";
import { exportNodeJpeg, exportTableCsv, exportTablePdf } from "@/lib/formkanwil/report-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report/cabang")({
  head: () => ({
    meta: [
      { title: "Rekap Cabang — Daily Report FormKanwil" },
      { name: "description", content: "Detail Daily Report per cabang dan UPC dengan highlight performa." },
      { property: "og:title", content: "Rekap Cabang — Daily Report FormKanwil" },
      { property: "og:description", content: "Detail Daily Report per cabang dan UPC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BranchView,
});

function BranchView() {
  const { db, rows, periodLabel, ready } = useDailyReport();
  const frameRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const metrics = metricsForView(db.dailyReport, "branch");
  const [sortId, setSortId] = useState<string | null>(null);
  const sortMetric = metrics.find((m) => m.id === sortId) ?? metrics[0];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (row) => !q || `${row.unit} ${row.branch} ${row.area}`.toLowerCase().includes(q),
    );
    if (!sortMetric) return filtered;
    return [...filtered].sort(
      (a, b) => (b.values[sortMetric.id] ?? -Infinity) - (a.values[sortMetric.id] ?? -Infinity),
    );
  }, [rows, query, sortMetric]);

  if (!ready) return <ReportEmptyState />;

  const ranked = sortMetric ? visible.filter((row) => row.values[sortMetric.id] !== null) : [];
  const top = ranked[0]?.unit;
  const bottom = ranked.length > 1 ? ranked.at(-1)?.unit : undefined;

  const title = `${db.dailyReport.title} — Rekap Cabang`;
  const filename = `daily-report-cabang-${format(new Date(), "yyyyMMdd-HHmm")}`;
  const table = {
    filename,
    title,
    period: periodLabel,
    columns: ["Unit / UPC", "Cabang", "Area", "Laporan", ...metrics.map((m) => `${m.name} (${m.unit})`)],
    rows: visible.map((row) => [
      row.unit,
      row.branch,
      row.area,
      String(row.submissions),
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari UPC / cabang…"
            className="h-9 w-52 rounded-xl pl-9"
          />
        </div>
        {metrics.length > 0 && sortMetric && (
          <Select value={sortMetric.id} onValueChange={setSortId}>
            <SelectTrigger className="h-9 w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.id}>
                  Urutkan: {metric.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </ReportToolbar>

      <ExportableReportFrame ref={frameRef} title={title} period={periodLabel} subtitle={`${visible.length} unit ditampilkan`}>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="w-10 text-right">#</TableHead>
                <TableHead className="min-w-52">Unit / UPC</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">Laporan</TableHead>
                {metrics.map((metric) => (
                  <TableHead
                    key={metric.id}
                    className={cn(
                      "whitespace-nowrap text-right",
                      metric.id === sortMetric?.id && "text-primary",
                    )}
                  >
                    {metric.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + metrics.length} className="py-10 text-center text-muted-foreground">
                    Tidak ada unit yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row, index) => {
                  const isTop = row.unit === top;
                  const isBottom = row.unit === bottom;
                  return (
                    <TableRow
                      key={row.unit}
                      className={cn(isTop && "bg-mint-soft/70", isBottom && "bg-warning-soft/60")}
                    >
                      <TableCell className="text-right tabular-nums text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          {row.unit}
                          {isTop && (
                            <span className="pill bg-primary text-primary-foreground">
                              <ArrowUpRight className="size-3" /> Tertinggi
                            </span>
                          )}
                          {isBottom && (
                            <span className="pill bg-warning-soft text-gold-foreground">
                              <ArrowDownRight className="size-3" /> Terendah
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.branch}</TableCell>
                      <TableCell className="text-muted-foreground">{row.area}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.submissions}</TableCell>
                      {metrics.map((metric) => (
                        <TableCell
                          key={metric.id}
                          className={cn(
                            "text-right tabular-nums",
                            metric.id === sortMetric?.id && "font-semibold",
                          )}
                        >
                          {formatMetricValue(row.values[metric.id] ?? null, metric.unit)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ExportableReportFrame>
    </div>
  );
}
