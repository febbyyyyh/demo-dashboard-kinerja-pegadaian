import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { format, parseISO, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";

import {
  computeUnitRows,
  getFeedingForm,
  periodDays,
  reportAreas,
  reportBranches,
  type ReportFilter,
  type UnitRow,
} from "@/lib/formkanwil/daily-report";
import { useDb } from "@/lib/formkanwil/store";
import type { Database, Form } from "@/lib/formkanwil/types";

interface DailyReportState {
  db: Database;
  filter: ReportFilter;
  setFilter: (patch: Partial<ReportFilter>) => void;
  /** Unit rows for the selected period/area/branch. */
  rows: UnitRow[];
  /** All areas/branches available in the period (ignores the area/branch filter). */
  areas: string[];
  branches: string[];
  days: number;
  periodLabel: string;
  feeding: { 1: Form | undefined; 2: Form | undefined };
  ready: boolean;
}

const Context = createContext<DailyReportState | null>(null);

function defaultFilter(): ReportFilter {
  const today = new Date();
  return {
    from: format(subDays(today, 6), "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
    area: null,
    branch: null,
  };
}

/** Survives view switches (each admin page remounts) within the session. */
let rememberedFilter: ReportFilter | null = null;

export function formatPeriod(filter: Pick<ReportFilter, "from" | "to">) {
  const from = parseISO(filter.from);
  const to = parseISO(filter.to);
  if (filter.from === filter.to) return format(from, "d MMMM yyyy", { locale: localeId });
  return `${format(from, "d MMM", { locale: localeId })} – ${format(to, "d MMM yyyy", { locale: localeId })}`;
}

export function DailyReportProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const [filter, setFilterState] = useState<ReportFilter>(() => rememberedFilter ?? defaultFilter());

  const value = useMemo<DailyReportState>(() => {
    const allRows = computeUnitRows(db, { ...filter, area: null, branch: null });
    const feeding = { 1: getFeedingForm(db.forms, 1), 2: getFeedingForm(db.forms, 2) };
    return {
      db,
      filter,
      setFilter: (patch) =>
        setFilterState((current) => {
          const next = { ...current, ...patch };
          if (patch.area !== undefined && patch.branch === undefined) next.branch = null;
          if (next.from > next.to) [next.from, next.to] = [next.to, next.from];
          rememberedFilter = next;
          return next;
        }),
      rows: computeUnitRows(db, filter),
      areas: reportAreas(allRows),
      branches: reportBranches(allRows, filter.area),
      days: periodDays(filter),
      periodLabel: formatPeriod(filter),
      feeding,
      ready: Boolean((feeding[1] || feeding[2]) && db.dailyReport.metrics.length > 0),
    };
  }, [db, filter]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDailyReport() {
  const context = useContext(Context);
  if (!context) throw new Error("useDailyReport must be used inside DailyReportProvider");
  return context;
}
