import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { KeyRound, Save, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { RequireAdmin, useAdminAccess } from "@/components/fk/access/AdminAccess";
import { PageTitle } from "@/components/fk/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, credentialsSchema, type CredentialsValues } from "@/lib/formkanwil/auth";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Akun & Akses — FormKanwil" },
      { name: "description", content: "Akun administrator, username dan password admin, serta akses responden FormKanwil." },
      { property: "og:title", content: "Akun & Akses — FormKanwil" },
      { property: "og:description", content: "Akun administrator dan akses FormKanwil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  return (
    <RequireAdmin title="Akun & Akses">
      <AccessContent />
    </RequireAdmin>
  );
}

function AccessContent() {
  const { user } = useAdminAccess();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { currentPassword: "", username: user?.username ?? "", newPassword: "", confirmPassword: "" },
  });
  if (!user) return null;

  async function onSubmit(values: CredentialsValues) {
    if (!user) return;
    const result = await auth.updateCredentials(user.id, values);
    if (!result.ok) {
      setError(result.field ?? "currentPassword", { message: result.error });
      return;
    }
    reset({ currentPassword: "", username: values.username.trim(), newPassword: "", confirmPassword: "" });
    toast.success("Akun admin diperbarui");
  }

  const fieldError = (message?: string) =>
    message ? <p className="text-xs font-medium text-destructive-foreground">{message}</p> : null;

  return (
    <div className="space-y-6">
      <PageTitle title="Akun & Akses" subtitle="Siapa yang bisa mengedit dashboard dan bagaimana responden mengisi form." />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
              <ShieldCheck className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold">{user.name}</h2>
              <p className="mt-0.5 break-all text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <Badge variant="solid">Admin</Badge>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2" noValidate>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="acc-current">Password saat ini</Label>
              <Input id="acc-current" type="password" autoComplete="current-password" {...register("currentPassword")} />
              {fieldError(errors.currentPassword?.message)}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="acc-username">Username</Label>
              <Input id="acc-username" autoComplete="username" {...register("username")} />
              {fieldError(errors.username?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-new">Password baru</Label>
              <Input id="acc-new" type="password" autoComplete="new-password" placeholder="Kosongkan jika tetap" {...register("newPassword")} />
              {fieldError(errors.newPassword?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-confirm">Ulangi password baru</Label>
              <Input id="acc-confirm" type="password" autoComplete="new-password" {...register("confirmPassword")} />
              {fieldError(errors.confirmPassword?.message)}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                <Save /> Simpan akun
              </Button>
            </div>
          </form>
        </section>

        <div className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-mint-soft text-primary">
                <KeyRound className="size-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-bold">Login admin</h3>
                <p className="text-xs text-muted-foreground">
                  {auth.mode === "local"
                    ? "Mode lokal — akun tersimpan di browser ini sampai Lovable Cloud diaktifkan."
                    : "Terhubung ke server — akun dicek di server."}
                </p>
              </div>
              <Badge variant={auth.mode === "local" ? "warning" : "solid"}>{auth.mode === "local" ? "Lokal" : "Aktif"}</Badge>
            </div>
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-mint-soft text-primary">
                <Users className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">Akses publik & responden</h3>
                <p className="text-xs text-muted-foreground">
                  Pengunjung melihat dashboard dalam Mode Lihat. Responden mengisi form dengan kode 6 karakter.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
