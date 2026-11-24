import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Building2, Gauge, Map, SlidersHorizontal, Trophy } from "lucide-react";

import { DailyReportProvider, useDailyReport } from "@/components/fk/report/DailyReportContext";
import { PageTitle } from "@/components/fk/StatCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report")({
  component: DailyReportLayout,
});

const VIEWS = [
  { to: "/admin/daily-report/indikator", label: "Kartu Indikator", icon: Gauge },
  { to: "/admin/daily-report/area", label: "Rekap Area", icon: Map },
  { to: "/admin/daily-report/cabang", label: "Rekap Cabang", icon: Building2 },
  { to: "/admin/daily-report/unit", label: "Kinerja Unit", icon: Trophy },
] as const;

function DailyReportLayout() {
  return (
    <DailyReportProvider>
      <DailyReportShell />
    </DailyReportProvider>
  );
}

function DailyReportShell() {
  const { db, feeding } = useDailyReport();
  const { pathname } = useLocation();
  const isConfig = pathname.startsWith("/admin/daily-report/config");

  return (
    <div className="space-y-5">
      <PageTitle
        title={isConfig ? "Konfigurasi Daily Report" : db.dailyReport.title}
        subtitle={
          isConfig
            ? "Atur form feeding, pemetaan unit, metrik, dan jadwal backup."
            : [feeding[1], feeding[2]]
                .map((form, index) => (form ? `Feed ${index + 1}: ${form.title}` : null))
                .filter(Boolean)
                .join(" · ") || "Belum ada form feeding."
        }
        action={
          !isConfig && (
            <Button asChild variant="outline">
              <Link to="/admin/daily-report/config">
                <SlidersHorizontal /> Konfigurasi
              </Link>
            </Button>
          )
        }
      />
      {!isConfig && (
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1 shadow-card">
          {VIEWS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-mint-soft hover:text-mint-foreground",
                "data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=active]:shadow-brand",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
      )}
      <Outlet />
    </div>
  );
}
