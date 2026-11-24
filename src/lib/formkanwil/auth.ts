import { z } from "zod";

import { getDb, setDb, setSession } from "./store";
import type { User } from "./types";

/*
 * Sign-in boundary. The UI only knows `signIn` / `signOut` / `updateCredentials`; credential
 * checks live here, never in components. Local mode checks a salted SHA-256 hash stored in
 * browser storage; a Cloud adapter will implement the same interface with real server auth.
 */
export type SignInResult = { ok: true; user: User } | { ok: false; error: string };
export type UpdateResult = { ok: true } | { ok: false; error: string; field?: "currentPassword" | "username" };

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

export interface AuthAdapter {
  readonly mode: "local" | "cloud";
  signIn(values: LoginValues): Promise<SignInResult>;
  signOut(): Promise<void>;
  updateCredentials(userId: string, values: CredentialsValues): Promise<UpdateResult>;
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

const localAuth: AuthAdapter = {
  mode: "local",
  async signIn(values) {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: INVALID };
    const username = parsed.data.username.toLowerCase();
    const user = getDb().users.find(
      (item) => item.role === "admin" && item.username.toLowerCase() === username,
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
};

export const auth: AuthAdapter = localAuth;
