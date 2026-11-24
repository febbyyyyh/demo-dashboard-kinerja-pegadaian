import type {
  Database,
  DailyReportConfig,
  IntegrationSettings,
  ThemeSettings,
} from "./types";

export function createDefaultDailyReportConfig(): DailyReportConfig {
  return {
    title: "Daily Report Kanwil Manado",
    backupTime: "18:00",
    driveFolderId: "",
    sources: [
      { slot: 1, unitQuestionId: null, areaColumn: null, branchColumn: null },
      { slot: 2, unitQuestionId: null, areaColumn: null, branchColumn: null },
    ],
    metrics: [],
    updatedAt: null,
  };
}

export function createDefaultTheme(): ThemeSettings {
  return {
    preset: "emerald",
    customPrimary: "#146C43",
    font: "jakarta",
    logoUrl: null,
    faviconUrl: null,
    bannerUrl: null,
  };
}

export function createDefaultIntegrations(): IntegrationSettings {
  return { sheetsUrl: "", sheetsConnected: false, lastSyncAt: null };
}

export function createInitialDatabase(): Database {
  return {
    version: 1,
    users: [
      {
        id: "usr_admin",
        username: "admin",
        name: "Admin Kanwil",
        email: "admin@kanwil.pegadaian.co.id",
        role: "admin",
        active: true,
        provider: "google",
        createdAt: new Date().toISOString(),
      },
    ],
    forms: [],
    responses: [],
    dailyReport: createDefaultDailyReportConfig(),
    theme: createDefaultTheme(),
    integrations: createDefaultIntegrations(),
    backups: [],
  };
}
