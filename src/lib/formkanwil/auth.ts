import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { isKinerjaArea, KINERJA_AREAS, type KinerjaArea } from "./kinerja";
import { uid } from "./logic";
import { getDb, setCloudUser, setDb, setSession } from "./store";
import type { Role, User } from "./types";

/*
 * Sign-in boundary. The UI only knows `auth` methods; credential checks, Google OAuth, and
 * 6-digit Email OTP live here, never in route components.
 *
 * - When `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` are configured: runs in "cloud" mode
 *   using Supabase Auth (Google OAuth + 6-digit Email OTP) with email whitelist verification
 *   against the `user_access` table.
 * - Otherwise: runs in "local" demo mode (browser storage + local demo OTP preview) so the app
 *   and all tests work seamlessly before backend secrets are plugged in.
 */
export type SignInResult = { ok: true; user: User } | { ok: false; error: string };
export type OtpRequestResult =
  | { ok: true; mode: "cloud" | "local"; demoCode?: string }
  | { ok: false; error: string };
export type GoogleSignInResult = { ok: true } | { ok: false; error: string };
export type UpdateResult = { ok: true } | { ok: false; error: string; field?: "currentPassword" | "username" };
export type AreaUserResult =
  | { ok: true; user: User }
  | { ok: false; error: string; field?: "username" | "assignedArea" | "email" };

export type CloudSyncEvent =
  | { status: "signed_in"; user: User; fresh: boolean }
  | { status: "unauthorized"; email: string; error: string }
  | { status: "signed_out" };

export interface CloudAccessEntry {
  id: string;
  email: string;
  name: string;
  role: Role;
  assignedArea: KinerjaArea | null;
  active: boolean;
  createdAt: string;
}

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

export const emailOtpRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi.")
    .email("Masukkan alamat email yang valid.")
    .max(120, "Email maksimal 120 karakter."),
});
export type EmailOtpRequestValues = z.infer<typeof emailOtpRequestSchema>;

export const emailOtpVerifySchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode verifikasi harus terdiri dari 6 digit angka."),
});
export type EmailOtpVerifyValues = z.infer<typeof emailOtpVerifySchema>;

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
  email: z
    .string()
    .trim()
    .email("Format email tidak valid.")
    .max(120, "Email maksimal 120 karakter.")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password minimal 8 karakter.").max(128, "Password terlalu panjang."),
  assignedArea: z.enum(KINERJA_AREAS, { message: "Pilih wilayah/area yang valid." }),
});
export type AreaUserValues = z.infer<typeof areaUserSchema>;

export const cloudAccessSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80, "Nama maksimal 80 karakter."),
    email: z.string().trim().email("Format email tidak valid.").max(120, "Email maksimal 120 karakter."),
    role: z.enum(["admin", "user"]),
    assignedArea: z.enum(KINERJA_AREAS).nullable(),
  })
  .refine((value) => value.role === "admin" || value.assignedArea !== null, {
    path: ["assignedArea"],
    message: "Pilih wilayah/area untuk akun non-admin.",
  });
export type CloudAccessValues = z.infer<typeof cloudAccessSchema>;

export interface AuthAdapter {
  readonly mode: "local" | "cloud";
  /** Option A: Send 6-digit verification code to email (Supabase Auth in cloud mode, demo preview in local mode). */
  requestEmailOtp(email: string): Promise<OtpRequestResult>;
  /** Option A: Verify the 6-digit code sent to email and sign in. */
  verifyEmailOtp(email: string, code: string): Promise<SignInResult>;
  /** Option A: Start Google OAuth sign-in via Supabase Auth. */
  signInWithGoogle(): Promise<GoogleSignInResult>;
  /** Subscribe to cloud auth session changes (Google OAuth callback, page reload, sign-out). */
  initSessionListener(onEvent?: (event: CloudSyncEvent) => void): () => void;
  /** Legacy / local demo username + password sign-in. */
  signIn(values: LoginValues): Promise<SignInResult>;
  signOut(): Promise<void>;
  updateCredentials(userId: string, values: CredentialsValues): Promise<UpdateResult>;
  createAreaUser(values: AreaUserValues): Promise<AreaUserResult>;
  seedDemoAreaUsers(): Promise<{ created: number; passwordHint: string }>;
  updateAreaUser(userId: string, patch: { assignedArea?: KinerjaArea; active?: boolean }): void;
  removeAreaUser(userId: string): void;
  /** Cloud whitelist management (Supabase `user_access` table). */
  listCloudAccess(): Promise<{ ok: true; items: CloudAccessEntry[] } | { ok: false; error: string }>;
  upsertCloudAccess(
    values: CloudAccessValues,
  ): Promise<{ ok: true; item: CloudAccessEntry } | { ok: false; error: string }>;
  updateCloudAccess(
    id: string,
    patch: { assignedArea?: KinerjaArea | null; active?: boolean },
  ): Promise<{ ok: true } | { ok: false; error: string }>;
  removeCloudAccess(id: string): Promise<{ ok: true } | { ok: false; error: string }>;
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

function randomOtpCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  const value = (bytes[0] ?? 123456) % 1_000_000;
  return String(value).padStart(6, "0");
}

const INVALID = "Username atau password salah.";
const OTP_TTL_MS = 5 * 60 * 1000;

interface PendingLocalOtp {
  code: string;
  expiresAt: number;
}

const pendingLocalOtps = new Map<string, PendingLocalOtp>();

const DEMO_AREA_BY_USERNAME = new Map<string, KinerjaArea>(
  KINERJA_AREAS.map((area) => [`area.${area.toLowerCase()}`, area]),
);

interface RawAccessRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  assigned_area: string | null;
  active: boolean;
  created_at: string;
}

function mapCloudRowToAccess(row: RawAccessRow): CloudAccessEntry {
  const role: Role = row.role === "admin" ? "admin" : "user";
  const area = row.assigned_area && isKinerjaArea(row.assigned_area) ? row.assigned_area : null;
  return {
    id: row.id,
    email: row.email.toLowerCase(),
    name: row.name?.trim() || row.email.split("@")[0] || "Pengguna",
    role,
    assignedArea: role === "admin" ? null : area,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

async function resolveCloudUser(
  authUser: SupabaseAuthUser,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  const email = authUser.email?.trim().toLowerCase();
  if (!supabase || !email) {
    return { ok: false, error: "Akun tidak memiliki alamat email yang valid." };
  }

  const { data, error } = await supabase
    .from("user_access")
    .select("id, email, name, role, assigned_area, active, created_at")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    const code = error.code ?? "";
    if (code === "42P01" || code === "PGRST205") {
      return {
        ok: false,
        error:
          "Tabel `user_access` belum dibuat di Supabase. Jalankan SQL setup yang disiapkan terlebih dahulu di Supabase SQL Editor.",
      };
    }
    return { ok: false, error: `Gagal memeriksa hak akses: ${error.message}` };
  }

  if (!data) {
    return {
      ok: false,
      error: `Email ${email} belum terdaftar di daftar akses Kanwil. Hubungi Admin Kanwil untuk mendaftarkan email Anda.`,
    };
  }

  const row = mapCloudRowToAccess(data as RawAccessRow);
  if (!row.active) {
    return {
      ok: false,
      error: `Akun ${email} sedang dinonaktifkan. Hubungi Admin Kanwil.`,
    };
  }

  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const providerRaw = authUser.app_metadata?.provider;
  const provider: User["provider"] = providerRaw === "google" ? "google" : "email_otp";
  const fullName =
    row.name ||
    (typeof meta["full_name"] === "string" ? meta["full_name"] : "") ||
    (typeof meta["name"] === "string" ? meta["name"] : "") ||
    email.split("@")[0] ||
    "Pengguna";
  const avatarUrl = typeof meta["avatar_url"] === "string" ? meta["avatar_url"] : undefined;

  const user: User = {
    id: authUser.id,
    username: email.split("@")[0] || email,
    name: fullName,
    email,
    role: row.role,
    assignedArea: row.assignedArea,
    active: true,
    provider,
    ...(avatarUrl ? { avatarUrl } : {}),
    createdAt: row.createdAt || authUser.created_at || new Date().toISOString(),
  };

  return { ok: true, user };
}

function formatSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("security purposes") || lower.includes("429")) {
    return "Terlalu banyak permintaan kode. Tunggu sekitar 60 detik lalu coba lagi.";
  }
  if (lower.includes("token has expired") || lower.includes("invalid") || lower.includes("otp")) {
    return "Kode verifikasi salah atau sudah kedaluwarsa. Minta kode baru dan coba lagi.";
  }
  if (lower.includes("provider is not enabled")) {
    return "Login Google belum diaktifkan di Supabase Dashboard (Authentication -> Providers -> Google).";
  }
  return message;
}

async function ensureLocalDemoAreasIfNeeded(emailOrUsername: string) {
  const lower = emailOrUsername.toLowerCase();
  const matchingUsername = lower.includes("@") ? lower.split("@")[0] ?? "" : lower;
  const expectedDemoArea = DEMO_AREA_BY_USERNAME.get(matchingUsername);
  if (!expectedDemoArea) return;

  const existing = getDb().users.find(
    (item) =>
      item.username.toLowerCase() === matchingUsername || item.email.toLowerCase() === lower,
  );
  if (!existing && !getDb().users.some((item) => item.role !== "admin")) {
    await authAdapter.seedDemoAreaUsers();
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

const authAdapter: AuthAdapter = {
  get mode() {
    return isSupabaseConfigured ? "cloud" : "local";
  },

  async requestEmailOtp(rawEmail) {
    const parsed = emailOtpRequestSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Email tidak valid." };
    }
    const email = parsed.data.email.toLowerCase();

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        return { ok: false, error: formatSupabaseAuthError(error.message) };
      }
      return { ok: true, mode: "cloud" };
    }

    // Local demo fallback (before Supabase env vars are added)
    await ensureLocalDemoAreasIfNeeded(email);
    const matched = getDb().users.find((item) => item.email.toLowerCase() === email);
    if (!matched) {
      return {
        ok: false,
        error: `Email ${email} belum terdaftar. Gunakan email contoh (mis. admin@kanwil.pegadaian.co.id atau area.manado@kanwil.pegadaian.co.id) atau daftarkan di Akun & Akses.`,
      };
    }
    if (!matched.active) {
      return { ok: false, error: "Akun ini sedang dinonaktifkan. Hubungi admin Kanwil." };
    }
    const code = randomOtpCode();
    pendingLocalOtps.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS });
    return { ok: true, mode: "local", demoCode: code };
  },

  async verifyEmailOtp(rawEmail, rawCode) {
    const parsed = emailOtpVerifySchema.safeParse({ email: rawEmail, code: rawCode });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Kode verifikasi tidak valid." };
    }
    const email = parsed.data.email.toLowerCase();
    const code = parsed.data.code;

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error || !data.user) {
        return {
          ok: false,
          error: formatSupabaseAuthError(error?.message ?? "Kode verifikasi tidak valid."),
        };
      }
      const resolved = await resolveCloudUser(data.user);
      if (!resolved.ok) {
        await supabase.auth.signOut();
        setCloudUser(null);
        return resolved;
      }
      setCloudUser(resolved.user);
      return { ok: true, user: resolved.user };
    }

    // Local demo fallback
    const pending = pendingLocalOtps.get(email);
    if (!pending) {
      return { ok: false, error: "Belum ada kode aktif untuk email ini. Klik Kirim Kode terlebih dahulu." };
    }
    if (Date.now() > pending.expiresAt) {
      pendingLocalOtps.delete(email);
      return { ok: false, error: "Kode verifikasi sudah kedaluwarsa. Minta kode baru." };
    }
    if (pending.code !== code) {
      return { ok: false, error: "Kode 6 digit tidak sesuai. Periksa kembali kode Anda." };
    }
    pendingLocalOtps.delete(email);

    const user = getDb().users.find((item) => item.email.toLowerCase() === email);
    if (!user) return { ok: false, error: "Akun tidak ditemukan." };
    if (!user.active) {
      return { ok: false, error: "Akun ini sedang dinonaktifkan. Hubungi admin Kanwil." };
    }
    setSession(user.id);
    return { ok: true, user };
  },

  async signInWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        ok: false,
        error:
          "Login Google membutuhkan koneksi Supabase. Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di .env.local (atau Vercel) dan aktifkan provider Google di Supabase.",
      };
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        ...(redirectTo ? { redirectTo } : {}),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return { ok: false, error: formatSupabaseAuthError(error.message) };
    }
    return { ok: true };
  },

  initSessionListener(onEvent) {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    let active = true;
    let lastNotifiedUserId: string | null = null;

    const handleAuthUser = async (authUser: SupabaseAuthUser | null, fresh: boolean) => {
      if (!active) return;
      if (!authUser) {
        lastNotifiedUserId = null;
        setCloudUser(null);
        onEvent?.({ status: "signed_out" });
        return;
      }

      const resolved = await resolveCloudUser(authUser);
      if (!active) return;

      if (!resolved.ok) {
        lastNotifiedUserId = null;
        setCloudUser(null);
        await supabase.auth.signOut();
        onEvent?.({
          status: "unauthorized",
          email: authUser.email ?? "",
          error: resolved.error,
        });
        return;
      }

      const isNewSession = lastNotifiedUserId !== resolved.user.id;
      lastNotifiedUserId = resolved.user.id;
      setCloudUser(resolved.user);
      if (isNewSession) {
        onEvent?.({ status: "signed_in", user: resolved.user, fresh });
      }
    };

    const hadOAuthCallback =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        window.location.search.includes("code="));

    void supabase.auth.getSession().then(({ data }) => {
      void handleAuthUser(data.session?.user ?? null, hadOAuthCallback);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        void handleAuthUser(session?.user ?? null, true);
      } else if (event === "TOKEN_REFRESHED") {
        void handleAuthUser(session?.user ?? null, false);
      } else if (event === "SIGNED_OUT") {
        void handleAuthUser(null, false);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  },

  async signIn(values) {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: INVALID };
    const username = parsed.data.username.toLowerCase();
    await ensureLocalDemoAreasIfNeeded(username);

    const user = getDb().users.find((item) => item.username.toLowerCase() === username);
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
    setCloudUser(null);
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
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
    const email = (parsed.data.email?.trim() || `${username}@kanwil.pegadaian.co.id`).toLowerCase();
    const taken = getDb().users.some((item) => item.username.toLowerCase() === username);
    if (taken) {
      return { ok: false, error: "Username sudah dipakai.", field: "username" };
    }
    const emailTaken = getDb().users.some((item) => item.email.toLowerCase() === email);
    if (emailTaken) {
      return { ok: false, error: "Email sudah dipakai akun lain.", field: "email" };
    }
    const salt = randomSalt();
    const passwordHash = await hashPassword(parsed.data.password, salt);
    const user: User = {
      id: uid("usr"),
      username,
      name: parsed.data.name.trim(),
      email,
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
      const result = await authAdapter.createAreaUser({
        name: `Tim Area ${area}`,
        username,
        email: `${username}@kanwil.pegadaian.co.id`,
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

  async listCloudAccess() {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase belum terhubung." };
    const { data, error } = await supabase
      .from("user_access")
      .select("id, email, name, role, assigned_area, active, created_at")
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      items: ((data ?? []) as RawAccessRow[]).map(mapCloudRowToAccess),
    };
  },

  async upsertCloudAccess(values) {
    const parsed = cloudAccessSchema.safeParse(values);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Data akses tidak valid." };
    }
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase belum terhubung." };

    const payload = {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      role: parsed.data.role,
      assigned_area: parsed.data.role === "admin" ? null : parsed.data.assignedArea,
      active: true,
    };

    const { data, error } = await supabase
      .from("user_access")
      .upsert(payload, { onConflict: "email" })
      .select("id, email, name, role, assigned_area, active, created_at")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Gagal menyimpan email akses." };
    }
    return { ok: true, item: mapCloudRowToAccess(data as RawAccessRow) };
  },

  async updateCloudAccess(id, patch) {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase belum terhubung." };
    const updatePayload: Record<string, unknown> = {};
    if (patch.assignedArea !== undefined) updatePayload["assigned_area"] = patch.assignedArea;
    if (patch.active !== undefined) updatePayload["active"] = patch.active;
    const { error } = await supabase.from("user_access").update(updatePayload).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async removeCloudAccess(id) {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase belum terhubung." };
    const { error } = await supabase.from("user_access").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};

export const auth: AuthAdapter = authAdapter;
