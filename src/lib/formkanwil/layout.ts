import type { DailyMetric, DashboardWidgetType, LayoutWidget, WidgetSpan } from "./types";

/*
 * Schema-driven layouts for "Atur Tampilan". Saved layouts are JSON arrays of LayoutWidget;
 * `resolve*` merges them with the defaults so new widgets/metrics appear and removed ones drop.
 */

export const WIDGET_SPANS: Array<{ value: WidgetSpan; label: string }> = [
  { value: "1/4", label: "1/4 lebar" },
  { value: "1/2", label: "1/2 lebar" },
  { value: "2/3", label: "2/3 lebar" },
  { value: "full", label: "Lebar penuh" },
];

/** 12-column bento grid; small screens stack, tablets pair up quarter cards. */
export const SPAN_CLASS: Record<WidgetSpan, string> = {
  "1/4": "col-span-12 sm:col-span-6 xl:col-span-3",
  "1/2": "col-span-12 xl:col-span-6",
  "2/3": "col-span-12 xl:col-span-8",
  full: "col-span-12",
};

function widget(
  id: DashboardWidgetType,
  title: string,
  subtitle: string,
  colSpan: WidgetSpan,
  order: number,
  visible = true,
): LayoutWidget {
  return { id, type: id, title, subtitle, colSpan, order, visible, config: {} };
}

export function defaultDashboardLayout(): LayoutWidget[] {
  return [
    widget("kpi-responses", "Total Jawaban Masuk", "", "1/4", 0),
    widget("kpi-forms", "Total Form", "", "1/4", 1),
    widget("kpi-active", "Form Aktif", "Bisa diisi responden", "1/4", 2),
    widget("kpi-draft", "Form Draft", "Belum dipublikasikan", "1/4", 3),
    widget("chart-daily", "Jawaban per Hari", "", "2/3", 4),
    widget("daily-summary", "Daily Report Hari Ini", "Capaian input unit", "1/4", 5),
    widget("daily-indicators", "Kartu Indikator Daily Report", "Capaian 7 hari terakhir", "full", 6, false),
    widget("recent-forms", "Form Terbaru & Status Feeding", "Status form dan jumlah jawaban.", "2/3", 7),
    widget("backup", "Backup & Sync", "Google Sheets · Drive · Storage", "1/4", 8),
  ];
}

function normalizeOrder(widgets: LayoutWidget[]): LayoutWidget[] {
  return [...widgets].sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }));
}

function isSpan(value: unknown): value is WidgetSpan {
  return value === "1/4" || value === "1/2" || value === "2/3" || value === "full";
}

function mergeLayout(saved: LayoutWidget[], defaults: LayoutWidget[]): LayoutWidget[] {
  if (saved.length === 0) return normalizeOrder(defaults);
  const known = new Map(defaults.map((item) => [item.id, item]));
  const kept = saved
    .filter((item) => known.has(item.id))
    .map((item) => {
      const base = known.get(item.id)!;
      return {
        ...base,
        title: typeof item.title === "string" ? item.title : base.title,
        subtitle: typeof item.subtitle === "string" ? item.subtitle : base.subtitle,
        colSpan: isSpan(item.colSpan) ? item.colSpan : base.colSpan,
        order: Number.isFinite(item.order) ? item.order : base.order,
        visible: item.visible !== false,
        config: { ...base.config, ...item.config },
      };
    });
  const keptIds = new Set(kept.map((item) => item.id));
  const maxOrder = kept.reduce((max, item) => Math.max(max, item.order), -1);
  const added = defaults
    .filter((item) => !keptIds.has(item.id))
    .map((item, index) => ({ ...item, order: maxOrder + 1 + index }));
  return normalizeOrder([...kept, ...added]);
}

export function resolveDashboardLayout(saved: LayoutWidget[]): LayoutWidget[] {
  return mergeLayout(saved, defaultDashboardLayout());
}

/** Indicator cards follow the metric list; an empty title means "use the metric name". */
export function defaultMetricLayout(metrics: DailyMetric[]): LayoutWidget[] {
  return metrics.map((metric, order) => ({
    id: metric.id,
    type: "metric-card",
    title: "",
    subtitle: "",
    colSpan: "1/4",
    order,
    visible: true,
    config: {},
  }));
}

export function resolveMetricLayout(saved: LayoutWidget[], metrics: DailyMetric[]): LayoutWidget[] {
  return mergeLayout(saved, defaultMetricLayout(metrics));
}

/** Moves `activeId` to the position of `overId` and renumbers `order`. */
export function moveWidget(widgets: LayoutWidget[], activeId: string, overId: string): LayoutWidget[] {
  const list = normalizeOrder(widgets);
  const from = list.findIndex((item) => item.id === activeId);
  const to = list.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return list;
  const [moved] = list.splice(from, 1);
  if (moved) list.splice(to, 0, moved);
  return list.map((item, order) => ({ ...item, order }));
}

/** Generic array move used by the builder and metric lists. */
export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}
