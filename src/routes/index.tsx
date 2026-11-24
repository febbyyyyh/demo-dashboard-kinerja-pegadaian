import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, CalendarCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { GoogleMark } from "@/components/fk/GoogleMark";
import { PegadaianLogo } from "@/components/fk/Logo";
import { ErrorNote, Spinner } from "@/components/fk/States";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/formkanwil/auth";
import { homePathFor, setSession } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk Admin — FormKanwil Pegadaian Kanwil Manado" },
      {
        name: "description",
        content:
          "Masuk dengan akun Google untuk mengelola form, Daily Report, dan rekap data Pegadaian Kanwil Manado.",
      },
      { property: "og:title", content: "Masuk Admin — FormKanwil" },
      {
        property: "og:description",
        content: "Portal pengumpulan data & Daily Report PT Pegadaian Kantor Wilayah Manado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  { icon: CalendarCheck2, title: "Daily Report otomatis", text: "Kartu indikator, rekap area & cabang dari form feeding." },
  { icon: BarChart3, title: "Rekap siap bagikan", text: "Ekspor JPEG, CSV, dan PDF dengan kop resmi." },
  { icon: ShieldCheck, title: "Akses aman", text: "Masuk dengan akun Google terverifikasi." },
];

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(null);
  }, []);

  async function signIn() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await auth.signInWithGoogle();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.demo) {
      toast.info("Mode demo aktif", {
        description: "Login Google sungguhan aktif setelah backend terhubung.",
      });
    }
    navigate({ to: homePathFor(result.user), replace: true });
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-auth p-10 text-on-hero lg:flex lg:flex-col xl:p-14">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-on-hero/15 font-display text-sm font-extrabold ring-1 ring-on-hero/25">
            FK
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-extrabold">FormKanwil</div>
            <div className="text-sm text-on-hero-muted">PT Pegadaian · Kantor Wilayah Manado</div>
          </div>
        </div>

        <div className="my-auto max-w-xl py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-on-hero/10 px-3 py-1 text-xs font-semibold ring-1 ring-on-hero/20">
            <Sparkles className="size-3.5" /> Platform Data & Daily Report
          </span>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">
            Satu pintu untuk data harian seluruh unit Kanwil.
          </h1>
          <p className="mt-5 max-w-md text-lg text-on-hero-muted">
            Susun form, kumpulkan laporan UPC, dan pantau capaian area hingga unit — tanpa rekap
            manual.
          </p>

          <ul className="mt-10 grid gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-2xl bg-on-hero/[0.07] p-4 ring-1 ring-on-hero/15 backdrop-blur-sm"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-primary-deep">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-on-hero-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-on-hero-muted">
          Wilayah layanan: Sulawesi Utara · Gorontalo · Maluku Utara
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full border-[48px] border-on-hero/5"
        />
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-page-in">
          <PegadaianLogo className="h-10" />
          <h2 className="mt-10 font-display text-3xl font-extrabold tracking-tight">
            Masuk ke Dashboard Admin
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan akun Google kantor Anda yang telah terdaftar sebagai admin Kanwil.
          </p>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-8 h-12 w-full text-base"
            onClick={signIn}
            disabled={loading}
          >
            {loading ? <Spinner className="size-5" /> : <GoogleMark className="!size-5" />}
            Masuk dengan Google
          </Button>

          {error && <ErrorNote className="mt-4">{error}</ErrorNote>}

          <div className="my-8 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
          </div>

          <div className="panel p-4">
            <div className="text-sm font-semibold">Ingin mengisi form?</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Responden tidak perlu login — cukup masukkan kode form 6 karakter.
            </p>
            <Button asChild variant="secondary" size="sm" className="mt-3">
              <Link to="/app">Masukkan kode form</Link>
            </Button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Dengan masuk, Anda menyetujui kebijakan penggunaan data internal PT Pegadaian.
          </p>
        </div>
      </section>
    </main>
  );
}
