import { useSyncExternalStore } from "react";

import {
  DEFAULT_ADMIN_PASSWORD_HASH,
  DEFAULT_ADMIN_PASSWORD_SALT,
  createDefaultDailyReportConfig,
  createDefaultIntegrations,
  createDefaultTheme,
  createInitialDatabase,
} from "./seed";
import type { Database, User } from "./types";

/*
 * Browser-only persistence used by the local repository adapter (see repository.ts).
 * Pages must not write here directly; go through `repository` so a Cloud adapter can replace it.
 */
const DB_KEY = "formkanwil:db:v6";
const LEGACY_DB_KEYS = ["formkanwil:db:v2", "formkanwil:db:v3"];
const PREVIOUS_DB_KEYS = ["formkanwil:db:v5", "formkanwil:db:v4"];
const SESSION_KEY = "formkanwil:session:v2";
const LEGACY_SESSION_KEY = "formkanwil:session:v1";

const SERVER_SNAPSHOT = createInitialDatabase();
let dbCache: Database | null = null;
let sessionCache: string | null | undefined;
const listeners = new Set<() => void>();

type PreviousDatabase = Omit<
  Database,
  "users" | "dailyReport" | "theme" | "integrations" | "backups" | "dashboardLayout" | "dailyReportLayout"
> & {
  users: Array<User & { unit?: string }>;
  units?: string[];
};

function keepSingleAdmin(database: Database): Database {
  const primaryAdmin = database.users.find((user) => user.role === "admin");
  if (!primaryAdmin) return database;
  const users = database.users.filter(
    (user) => user.role !== "admin" || user.id === primaryAdmin.id,
  );
  return users.length === database.users.length ? database : { ...database, users };
}

function addRespondentIdentity(database: Database): Database {
  return {
    ...database,
    responses: database.responses.map((response) => {
      const user = response.userId
        ? database.users.find((item) => item.id === response.userId)
        : undefined;
      return {
        ...response,
        respondentName:
          response.respondentName?.trim() || user?.name || "Identitas tidak tersedia (data lama)",
        respondentEmail: response.respondentEmail?.trim() || user?.email || "",
      };
    }),
  };
}

/**
 * Fills settings added after v6, strips the legacy plain-text password and gives an admin
 * without a password hash (Google-era data) the initial credential.
 */
function withDefaults(database: Partial<Database> & Pick<Database, "users" | "forms" | "responses">): Database {
  const dailyDefaults = createDefaultDailyReportConfig();
  const daily = database.dailyReport ?? dailyDefaults;
  return {
    version: 1,
    users: database.users.map((user) => {
      if (user.password === undefined && (user.role !== "admin" || user.passwordHash)) return user;
      const clean = { ...user };
      delete clean.password;
      if (clean.role === "admin" && !clean.passwordHash) {
        clean.passwordHash = DEFAULT_ADMIN_PASSWORD_HASH;
        clean.passwordSalt = DEFAULT_ADMIN_PASSWORD_SALT;
        clean.provider = "password";
      }
      return clean;
    }),
    forms: database.forms,
    responses: database.responses,
    dailyReport: {
      ...dailyDefaults,
      ...daily,
      sources: dailyDefaults.sources.map(
        (fallback) => daily.sources?.find((source) => source.slot === fallback.slot) ?? fallback,
      ),
      metrics: daily.metrics ?? [],
    },
    theme: { ...createDefaultTheme(), ...database.theme },
    integrations: { ...createDefaultIntegrations(), ...database.integrations },
    backups: database.backups ?? [],
    dashboardLayout: database.dashboardLayout ?? [],
    dailyReportLayout: database.dailyReportLayout ?? [],
  };
}

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DB_KEY) dbCache = null;
    if (e.key === DB_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDb(): Database {
  if (!isBrowser()) return SERVER_SNAPSHOT;
  if (dbCache) return dbCache;
  try {
    for (const key of LEGACY_DB_KEYS) localStorage.removeItem(key);
    const raw = localStorage.getItem(DB_KEY);
    let database: Database;
    if (raw) {
      database = withDefaults(JSON.parse(raw) as Database);
    } else {
      const previous = PREVIOUS_DB_KEYS.map((key) => ({
        key,
        raw: localStorage.getItem(key),
      })).find((entry) => entry.raw);
      if (previous?.raw) {
        const oldDatabase = JSON.parse(previous.raw) as PreviousDatabase;
        database = withDefaults({
          version: oldDatabase.version,
          users: oldDatabase.users.map((previousUser) => {
            const user = { ...previousUser };
            delete user.unit;
            return user;
          }),
          forms: oldDatabase.forms,
          responses: oldDatabase.responses,
        });
        localStorage.removeItem(previous.key);
      } else {
        database = createInitialDatabase();
      }
    }
    database = keepSingleAdmin(addRespondentIdentity(database));
    localStorage.setItem(DB_KEY, JSON.stringify(database));
    dbCache = database;
  } catch (error) {
    console.error("Gagal memuat data FormKanwil dari penyimpanan lokal.", error);
    dbCache = createInitialDatabase();
  }
  return dbCache;
}

export function setDb(next: Database | ((db: Database) => Database)) {
  const value = keepSingleAdmin(
    addRespondentIdentity(withDefaults(typeof next === "function" ? next(getDb()) : next)),
  );
  dbCache = value;
  if (isBrowser()) localStorage.setItem(DB_KEY, JSON.stringify(value));
  emit();
}

export function getSessionUserId(): string | null {
  if (!isBrowser()) return null;
  if (sessionCache === undefined) sessionCache = sessionStorage.getItem(SESSION_KEY);
  return sessionCache;
}

export function setSession(userId: string | null) {
  sessionCache = userId;
  if (isBrowser()) {
    if (userId) sessionStorage.setItem(SESSION_KEY, userId);
    else sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }
  emit();
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  const user = getDb().users.find((u) => u.id === id);
  return user && user.active ? user : null;
}

export function useDb(): Database {
  return useSyncExternalStore(subscribe, getDb, () => SERVER_SNAPSHOT);
}

export function useCurrentUser(): User | null {
  const db = useDb();
  const id = useSyncExternalStore(subscribe, getSessionUserId, () => null);
  if (!id) return null;
  const user = db.users.find((u) => u.id === id);
  return user && user.active ? user : null;
}

export function homePathFor(user: User): "/admin" | "/app" {
  return user.role === "admin" ? "/admin" : "/app";
}

/** True only while an active admin session exists in this browser tab. */
export function useIsAdmin(): boolean {
  return useCurrentUser()?.role === "admin";
}
