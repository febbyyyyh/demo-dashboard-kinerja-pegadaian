import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { isAnswered } from "./logic";
import type {
  DailyMetric,
  DailyReportConfig,
  Database,
  FeedingSlot,
  FeedingSourceMapping,
  Form,
  FormResponse,
  MetricAggregation,
  MetricViews,
  Question,
} from "./types";

export const FEEDING_SLOTS: FeedingSlot[] = [1, 2];
export const NO_AREA = "Tanpa area";
export const NO_BRANCH = "Tanpa cabang";
export const NO_UNIT = "Tanpa unit";

export const METRIC_VIEW_LABEL: Record<keyof MetricViews, string> = {
  indicator: "Kartu Indikator",
  area: "Rekap Area",
  branch: "Rekap Cabang",
  unit: "Kinerja Unit",
};

export const AGGREGATION_LABEL: Record<MetricAggregation, string> = {
  sum: "Jumlah",
  avg: "Rata-rata",
  count: "Hitung laporan",
};

export interface ReportFilter {
  /** yyyy-MM-dd, inclusive */
  from: string;
  /** yyyy-MM-dd, inclusive */
  to: string;
  area: string | null;
  branch: string | null;
}

export interface UnitInfo {
  unit: string;
  branch: string;
  area: string;
}

export interface UnitRow extends UnitInfo {
  values: Record<string, number | null>;
  submissions: number;
}

export interface GroupRow {
  key: string;
  area: string;
  branch: string | null;
  values: Record<string, number | null>;
  units: number;
  reportingUnits: number;
}

/* ---------------- Feeding forms ---------------- */

export function getFeedingForm(forms: Form[], slot: FeedingSlot): Form | undefined {
  return forms.find((form) => form.feedingSlot === slot);
}

export type FeedingAssignment = Record<FeedingSlot, string | null>;

export function validateFeedingAssignment(assignment: FeedingAssignment): string | null {
  if (assignment[1] && assignment[1] === assignment[2]) {
    return "Satu form hanya bisa menjadi Feeding 1 atau Feeding 2, tidak keduanya.";
  }
  return null;
}

/** Applies the (max two) feeding forms; every other form loses its feeding slot. */
export function assignFeedingForms(forms: Form[], assignment: FeedingAssignment): Form[] {
  const error = validateFeedingAssignment(assignment);
  if (error) throw new Error(error);
  return forms.map((form) => {
    const slot: FeedingSlot | null =
      assignment[1] === form.id ? 1 : assignment[2] === form.id ? 2 : null;
    return (form.feedingSlot ?? null) === slot ? form : { ...form, feedingSlot: slot };
  });
}

export function getSourceMapping(
  config: DailyReportConfig,
  slot: FeedingSlot,
): FeedingSourceMapping {
  return (
    config.sources.find((source) => source.slot === slot) ?? {
      slot,
      unitQuestionId: null,
      areaColumn: null,
      branchColumn: null,
    }
  );
}

/** Questions that can identify a unit: choice questions (ideally imported from a UPC list). */
export function unitQuestionCandidates(form: Form | undefined): Question[] {
  return (form?.questions ?? []).filter((q) => q.type === "dropdown" || q.type === "single");
}

/** Questions whose answers can be summed or averaged. */
export function numericQuestionCandidates(form: Form | undefined): Question[] {
  return (form?.questions ?? []).filter((q) => q.type === "number" || q.type === "rating");
}

function unitQuestion(form: Form, mapping: FeedingSourceMapping): Question | undefined {
  return mapping.unitQuestionId
    ? form.questions.find((q) => q.id === mapping.unitQuestionId)
    : undefined;
}

function unitInfoFromOption(
  question: Question,
  mapping: FeedingSourceMapping,
  option: string,
): UnitInfo {
  const index = question.options?.indexOf(option) ?? -1;
  const meta = index >= 0 ? question.optionMetadata?.[index] : undefined;
  return {
    unit: option,
    branch: (mapping.branchColumn && meta?.[mapping.branchColumn]?.trim()) || NO_BRANCH,
    area: (mapping.areaColumn && meta?.[mapping.areaColumn]?.trim()) || NO_AREA,
  };
}

/** All units the feeding form knows about (its unit question's options). */
export function listUnits(form: Form | undefined, mapping: FeedingSourceMapping): UnitInfo[] {
  if (!form) return [];
  const question = unitQuestion(form, mapping);
  if (!question) return [];
  return (question.options ?? []).map((option) => unitInfoFromOption(question, mapping, option));
}

export function resolveUnit(
  form: Form,
  mapping: FeedingSourceMapping,
  response: FormResponse,
): UnitInfo {
  const question = unitQuestion(form, mapping);
  const raw = question ? response.answers[question.id] : undefined;
  const label = Array.isArray(raw) ? (raw[0] ?? "") : raw === undefined ? "" : String(raw);
  if (!question || !label.trim()) return { unit: NO_UNIT, branch: NO_BRANCH, area: NO_AREA };
  return unitInfoFromOption(question, mapping, label);
}

/* ---------------- Dates ---------------- */

export function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function periodDays(filter: Pick<ReportFilter, "from" | "to">): number {
  return Math.max(1, differenceInCalendarDays(parseISO(filter.to), parseISO(filter.from)) + 1);
}

function inPeriod(response: FormResponse, filter: ReportFilter): boolean {
  const day = dayKey(response.submittedAt);
  return day >= filter.from && day <= filter.to;
}

/* ---------------- Aggregation ---------------- */

export function numericAnswer(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Aggregates the raw values of one metric. Returns null when nothing was reported. */
export function aggregate(values: number[], aggregation: MetricAggregation): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return aggregation === "avg" ? sum / values.length : sum;
}

/** Combines already-aggregated unit values into a group value. */
export function combine(values: Array<number | null>, aggregation: MetricAggregation): number | null {
  const present = values.filter((value): value is number => value !== null);
  return aggregate(present, aggregation);
}

/** Target for a group: daily target per unit × units × days (sum/count) or the target itself (avg). */
export function metricTarget(metric: DailyMetric, unitCount: number, days: number): number | null {
  if (metric.target === null || metric.target <= 0) return null;
  if (metric.aggregation === "avg") return metric.target;
  return metric.target * Math.max(unitCount, 1) * Math.max(days, 1);
}

export function achievement(value: number | null, target: number | null): number | null {
  if (value === null || target === null || target <= 0) return null;
  return (value / target) * 100;
}

/* ---------------- Report rows ---------------- */

export function computeUnitRows(db: Database, filter: ReportFilter): UnitRow[] {
  const config = db.dailyReport;
  const rows = new Map<string, UnitRow & { raw: Record<string, number[]> }>();
  const ensure = (info: UnitInfo) => {
    let row = rows.get(info.unit);
    if (!row) {
      row = { ...info, values: {}, submissions: 0, raw: {} };
      rows.set(info.unit, row);
    }
    return row;
  };

  for (const slot of FEEDING_SLOTS) {
    const form = getFeedingForm(db.forms, slot);
    if (!form) continue;
    const mapping = getSourceMapping(config, slot);
    listUnits(form, mapping).forEach(ensure);
    const metrics = config.metrics.filter((metric) => metric.slot === slot);
    for (const response of db.responses) {
      if (response.formId !== form.id || !inPeriod(response, filter)) continue;
      const row = ensure(resolveUnit(form, mapping, response));
      row.submissions += 1;
      for (const metric of metrics) {
        const bucket = (row.raw[metric.id] ??= []);
        if (metric.aggregation === "count") {
          if (!metric.questionId || isAnswered(response.answers[metric.questionId])) bucket.push(1);
          continue;
        }
        if (!metric.questionId) continue;
        const value = numericAnswer(response.answers[metric.questionId]);
        if (value !== null) bucket.push(value);
      }
    }
  }

  return [...rows.values()]
    .filter((row) => !filter.area || row.area === filter.area)
    .filter((row) => !filter.branch || row.branch === filter.branch)
    .map(({ raw, ...row }) => ({
      ...row,
      values: Object.fromEntries(
        config.metrics.map((metric) => [
          metric.id,
          aggregate(raw[metric.id] ?? [], metric.aggregation),
        ]),
      ),
    }))
    .sort(
      (a, b) =>
        a.area.localeCompare(b.area) ||
        a.branch.localeCompare(b.branch) ||
        a.unit.localeCompare(b.unit),
    );
}

export function groupUnitRows(
  rows: UnitRow[],
  metrics: DailyMetric[],
  by: "area" | "branch",
): GroupRow[] {
  const groups = new Map<string, UnitRow[]>();
  for (const row of rows) {
    const key = by === "area" ? row.area : `${row.area}::${row.branch}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()].map(([key, members]) => summarizeRows(key, members, metrics, by));
}

export function summarizeRows(
  key: string,
  rows: UnitRow[],
  metrics: DailyMetric[],
  by: "area" | "branch" | "total" = "total",
): GroupRow {
  return {
    key,
    area: by === "total" ? "Grand Total" : (rows[0]?.area ?? NO_AREA),
    branch: by === "branch" ? (rows[0]?.branch ?? NO_BRANCH) : null,
    units: rows.length,
    reportingUnits: rows.filter((row) => row.submissions > 0).length,
    values: Object.fromEntries(
      metrics.map((metric) => [
        metric.id,
        combine(
          rows.map((row) => row.values[metric.id] ?? null),
          metric.aggregation,
        ),
      ]),
    ),
  };
}

/** Average achievement (%) across the metrics that have a target; used to rank units. */
export function unitScore(row: UnitRow, metrics: DailyMetric[], days: number): number | null {
  const scores = metrics
    .map((metric) => achievement(row.values[metric.id] ?? null, metricTarget(metric, 1, days)))
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export interface InputProgress {
  reported: number;
  total: number;
  missing: UnitInfo[];
}

/** How many units submitted at least one feeding form on the given day. */
export function dailyInputProgress(db: Database, day: string): InputProgress {
  const filter: ReportFilter = { from: day, to: day, area: null, branch: null };
  const rows = computeUnitRows(db, filter).filter((row) => row.unit !== NO_UNIT);
  return {
    reported: rows.filter((row) => row.submissions > 0).length,
    total: rows.length,
    missing: rows.filter((row) => row.submissions === 0),
  };
}

export function metricsForView(config: DailyReportConfig, view: keyof MetricViews): DailyMetric[] {
  return config.metrics.filter((metric) => metric.views[view]);
}

export function reportAreas(rows: UnitRow[]): string[] {
  return [...new Set(rows.map((row) => row.area))].sort();
}

export function reportBranches(rows: UnitRow[], area: string | null): string[] {
  return [
    ...new Set(rows.filter((row) => !area || row.area === area).map((row) => row.branch)),
  ].sort();
}

/* ---------------- Formatting ---------------- */

export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return "–";
  const digits = Number.isInteger(value) ? 0 : 1;
  const number = value.toLocaleString("id-ID", { maximumFractionDigits: digits });
  if (unit === "Rp") return `Rp ${number}`;
  if (unit === "%") return `${number}%`;
  return unit ? `${number} ${unit}` : number;
}

export function formatCompact(value: number | null, unit: string): string {
  if (value === null) return "–";
  if (Math.abs(value) < 10_000) return formatMetricValue(value, unit);
  const compact = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return unit === "Rp" ? `Rp ${compact}` : unit ? `${compact} ${unit}` : compact;
}

/* ---------------- Google Drive ---------------- */

const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

/** Accepts a raw folder ID or a Google Drive folder link; returns the ID or null if invalid. */
export function parseDriveFolderId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (DRIVE_ID.test(value)) return value;
  const folder = value.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,})/);
  if (folder?.[1]) return folder[1];
  const query = value.match(/drive\.google\.com\/.*[?&]id=([A-Za-z0-9_-]{10,})/);
  return query?.[1] ?? null;
}

export function driveFolderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}
