import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  BarChart3,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { ErrorNote, Spinner } from "@/components/fk/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  auth,
  DEMO_AREA_PASSWORD,
  emailOtpRequestSchema,
  type EmailOtpRequestValues,
} from "@/lib/formkanwil/auth";
import { useThemeSettings } from "@/lib/formkanwil/hooks";
import { repository } from "@/lib/formkanwil/repository";
import { resolveThemeMode } from "@/lib/formkanwil/theme";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

const HIGHLIGHTS = [
  {
    icon: BarChart3,
    title: "Hierarki 3 Tingkat",
    desc: "Agregasi & filter otomatis Area → Cabang → Unit (UPC) pada 8 modul kinerja.",
  },
  {
    icon: Lock,
    title: "Kontrol Akses Wilayah",
    desc: "Autentikasi Google OAuth & OTP 6 digit dengan pembatasan akses per wilayah.",
  },
  {
    icon: FileSpreadsheet,
    title: "Ekspor Laporan Resmi",
    desc: "Unduh laporan siap presentasi dalam format Excel (CSV), PDF, dan JPEG.",
  },
];

export function DemoLoginGate() {
  const theme = useThemeSettings();
  const isDark = resolveThemeMode(theme.mode ?? "light") === "dark";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [targetEmail, setTargetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"admin" | "area" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<EmailOtpRequestValues>({
    resolver: zodResolver(emailOtpRequestSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const toggleColorMode = () => {
    repository.theme.save({ ...theme, mode: isDark ? "light" : "dark" });
  };

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    const result = await auth.signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok) {
      setError(result.error);
    }
  }

  async function handleSendOtp(values: EmailOtpRequestValues) {
    setError(null);
    const email = values.email.trim().toLowerCase();
    const result = await auth.requestEmailOtp(email);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTargetEmail(email);
    setOtpCode("");
    setDemoCode(result.demoCode ?? null);
    setCooldown(60);
    setStep("otp");

    if (result.mode === "cloud") {
      toast.success("Kode verifikasi terkirim", {
        description: `Periksa kotak masuk ${email} untuk kode 6 digit.`,
      });
    } else if (result.demoCode) {
      toast.info(`Kode OTP simulasi: ${result.demoCode}`, {
        description: "Masukkan kode 6 digit tersebut untuk masuk.",
      });
    }
  }

  async function handleVerifyOtp(codeOverride?: string) {
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi yang dikirim ke email.");
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    const result = await auth.verifyEmailOtp(targetEmail, code);
    setVerifyingOtp(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`Selamat datang, ${result.user.name}`);
  }

  async function enterDemo(role: "admin" | "area") {
    setError(null);
    setDemoLoading(role);
    const result =
      role === "admin"
        ? await auth.signIn({ username: "admin", password: "Kanwil@2026" })
        : await auth.signIn({ username: "area.manado", password: DEMO_AREA_PASSWORD });
    setDemoLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(
      role === "admin"
        ? "Masuk Mode Demo (Akses Penuh Admin)"
        : "Masuk Mode Demo (Akses Terbatas Area Manado)",
      {
        description: "Seluruh angka yang ditampilkan adalah data simulasi portofolio.",
      },
    );
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-gradient-hero text-foreground">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand font-display text-xs font-extrabold text-primary-foreground shadow-brand">
            DK
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-extrabold tracking-tight sm:text-base">
              Dashboard Kinerja Regional
            </div>
            <div className="text-[11px] text-muted-foreground">Demo Portofolio · Data Simulasi</div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleColorMode}
          aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          className="size-9 rounded-xl bg-card"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-6 sm:px-6 lg:py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          {/* Left Column: Product Overview */}
          <section className="space-y-5">
            <Badge className="gap-1.5 rounded-full border-0 bg-mint-soft px-3 py-1 text-xs font-semibold text-mint-foreground hover:bg-mint-soft">
              <ShieldCheck className="size-3.5" /> Akses Terproteksi · Demo Portofolio
            </Badge>

            <div className="space-y-2.5">
              <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Sistem Pemantauan Kinerja Regional Berbasis Web
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Portal analitik kinerja multi-wilayah untuk memantau target, realisasi, tren bulanan,
                dan capaian KPI secara terstruktur dari level <strong>Area</strong> hingga{" "}
                <strong>Unit Pelayanan</strong>.
              </p>
            </div>

            <div className="grid gap-3 pt-1 sm:grid-cols-3 lg:grid-cols-1">
              {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card/80 p-3.5 shadow-card backdrop-blur-sm"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint-soft text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">{title}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Column: Login Card */}
          <section className="panel w-full p-5 sm:p-7">
            <div className="mb-5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold tracking-tight">
                  {step === "otp" ? "Verifikasi Kode Email" : "Masuk ke Dashboard"}
                </h2>
                <span className="pill bg-gold-soft text-gold-foreground">Demo Portofolio</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {step === "otp"
                  ? `Masukkan 6 digit kode verifikasi yang dikirim ke ${targetEmail}.`
                  : "Akses dashboard dilindungi login Google & Kode OTP Email. Gunakan tombol demo di bawah untuk meninjau aplikasi dengan data simulasi."}
              </p>
            </div>

            {step === "email" ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full gap-2.5 rounded-xl border-border bg-card font-semibold hover:bg-muted/60"
                  disabled={googleLoading}
                  onClick={() => void handleGoogleLogin()}
                >
                  {googleLoading ? <Spinner className="size-4" /> : <GoogleIcon className="size-4" />}
                  Lanjutkan dengan Google
                </Button>

                <div className="relative flex items-center py-0.5">
                  <div className="flex-1 border-t border-border" />
                  <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    atau kode via email
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-3" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="gate-email">Alamat Email Terdaftar</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="gate-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nama@email.com"
                        className="h-11 rounded-xl pl-9"
                        aria-invalid={Boolean(emailForm.formState.errors.email)}
                        {...emailForm.register("email")}
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className="text-xs font-medium text-destructive-foreground">
                        {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {error && <ErrorNote>{error}</ErrorNote>}

                  <Button
                    type="submit"
                    variant="secondary"
                    className="h-10 w-full rounded-xl font-semibold"
                    disabled={emailForm.formState.isSubmitting}
                  >
                    {emailForm.formState.isSubmitting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}
                    Kirim Kode 6 Digit ke Email
                  </Button>
                </form>

                {/* Primary 1-Click Portfolio Demo Access */}
                <div className="space-y-2.5 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Akses Demo Cepat (Tanpa Akun)
                    </span>
                    <span className="text-[11px] font-medium text-primary">100% Data Simulasi</span>
                  </div>

                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl font-bold shadow-brand"
                    disabled={demoLoading !== null}
                    onClick={() => void enterDemo("admin")}
                  >
                    {demoLoading === "admin" ? (
                      <Spinner className="size-4 text-primary-foreground" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Masuk Demo (Data Simulasi)
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full rounded-xl text-xs font-semibold"
                    disabled={demoLoading !== null}
                    onClick={() => void enterDemo("area")}
                  >
                    {demoLoading === "area" ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <MapPin className="size-3.5 text-primary" />
                    )}
                    Coba Demo Akses Terbatas (Khusus Area Manado)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {demoCode && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/70 px-3.5 py-2.5 text-xs text-gold-foreground">
                    <span>
                      Kode OTP simulasi: <strong className="font-mono text-sm tracking-widest">{demoCode}</strong>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-lg bg-card px-2.5 text-xs"
                      onClick={() => {
                        setOtpCode(demoCode);
                        void handleVerifyOtp(demoCode);
                      }}
                    >
                      Isi &amp; Masuk
                    </Button>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3 py-1">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(val) => {
                      const digits = val.replace(/\D/g, "");
                      setOtpCode(digits);
                      if (digits.length === 6) void handleVerifyOtp(digits);
                    }}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-1.5 sm:gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-12 w-10 rounded-xl border font-mono text-lg font-bold sm:w-11"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <Button
                  type="button"
                  className="h-11 w-full rounded-xl"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  onClick={() => void handleVerifyOtp()}
                >
                  {verifyingOtp ? (
                    <Spinner className="size-4 text-primary-foreground" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Verifikasi &amp; Masuk
                </Button>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                      setOtpCode("");
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" /> Ganti email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0}
                    onClick={() => void handleSendOtp({ email: targetEmail })}
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      cooldown > 0 ? "cursor-not-allowed text-muted-foreground/60" : "text-primary hover:underline",
                    )}
                  >
                    <RefreshCw className="size-3.5" />
                    {cooldown > 0 ? `Kirim ulang (${cooldown}d)` : "Kirim ulang kode"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
        Versi Demo Portofolio — Seluruh angka, nama unit, dan statistik bersifat simulasi dan tidak memuat data internal instansi mana pun.
      </footer>
    </div>
  );
}
