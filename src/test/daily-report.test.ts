import { describe, expect, it } from "vitest";

import {
  assignFeedingForms,
  computeUnitRows,
  dailyInputProgress,
  groupUnitRows,
  metricTarget,
  parseDriveFolderId,
  summarizeRows,
} from "@/lib/formkanwil/daily-report";
import { createDailyReportDemo } from "@/lib/formkanwil/demo-daily-report";
import { nextSchemaVersion, nextScheduledRun } from "@/lib/formkanwil/logic";
import { tableToCsv } from "@/lib/formkanwil/report-export";
import { createInitialDatabase } from "@/lib/formkanwil/seed";
import type { Database, DailyMetric, Form, FormResponse } from "@/lib/formkanwil/types";

const views = { indicator: true, area: true, branch: true, unit: true };

function form(id: string, extra: Partial<Form> = {}): Form {
  return {
    id,
    code: id.toUpperCase().slice(0, 6).padEnd(6, "X"),
    title: id,
    description: "",
    emoji: "📝",
    active: true,
    questions: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...extra,
  };
}

function reportDb(): Database {
  const feed = form("feed", {
    feedingSlot: 1,
    questions: [
      {
        id: "unit",
        type: "dropdown",
        label: "UPC",
        required: true,
        options: ["A1", "A2", "B1"],
        optionMetadataColumns: ["Area", "Cabang"],
        optionMetadata: [
          { Area: "Area A", Cabang: "CP A" },
          { Area: "Area A", Cabang: "CP A" },
          { Area: "Area B", Cabang: "CP B" },
        ],
      },
      { id: "omzet", type: "number", label: "Omzet", required: true },
      { id: "rating", type: "rating", label: "Rating", required: true },
    ],
  });
  const at = "2026-11-20T03:00:00.000Z";
  const response = (id: string, unit: string, omzet: string, rating: number): FormResponse => ({
    id,
    formId: "feed",
    userId: null,
    respondentName: "x",
    respondentEmail: "x@y.z",
    answers: { unit, omzet, rating },
    submittedAt: at,
  });
  const metrics: DailyMetric[] = [
    { id: "m_omzet", name: "Omzet", unit: "Rp", slot: 1, questionId: "omzet", aggregation: "sum", target: 100, views },
    { id: "m_rating", name: "Rating", unit: "/5", slot: 1, questionId: "rating", aggregation: "avg", target: 4, views },
  ];
  const base = createInitialDatabase();
  return {
    ...base,
    forms: [feed],
    responses: [
      response("r1", "A1", "100", 4),
      response("r2", "A1", "50", 5),
      response("r3", "A2", "30", 3),
      response("r4", "B1", "200", 5),
    ],
    dailyReport: {
      ...base.dailyReport,
      sources: [
        { slot: 1, unitQuestionId: "unit", areaColumn: "Area", branchColumn: "Cabang" },
        { slot: 2, unitQuestionId: null, areaColumn: null, branchColumn: null },
      ],
      metrics,
    },
  };
}

const period = { from: "2026-11-20", to: "2026-11-20", area: null, branch: null };

describe("Daily Report feeding forms", () => {
  it("keeps at most two feeding forms and clears the slot from every other form", () => {
    const forms = [form("a", { feedingSlot: 1 }), form("b", { feedingSlot: 2 }), form("c")];
    const next = assignFeedingForms(forms, { 1: "c", 2: "a" });
    expect(next.map((f) => [f.id, f.feedingSlot ?? null])).toEqual([
      ["a", 2],
      ["b", null],
      ["c", 1],
    ]);
    expect(next.filter((f) => f.feedingSlot).length).toBe(2);
  });

  it("refuses the same form as both Feeding 1 and Feeding 2", () => {
    expect(() => assignFeedingForms([form("a")], { 1: "a", 2: "a" })).toThrow();
  });
});

describe("Daily Report aggregation", () => {
  it("sums per unit, then gives area subtotals and a grand total", () => {
    const db = reportDb();
    const rows = computeUnitRows(db, period);
    const metrics = db.dailyReport.metrics;
    expect(rows.find((r) => r.unit === "A1")?.values["m_omzet"]).toBe(150);

    const areas = groupUnitRows(rows, metrics, "area");
    expect(areas.find((a) => a.area === "Area A")?.values["m_omzet"]).toBe(180);
    expect(areas.find((a) => a.area === "Area B")?.values["m_omzet"]).toBe(200);
    expect(summarizeRows("total", rows, metrics).values["m_omzet"]).toBe(380);
  });

  it("averages 'Rata-rata' metrics instead of summing them", () => {
    const db = reportDb();
    const rows = computeUnitRows(db, period);
    expect(rows.find((r) => r.unit === "A1")?.values["m_rating"]).toBe(4.5);
  });

  it("filters by area and ignores answers outside the date range", () => {
    const db = reportDb();
    expect(computeUnitRows(db, { ...period, area: "Area B" }).map((r) => r.unit)).toEqual(["B1"]);
    const outside = computeUnitRows(db, { ...period, from: "2026-11-21", to: "2026-11-22" });
    expect(outside.every((r) => r.submissions === 0)).toBe(true);
  });

  it("scales the daily per-unit target by units and days for summed metrics only", () => {
    const [sum, avg] = reportDb().dailyReport.metrics;
    expect(metricTarget(sum!, 3, 7)).toBe(2100);
    expect(metricTarget(avg!, 3, 7)).toBe(4);
  });

  it("counts units that submitted today against all UPC options", () => {
    const progress = dailyInputProgress(reportDb(), "2026-11-20");
    expect(progress).toMatchObject({ reported: 3, total: 3 });
    expect(dailyInputProgress(reportDb(), "2026-11-21")).toMatchObject({ reported: 0, total: 3 });
  });
});

describe("Daily Report settings", () => {
  it("accepts a Drive folder link or ID and rejects anything else", () => {
    expect(parseDriveFolderId("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn")).toBe("1AbCdEfGhIjKlMn");
    expect(parseDriveFolderId("https://drive.google.com/drive/u/0/folders/1AbCdEfGhIjKlMn?usp=sharing")).toBe("1AbCdEfGhIjKlMn");
    expect(parseDriveFolderId("1AbCdEfGhIjKlMn")).toBe("1AbCdEfGhIjKlMn");
    expect(parseDriveFolderId("bukan link")).toBeNull();
  });

  it("schedules the next automatic backup at the configured time", () => {
    const now = new Date(2026, 10, 24, 19, 0);
    const next = nextScheduledRun("18:00", now);
    expect([next.getDate(), next.getHours(), next.getMinutes()]).toEqual([25, 18, 0]);
    expect(nextScheduledRun("20:30", now).getDate()).toBe(24);
  });

  it("bumps the schema version only when the question structure changes", () => {
    const saved = form("f", { schemaVersion: 3, questions: [{ id: "q", type: "short", label: "Nama", required: true }] });
    expect(nextSchemaVersion(saved, { ...saved, title: "Judul baru" })).toBe(3);
    expect(nextSchemaVersion(saved, { ...saved, questions: [{ id: "q", type: "short", label: "Nama lengkap", required: true }] })).toBe(4);
  });

  it("loads sample data with two feeding forms covering 12 UPCs", () => {
    const db = createDailyReportDemo(createInitialDatabase(), new Date(2026, 10, 24, 12));
    expect(db.forms.filter((f) => f.feedingSlot).map((f) => f.feedingSlot)).toEqual([1, 2]);
    expect(computeUnitRows(db, { from: "2026-11-11", to: "2026-11-24", area: null, branch: null })).toHaveLength(12);
  });
});

describe("Report exports", () => {
  it("writes CSV with a UTF-8 BOM, report metadata, and escaped formulas", () => {
    const csv = tableToCsv(
      { title: "Rekap", period: "1–7 Nov", columns: ["Unit", "Nilai"], rows: [["=HYPERLINK()", "-5"]] },
      new Date(2026, 10, 24, 9, 30),
    );
    expect(csv.startsWith("\uFEFFRekap\r\nPeriode: 1–7 Nov\r\n")).toBe(true);
    expect(csv).toContain("'=HYPERLINK()");
    expect(csv.endsWith(",-5")).toBe(true);
  });
});
