import { subDays } from "date-fns";

import { createDefaultDailyReportConfig } from "./seed";
import type { Database, DailyMetric, Form, FormResponse, Question } from "./types";

/*
 * Optional sample data so the Daily Report views can be previewed before real forms exist.
 * Loaded only when the admin clicks "Muat data contoh"; the app still starts empty.
 */

export const DEMO_FORM_IDS = ["frm_demo_feed1", "frm_demo_feed2"] as const;

const UNITS: Array<[code: string, name: string, branch: string, area: string]> = [
  ["10101", "UPC Tikala", "CP Manado Timur", "Area Manado"],
  ["10102", "UPC Paal Dua", "CP Manado Timur", "Area Manado"],
  ["10201", "UPC Tomohon", "CP Tondano", "Area Manado"],
  ["10202", "UPC Langowan", "CP Tondano", "Area Manado"],
  ["20101", "UPC Girian", "CP Bitung", "Area Bitung"],
  ["20102", "UPC Airmadidi", "CP Bitung", "Area Bitung"],
  ["20201", "UPC Kotamobagu Barat", "CP Kotamobagu", "Area Bitung"],
  ["20202", "UPC Lolak", "CP Kotamobagu", "Area Bitung"],
  ["30101", "UPC Limboto", "CP Gorontalo", "Area Gorontalo"],
  ["30102", "UPC Telaga", "CP Gorontalo", "Area Gorontalo"],
  ["30201", "UPC Ternate Selatan", "CP Ternate", "Area Gorontalo"],
  ["30202", "UPC Tobelo", "CP Ternate", "Area Gorontalo"],
];

const COLUMNS = ["Kode UPC", "Nama UPC", "Cabang", "Area"];

function unitQuestion(id: string, pageId: string): Question {
  return {
    id,
    type: "dropdown",
    label: "Unit Pelayanan Cabang (UPC)",
    required: true,
    pageId,
    options: UNITS.map(([code, name]) => `${code} - ${name}`),
    optionMetadataColumns: COLUMNS,
    optionMetadata: UNITS.map(([code, name, branch, area]) => ({
      "Kode UPC": code,
      "Nama UPC": name,
      Cabang: branch,
      Area: area,
    })),
  };
}

/** Small deterministic PRNG so the sample looks the same on every load. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function createDailyReportDemo(db: Database, now = new Date()): Database {
  const iso = now.toISOString();
  const feed1: Form = {
    id: DEMO_FORM_IDS[0],
    code: "DRB001",
    title: "Daily Report Bisnis UPC",
    description: "Input capaian bisnis harian setiap UPC sebelum pukul 17.00 WITA.",
    emoji: "📊",
    active: true,
    status: "active",
    pages: [{ id: "page_drb", title: "Capaian harian" }],
    questions: [
      unitQuestion("q_drb_unit", "page_drb"),
      { id: "q_drb_omzet", type: "number", label: "Omzet gadai hari ini (Rp)", required: true, pageId: "page_drb" },
      { id: "q_drb_nasabah", type: "number", label: "Jumlah nasabah baru", required: true, pageId: "page_drb" },
      { id: "q_drb_emas", type: "number", label: "Penjualan Tabungan Emas (gram)", required: false, pageId: "page_drb" },
    ],
    feedingSlot: 1,
    schemaVersion: 1,
    createdAt: iso,
    updatedAt: iso,
  };
  const feed2: Form = {
    id: DEMO_FORM_IDS[1],
    code: "LAH002",
    title: "Laporan Aktivitas Harian",
    description: "Kunjungan nasabah dan kualitas layanan per UPC.",
    emoji: "📣",
    active: true,
    status: "active",
    pages: [{ id: "page_lah", title: "Aktivitas" }],
    questions: [
      unitQuestion("q_lah_unit", "page_lah"),
      { id: "q_lah_kunjungan", type: "number", label: "Jumlah kunjungan nasabah", required: true, pageId: "page_lah" },
      { id: "q_lah_rating", type: "rating", label: "Penilaian kualitas layanan hari ini", required: true, pageId: "page_lah" },
    ],
    feedingSlot: 2,
    schemaVersion: 1,
    createdAt: iso,
    updatedAt: iso,
  };

  const rand = random(42);
  const responses: FormResponse[] = [];
  for (let day = 13; day >= 0; day--) {
    const date = subDays(now, day);
    UNITS.forEach(([code, name], index) => {
      const strength = 0.65 + (index % 5) * 0.12;
      const label = `${code} - ${name}`;
      const at = new Date(date);
      at.setHours(9 + Math.floor(rand() * 7), Math.floor(rand() * 60), 0, 0);
      if (day === 0 && at > now) at.setTime(now.getTime() - (index + 1) * 60_000);
      if (rand() < (day === 0 ? 0.7 : 0.88)) {
        responses.push({
          id: `rsp_demo1_${day}_${code}`,
          formId: feed1.id,
          userId: null,
          respondentName: `Pengelola ${name}`,
          respondentEmail: `upc${code}@pegadaian.co.id`,
          submittedAt: at.toISOString(),
          answers: {
            q_drb_unit: label,
            q_drb_omzet: String(Math.round((9 + rand() * 12) * strength) * 1_000_000),
            q_drb_nasabah: String(Math.round((2 + rand() * 6) * strength)),
            q_drb_emas: String(Math.round((4 + rand() * 12) * strength)),
          },
        });
      }
      if (rand() < (day === 0 ? 0.6 : 0.8)) {
        responses.push({
          id: `rsp_demo2_${day}_${code}`,
          formId: feed2.id,
          userId: null,
          respondentName: `Pengelola ${name}`,
          respondentEmail: `upc${code}@pegadaian.co.id`,
          submittedAt: new Date(at.getTime() + 20 * 60_000).toISOString(),
          answers: {
            q_lah_unit: label,
            q_lah_kunjungan: String(Math.round((10 + rand() * 18) * strength)),
            q_lah_rating: Math.min(5, Math.max(3, Math.round(3 + rand() * 2.4))),
          },
        });
      }
    });
  }

  const allViews = { indicator: true, area: true, branch: true, unit: true };
  const metrics: DailyMetric[] = [
    { id: "met_omzet", name: "Omzet Gadai", unit: "Rp", slot: 1, questionId: "q_drb_omzet", aggregation: "sum", target: 15_000_000, views: allViews },
    { id: "met_nasabah", name: "Nasabah Baru", unit: "Nasabah", slot: 1, questionId: "q_drb_nasabah", aggregation: "sum", target: 5, views: allViews },
    { id: "met_emas", name: "Tabungan Emas", unit: "gram", slot: 1, questionId: "q_drb_emas", aggregation: "sum", target: 10, views: { ...allViews, unit: false } },
    { id: "met_kunjungan", name: "Kunjungan Nasabah", unit: "Nasabah", slot: 2, questionId: "q_lah_kunjungan", aggregation: "sum", target: 18, views: allViews },
    { id: "met_rating", name: "Kualitas Layanan", unit: "/5", slot: 2, questionId: "q_lah_rating", aggregation: "avg", target: 4.5, views: { ...allViews, area: false } },
    { id: "met_laporan", name: "Laporan Masuk", unit: "Laporan", slot: 1, questionId: null, aggregation: "count", target: 1, views: { ...allViews, unit: false } },
  ];

  const demoIds = new Set<string>(DEMO_FORM_IDS);
  return {
    ...db,
    forms: [
      ...db.forms
        .filter((form) => !demoIds.has(form.id))
        .map((form) => (form.feedingSlot ? { ...form, feedingSlot: null } : form)),
      feed1,
      feed2,
    ],
    responses: [...db.responses.filter((r) => !demoIds.has(r.formId)), ...responses],
    dailyReport: {
      ...createDefaultDailyReportConfig(),
      driveFolderId: db.dailyReport.driveFolderId,
      backupTime: db.dailyReport.backupTime,
      sources: [
        { slot: 1, unitQuestionId: "q_drb_unit", areaColumn: "Area", branchColumn: "Cabang" },
        { slot: 2, unitQuestionId: "q_lah_unit", areaColumn: "Area", branchColumn: "Cabang" },
      ],
      metrics,
      updatedAt: iso,
    },
  };
}
