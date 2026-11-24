import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BarChart3, CalendarClock, CloudUpload, FileText, PencilRuler, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { SemiGauge } from "@/components/fk/Gauge";
import { KpiCard } from "@/components/fk/KpiCard";
import { EmptyState } from "@/components/fk/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { dailyInputProgress, dayKey } from "@/lib/formkanwil/daily-report";
import { useQuickActions } from "@/components/fk/AdminTopbar";
import { getFormStatus, nextScheduledRun } from "@/lib/formkanwil/logic";
import { repository } from "@/lib/formkanwil/repository";
import { useCurrentUser, useDb } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard Overview — FormKanwil" },
      {
        name: "description",
        content: "Ringkasan jawaban, status form, Daily Report harian, dan backup FormKanwil Kanwil Manado.",
      },
      { property: "og:title", content: "Dashboard Overview — FormKanwil" },
      { property: "og:description", content: "Ringkasan jawaban, form, dan Daily Report Kanwil Manado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const ALL = "__all";
const RANGES = [7, 14, 30] as const;

const chartConfig = {
  jawaban: { label: "Jawaban", color: "var(--primary)" },
  kosong: { label: "Hari kosong", color: "var(--primary-glow)" },
} satisfies ChartConfig;

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function Dashboard() {
  const db = useDb();
  const user = useCurrentUser();
  const actions = useQuickActions();
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [formFilter, setFormFilter] = useState(ALL);
  const now = new Date();

  const counts = {
    total: db.forms.length,
    active: db.forms.filter((f) => getFormStatus(f) === "active").length,
    draft: db.forms.filter((f) => getFormStatus(f) === "draft").length,
    closed: db.forms.filter((f) => getFormStatus(f) === "closed").length,
  };

  const trend = useMemo(() => {
    const week = (offset: number) =>
      db.responses.filter((r) => {
        const age = (Date.now() - new Date(r.submittedAt).getTime()) / 86_400_000;
        return age >= offset && age < offset + 7;
      }).length;
    const current = week(0);
    const previous = week(7);
    return { current, value: previous === 0 ? (current > 0 ? 100 : null) : ((current - previous) / previous) * 100 };
  }, [db.responses]);

  const series = useMemo(() => {
    const responses = db.responses.filter((r) => formFilter === ALL || r.formId === formFilter);
    const byDay = new Map<string, number>();
    for (const response of responses) {
      const key = dayKey(response.submittedAt);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const days = Array.from({ length: range }, (_, index) => subDays(new Date(), range - 1 - index));
    const values = days.map((day) => byDay.get(format(day, "yyyy-MM-dd")) ?? 0);
    const active = values.filter((value) => value > 0);
    const baseline = active.length ? Math.max(1, Math.round(active.reduce((a, b) => a + b, 0) / active.length)) : 1;
    return {
      total: values.reduce((a, b) => a + b, 0),
      data: days.map((day, index) => ({
        label: format(day, range > 14 ? "d/M" : "EEE d", { locale: localeId }),
        jawaban: values[index] ?? 0,
        kosong: values[index] ? 0 : baseline,
      })),
    };
  }, [db.responses, formFilter, range]);

  const today = format(now, "yyyy-MM-dd");
  const progress = dailyInputProgress(db, today);
  const recentForms = [...db.forms].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const nextBackup = nextScheduledRun(db.dailyReport.backupTime, now);
  const lastBackup = db.backups[0];

  function syncNow() {
    repository.integrations.syncSheets();
    const log = repository.integrations.triggerBackup("manual");
    toast.success("Sinkronisasi selesai", {
      description: `Snapshot ${(log.sizeBytes / 1024).toFixed(1)} KB disimpan.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(now, "EEEE, d MMMM yyyy", { locale: localeId })}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            {greeting(now)}, {user?.name.split(" ")[0] ?? "Admin"} 👋
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/daily-report/indikator">
              <BarChart3 /> Buka Daily Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Row 1 — KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hero
          label="Total Jawaban Masuk"
          value={db.responses.length.toLocaleString("id-ID")}
          trend={trend.value}
          hint={<span>{trend.current} jawaban 7 hari terakhir</span>}
          to={{ to: "/admin/forms" }}
        />
        <KpiCard label="Total Form" value={counts.total} hint={`${counts.closed} ditutup`} to={{ to: "/admin/forms" }} />
        <KpiCard label="Form Aktif" value={counts.active} hint="Bisa diisi responden" to={{ to: "/admin/forms" }} />
        <KpiCard label="Form Draft" value={counts.draft} hint="Belum dipublikasikan" to={{ to: "/admin/forms" }} />
      </div>

      {/* Row 2 — chart + daily report */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight">Jawaban per Hari</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{series.total}</span> jawaban dalam {range} hari · arsir = hari tanpa jawaban
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="h-9 w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua form</SelectItem>
                  {db.forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.emoji} {form.title || "Tanpa judul"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex rounded-xl border border-border bg-muted p-0.5">
                {RANGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    className={
                      value === range
                        ? "rounded-lg bg-card px-3 py-1 text-xs font-bold shadow-card"
                        : "rounded-lg px-3 py-1 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {value}H
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-64 w-full">
            <BarChart data={series.data} margin={{ left: -16, right: 4, top: 8 }}>
              <defs>
                <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" style={{ fill: "var(--mint-soft)" }} />
                  <line x1="0" y1="0" x2="0" y2="6" strokeWidth="3" style={{ stroke: "var(--mint)" }} />
                </pattern>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={range > 14 ? 3 : 0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip cursor={{ fill: "var(--mint-soft)" }} content={<ChartTooltipContent hideIndicator />} />
              <Bar dataKey="jawaban" stackId="a" fill="var(--color-jawaban)" radius={[8, 8, 8, 8]} maxBarSize={36} />
              <Bar dataKey="kosong" stackId="a" fill="url(#hatch)" radius={[8, 8, 8, 8]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        </section>

        <section className="panel flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight">Daily Report Hari Ini</h2>
              <p className="text-sm text-muted-foreground">Capaian input unit</p>
            </div>
            <Badge variant="feed">{format(now, "d MMM", { locale: localeId })}</Badge>
          </div>
          {progress.total === 0 ? (
            <div className="my-auto py-6 text-center text-sm text-muted-foreground">
              Belum ada form feeding dengan daftar UPC.
              <div className="mt-3">
                <Button asChild size="sm" variant="secondary">
                  <Link to="/admin/daily-report/config">Atur Daily Report</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <SemiGauge value={progress.reported} max={progress.total} label={`${progress.reported} dari ${progress.total} unit melapor`} />
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Belum melapor</span>
                  <span className="tabular-nums text-muted-foreground">{progress.missing.length} unit</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {progress.missing.slice(0, 6).map((unit) => (
                    <span key={unit.unit} className="pill bg-warning-soft text-gold-foreground">
                      {unit.unit.replace(/^\d+\s*-\s*/, "")}
                    </span>
                  ))}
                  {progress.missing.length > 6 && (
                    <span className="pill bg-muted text-muted-foreground">+{progress.missing.length - 6}</span>
                  )}
                  {progress.missing.length === 0 && (
                    <span className="pill bg-mint-soft text-mint-foreground">Semua unit sudah input 🎉</span>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-auto self-start">
                <Link to="/admin/daily-report/indikator">Lihat Kartu Indikator</Link>
              </Button>
            </>
          )}
        </section>
      </div>

      {/* Row 3 — forms + backup */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight">Form Terbaru & Status Feeding</h2>
              <p className="text-sm text-muted-foreground">Aktifkan, buka builder, atau lihat jawaban.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/forms">Semua form</Link>
            </Button>
          </div>
          {recentForms.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="Belum ada form"
              description="Buat form pertama atau impor daftar UPC dari menu atas."
              action={<Button onClick={actions.createForm}>Buat form</Button>}
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentForms.map((form) => {
                const count = db.responses.filter((r) => r.formId === form.id).length;
                return (
                  <li key={form.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-lg">{form.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{form.title || "Form tanpa judul"}</span>
                        {form.feedingSlot && <Badge variant="feed">Feed {form.feedingSlot}</Badge>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono font-semibold tracking-wider text-foreground">{form.code}</span>
                        <span className="tabular-nums">{count} jawaban</span>
                        <span>· diubah {formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true, locale: localeId })}</span>
                      </div>
                    </div>
                    <Switch
                      checked={form.active}
                      onCheckedChange={(active) => {
                        repository.forms.setActive(form.id, active);
                        toast.success(active ? "Form diaktifkan" : "Form dinonaktifkan");
                      }}
                      aria-label={form.active ? "Nonaktifkan form" : "Aktifkan form"}
                    />
                    <div className="flex gap-1">
                      <Button asChild variant="ghost" size="iconSm" aria-label="Builder">
                        <Link to="/admin/forms/$formId" params={{ formId: form.id }}>
                          <PencilRuler />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="iconSm" aria-label="Jawaban">
                        <Link to="/admin/forms/$formId/jawaban" params={{ formId: form.id }}>
                          <FileText />
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-hero-card p-5 text-on-hero shadow-brand">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-on-hero/15">
              <CloudUpload className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-tight">Backup & Sync</h2>
              <p className="text-xs text-on-hero-muted">Google Sheets · Drive · Storage</p>
            </div>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-on-hero-muted">
                <CalendarClock className="size-3.5" /> Backup berikutnya
              </dt>
              <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                {format(nextBackup, "HH:mm")}{" "}
                <span className="text-sm font-semibold text-on-hero-muted">
                  {format(nextBackup, "EEEE", { locale: localeId })}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-hero-muted">Backup terakhir</dt>
              <dd className="mt-1 font-semibold">
                {lastBackup
                  ? formatDistanceToNow(new Date(lastBackup.at), { addSuffix: true, locale: localeId })
                  : "Belum pernah"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-2 pt-2 xl:mt-auto">
            <Button variant="onHero" size="sm" onClick={syncNow}>
              <RefreshCw /> Sync Now
            </Button>
            <Button asChild variant="onHeroGhost" size="sm">
              <Link to="/admin/settings/integrasi">Riwayat</Link>
            </Button>
          </div>
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border-[24px] border-on-hero/10" />
        </section>
      </div>
    </div>
  );
}
