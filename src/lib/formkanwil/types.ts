export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  /** Legacy field from the old password login. Stripped on load; never set again. */
  password?: string;
  name: string;
  email: string;
  tagline?: string;
  role: Role;
  /** Assigned Pegadaian Area for regional accounts (used to scope Potensi Bisnis access). */
  assignedArea?: string | null;
  active: boolean;
  /** SHA-256 hex of `${passwordSalt}:${password}`; checked only inside auth.ts. */
  passwordHash?: string;
  passwordSalt?: string;
  /** Identity provider used to sign in. */
  provider?: "password" | "google" | "email_otp";
  avatarUrl?: string;
  createdAt: string;
}

export type QuestionType =
  "short" | "long" | "single" | "multiple" | "dropdown" | "rating" | "number" | "date";

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required: boolean;
  options?: string[];
  optionMetadata?: Array<Record<string, string>>;
  optionMetadataColumns?: string[];
  pageId?: string;
}

export interface FormPage {
  id: string;
  title: string;
}

/** A form can feed the Daily Report through one of two slots. */
export type FeedingSlot = 1 | 2;

export interface Form {
  id: string;
  code: string;
  title: string;
  description: string;
  emoji: string;
  active: boolean;
  status?: "draft" | "active" | "closed";
  pages?: FormPage[];
  questions: Question[];
  /** Which Daily Report feed this form supplies, if any. */
  feedingSlot?: FeedingSlot | null;
  /** Bumped every time the question structure changes (used by Sheets backup columns). */
  schemaVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export type AnswerValue = string | string[] | number;
export type Answers = Record<string, AnswerValue | undefined>;

export interface FormResponse {
  id: string;
  formId: string;
  userId: string | null;
  respondentName: string;
  respondentEmail: string;
  answers: Answers;
  submittedAt: string;
}

/* ---------------- Daily Report ---------------- */

export type MetricAggregation = "sum" | "avg" | "count";

export interface MetricViews {
  indicator: boolean;
  area: boolean;
  branch: boolean;
  unit: boolean;
}

export interface DailyMetric {
  id: string;
  name: string;
  /** Display unit, e.g. "Rp", "%", "Nasabah", "Unit". */
  unit: string;
  slot: FeedingSlot;
  /** Question in the feeding form whose answers produce the value (not needed for "count"). */
  questionId: string | null;
  aggregation: MetricAggregation;
  /** Target per unit for the selected period; null = no target. */
  target: number | null;
  views: MetricViews;
}

/** How a feeding form identifies the reporting unit (UPC) and its branch/area. */
export interface FeedingSourceMapping {
  slot: FeedingSlot;
  unitQuestionId: string | null;
  areaColumn: string | null;
  branchColumn: string | null;
}

export interface DailyReportConfig {
  title: string;
  /** "HH:mm", 24h. */
  backupTime: string;
  driveFolderId: string;
  sources: FeedingSourceMapping[];
  metrics: DailyMetric[];
  updatedAt: string | null;
}

/* ---------------- Theme & integrations ---------------- */

export type ThemePresetId = "emerald" | "forest" | "teal" | "custom";
export type ThemeFontId = "jakarta" | "inter" | "dmsans";
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeSettings {
  preset: ThemePresetId;
  /** Used when preset is "custom". #RRGGBB */
  customPrimary: string;
  font: ThemeFontId;
  /** Color mode: light, dark, or follow OS preference. */
  mode?: ThemeMode;
  /** Data URLs (browser storage) until file storage is connected. */
  logoUrl: string | null;
  faviconUrl: string | null;
  bannerUrl: string | null;
}

export interface IntegrationSettings {
  sheetsUrl: string;
  sheetsConnected: boolean;
  lastSyncAt: string | null;
}

export type BackupStatus = "success" | "failed";

export interface BackupLog {
  id: string;
  at: string;
  kind: "scheduled" | "manual";
  target: "storage" | "drive" | "sheets";
  status: BackupStatus;
  sizeBytes: number;
  note?: string;
}

/* ---------------- Layout (Atur Tampilan) ---------------- */

export type WidgetSpan = "1/4" | "1/2" | "2/3" | "full";

export type DashboardWidgetType =
  | "kpi-responses"
  | "kpi-forms"
  | "kpi-active"
  | "kpi-draft"
  | "chart-daily"
  | "daily-summary"
  | "daily-indicators"
  | "recent-forms"
  | "backup";

/** Daily Report widgets are the indicator cards; their id is the metric id. */
export type LayoutWidgetType = DashboardWidgetType | "metric-card";

export interface LayoutWidget {
  id: string;
  type: LayoutWidgetType;
  title: string;
  subtitle: string;
  colSpan: WidgetSpan;
  order: number;
  visible: boolean;
  config: Record<string, string | number | boolean>;
}

export type LayoutKey = "dashboardLayout" | "dailyReportLayout";

export interface Database {
  version: 1;
  users: User[];
  forms: Form[];
  responses: FormResponse[];
  dailyReport: DailyReportConfig;
  theme: ThemeSettings;
  integrations: IntegrationSettings;
  backups: BackupLog[];
  /** Empty array = use the default layout. */
  dashboardLayout: LayoutWidget[];
  dailyReportLayout: LayoutWidget[];
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  short: "Jawaban singkat",
  long: "Paragraf",
  single: "Pilihan ganda",
  multiple: "Kotak centang",
  dropdown: "Dropdown",
  rating: "Rating bintang",
  number: "Angka",
  date: "Tanggal",
};

export const CHOICE_TYPES: QuestionType[] = ["single", "multiple", "dropdown"];
