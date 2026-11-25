import { z } from "zod";

import { KINERJA_AREAS, type KinerjaArea } from "./kinerja";
import { uid } from "./logic";
import { getDb, setDb, setSession } from "./store";
import type { User } from "./types";

/*
 * Sign-in boundary. The UI only knows `signIn` / `signOut` / `updateCredentials` / area-account
 * helpers; credential checks live here, never in components. Local mode checks a salted SHA-256
 * hash stored in browser storage; a Cloud adapter will implement the same interface with real auth.
 */
export type SignInResult = { ok: true; user: User } | { ok: false; error: string };
export type UpdateResult = { ok: true } | { ok: false; error: string; field?: "currentPassword" | "username" };
export type AreaUserResult = { ok: true; user: User } | { ok: false; error: string; field?: "username" | "assignedArea" };

export const DEMO_AREA_PASSWORD = "Area@2026";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi.")
    .max(40, "Username maksimal 40 karakter."),
  password: z.string().min(1, "Password wajib diisi.").max(128, "Password terlalu panjang."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const credentialsSchema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan password saat ini."),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter.")
      .max(40, "Username maksimal 40 karakter.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Gunakan huruf, angka, titik, garis bawah, atau strip."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .max(128, "Password terlalu panjang.")
      .or(z.literal("")),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak sama.",
  });
export type CredentialsValues = z.infer<typeof credentialsSchema>;

export const areaUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(60, "Nama maksimal 60 karakter."),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(40, "Username maksimal 40 karakter.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Gunakan huruf, angka, titik, garis bawah, atau strip."),
  password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password terlalu panjang."),
  assignedArea: z.enum(KINERJA_AREAS, { message: "Pilih wilayah/area yang valid." }),
});
export type AreaUserValues = z.infer<typeof areaUserSchema>;

export interface AuthAdapter {
  readonly mode: "local" | "cloud";
  signIn(values: LoginValues): Promise<SignInResult>;
  signOut(): Promise<void>;
  updateCredentials(userId: string, values: CredentialsValues): Promise<UpdateResult>;
  createAreaUser(values: AreaUserValues): Promise<AreaUserResult>;
  seedDemoAreaUsers(): Promise<{ created: number; passwordHint: string }>;
  updateAreaUser(userId: string, patch: { assignedArea?: KinerjaArea; active?: boolean }): void;
  removeAreaUser(userId: string): void;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const INVALID = "Username atau password salah.";

const DEMO_AREA_BY_USERNAME = new Map<string, KinerjaArea>(
  KINERJA_AREAS.map((area) => [`area.${area.toLowerCase()}`, area]),
);

const localAuth: AuthAdapter = {
  mode: "local",
  async signIn(values) {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: INVALID };
    const username = parsed.data.username.toLowerCase();
    // Auto-provision or sync built-in demo area accounts so area.<wilayah> always matches its wilayah.
    const expectedDemoArea = DEMO_AREA_BY_USERNAME.get(username);
    if (expectedDemoArea) {
      const existing = getDb().users.find((item) => item.username.toLowerCase() === username);
      if (!existing && !getDb().users.some((item) => item.role !== "admin")) {
        await localAuth.seedDemoAreaUsers();
      } else if (existing && existing.role !== "admin" && existing.assignedArea !== expectedDemoArea) {
        setDb((db) => ({
          ...db,
          users: db.users.map((item) =>
            item.id === existing.id
              ? { ...item, name: `Tim Area ${expectedDemoArea}`, assignedArea: expectedDemoArea }
              : item,
          ),
        }));
      }
    }
    const user = getDb().users.find(
      (item) => item.username.toLowerCase() === username,
    );
    if (!user?.passwordHash || !user.passwordSalt) return { ok: false, error: INVALID };
    const hash = await hashPassword(parsed.data.password, user.passwordSalt);
    if (hash !== user.passwordHash) return { ok: false, error: INVALID };
    if (!user.active) {
      return { ok: false, error: "Akun ini sedang dinonaktifkan. Hubungi admin Kanwil." };
    }
    setSession(user.id);
    return { ok: true, user };
  },
  async signOut() {
    setSession(null);
  },
  async updateCredentials(userId, values) {
    const parsed = credentialsSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
    const user = getDb().users.find((item) => item.id === userId);
    if (!user?.passwordHash || !user.passwordSalt) return { ok: false, error: "Akun tidak ditemukan." };
    const current = await hashPassword(parsed.data.currentPassword, user.passwordSalt);
    if (current !== user.passwordHash) {
      return { ok: false, error: "Password saat ini salah.", field: "currentPassword" };
    }
    const username = parsed.data.username.trim();
    const taken = getDb().users.some(
      (item) => item.id !== userId && item.username.toLowerCase() === username.toLowerCase(),
    );
    if (taken) return { ok: false, error: "Username sudah dipakai.", field: "username" };
    let credential: Pick<User, "passwordHash" | "passwordSalt"> = {};
    if (parsed.data.newPassword) {
      const salt = randomSalt();
      credential = { passwordSalt: salt, passwordHash: await hashPassword(parsed.data.newPassword, salt) };
    }
    setDb((db) => ({
      ...db,
      users: db.users.map((item) => (item.id === userId ? { ...item, username, ...credential } : item)),
    }));
    return { ok: true };
  },
  async createAreaUser(values) {
    const parsed = areaUserSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Data akun area tidak valid." };
    }
    const username = parsed.data.username.trim().toLowerCase();
    const taken = getDb().users.some((item) => item.username.toLowerCase() === username);
    if (taken) {
      return { ok: false, error: "Username sudah dipakai.", field: "username" };
    }
    const salt = randomSalt();
    const passwordHash = await hashPassword(parsed.data.password, salt);
    const user: User = {
      id: uid("usr"),
      username,
      name: parsed.data.name.trim(),
      email: `${username}@kanwil.pegadaian.co.id`,
      role: "user",
      assignedArea: parsed.data.assignedArea,
      active: true,
      provider: "password",
      passwordSalt: salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    setDb((db) => ({ ...db, users: [...db.users, user] }));
    return { ok: true, user };
  },
  async seedDemoAreaUsers() {
    let created = 0;
    for (const area of KINERJA_AREAS) {
      const username = `area.${area.toLowerCase()}`;
      const existing = getDb().users.find((item) => item.username.toLowerCase() === username);
      if (existing) {
        // Ensure built-in demo account always stays matched to its namesake area
        if (existing.role !== "admin" && existing.assignedArea !== area) {
          setDb((db) => ({
            ...db,
            users: db.users.map((item) =>
              item.id === existing.id
                ? { ...item, name: `Tim Area ${area}`, assignedArea: area, active: true }
                : item,
            ),
          }));
        }
        continue;
      }
      const result = await localAuth.createAreaUser({
        name: `Tim Area ${area}`,
        username,
        password: DEMO_AREA_PASSWORD,
        assignedArea: area,
      });
      if (result.ok) created += 1;
    }
    return { created, passwordHint: DEMO_AREA_PASSWORD };
  },
  updateAreaUser(userId, patch) {
    setDb((db) => ({
      ...db,
      users: db.users.map((item) =>
        item.id === userId && item.role !== "admin" ? { ...item, ...patch } : item,
      ),
    }));
  },
  removeAreaUser(userId) {
    setDb((db) => ({
      ...db,
      users: db.users.filter((item) => !(item.id === userId && item.role !== "admin")),
    }));
  },
};

export const auth: AuthAdapter = localAuth;
