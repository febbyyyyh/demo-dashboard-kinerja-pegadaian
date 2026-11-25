import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  ListFilter,
  MessageSquare,
  Pencil,
  PieChart as PieChartIcon,
  Search,
  Star,
  Table as TableIcon,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { EmptyState } from "@/components/fk/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAnswer,
  getRespondentEmail,
  getRespondentName,
  responsesToCsv,
  responsesToRows,
  summarizeQuestion,
  RATING_MAX,
} from "@/lib/formkanwil/logic";
import { useDb } from "@/lib/formkanwil/store";
import {
  CHOICE_TYPES,
  QUESTION_TYPE_LABEL,
  type FormResponse,
} from "@/lib/formkanwil/types";

export const Route = createFileRoute("/admin/forms/$formId/jawaban")({
  head: () => ({
    meta: [
      { title: "Jawaban & Statistik — FormKanwil" },
      {
        name: "description",
        content: "Rekap jawaban, visualisasi bento per pertanyaan, pratinjau CSV, dan ekspor CSV atau PDF.",
      },
      { property: "og:title", content: "Jawaban & Statistik — FormKanwil" },
      { property: "og:description", content: "Rekap jawaban dan ekspor CSV atau PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResponsesPage,
});

const PALETTE = [
  "#146C43", // Pegadaian emerald primary
  "#0EA5E9", // Ocean blue
  "#F59E0B", // Amber gold
  "#8B5CF6", // Violet
  "#EC4899", // Rose
  "#10B981", // Mint emerald
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#64748B", // Slate
];

type ViewMode = "donut" | "bar" | "table";

/** Custom tooltip for Recharts */
function CustomChartTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { option?: string; count?: number } }>;
  total: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const count = item?.value ?? item?.payload?.count ?? 0;
  const name = item?.name ?? item?.payload?.option ?? "";
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card/95 p-3.5 shadow-lift backdrop-blur">
      <p className="text-xs font-bold text-foreground">{name}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-sm font-extrabold text-primary">{count} suara</span>
        <span className="text-xs font-semibold text-muted-foreground">({pct}%)</span>
      </div>
    </div>
  );
}

/** Horizontal Option Row with rank badge and animated percentage progress */
function OptionRow({
  option,
  count,
  total,
  color,
  rank,
}: {
  option: string;
  count: number;
  total: number;
  color: string;
  rank?: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex min-w-0 items-center gap-2">
          {rank !== undefined && (
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                rank === 0
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : rank === 1
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : rank === 2
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {rank + 1}
            </span>
          )}
          <span className="truncate font-medium text-foreground">{option}</span>
        </div>
        <span className="shrink-0 font-mono text-xs font-bold text-foreground">
          {count}{" "}
          <span className="font-semibold text-muted-foreground">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 sm:h-2.5 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ResponsesPage() {
  const { formId } = Route.useParams();
  const db = useDb();
  const form = db.forms.find((f) => f.id === formId);
  const [selected, setSelected] = useState<FormResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState<string>("all");
  const [activeMainTab, setActiveMainTab] = useState<"ringkasan" | "semua">("ringkasan");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "choice" | "rating" | "text">("all");
  const [searchTable, setSearchTable] = useState("");
  const [viewModes, setViewModes] = useState<Record<string, ViewMode>>({});
  const [textSearches, setTextSearches] = useState<Record<string, string>>({});

  const responses = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return db.responses
      .filter((response) => {
        if (response.formId !== formId) return false;
        const submittedAt = new Date(response.submittedAt);
        if (from && submittedAt < from) return false;
        if (to && submittedAt > to) return false;
        return true;
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [db.responses, formId, dateFrom, dateTo]);

  const exportRows = useMemo(
    () => (form ? responsesToRows(form, responses, db.users) : []),
    [form, responses, db.users],
  );

  const filteredResponses = useMemo(() => {
    if (!searchTable.trim()) return responses;
    const q = searchTable.toLowerCase();
    return responses.filter((r) => {
      const name = getRespondentName(r, db.users).toLowerCase();
      const email = getRespondentEmail(r, db.users).toLowerCase();
      const id = r.id.toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [responses, searchTable, db.users]);

  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  if (!form) {
    return (
      <EmptyState
        emoji="🔍"
        title="Form tidak ditemukan"
        action={
          <Button asChild>
            <Link to="/admin/forms">Kembali ke daftar form</Link>
          </Button>
        }
      />
    );
  }

  const currentForm = form;
  const ratingQ = form.questions.find((q) => q.type === "rating");
  const ratingSummary = ratingQ ? summarizeQuestion(ratingQ, responses) : null;
  const latestResponse = responses[0];

  const completionRate =
    responses.length > 0 && form.questions.length > 0
      ? Math.round(
          (responses.reduce((acc, r) => {
            const answered = form.questions.filter((q) => r.answers[q.id] !== undefined && r.answers[q.id] !== "").length;
            return acc + answered / form.questions.length;
          }, 0) /
            responses.length) *
            100,
        )
      : 0;

  function applyDatePreset(preset: "all" | "today" | "7d" | "30d") {
    setActiveDatePreset(preset);
    setSelected(null);
    const today = new Date();
    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "today") {
      const str = format(today, "yyyy-MM-dd");
      setDateFrom(str);
      setDateTo(str);
    } else if (preset === "7d") {
      setDateFrom(format(subDays(today, 7), "yyyy-MM-dd"));
      setDateTo(format(today, "yyyy-MM-dd"));
    } else if (preset === "30d") {
      setDateFrom(format(subDays(today, 30), "yyyy-MM-dd"));
      setDateTo(format(today, "yyyy-MM-dd"));
    }
  }

  function exportCsv() {
    const csv = responsesToCsv(currentForm, responses, db.users);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentForm.code}-jawaban-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${responses.length} jawaban berhasil diekspor 📥`);
  }

  async function exportPdf() {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const [header = [], ...rows] = exportRows;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(currentForm.title, pageWidth - 60);
      doc.text(titleLines, 30, 30);
      doc.setFontSize(9);
      const subtitleY = 30 + titleLines.length * 17;
      doc.text(
        `Kode: ${currentForm.code} - ${responses.length} jawaban - diekspor ${format(new Date(), "d MMMM yyyy HH:mm", { locale: localeId })}`,
        30,
        subtitleY,
      );
      autoTable(doc, {
        head: [header],
        body: rows,
        startY: subtitleY + 12,
        margin: 30,
        styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [20, 108, 67] },
      });
      doc.save(`${currentForm.code}-jawaban-${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success(`${responses.length} jawaban berhasil diekspor 📥`);
    } catch (error) {
      console.error("Gagal mengekspor jawaban ke PDF.", error);
      toast.error("PDF gagal dibuat. Coba lagi.");
    }
  }

  function getQuestionMode(qId: string): ViewMode {
    return viewModes[qId] ?? "donut";
  }

  function setQuestionMode(qId: string, mode: ViewMode) {
    setViewModes((prev) => ({ ...prev, [qId]: mode }));
  }

  const displayedQuestions = useMemo(() => {
    if (activeCategoryFilter === "all") return form.questions;
    if (activeCategoryFilter === "choice")
      return form.questions.filter((q) => CHOICE_TYPES.includes(q.type));
    if (activeCategoryFilter === "rating")
      return form.questions.filter((q) => q.type === "rating");
    if (activeCategoryFilter === "text")
      return form.questions.filter(
        (q) => !CHOICE_TYPES.includes(q.type) && q.type !== "rating",
      );
    return form.questions;
  }, [form.questions, activeCategoryFilter]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-hidden">
      {/* ── TOP ACTION & TITLE BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3 gap-1 rounded-full w-fit">
          <Link to="/admin/forms">
            <ArrowLeft className="size-4" /> Kembali ke Daftar Form
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 shadow-xs text-xs">
            <a href={`/app/isi/${currentForm.code}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> Buka Form
            </a>
          </Button>
          <Button asChild variant="brandOutline" size="sm" className="rounded-full gap-1.5 text-xs">
            <Link to="/admin/forms/$formId" params={{ formId: form.id }}>
              <Pencil className="size-3.5" /> Edit Form
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full gap-1.5 shadow-xs text-xs"
            onClick={() => setPreviewOpen(true)}
            disabled={responses.length === 0}
          >
            <Eye className="size-3.5" /> Preview CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={responses.length === 0} className="rounded-full gap-1.5 shadow-xs bg-primary text-primary-foreground text-xs">
                <Download className="size-3.5" /> Unduh Data <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onSelect={exportCsv} className="gap-2 text-xs">
                <FileText className="size-4 text-primary" /> Format CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportPdf()} className="gap-2 text-xs">
                <FileText className="size-4 text-primary" /> Format Dokumen PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── CAPSULE NAVIGATION HEADER (RESPONSIVE SCROLLABLE ON MOBILE) ───── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Scrollable Capsule Pill Tabs */}
        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0 -mx-1 px-1 no-scrollbar">
          <div className="inline-flex min-w-max items-center gap-1 rounded-full bg-card p-1.5 shadow-card border border-border/80">
            <button
              type="button"
              onClick={() => setActiveMainTab("ringkasan")}
              className={`rounded-full px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-bold transition-all ${
                activeMainTab === "ringkasan"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview Visual
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab("ringkasan");
                setActiveCategoryFilter("choice");
              }}
              className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                activeMainTab === "ringkasan" && activeCategoryFilter === "choice"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pilihan Ganda
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab("ringkasan");
                setActiveCategoryFilter("rating");
              }}
              className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                activeMainTab === "ringkasan" && activeCategoryFilter === "rating"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rating CSAT
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab("ringkasan");
                setActiveCategoryFilter("text");
              }}
              className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                activeMainTab === "ringkasan" && activeCategoryFilter === "text"
                  ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Teks
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab("semua")}
              className={`rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all ${
                activeMainTab === "semua"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({responses.length})
            </button>
          </div>
        </div>

        {/* Right: Date Presets & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted/40 transition-colors"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>
                  {activeDatePreset === "all"
                    ? "📅 Semua Waktu"
                    : activeDatePreset === "today"
                      ? "📅 Hari Ini"
                      : activeDatePreset === "7d"
                        ? "📅 7 Hari Terakhir"
                        : activeDatePreset === "30d"
                          ? "📅 30 Hari Terakhir"
                          : `${dateFrom || "..."} - ${dateTo || "..."}`}
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-48">
              <DropdownMenuItem onSelect={() => applyDatePreset("all")} className="font-medium text-xs">
                Semua Waktu
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyDatePreset("today")} className="font-medium text-xs">
                Hari Ini
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyDatePreset("7d")} className="font-medium text-xs">
                7 Hari Terakhir
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => applyDatePreset("30d")} className="font-medium text-xs">
                30 Hari Terakhir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Form Status Chip */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 sm:py-2 text-xs font-semibold text-foreground shadow-xs">
            <span
              className={`size-2 rounded-full ${
                form.active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{form.active ? "Aktif" : "Ditutup"}</span>
          </div>
        </div>
      </div>

      {invalidDateRange && (
        <p role="alert" className="text-xs text-destructive font-medium pl-1">
          Rentang tanggal tidak valid: tanggal awal tidak boleh melewati tanggal akhir.
        </p>
      )}

      {/* ── BENTO METRIC CARDS ROW (RESPONSIVE GRID) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {/* CARD 1: Total Responses */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[26px] border border-black/[0.07] bg-card p-4 sm:p-5 shadow-card transition-all hover:shadow-lift dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Responses</span>
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-muted/70 text-foreground transition-transform group-hover:scale-105">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {responses.length}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                ↑ 100%
              </span>
              <span className="text-[11px] text-muted-foreground">terverifikasi</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Total Pertanyaan */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[26px] border border-black/[0.07] bg-card p-4 sm:p-5 shadow-card transition-all hover:shadow-lift dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pertanyaan Form</span>
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-muted/70 text-foreground transition-transform group-hover:scale-105">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {form.questions.length}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {CHOICE_TYPES.filter((t) => form.questions.some((q) => q.type === t)).length > 0 ? "Pilihan" : "Teks"}
              </span>
              <span className="text-[11px] text-muted-foreground">pertanyaan</span>
            </div>
          </div>
        </div>

        {/* CARD 3: CSAT Rating (LILAC / VIOLET PASTEL) */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[26px] border border-violet-200/60 bg-[#e4deff] p-4 sm:p-5 shadow-card transition-all hover:shadow-lift dark:border-violet-900/40 dark:bg-[#2c244c] dark:text-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-violet-200">
              Skor Kepuasan
            </span>
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-white text-slate-900 shadow-xs transition-transform group-hover:scale-105 dark:bg-white/90">
              <Star className="size-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="flex items-baseline gap-1 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {ratingSummary && ratingSummary.kind === "rating" && ratingSummary.total
                ? ratingSummary.average.toFixed(1)
                : "5.0"}
              <span className="text-xs sm:text-sm font-semibold opacity-60">/ {RATING_MAX}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-extrabold text-slate-900 shadow-xs">
                ⭐ {ratingSummary && ratingSummary.kind === "rating" && ratingSummary.total
                  ? `${Math.round(
                      (((ratingSummary.counts.find((c) => c.option.startsWith("4"))?.count ?? 0) +
                        (ratingSummary.counts.find((c) => c.option.startsWith("5"))?.count ?? 0)) /
                        ratingSummary.total) *
                        100,
                    )}%`
                  : "100%"}{" "}
                positif
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: Respon Terkini */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[26px] border border-black/[0.07] bg-card p-4 sm:p-5 shadow-card transition-all hover:shadow-lift dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Respon Terkini</span>
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-muted/70 text-foreground transition-transform group-hover:scale-105">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {latestResponse
                ? format(new Date(latestResponse.submittedAt), "d MMM", { locale: localeId })
                : "—"}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {latestResponse
                  ? format(new Date(latestResponse.submittedAt), "HH:mm", { locale: localeId })
                  : "Belum ada"}
              </span>
              <span className="text-[11px] text-muted-foreground">aktivitas</span>
            </div>
          </div>
        </div>

        {/* CARD 5: Kelengkapan Isian (MINT / SAGE PASTEL) */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-[26px] border border-emerald-200/60 bg-[#ddf4d6] p-4 sm:p-5 shadow-card transition-all hover:shadow-lift dark:border-emerald-900/40 dark:bg-[#1e3422] dark:text-slate-100 sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-emerald-200">
              Kelengkapan Isian
            </span>
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-white text-slate-900 shadow-xs transition-transform group-hover:scale-105 dark:bg-white/90">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {completionRate}%
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-extrabold text-slate-900 shadow-xs">
                ↑ 4.2 pts
              </span>
              <span className="text-[11px] text-slate-700 dark:text-emerald-200/80 font-medium">
                rata-rata
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTION QUICK JUMP BAR (HORIZONTAL SCROLL ON MOBILE) ──────────── */}
      {form.questions.length > 1 && responses.length > 0 && activeMainTab === "ringkasan" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar -mx-1 px-1">
          <span className="shrink-0 font-semibold text-muted-foreground flex items-center gap-1 pl-1">
            <ListFilter className="size-3.5" /> Navigasi:
          </span>
          {form.questions.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                const el = document.getElementById(`q-section-${q.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("ring-2", "ring-primary", "ring-offset-2");
                  window.setTimeout(() => {
                    el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                  }, 1500);
                }
              }}
              className="shrink-0 rounded-full border border-border/80 bg-card px-3 py-1 font-medium text-foreground transition-colors hover:border-primary hover:bg-mint-soft hover:text-mint-foreground shadow-xs text-xs"
            >
              #{idx + 1}. {q.label.length > 20 ? q.label.slice(0, 20) + "…" : q.label}
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN CONTENT: OVERVIEW OR FULL TABLE ───────────────────────────── */}
      {responses.length === 0 ? (
        <EmptyState
          emoji="📭"
          title={dateFrom || dateTo ? "Tidak ada tanggapan pada rentang ini" : "Belum ada jawaban masuk"}
          description={
            dateFrom || dateTo
              ? "Coba ubah atau reset filter rentang tanggal di atas."
              : "Bagikan tautan form kepada responden untuk mulai menerima data."
          }
          action={
            <Button asChild variant="outline" className="rounded-full">
              <a href={`/app/isi/${currentForm.code}`} target="_blank" rel="noopener noreferrer">
                Buka Link Form Responden
              </a>
            </Button>
          }
        />
      ) : activeMainTab === "ringkasan" ? (
        /* ── SECTION: VISUAL SUMMARY CARDS ── */
        <div className="space-y-4 sm:space-y-6">
          {displayedQuestions.map((q, i) => {
            const s = summarizeQuestion(q, responses);
            const isChoice = CHOICE_TYPES.includes(q.type);
            const mode = getQuestionMode(q.id);

            return (
              <section
                key={q.id}
                id={`q-section-${q.id}`}
                className="group relative rounded-2xl sm:rounded-[28px] border border-black/[0.07] bg-card p-4 sm:p-7 shadow-card transition-all hover:shadow-lift dark:border-white/10"
              >
                {/* Card Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5 sm:pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-extrabold text-white dark:bg-white dark:text-slate-900 shadow-xs">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold text-sm sm:text-base md:text-lg text-foreground truncate">
                        {q.label}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                          {QUESTION_TYPE_LABEL[q.type]}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] sm:text-xs font-bold text-primary">
                          {s.total} suara ({responses.length > 0 ? Math.round((s.total / responses.length) * 100) : 0}% terisi)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Switcher capsule for Choice questions (Responsive on mobile) */}
                  {isChoice && s.kind === "choice" && s.counts.length > 0 && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-muted/70 p-1 border border-border/40 w-fit self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setQuestionMode(q.id, "donut")}
                        title="Tampilan Grafik Donat"
                        className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition-all ${
                          mode === "donut"
                            ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PieChartIcon className="size-3.5" /> Donat
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionMode(q.id, "bar")}
                        title="Tampilan Grafik Batang"
                        className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition-all ${
                          mode === "bar"
                            ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <BarChart3 className="size-3.5" /> Batang
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionMode(q.id, "table")}
                        title="Tampilan Tabel Data"
                        className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition-all ${
                          mode === "table"
                            ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <TableIcon className="size-3.5" /> Tabel
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 sm:pt-5">
                  {/* ── TEXT QUESTION PRESENTATION ── */}
                  {s.kind === "text" ? (
                    <div>
                      {s.total > 4 && (
                        <div className="mb-4 relative w-full max-w-sm">
                          <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Cari dalam tanggapan..."
                            value={textSearches[q.id] ?? ""}
                            onChange={(e) =>
                              setTextSearches((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            className="pl-9 h-9 text-xs rounded-full w-full"
                          />
                        </div>
                      )}

                      {(() => {
                        const query = (textSearches[q.id] ?? "").toLowerCase();
                        const allTexts = responses
                          .map((r) => ({
                            id: r.id,
                            name: getRespondentName(r, db.users),
                            submittedAt: r.submittedAt,
                            text: String(r.answers[q.id] ?? "").trim(),
                          }))
                          .filter((item) => Boolean(item.text));

                        const filteredTexts = query
                          ? allTexts.filter(
                              (item) =>
                                item.text.toLowerCase().includes(query) ||
                                item.name.toLowerCase().includes(query),
                            )
                          : allTexts;

                        if (filteredTexts.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground italic py-4 text-center">
                              {query ? "Tidak ditemukan tanggapan yang cocok." : "Belum ada jawaban untuk pertanyaan ini 🌱"}
                            </p>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredTexts.slice(0, 8).map((item, idx) => (
                              <div
                                key={idx}
                                className="group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border border-black/[0.06] bg-muted/20 p-3.5 sm:p-4 transition-all hover:bg-card hover:shadow-card dark:border-white/10"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="mt-1 text-primary shrink-0">
                                    <MessageSquare className="size-3.5 sm:size-4" />
                                  </span>
                                  <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                                    "{item.text}"
                                  </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                                  <span className="font-bold text-foreground/80 truncate max-w-[140px]">{item.name}</span>
                                  <span className="shrink-0">{format(new Date(item.submittedAt), "d MMM, HH:mm", { locale: localeId })}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : s.kind === "rating" ? (
                    /* ── RATING QUESTION PRESENTATION ── */
                    <div className="space-y-5 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl sm:rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 sm:p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="grid size-12 sm:size-16 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-amber-400/20 text-amber-500 shadow-xs">
                            <Star className="size-6 sm:size-9 fill-amber-400 text-amber-500" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1.5 sm:gap-2">
                              <span className="font-display text-3xl sm:text-4xl font-black text-amber-800 dark:text-amber-200">
                                {s.average.toFixed(1)}
                              </span>
                              <span className="text-base sm:text-lg font-semibold text-amber-700/70 dark:text-amber-400/70">
                                / {RATING_MAX}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                              Rata-rata kepuasan responden
                            </p>
                          </div>
                        </div>

                        {(() => {
                          const star4 = s.counts.find((c) => c.option.startsWith("4"))?.count ?? 0;
                          const star5 = s.counts.find((c) => c.option.startsWith("5"))?.count ?? 0;
                          const posPct = s.total > 0 ? Math.round(((star4 + star5) / s.total) * 100) : 0;
                          return (
                            <div className="rounded-xl sm:rounded-2xl bg-card p-3 sm:p-4 border border-border shadow-xs text-left sm:text-right">
                              <span className="text-xs font-bold text-muted-foreground">
                                Kepuasan Positif (★4 & ★5)
                              </span>
                              <div className="font-display text-xl sm:text-2xl font-black text-primary">
                                {posPct}%
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-2">
                        {[...s.counts].reverse().map((item, k) => (
                          <OptionRow
                            key={k}
                            option={item.option}
                            count={item.count}
                            total={s.total}
                            color="#F59E0B"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* ── CHOICE QUESTION PRESENTATION ── */
                    <div>
                      {/* Top Choice Highlight Pill */}
                      {(() => {
                        if (!s.counts.length || s.total === 0) return null;
                        const sorted = [...s.counts].sort((a, b) => b.count - a.count);
                        const top = sorted[0];
                        if (!top || top.count === 0) return null;
                        const pct = Math.round((top.count / s.total) * 100);
                        return (
                          <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 max-w-full">
                            <span className="shrink-0">🏆 Paling banyak:</span>
                            <span className="font-black truncate underline underline-offset-2">{top.option}</span>
                            <span className="shrink-0">({top.count} • {pct}%)</span>
                          </div>
                        );
                      })()}

                      {/* DONUT VIEW */}
                      {mode === "donut" && (
                        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 items-center">
                          <div className="h-52 sm:h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <RechartsTooltip
                                  content={<CustomChartTooltip total={s.total} />}
                                />
                                <Pie
                                  data={s.counts}
                                  dataKey="count"
                                  nameKey="option"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={48}
                                  outerRadius={80}
                                  paddingAngle={3}
                                >
                                  {s.counts.map((_, k) => (
                                    <Cell
                                      key={`cell-${k}`}
                                      fill={PALETTE[k % PALETTE.length]}
                                      stroke="var(--card)"
                                      strokeWidth={2}
                                    />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Donut Legend List */}
                          <div className="space-y-1.5 sm:space-y-2">
                            {s.counts.map((item, k) => {
                              const pct = s.total > 0 ? Math.round((item.count / s.total) * 100) : 0;
                              const color = PALETTE[k % PALETTE.length] ?? "#146C43";
                              return (
                                <div
                                  key={k}
                                  className="flex items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-black/[0.05] bg-muted/20 px-3.5 py-2 text-xs transition-all hover:bg-card dark:border-white/10"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="size-2.5 sm:size-3 shrink-0 rounded-full"
                                      style={{ background: color }}
                                    />
                                    <span className="truncate font-semibold text-foreground">
                                      {item.option}
                                    </span>
                                  </div>
                                  <div className="shrink-0 font-mono font-bold text-foreground text-xs">
                                    {item.count}{" "}
                                    <span className="text-muted-foreground font-normal">
                                      ({pct}%)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* HORIZONTAL BAR VIEW */}
                      {mode === "bar" && (
                        <div className="space-y-4">
                          <div className="space-y-2.5">
                            {s.counts.map((item, k) => (
                              <OptionRow
                                key={k}
                                rank={k}
                                option={item.option}
                                count={item.count}
                                total={s.total}
                                color={PALETTE[k % PALETTE.length] ?? "#146C43"}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TABLE VIEW */}
                      {mode === "table" && (
                        <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-border">
                          <Table className="min-w-full text-xs">
                            <TableHeader>
                              <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-10 text-center">#</TableHead>
                                <TableHead>Pilihan Jawaban</TableHead>
                                <TableHead className="text-right">Suara</TableHead>
                                <TableHead className="text-right">Persen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {s.counts.map((item, k) => {
                                const pct = s.total > 0 ? Math.round((item.count / s.total) * 100) : 0;
                                return (
                                  <TableRow key={k}>
                                    <TableCell className="text-center font-bold text-muted-foreground text-xs">
                                      {k + 1}
                                    </TableCell>
                                    <TableCell className="font-semibold text-foreground text-xs">
                                      {item.option}
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-xs">
                                      {item.count}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-primary font-bold text-xs">
                                      {pct}%
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* ── SECTION: FULL DATA TABLE (RESPONSIVE SCROLL) ── */
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, atau ID..."
                value={searchTable}
                onChange={(e) => setSearchTable(e.target.value)}
                className="pl-9 h-9 text-xs rounded-full w-full"
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Menampilkan {filteredResponses.length} dari {responses.length} jawaban
            </span>
          </div>

          <div className="rounded-2xl sm:rounded-[28px] border border-black/[0.07] bg-card overflow-x-auto shadow-card dark:border-white/10">
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-24 font-bold text-xs">ID</TableHead>
                  <TableHead className="font-bold text-xs">Responden</TableHead>
                  <TableHead className="hidden sm:table-cell font-bold text-xs">Email</TableHead>
                  <TableHead className="font-bold text-xs">Waktu</TableHead>
                  <TableHead className="hidden md:table-cell font-bold text-xs">
                    {form.questions[0]?.label ?? "Jawaban"}
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground italic">
                      Tidak ada tanggapan yang cocok dengan pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResponses.map((r) => {
                    const name = getRespondentName(r, db.users);
                    const email = getRespondentEmail(r, db.users);
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell
                          className="whitespace-nowrap font-mono text-[11px] text-muted-foreground"
                          title={r.id}
                        >
                          {r.id.slice(0, 8)}…
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-foreground">{name}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {email || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.submittedAt), "d MMM, HH:mm", { locale: localeId })}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:table-cell">
                          {form.questions[0]
                            ? formatAnswer(form.questions[0], r.answers[form.questions[0].id])
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-bold gap-1 rounded-full px-2.5">
                            <Eye className="size-3.5" /> Buka
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL FOR SINGLE RESPONSE (RESPONSIVE) ──────────────────── */}
      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[88vh] w-[95vw] max-w-lg overflow-y-auto rounded-2xl sm:rounded-[28px] p-4 sm:p-6">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg sm:text-xl font-extrabold flex items-center gap-3">
                  <span className="grid size-9 sm:size-10 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-xs">
                    {getRespondentName(selected, db.users).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{getRespondentName(selected, db.users)}</p>
                    <p className="font-mono text-[11px] font-normal text-muted-foreground mt-0.5">
                      ID: {selected.id}
                    </p>
                  </div>
                </DialogTitle>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span className="chip rounded-full text-[11px]">
                    📅 {format(new Date(selected.submittedAt), "d MMMM yyyy, HH:mm", { locale: localeId })}
                  </span>
                  <span className="chip rounded-full text-[11px]">
                    ✉️ {getRespondentEmail(selected, db.users) || "Email tidak tercatat"}
                  </span>
                </div>
              </DialogHeader>
              <div className="mt-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Daftar Jawaban Responden:
                </h4>
                {form.questions.map((q, i) => {
                  const val = formatAnswer(q, selected.answers[q.id]);
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl sm:rounded-2xl border border-border/80 bg-muted/30 p-3 sm:p-4 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          {i + 1}
                        </span>
                        <span>{q.label}</span>
                      </div>
                      <div className="pl-7 text-xs sm:text-sm font-semibold text-foreground">
                        {val ? (
                          q.type === "rating" ? (
                            <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                              <Star className="size-4 fill-amber-400 text-amber-500" />
                              <span>{val}</span>
                            </div>
                          ) : (
                            val
                          )
                        ) : (
                          <span className="italic text-muted-foreground font-normal">Tidak dijawab</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── CSV PREVIEW DIALOG (RESPONSIVE) ─────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-y-auto rounded-2xl sm:rounded-[28px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl font-extrabold flex items-center gap-2">
              <FileText className="size-5 text-primary" /> Pratinjau Tabel Ekspor CSV
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tabel data mentah sesuai filter tanggal aktif.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Menampilkan {Math.min(responses.length, 25)} dari {responses.length} baris jawaban.</span>
            <Button size="sm" onClick={exportCsv} className="gap-1.5 rounded-full bg-primary text-primary-foreground font-bold w-fit">
              <Download className="size-3.5" /> Unduh CSV Sekarang
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-x-auto rounded-xl sm:rounded-2xl border border-border">
            <Table className="min-w-max text-xs">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {(exportRows[0] ?? []).map((heading, index) => (
                    <TableHead key={`${heading}-${index}`} className="whitespace-nowrap font-bold text-xs">
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportRows.slice(1, 26).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((value, columnIndex) => (
                      <TableCell
                        key={`${rowIndex}-${columnIndex}`}
                        className="max-w-xs whitespace-pre-wrap align-top text-xs"
                      >
                        {value || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}