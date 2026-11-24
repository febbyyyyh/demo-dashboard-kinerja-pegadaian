import { getDb, setSession } from "./store";
import type { User } from "./types";

/*
 * Sign-in boundary. The UI only knows `signInWithGoogle` / `signOut`.
 * Local (demo) mode signs in as the single Kanwil admin; a Cloud adapter will run the
 * real Google OAuth flow behind the same functions.
 */
export type SignInResult = { ok: true; user: User; demo: boolean } | { ok: false; error: string };

export interface AuthAdapter {
  readonly mode: "demo" | "cloud";
  signInWithGoogle(): Promise<SignInResult>;
  signOut(): Promise<void>;
}

const demoAuth: AuthAdapter = {
  mode: "demo",
  async signInWithGoogle() {
    const admin = getDb().users.find((user) => user.role === "admin");
    if (!admin) return { ok: false, error: "Akun admin tidak ditemukan. Muat ulang aplikasi." };
    if (!admin.active) {
      return { ok: false, error: "Akun kamu sedang dinonaktifkan. Hubungi admin Kanwil." };
    }
    setSession(admin.id);
    return { ok: true, user: admin, demo: true };
  },
  async signOut() {
    setSession(null);
  },
};

export const auth: AuthAdapter = demoAuth;
