import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { ErrorNote, Spinner } from "@/components/fk/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  auth,
  DEMO_AREA_PASSWORD,
  emailOtpRequestSchema,
  loginSchema,
  type EmailOtpRequestValues,
  type LoginValues,
} from "@/lib/formkanwil/auth";
import { KINERJA_AREAS } from "@/lib/formkanwil/kinerja";
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

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const isCloud = auth.mode === "cloud";

  // Option A primary state: Google OAuth + 6-digit Email OTP
  const [step, setStep] = useState<"email" | "otp">("email");
  const [targetEmail, setTargetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapsible local password fallback (only shown in local demo mode)
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<EmailOtpRequestValues>({
    resolver: zodResolver(emailOtpRequestSchema),
    defaultValues: { email: "" },
  });

  const legacyForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!open) {
      setStep("email");
      setTargetEmail("");
      setOtpCode("");
      setDemoCode(null);
      setCooldown(0);
      setGoogleLoading(false);
      setVerifyingOtp(false);
      setError(null);
      setShowLegacyLogin(false);
      setShowPassword(false);
      emailForm.reset({ email: "" });
      legacyForm.reset({ username: "", password: "" });
    }
  }, [open, emailForm, legacyForm]);

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
        description: `Periksa kotak masuk (atau folder Spam) ${email} untuk kode 6 digit.`,
      });
    } else if (result.demoCode) {
      toast.info(`Kode OTP demo lokal: ${result.demoCode}`, {
        description: "Email sungguhan akan terkirim otomatis setelah Supabase dihubungkan.",
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
    onOpenChange(false);
    toast.success(`Selamat datang, ${result.user.name}`, {
      description:
        result.user.role === "admin"
          ? "Admin Mode aktif — kamu bisa mengakses dan mengelola semua wilayah."
          : result.user.assignedArea
            ? `Akses Potensi Bisnis aktif untuk wilayah Area ${result.user.assignedArea}.`
            : "Kamu berhasil masuk.",
    });
  }

  async function handleResendOtp() {
    if (cooldown > 0 || !targetEmail) return;
    await handleSendOtp({ email: targetEmail });
  }

  async function handleLegacySubmit(values: LoginValues) {
    setError(null);
    const result = await auth.signIn(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    toast.success(`Selamat datang, ${result.user.name}`, {
      description:
        result.user.role === "admin"
          ? "Admin Mode aktif — kamu bisa mengedit dan melihat semua wilayah."
          : result.user.assignedArea
            ? `Akses Potensi Bisnis aktif untuk wilayah Area ${result.user.assignedArea}.`
            : "Kamu berhasil masuk.",
    });
  }

  function fillDemoEmail(email: string) {
    setError(null);
    setStep("email");
    emailForm.setValue("email", email, { shouldValidate: true });
  }

  function fillLegacyDemo(username: string, password: string) {
    setError(null);
    legacyForm.setValue("username", username, { shouldValidate: true });
    legacyForm.setValue("password", password, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-md sm:p-6">
        <DialogHeader>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
              <ShieldCheck className="size-5" />
            </span>
            <span
              className={cn(
                "pill",
                isCloud ? "bg-mint-soft text-mint-foreground" : "bg-gold-soft text-gold-foreground",
              )}
            >
              {isCloud ? "Supabase Auth Aktif" : "Mode Demo Lokal"}
            </span>
          </div>
          <DialogTitle className="font-display text-xl font-extrabold">
            {step === "otp" ? "Masukkan Kode Verifikasi" : "Masuk ke Dashboard"}
          </DialogTitle>
          <DialogDescription>
            {step === "otp"
              ? `Masukkan 6 digit kode yang dikirim ke ${targetEmail}.`
              : "Masuk dengan akun Google atau kode verifikasi 6 digit yang dikirim ke email terdaftar Anda."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <div className="space-y-4">
            {/* Option A-1: Google OAuth */}
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

            {/* Divider */}
            <div className="relative flex items-center py-0.5">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                atau kode via email
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Option A-2: 6-Digit Email OTP Request */}
            <form onSubmit={emailForm.handleSubmit(handleSendOtp)} className="space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Alamat Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@pegadaian.co.id atau gmail.com"
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

              <Button type="submit" className="h-11 w-full rounded-xl" disabled={emailForm.formState.isSubmitting}>
                {emailForm.formState.isSubmitting ? (
                  <Spinner className="size-4 text-primary-foreground" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Kirim Kode 6 Digit ke Email
              </Button>
            </form>
          </div>
        ) : (
          /* Step 2: Enter 6-Digit OTP */
          <div className="space-y-4">
            {demoCode && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/70 px-3.5 py-2.5 text-xs text-gold-foreground">
                <span>
                  Kode demo lokal: <strong className="font-mono text-sm tracking-widest">{demoCode}</strong>
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
                  if (digits.length === 6) {
                    void handleVerifyOtp(digits);
                  }
                }}
                autoFocus
              >
                <InputOTPGroup className="gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-12 w-10 rounded-xl border font-mono text-lg font-bold sm:h-12 sm:w-11"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-center text-xs text-muted-foreground">
                Kode berlaku beberapa menit. Cek folder <strong>Inbox</strong> atau <strong>Spam</strong>.
              </p>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <Button
              type="button"
              className="h-11 w-full rounded-xl"
              disabled={verifyingOtp || otpCode.length !== 6}
              onClick={() => void handleVerifyOtp()}
            >
              {verifyingOtp ? <Spinner className="size-4 text-primary-foreground" /> : <ShieldCheck className="size-4" />}
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
                onClick={() => void handleResendOtp()}
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

        {/* Local Demo Helpers & Legacy Password Toggle (hidden once Supabase Cloud is active) */}
        {!isCloud && step === "email" && (
          <div className="mt-1 space-y-3 border-t border-border pt-3.5">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Uji coba kode email cepat (mode lokal)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {KINERJA_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => fillDemoEmail(`area.${area.toLowerCase()}@kanwil.pegadaian.co.id`)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-mint-soft hover:text-mint-foreground"
                  >
                    <MapPin className="size-3 text-primary" /> {area}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fillDemoEmail("admin@kanwil.pegadaian.co.id")}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold-foreground transition-opacity hover:opacity-90"
                >
                  <ShieldCheck className="size-3" /> Admin
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowLegacyLogin((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>Masuk dengan username &amp; password lokal</span>
                <ChevronDown className={cn("size-4 transition-transform", showLegacyLogin && "rotate-180")} />
              </button>

              {showLegacyLogin && (
                <form
                  onSubmit={legacyForm.handleSubmit(handleLegacySubmit)}
                  className="mt-2.5 space-y-3 rounded-xl border border-border bg-muted/30 p-3"
                  noValidate
                >
                  <div className="space-y-1">
                    <Label htmlFor="login-username" className="text-xs">Username</Label>
                    <Input
                      id="login-username"
                      autoComplete="username"
                      className="h-9 bg-card text-sm"
                      {...legacyForm.register("username")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password" className="text-xs">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="h-9 bg-card pr-10 text-sm"
                        {...legacyForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => fillLegacyDemo("admin", "Kanwil@2026")}
                      className="rounded-md bg-gold-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-gold-foreground"
                    >
                      admin
                    </button>
                    {KINERJA_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => fillLegacyDemo(`area.${area.toLowerCase()}`, DEMO_AREA_PASSWORD)}
                        className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        area.{area.toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={legacyForm.formState.isSubmitting}>
                    <Lock className="size-3.5" /> Masuk dengan Password
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
