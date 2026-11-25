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
    mode: "light",
    logoUrl: null,
    faviconUrl: null,
    bannerUrl: null,
  };
}

export function createDefaultIntegrations(): IntegrationSettings {
  return { sheetsUrl: "", sheetsConnected: false, lastSyncAt: null };
}

/*
 * Initial admin credential (admin / the password chosen by Kanwil), stored only as a salted
 * SHA-256 hash. Browser-local until Cloud auth replaces it; change it in Akun & Akses.
 */
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD_SALT = "fk-kanwil-manado-v1";
export const DEFAULT_ADMIN_PASSWORD_HASH =
  "2d1c845c81b002be34d33e11cdcc47d1913145a7ab567049d1b3055a98feb1d9";

export function createInitialDatabase(): Database {
  return {
    version: 1,
    users: [
      {
        id: "usr_admin",
        username: DEFAULT_ADMIN_USERNAME,
        name: "Admin Kanwil",
        email: "admin@kanwil.pegadaian.co.id",
        role: "admin",
        active: true,
        provider: "password",
        passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
        passwordSalt: DEFAULT_ADMIN_PASSWORD_SALT,
        createdAt: new Date().toISOString(),
      },
    ],
    forms: [],
    responses: [],
    dailyReport: createDefaultDailyReportConfig(),
    theme: createDefaultTheme(),
    integrations: createDefaultIntegrations(),
    backups: [],
    dashboardLayout: [],
    dailyReportLayout: [],
  };
}
