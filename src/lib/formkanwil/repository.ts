import { createDailyReportDemo } from "./demo-daily-report";
import { assignFeedingForms, type FeedingAssignment } from "./daily-report";
import { generateCode, nextSchemaVersion, submitResponse, uid, type SubmitResult } from "./logic";
import { getDb, setDb } from "./store";
import type {
  Answers,
  BackupLog,
  DailyReportConfig,
  Form,
  IntegrationSettings,
  LayoutKey,
  LayoutWidget,
  ThemeSettings,
} from "./types";
import type { RespondentIdentity } from "./logic";

/*
 * Data access boundary for FormKanwil. Pages call `repository.*` instead of touching storage.
 * Today it is backed by browser storage (store.ts); a Cloud adapter implementing the same
 * interface can replace `localRepository` without changing any page.
 */
export interface FormKanwilRepository {
  readonly mode: "local" | "cloud";
  forms: {
    create(input?: Partial<Pick<Form, "title" | "questions" | "pages">>): Form;
    save(form: Form): Form;
    setActive(formId: string, active: boolean): void;
    remove(formId: string): void;
    generateCode(): string;
  };
  responses: {
    submit(params: { formId: string; answers: Answers; respondent: RespondentIdentity }): SubmitResult;
  };
  dailyReport: {
    saveConfig(config: DailyReportConfig, feeding: FeedingAssignment): void;
    loadDemo(): void;
  };
  theme: {
    save(theme: ThemeSettings): void;
  };
  layout: {
    /** Persists the "Atur Tampilan" JSON layout; an empty array restores the default. */
    save(key: LayoutKey, widgets: LayoutWidget[]): void;
    reset(key: LayoutKey): void;
  };
  integrations: {
    save(settings: IntegrationSettings): void;
    syncSheets(): void;
    triggerBackup(kind: BackupLog["kind"]): BackupLog;
    exportSnapshot(): Blob;
  };
}

function createLocalRepository(): FormKanwilRepository {
  return {
    mode: "local",
    forms: {
      create(input) {
        const now = new Date().toISOString();
        const firstPageId = uid("page");
        const form: Form = {
          id: uid("frm"),
          code: generateCode(getDb()),
          title: input?.title ?? "",
          description: "",
          emoji: "📝",
          active: false,
          status: "draft",
          pages: input?.pages ?? [{ id: firstPageId, title: "Halaman 1" }],
          questions: (input?.questions ?? []).map((q) => ({
            ...q,
            pageId: q.pageId ?? input?.pages?.[0]?.id ?? firstPageId,
          })),
          feedingSlot: null,
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
        };
        setDb((d) => ({ ...d, forms: [...d.forms, form] }));
        return form;
      },
      save(form) {
        const previous = getDb().forms.find((f) => f.id === form.id);
        const next: Form = {
          ...form,
          schemaVersion: nextSchemaVersion(previous, form),
          updatedAt: new Date().toISOString(),
        };
        setDb((d) => ({ ...d, forms: d.forms.map((f) => (f.id === next.id ? next : f)) }));
        return next;
      },
      setActive(formId, active) {
        setDb((d) => ({
          ...d,
          forms: d.forms.map((f) =>
            f.id === formId
              ? { ...f, active, status: active ? "active" : "closed", updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },
      remove(formId) {
        setDb((d) => ({
          ...d,
          forms: d.forms.filter((f) => f.id !== formId),
          responses: d.responses.filter((r) => r.formId !== formId),
        }));
      },
      generateCode() {
        return generateCode(getDb());
      },
    },
    responses: {
      submit(params) {
        const result = submitResponse(getDb(), params);
        if (result.ok) setDb(result.db);
        return result;
      },
    },
    dailyReport: {
      saveConfig(config, feeding) {
        setDb((d) => ({
          ...d,
          forms: assignFeedingForms(d.forms, feeding),
          dailyReport: { ...config, updatedAt: new Date().toISOString() },
        }));
      },
      loadDemo() {
        setDb((d) => createDailyReportDemo(d));
      },
    },
    theme: {
      save(theme) {
        setDb((d) => ({ ...d, theme }));
      },
    },
    layout: {
      save(key, widgets) {
        const clean = widgets.map((item, order) => ({ ...item, order }));
        setDb((d) => ({ ...d, [key]: clean }));
      },
      reset(key) {
        setDb((d) => ({ ...d, [key]: [] }));
      },
    },
    integrations: {
      save(settings) {
        setDb((d) => ({ ...d, integrations: settings }));
      },
      syncSheets() {
        setDb((d) => ({
          ...d,
          integrations: { ...d.integrations, lastSyncAt: new Date().toISOString() },
        }));
      },
      triggerBackup(kind) {
        const snapshot = JSON.stringify(getDb());
        const log: BackupLog = {
          id: uid("bkp"),
          at: new Date().toISOString(),
          kind,
          target: "storage",
          status: "success",
          sizeBytes: new Blob([snapshot]).size,
          note: "Snapshot disimpan di browser (mode lokal).",
        };
        setDb((d) => ({ ...d, backups: [log, ...d.backups].slice(0, 50) }));
        return log;
      },
      exportSnapshot() {
        return new Blob([JSON.stringify(getDb(), null, 2)], { type: "application/json" });
      },
    },
  };
}

export const repository: FormKanwilRepository = createLocalRepository();
