import { z } from "zod";

import { parseDriveFolderId } from "./daily-report";
import type { DailyReportConfig, FeedingSlot, Form } from "./types";

export const NONE = "__none";

const slotSchema = z.union([z.literal(1), z.literal(2)]);

const metricSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().min(1, "Nama metrik wajib diisi.").max(60, "Maksimal 60 karakter."),
    unit: z.string().trim().min(1, "Satuan wajib diisi.").max(20, "Maksimal 20 karakter."),
    slot: slotSchema,
    questionId: z.string(),
    aggregation: z.enum(["sum", "avg", "count"]),
    target: z
      .string()
      .trim()
      .refine((value) => value === "" || (Number.isFinite(Number(value)) && Number(value) > 0), {
        message: "Target harus angka lebih dari 0.",
      }),
    views: z.object({
      indicator: z.boolean(),
      area: z.boolean(),
      branch: z.boolean(),
      unit: z.boolean(),
    }),
  })
  .refine((metric) => metric.aggregation === "count" || metric.questionId !== NONE, {
    path: ["questionId"],
    message: "Pilih pertanyaan sumber angka.",
  });

const sourceSchema = z.object({
  slot: slotSchema,
  unitQuestionId: z.string(),
  areaColumn: z.string(),
  branchColumn: z.string(),
});

export const dailyReportFormSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(80, "Judul maksimal 80 karakter."),
    backupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Gunakan format jam HH:MM."),
    driveFolder: z
      .string()
      .trim()
      .refine((value) => value === "" || parseDriveFolderId(value) !== null, {
        message: "Tempel ID folder atau link folder Google Drive yang valid.",
      }),
    feed1: z.string(),
    feed2: z.string(),
    sources: z.array(sourceSchema).length(2),
    metrics: z.array(metricSchema).max(24, "Maksimal 24 metrik."),
  })
  .refine((values) => values.feed1 === NONE || values.feed1 !== values.feed2, {
    path: ["feed2"],
    message: "Form ini sudah dipakai sebagai Feeding 1.",
  })
  .superRefine((values, ctx) => {
    values.metrics.forEach((metric, index) => {
      const feed = metric.slot === 1 ? values.feed1 : values.feed2;
      if (feed === NONE) {
        ctx.addIssue({
          code: "custom",
          path: ["metrics", index, "slot"],
          message: `Form Feeding ${metric.slot} belum dipilih.`,
        });
      }
    });
  });

export type DailyReportFormValues = z.infer<typeof dailyReportFormSchema>;

const orNone = (value: string | null | undefined) => value ?? NONE;
const fromNone = (value: string) => (value === NONE ? null : value);

export function toFormValues(config: DailyReportConfig, forms: Form[]): DailyReportFormValues {
  const feed = (slot: FeedingSlot) => forms.find((form) => form.feedingSlot === slot)?.id ?? NONE;
  return {
    title: config.title,
    backupTime: config.backupTime,
    driveFolder: config.driveFolderId,
    feed1: feed(1),
    feed2: feed(2),
    sources: ([1, 2] as const).map((slot) => {
      const source = config.sources.find((item) => item.slot === slot);
      return {
        slot,
        unitQuestionId: orNone(source?.unitQuestionId),
        areaColumn: orNone(source?.areaColumn),
        branchColumn: orNone(source?.branchColumn),
      };
    }),
    metrics: config.metrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      unit: metric.unit,
      slot: metric.slot,
      questionId: orNone(metric.questionId),
      aggregation: metric.aggregation,
      target: metric.target === null ? "" : String(metric.target),
      views: { ...metric.views },
    })),
  };
}

export function fromFormValues(
  values: DailyReportFormValues,
  previous: DailyReportConfig,
): { config: DailyReportConfig; feeding: Record<FeedingSlot, string | null> } {
  return {
    feeding: { 1: fromNone(values.feed1), 2: fromNone(values.feed2) },
    config: {
      ...previous,
      title: values.title.trim(),
      backupTime: values.backupTime,
      driveFolderId: values.driveFolder ? (parseDriveFolderId(values.driveFolder) ?? "") : "",
      sources: values.sources.map((source) => ({
        slot: source.slot,
        unitQuestionId: fromNone(source.unitQuestionId),
        areaColumn: fromNone(source.areaColumn),
        branchColumn: fromNone(source.branchColumn),
      })),
      metrics: values.metrics.map((metric) => ({
        id: metric.id,
        name: metric.name.trim(),
        unit: metric.unit.trim(),
        slot: metric.slot,
        questionId: metric.aggregation === "count" && metric.questionId === NONE ? null : fromNone(metric.questionId),
        aggregation: metric.aggregation,
        target: metric.target === "" ? null : Number(metric.target),
        views: { ...metric.views },
      })),
    },
  };
}
