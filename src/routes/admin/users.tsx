import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, Users } from "lucide-react";

import { GoogleMark } from "@/components/fk/GoogleMark";
import { EmptyState } from "@/components/fk/States";
import { PageTitle } from "@/components/fk/StatCard";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/formkanwil/auth";
import { useDb } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Akun & Akses — FormKanwil" },
      { name: "description", content: "Akun administrator, metode masuk Google, dan akses responden FormKanwil." },
      { property: "og:title", content: "Akun & Akses — FormKanwil" },
      { property: "og:description", content: "Akun administrator dan metode masuk FormKanwil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  const db = useDb();
  const admin = db.users.find((user) => user.role === "admin");

  return (
    <div className="space-y-6">
      <PageTitle title="Akun & Akses" subtitle="Siapa yang bisa masuk ke dashboard dan bagaimana responden mengisi form." />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {admin ? (
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
                <ShieldCheck className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold">{admin.name}</h2>
                <p className="mt-0.5 break-all text-sm text-muted-foreground">{admin.email}</p>
              </div>
              <Badge variant={admin.active ? "solid" : "secondary"}>{admin.active ? "Aktif" : "Nonaktif"}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <div>
                <dt className="eyebrow">Peran</dt>
                <dd className="mt-1 text-sm font-semibold">Administrator Kanwil</dd>
              </div>
              <div>
                <dt className="eyebrow">Metode masuk</dt>
                <dd className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <GoogleMark className="size-4" /> Google
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Kata sandi</dt>
                <dd className="mt-1 text-sm font-semibold">Tidak disimpan</dd>
              </div>
            </dl>
          </section>
        ) : (
          <EmptyState emoji="🔐" title="Akun admin tidak ditemukan" description="Muat ulang aplikasi untuk memulihkan data awal." />
        )}

        <div className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-mint-soft text-primary">
                <KeyRound className="size-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-bold">Google OAuth</h3>
                <p className="text-xs text-muted-foreground">
                  {auth.mode === "demo"
                    ? "Mode demo — tombol Google masuk sebagai admin Kanwil di browser ini."
                    : "Terhubung — hanya email admin terdaftar yang bisa masuk."}
                </p>
              </div>
              <Badge variant={auth.mode === "demo" ? "warning" : "solid"}>{auth.mode === "demo" ? "Demo" : "Aktif"}</Badge>
            </div>
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-mint-soft text-primary">
                <Users className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">Akses responden</h3>
                <p className="text-xs text-muted-foreground">
                  Tanpa login — responden memasukkan kode form 6 karakter, nama, dan email.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
