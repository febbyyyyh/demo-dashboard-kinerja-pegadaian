import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Building2,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Lock,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { useAdminAccess } from "@/components/fk/access/AdminAccess";
import { ExportableReportFrame } from "@/components/fk/report/ExportableReportFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ALL_AREAS,
  ALL_BRANCHES,
  ALL_UNITS,
  buildKinerjaSnapshot,
  formatKinerjaNumber,
  getBranchesForArea,
  getKinerjaPage,
  getUnitsForFilter,
  KINERJA_AREAS,
  KINERJA_PERIODS,
  KINERJA_STATUS_LABEL,
  KINERJA_STATUS_RANGE,
  resolvePotensiAccess,
  type KinerjaBreakdownLevel,
  type KinerjaStatus,
} from "@/lib/formkanwil/kinerja";
import { auth, DEMO_AREA_PASSWORD } from "@/lib/formkanwil/auth";
import { exportNodeJpeg, exportTableCsv, exportTablePdf } from "@/lib/formkanwil/report-export";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  realisasi: { label: "Realisasi", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--gold)" },
} satisfies ChartConfig;

const BREAKDOWN_META: Record<KinerjaBreakdownLevel, { label: string; heading: string; barTitle: string; unitWord: string }> = {
  area: {
    label: "Rincian per Area",
    heading: "Rincian per Area",
    barTitle: "Pencapaian per area",
    unitWord: "area",
  },
  cabang: {
    label: "Rincian per Cabang",
    heading: "Rincian per Cabang",
    barTitle: "Pencapaian per cabang",
    unitWord: "cabang",
  },
  unit: {
    label: "Rincian per Unit",
    heading: "Rincian per Unit",
    barTitle: "Pencapaian per unit",
    unitWord: "unit",
  },
};

function StatusPill({ status }: { status: KinerjaStatus }) {
  return (
    <span
      title={`${KINERJA_STATUS_LABEL[status]} (${KINERJA_STATUS_RANGE[status]})`}
      className={cn(
        "pill px-2.5 py-0.5 text-xs font-semibold",
        status === "melampaui" && "bg-primary text-primary-foreground",
        status === "tercapai" && "bg-mint-soft text-mint-foreground",
        status === "peningkatan" && "bg-gold-soft text-gold-foreground",
        status === "belum" && "bg-destructive-soft text-destructive-foreground",
      )}
    >
      {KINERJA_STATUS_LABEL[status]}
    </span>
  );
}

export function KinerjaDashboardView({ slug }: { slug: string }) {
  const page = getKinerjaPage(slug);
  const { user, isAdmin, openLogin } = useAdminAccess();
  const frameRef = useRef<HTMLDivElement>(null);

  const potensiPolicy = useMemo(
    () => (page.groupRestricted ? resolvePotensiAccess(user) : { allowed: true, lockedArea: null }),
    [page.groupRestricted, user],
  );
  const lockedArea = potensiPolicy.lockedArea;

  // Draft & applied cascading filters: Periode -> Area -> Cabang -> Unit
  const [draftPeriod, setDraftPeriod] = useState<string>(KINERJA_PERIODS[0]);
  const [draftArea, setDraftArea] = useState<string>(lockedArea ?? ALL_AREAS);
  const [draftBranch, setDraftBranch] = useState<string>(ALL_BRANCHES);
  const [draftUnit, setDraftUnit] = useState<string>(ALL_UNITS);

  const [applied, setApplied] = useState({
    period: KINERJA_PERIODS[0] as string,
    area: (lockedArea ?? ALL_AREAS) as string,
    branch: ALL_BRANCHES,
    unit: ALL_UNITS,
  });

  // Breakdown selector: Area / Cabang / Unit
  const [breakdownMode, setBreakdownMode] = useState<KinerjaBreakdownLevel>(
    lockedArea ? "cabang" : "area",
  );

  useEffect(() => {
    if (lockedArea) {
      setDraftArea(lockedArea);
      setDraftBranch(ALL_BRANCHES);
      setDraftUnit(ALL_UNITS);
      setApplied((prev) => ({
        ...prev,
        area: lockedArea,
        branch: ALL_BRANCHES,
        unit: ALL_UNITS,
      }));
      setBreakdownMode("cabang");
    }
  }, [lockedArea]);

  useEffect(() => {
    if (applied.unit !== ALL_UNITS) {
      setBreakdownMode("unit");
    } else if (applied.branch !== ALL_BRANCHES && breakdownMode === "area") {
      setBreakdownMode("cabang");
    }
  }, [applied.unit, applied.branch, breakdownMode]);

  const effectiveDraftArea = lockedArea ?? draftArea;
  const availableBranches = useMemo(() => getBranchesForArea(effectiveDraftArea), [effectiveDraftArea]);
  useEffect(() => {
    if (draftBranch !== ALL_BRANCHES && !availableBranches.includes(draftBranch)) {
      setDraftBranch(ALL_BRANCHES);
    }
  }, [availableBranches, draftBranch]);

  const effectiveDraftBranch =
    draftBranch !== ALL_BRANCHES && availableBranches.includes(draftBranch)
      ? draftBranch
      : ALL_BRANCHES;
  const availableUnits = useMemo(
    () => getUnitsForFilter(effectiveDraftArea, effectiveDraftBranch),
    [effectiveDraftArea, effectiveDraftBranch],
  );
  useEffect(() => {
    if (draftUnit !== ALL_UNITS && !availableUnits.includes(draftUnit)) {
      setDraftUnit(ALL_UNITS);
    }
  }, [availableUnits, draftUnit]);

  const effectiveAppliedArea = lockedArea ?? applied.area;

  const snapshot = useMemo(
    () =>
      buildKinerjaSnapshot({
        slug: page.slug,
        period: applied.period,
        area: effectiveAppliedArea,
        branch: applied.branch,
        unit: applied.unit,
        scopedArea: lockedArea,
      }),
    [page.slug, applied.period, effectiveAppliedArea, applied.branch, applied.unit, lockedArea],
  );

  const activeRows =
    breakdownMode === "area"
      ? snapshot.areaRows
      : breakdownMode === "cabang"
        ? snapshot.branchRows
        : snapshot.unitRows;

  const sortedBars = useMemo(
    () => [...activeRows].sort((a, b) => b.achievement - a.achievement),
    [activeRows],
  );

  // Enforce access gate for restricted Potensi Bisnis pages
  if (page.groupRestricted && !potensiPolicy.allowed) {
    async function quickDemoSignIn(username: string, password: string) {
      const result = await auth.signIn({ username, password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Masuk sebagai ${result.user.name}`, {
        description:
          result.user.role === "admin"
            ? "Akses Admin Kanwil aktif (semua wilayah)."
            : `Potensi Bisnis terkunci khusus Area ${result.user.assignedArea}.`,
      });
    }

    return (
      <div className="panel mx-auto my-6 flex max-w-2xl flex-col items-center px-5 py-10 text-center sm:px-8 sm:py-12">
        <span className="grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-foreground">
          <Lock className="size-6" />
        </span>
        <Badge className="mt-4 gap-1.5 rounded-full border-0 bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-foreground hover:bg-gold-soft">
          Potensi Bisnis · Akses Wilayah
        </Badge>
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
          {page.title} Terkunci
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {potensiPolicy.reason === "no_area_assigned"
            ? "Akun Anda belum ditetapkan ke wilayah/area tertentu. Hubungi Admin Kanwil di menu Akun & Akses untuk menetapkan wilayah Anda."
            : "Data Potensi Bisnis bersifat khusus dan hanya dapat diakses sesuai wilayah/area masing-masing. Masuk dengan akun Area Anda atau akun Admin Kanwil."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={openLogin}>
            <ShieldCheck className="size-4" /> Masuk (Input Username &amp; Password)
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Kembali ke Home</Link>
          </Button>
        </div>

        {/* Dummy accounts reference & one-click demo access */}
        <div className="mt-8 w-full rounded-2xl border border-border bg-muted/40 p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Akun Dummy Uji Coba Potensi Bisnis
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Password area: <strong className="text-foreground">{DEMO_AREA_PASSWORD}</strong>
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {KINERJA_AREAS.map((area) => {
              const uname = `area.${area.toLowerCase()}`;
              return (
                <div
                  key={area}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MapPin className="size-3.5 shrink-0 text-primary" /> Area {area}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {uname} / {DEMO_AREA_PASSWORD}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
                    onClick={() => void quickDemoSignIn(uname, DEMO_AREA_PASSWORD)}
                  >
                    Masuk
                  </Button>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/50 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gold-foreground">
                  <ShieldCheck className="size-3.5 shrink-0" /> Admin (Semua Area)
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  admin / Kanwil@2026
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-7 shrink-0 rounded-lg px-2.5 text-xs"
                onClick={() => void quickDemoSignIn("admin", "Kanwil@2026")}
              >
                Masuk
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = BREAKDOWN_META[breakdownMode];

  const isFiltered =
    applied.period !== KINERJA_PERIODS[0] ||
    (!lockedArea && applied.area !== ALL_AREAS) ||
    applied.branch !== ALL_BRANCHES ||
    applied.unit !== ALL_UNITS;

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const targetArea = lockedArea ?? draftArea;
    setApplied({
      period: draftPeriod,
      area: targetArea,
      branch: effectiveDraftBranch,
      unit: draftUnit,
    });
    toast.success("Filter kinerja diterapkan", {
      description: [
        draftPeriod,
        targetArea === ALL_AREAS ? "Semua area" : `Area ${targetArea}`,
        effectiveDraftBranch === ALL_BRANCHES ? null : effectiveDraftBranch,
        draftUnit === ALL_UNITS ? null : draftUnit,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  function resetFilters() {
    const defaultArea = lockedArea ?? ALL_AREAS;
    setDraftPeriod(KINERJA_PERIODS[0]);
    setDraftArea(defaultArea);
    setDraftBranch(ALL_BRANCHES);
    setDraftUnit(ALL_UNITS);
    setApplied({
      period: KINERJA_PERIODS[0],
      area: defaultArea,
      branch: ALL_BRANCHES,
      unit: ALL_UNITS,
    });
  }

  const exportTitle = `${page.title} — ${meta.heading}`;
  const exportFilename = `kinerja-${page.slug}-${breakdownMode}-${format(new Date(), "yyyyMMdd-HHmm")}`;
  const exportPeriod = [
    applied.period,
    effectiveAppliedArea === ALL_AREAS ? "Semua Area" : `Area ${effectiveAppliedArea}`,
    applied.branch === ALL_BRANCHES ? null : applied.branch,
    applied.unit === ALL_UNITS ? null : applied.unit,
  ]
    .filter(Boolean)
    .join(" · ");

  function buildExportTable() {
    if (breakdownMode === "unit") {
      return {
        filename: exportFilename,
        title: exportTitle,
        period: exportPeriod,
        columns: ["Unit", "Cabang", "Area", "Target (Rp miliar)", "Realisasi (Rp miliar)", "Pencapaian (%)", "Status"],
        rows: [
          ...activeRows.map((row) => [
            row.label,
            row.branch ?? "",
            row.area,
            String(row.target),
            String(row.realisasi),
            `${row.achievement}%`,
            KINERJA_STATUS_LABEL[row.status],
          ]),
          [
            "Grand Total",
            `${snapshot.branchRows.length} cabang`,
            `${snapshot.areaRows.length} area`,
            String(snapshot.totals.target),
            String(snapshot.totals.realisasi),
            `${snapshot.totals.achievement}%`,
            KINERJA_STATUS_LABEL[snapshot.totals.status],
          ],
        ],
      };
    }

    if (breakdownMode === "cabang") {
      return {
        filename: exportFilename,
        title: exportTitle,
        period: exportPeriod,
        columns: ["Cabang", "Area", "Target (Rp miliar)", "Realisasi (Rp miliar)", "Pencapaian (%)", "Status"],
        rows: [
          ...activeRows.map((row) => [
            row.label,
            row.area,
            String(row.target),
            String(row.realisasi),
            `${row.achievement}%`,
            KINERJA_STATUS_LABEL[row.status],
          ]),
          [
            "Grand Total",
            `${snapshot.areaRows.length} area`,
            String(snapshot.totals.target),
            String(snapshot.totals.realisasi),
            `${snapshot.totals.achievement}%`,
            KINERJA_STATUS_LABEL[snapshot.totals.status],
          ],
        ],
      };
    }

    return {
      filename: exportFilename,
      title: exportTitle,
      period: exportPeriod,
      columns: ["Area", "Target (Rp miliar)", "Realisasi (Rp miliar)", "Pencapaian (%)", "Status"],
      rows: [
        ...activeRows.map((row) => [
          row.label,
          String(row.target),
          String(row.realisasi),
          `${row.achievement}%`,
          KINERJA_STATUS_LABEL[row.status],
        ]),
        [
          "Grand Total",
          String(snapshot.totals.target),
          String(snapshot.totals.realisasi),
          `${snapshot.totals.achievement}%`,
          KINERJA_STATUS_LABEL[snapshot.totals.status],
        ],
      ],
    };
  }

  return (
    <div className="space-y-5">
      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {page.groupTitle && <p className="eyebrow mb-1 text-primary">{page.groupTitle}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {page.title}
            </h1>
            {page.groupRestricted && (
              <Badge className="gap-1.5 rounded-full border-0 bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-foreground hover:bg-gold-soft">
                <Lock className="size-3" /> Khusus grup user
              </Badge>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{page.description}</p>
        </div>
      </div>

      {/* ── AREA SCOPE BANNER FOR POTENSI BISNIS ───────────────────────────── */}
      {page.groupRestricted && lockedArea && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft/70 px-4 py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-gold-foreground">
            <MapPin className="size-4 shrink-0" />
            <span>
              <strong>Akses Terbatas Wilayah:</strong> Data <strong>{page.title}</strong> dikunci khusus untuk{" "}
              <strong>Area {lockedArea}</strong> sesuai akun Anda ({user?.name}).
            </span>
          </div>
          <span className="pill bg-card text-foreground">Terkunci · {lockedArea}</span>
        </div>
      )}
      {page.groupRestricted && isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-mint-soft/70 px-4 py-2.5 text-xs text-mint-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0" />
            <span>
              <strong>Akses Admin Kanwil:</strong> Anda dapat melihat semua wilayah. Akun per wilayah dapat dikelola di{" "}
              <Link to="/admin/users" className="font-bold underline underline-offset-2">
                Akun &amp; Akses
              </Link>.
            </span>
          </div>
        </div>
      )}

      {/* ── FILTER BAR (PERIODE, AREA, CABANG, UNIT) ───────────────────────── */}
      <form
        onSubmit={applyFilters}
        className="panel grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Periode</label>
          <Select value={draftPeriod} onValueChange={setDraftPeriod}>
            <SelectTrigger className="h-10 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINERJA_PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            Area {lockedArea && <Lock className="size-3 text-gold-foreground" />}
          </label>
          <Select
            value={effectiveDraftArea}
            onValueChange={(value) => {
              if (!lockedArea) setDraftArea(value);
            }}
            disabled={Boolean(lockedArea)}
          >
            <SelectTrigger className="h-10 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!lockedArea && <SelectItem value={ALL_AREAS}>Semua area</SelectItem>}
              {(lockedArea ? [lockedArea] : KINERJA_AREAS).map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Cabang</label>
          <Select value={effectiveDraftBranch} onValueChange={setDraftBranch}>
            <SelectTrigger className="h-10 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BRANCHES}>Semua cabang</SelectItem>
              {availableBranches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Unit</label>
          <Select value={draftUnit} onValueChange={setDraftUnit}>
            <SelectTrigger className="h-10 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_UNITS}>Semua unit</SelectItem>
              {availableUnits.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="h-10 flex-1 rounded-xl px-5 lg:flex-initial">
            <Filter className="size-4" /> Terapkan
          </Button>
          {isFiltered && (
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="h-10 rounded-xl px-3"
              title="Reset filter"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </form>

      {/* ── 4 KPI STAT CARDS ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.stats.map((stat) => (
          <div
            key={stat.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 transition-all card-hover",
              stat.hero
                ? "border-transparent bg-gradient-hero-card text-on-hero shadow-brand"
                : "border-border bg-card text-card-foreground shadow-card",
            )}
          >
            {stat.hero && (
              <span
                aria-hidden
                className="pointer-events-none absolute -right-7 -top-7 size-28 rounded-full border border-gold/70"
              />
            )}
            <div
              className={cn(
                "text-xs font-semibold",
                stat.hero ? "text-on-hero-muted" : "text-muted-foreground",
              )}
            >
              {stat.label}
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
              {stat.value}
            </div>
            <div
              className={cn(
                "mt-2 text-xs font-semibold tabular-nums",
                stat.hero
                  ? "text-lime"
                  : stat.tone === "negative"
                    ? "text-destructive"
                    : "text-mint-foreground",
              )}
            >
              {stat.delta}
            </div>
          </div>
        ))}
      </section>

      {/* ── CHARTS ROW: TREN BULANAN + PENCAPAIAN PER AREA/CABANG/UNIT ────── */}
      <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* Tren Bulanan */}
        <div className="panel min-w-0 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                Tren bulanan
              </h2>
              <p className="text-xs text-muted-foreground">Realisasi dibanding target (Jan – Des)</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="inline-block h-0.5 w-3.5 rounded-full bg-chart-1" />
                Realisasi
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="inline-block h-0.5 w-3.5 rounded-full border-t-2 border-dashed border-gold" />
                Target
              </span>
            </div>
          </div>

          <ChartContainer config={trendChartConfig} className="aspect-auto h-60 w-full sm:h-64">
            <ComposedChart data={snapshot.trend} margin={{ left: -16, right: 12, top: 8, bottom: 2 }}>
              <defs>
                <linearGradient id={`kinerjaFill-${page.slug}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={16}
                padding={{ left: 6, right: 6 }}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono font-semibold tabular-nums">
                        {name === "target" ? "Target: " : "Realisasi: "}
                        {formatKinerjaNumber(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="realisasi"
                stroke="var(--chart-1)"
                strokeWidth={2.4}
                fill={`url(#kinerjaFill-${page.slug})`}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="var(--gold)"
                strokeWidth={1.8}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </div>

        {/* Pencapaian per Area / Cabang / Unit */}
        <div className="panel flex min-w-0 flex-col p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                {meta.barTitle}
              </h2>
              <p className="text-xs text-muted-foreground">Persentase terhadap target</p>
            </div>
            <span className="pill bg-mint-soft text-mint-foreground">
              {sortedBars.length} {meta.unitWord}
            </span>
          </div>

          <div className="max-h-64 space-y-3.5 overflow-y-auto pr-1">
            {sortedBars.map((item, idx) => {
              const clamped = Math.min(100, Math.max(0, item.achievement));
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="min-w-0 truncate font-semibold text-foreground">
                      {item.label}
                      {breakdownMode === "cabang" && (
                        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                          ({item.area})
                        </span>
                      )}
                      {breakdownMode === "unit" && (
                        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                          ({item.branch})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-muted-foreground">
                      {formatKinerjaNumber(item.achievement)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-mint-soft">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${clamped}%`,
                        background: idx === 0 ? "var(--gold)" : "var(--chart-1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BREAKDOWN TABLE WITH AREA / CABANG / UNIT TOGGLE + EXPORTS ─────── */}
      <ExportableReportFrame
        ref={frameRef}
        title={exportTitle}
        period={exportPeriod}
        subtitle={`${activeRows.length} ${meta.unitWord} · Pencapaian total ${formatKinerjaNumber(snapshot.totals.achievement)}%`}
      >
        <div
          data-export-ignore="true"
          className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          {/* 3-Way Segmented Toggle: Area / Cabang / Unit */}
          <div className="w-full overflow-x-auto pb-0.5 md:w-auto md:pb-0">
            <div className="inline-flex min-w-full rounded-xl border border-border bg-muted/70 p-1 sm:min-w-0">
              <button
                type="button"
                onClick={() => setBreakdownMode("area")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  breakdownMode === "area"
                    ? "bg-primary text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MapIcon className="size-3.5" /> Rincian per Area
              </button>
              <button
                type="button"
                onClick={() => setBreakdownMode("cabang")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  breakdownMode === "cabang"
                    ? "bg-primary text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Building2 className="size-3.5" /> Rincian per Cabang
              </button>
              <button
                type="button"
                onClick={() => setBreakdownMode("unit")}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  breakdownMode === "unit"
                    ? "bg-primary text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Store className="size-3.5" /> Rincian per Unit
              </button>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                exportTableCsv(buildExportTable());
                toast.success("File Excel (CSV) berhasil diunduh");
              }}
            >
              <FileSpreadsheet className="size-4 text-primary" /> Unduh Excel
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl">
                  <Download className="size-4" /> Ekspor lain
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  onSelect={async () => {
                    await exportTablePdf(buildExportTable());
                    toast.success("Laporan PDF berhasil diunduh");
                  }}
                >
                  <FileText className="size-4 text-primary" /> Unduh PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    if (frameRef.current) {
                      await exportNodeJpeg(frameRef.current, exportFilename);
                      toast.success("Gambar JPEG berhasil diunduh");
                    }
                  }}
                >
                  <FileImage className="size-4 text-primary" /> Unduh JPEG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">
                  {breakdownMode === "area" ? "Area" : breakdownMode === "cabang" ? "Cabang" : "Unit"}
                </TableHead>
                {breakdownMode === "unit" && <TableHead className="font-semibold">Cabang</TableHead>}
                {(breakdownMode === "cabang" || breakdownMode === "unit") && (
                  <TableHead className="font-semibold">Area</TableHead>
                )}
                <TableHead className="text-right font-semibold">Target (Rp miliar)</TableHead>
                <TableHead className="text-right font-semibold">Realisasi (Rp miliar)</TableHead>
                <TableHead className="text-right font-semibold">Pencapaian</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRows.map((row) => (
                <TableRow key={row.key} className="hover:bg-mint-soft/40">
                  <TableCell className="font-semibold text-foreground">{row.label}</TableCell>
                  {breakdownMode === "unit" && (
                    <TableCell className="text-muted-foreground">{row.branch}</TableCell>
                  )}
                  {(breakdownMode === "cabang" || breakdownMode === "unit") && (
                    <TableCell className="text-muted-foreground">{row.area}</TableCell>
                  )}
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatKinerjaNumber(row.target)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatKinerjaNumber(row.realisasi)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums">
                    {formatKinerjaNumber(row.achievement)}%
                  </TableCell>
                  <TableCell>
                    <StatusPill status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary font-bold text-primary-foreground hover:bg-primary">
                <TableCell>Grand Total</TableCell>
                {breakdownMode === "unit" && (
                  <TableCell className="text-primary-foreground/80">
                    {snapshot.branchRows.length} cabang
                  </TableCell>
                )}
                {(breakdownMode === "cabang" || breakdownMode === "unit") && (
                  <TableCell className="text-primary-foreground/80">
                    {snapshot.areaRows.length} area
                  </TableCell>
                )}
                <TableCell className="text-right font-mono tabular-nums">
                  {formatKinerjaNumber(snapshot.totals.target)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatKinerjaNumber(snapshot.totals.realisasi)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatKinerjaNumber(snapshot.totals.achievement)}%
                </TableCell>
                <TableCell>
                  <span className="pill bg-white/20 text-white">
                    {KINERJA_STATUS_LABEL[snapshot.totals.status]}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Formal Status Threshold Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Keterangan Status:</span>
          {(["melampaui", "tercapai", "peningkatan", "belum"] as const).map((st) => (
            <span key={st} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  st === "melampaui" && "bg-primary",
                  st === "tercapai" && "bg-primary-glow",
                  st === "peningkatan" && "bg-gold",
                  st === "belum" && "bg-destructive",
                )}
              />
              <span>
                <strong className="font-semibold text-foreground">{KINERJA_STATUS_LABEL[st]}</strong>{" "}
                ({KINERJA_STATUS_RANGE[st]})
              </span>
            </span>
          ))}
        </div>
      </ExportableReportFrame>
    </div>
  );
}
