import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, MapPin, ShieldCheck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { auth, DEMO_AREA_PASSWORD, loginSchema, type LoginValues } from "@/lib/formkanwil/auth";
import { KINERJA_AREAS } from "@/lib/formkanwil/kinerja";

export function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function fillDemo(username: string, password: string) {
    setError(null);
    setValue("username", username, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
  }

  useEffect(() => {
    if (!open) {
      reset({ username: "", password: "" });
      setError(null);
      setShowPassword(false);
    }
  }, [open, reset]);

  async function onSubmit(values: LoginValues) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-sm">
        <DialogHeader>
          <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
            <ShieldCheck className="size-6" />
          </span>
          <DialogTitle className="font-display text-xl font-extrabold">Masuk ke Dashboard</DialogTitle>
          <DialogDescription>
            Masuk dengan akun Admin Kanwil atau akun Wilayah/Area untuk mengakses data Potensi Bisnis sesuai area Anda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              autoComplete="username"
              autoFocus
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
            {errors.username && <p className="text-xs font-medium text-destructive-foreground">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-11"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-mint-soft hover:text-mint-foreground"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs font-medium text-destructive-foreground">{errors.password.message}</p>}
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="size-4 text-primary-foreground" /> : <Lock />} Masuk
          </Button>
        </form>

        <div className="mt-1 space-y-2 border-t border-border pt-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Akun dummy cepat (klik untuk isi otomatis)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {KINERJA_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => fillDemo(`area.${area.toLowerCase()}`, DEMO_AREA_PASSWORD)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-mint-soft hover:text-mint-foreground"
              >
                <MapPin className="size-3 text-primary" /> {area}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fillDemo("admin", "Kanwil@2026")}
              className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold-foreground transition-opacity hover:opacity-90"
            >
              <ShieldCheck className="size-3" /> Admin
            </button>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Area: area.&lt;wilayah&gt; / {DEMO_AREA_PASSWORD} · Admin: admin / Kanwil@2026
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
