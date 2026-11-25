import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  Cloud,
  KeyRound,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { RequireAdmin, useAdminAccess } from "@/components/fk/access/AdminAccess";
import { PageTitle } from "@/components/fk/StatCard";
import { ErrorNote, Spinner } from "@/components/fk/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  areaUserSchema,
  auth,
  cloudAccessSchema,
  credentialsSchema,
  DEMO_AREA_PASSWORD,
  type AreaUserValues,
  type CloudAccessEntry,
  type CloudAccessValues,
  type CredentialsValues,
} from "@/lib/formkanwil/auth";
import { KINERJA_AREAS, type KinerjaArea } from "@/lib/formkanwil/kinerja";
import { useDb } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Akun & Akses — FormKanwil" },
      { name: "description", content: "Akun administrator, akun wilayah untuk Potensi Bisnis, serta akses Google & Kode OTP Email." },
      { property: "og:title", content: "Akun & Akses — FormKanwil" },
      { property: "og:description", content: "Akun administrator, akun area, dan akses FormKanwil." },
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

function CloudAccessManager({ currentEmail }: { currentEmail: string }) {
  const [entries, setEntries] = useState<CloudAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<CloudAccessValues>({
    resolver: zodResolver(cloudAccessSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "user",
      assignedArea: KINERJA_AREAS[0],
    },
  });

  const selectedRole = form.watch("role");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await auth.listCloudAccess();
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setEntries(result.items);
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function onAddCloudAccess(values: CloudAccessValues) {
    const result = await auth.upsertCloudAccess({
      ...values,
      assignedArea: values.role === "admin" ? null : values.assignedArea,
    });
    if (!result.ok) {
      toast.error("Gagal menyimpan akses", { description: result.error });
      return;
    }
    form.reset({
      name: "",
      email: "",
      role: "user",
      assignedArea: values.assignedArea ?? KINERJA_AREAS[0],
    });
    toast.success(`Akses ${result.item.email} disimpan`, {
      description:
        result.item.role === "admin"
          ? "Hak akses Admin Kanwil aktif."
          : `Potensi Bisnis dikunci untuk Area ${result.item.assignedArea}.`,
    });
    await loadEntries();
  }

  return (
    <section className="panel space-y-4 p-4 sm:space-y-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
              Daftar Email Akses (Google &amp; Kode OTP Email)
            </h2>
            <Badge variant="solid" className="gap-1">
              <Cloud className="size-3" /> Supabase
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Hanya email yang terdaftar dan aktif di sini yang dapat masuk via <strong>Google</strong> atau{" "}
            <strong>Kode OTP 6 Digit</strong>.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadEntries()} disabled={loading}>
          <RefreshCw className="size-4" /> Muat ulang
        </Button>
      </div>

      <form
        onSubmit={form.handleSubmit(onAddCloudAccess)}
        className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-5"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="cloud-name" className="text-xs">Nama pengguna</Label>
          <Input id="cloud-name" placeholder="mis. Budi Santoso" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs font-medium text-destructive-foreground">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="cloud-email" className="text-xs">Email (Google / Kantor)</Label>
          <Input id="cloud-email" type="email" placeholder="nama@pegadaian.co.id" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs font-medium text-destructive-foreground">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Peran</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (!value || value === field.value) return;
                  field.onChange(value);
                  if (value === "admin") form.setValue("assignedArea", null);
                  else if (!form.getValues("assignedArea")) form.setValue("assignedArea", KINERJA_AREAS[0]);
                }}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User Wilayah / Area</SelectItem>
                  <SelectItem value="admin">Admin Kanwil</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Wilayah / Area</Label>
          <Controller
            control={form.control}
            name="assignedArea"
            render={({ field }) => (
              <Select
                value={field.value ?? KINERJA_AREAS[0]}
                disabled={selectedRole === "admin"}
                onValueChange={(value) => {
                  if (value && value !== field.value) field.onChange(value);
                }}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Semua Area (Admin)" />
                </SelectTrigger>
                <SelectContent>
                  {KINERJA_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      Area {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.assignedArea && (
            <p className="text-xs font-medium text-destructive-foreground">
              {form.formState.errors.assignedArea.message}
            </p>
          )}
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <Plus className="size-4" /> Tambah Email
          </Button>
        </div>
      </form>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Memuat daftar email akses…
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Belum ada email terdaftar di tabel <code className="font-mono">user_access</code>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Nama &amp; Email</TableHead>
                <TableHead>Peran &amp; Wilayah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isSelf = entry.email.toLowerCase() === currentEmail.toLowerCase();
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{entry.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{entry.email}</div>
                    </TableCell>
                    <TableCell>
                      {entry.role === "admin" ? (
                        <Badge variant="solid">Admin Kanwil (Semua Area)</Badge>
                      ) : (
                        <Select
                          value={entry.assignedArea ?? KINERJA_AREAS[0]}
                          onValueChange={async (value) => {
                            if (!value || value === entry.assignedArea) return;
                            const res = await auth.updateCloudAccess(entry.id, {
                              assignedArea: value as KinerjaArea,
                            });
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.success(`Wilayah ${entry.name} diubah ke Area ${value}`);
                            await loadEntries();
                          }}
                        >
                          <SelectTrigger className="h-9 w-44 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KINERJA_AREAS.map((area) => (
                              <SelectItem key={area} value={area}>
                                Area {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.active}
                          disabled={isSelf}
                          onCheckedChange={async (active) => {
                            const res = await auth.updateCloudAccess(entry.id, { active });
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.info(active ? `${entry.email} diaktifkan` : `${entry.email} dinonaktifkan`);
                            await loadEntries();
                          }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {entry.active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSelf}
                        className="text-destructive-foreground hover:bg-destructive-soft"
                        onClick={async () => {
                          const res = await auth.removeCloudAccess(entry.id);
                          if (!res.ok) {
                            toast.error(res.error);
                            return;
                          }
                          toast.info(`Akses ${entry.email} dihapus`);
                          await loadEntries();
                        }}
                      >
                        <Trash2 className="size-4" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function AccessContent() {
  const { user } = useAdminAccess();
  const db = useDb();
  const isCloud = auth.mode === "cloud";
  const areaUsers = db.users.filter((item) => item.role !== "admin");

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

  const areaForm = useForm<AreaUserValues>({
    resolver: zodResolver(areaUserSchema),
    defaultValues: { name: "", username: "", email: "", password: "", assignedArea: KINERJA_AREAS[0] },
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

  async function onCreateAreaUser(values: AreaUserValues) {
    const result = await auth.createAreaUser(values);
    if (!result.ok) {
      areaForm.setError(result.field ?? "username", { message: result.error });
      return;
    }
    areaForm.reset({ name: "", username: "", email: "", password: "", assignedArea: values.assignedArea });
    toast.success(`Akun Area ${values.assignedArea} ditambahkan`, {
      description: `Email: ${result.user.email} · @${result.user.username}`,
    });
  }

  async function onSeedDemoAreas() {
    const { created, passwordHint } = await auth.seedDemoAreaUsers();
    if (created === 0) {
      toast.info("Semua 5 akun demo area sudah tersedia", {
        description: `Password default: ${passwordHint}`,
      });
      return;
    }
    toast.success(`${created} akun wilayah demo dibuat`, {
      description: `Username: area.manado s/d area.makassar · Password: ${passwordHint}`,
    });
  }

  const fieldError = (message?: string) =>
    message ? <p className="text-xs font-medium text-destructive-foreground">{message}</p> : null;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Akun & Akses"
        subtitle="Kelola akun administrator Kanwil dan akun per wilayah/area untuk akses terbatas Potensi Bisnis."
      />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-brand">
              <ShieldCheck className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold">{user.name}</h2>
              <p className="mt-0.5 break-all text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="solid">Admin Kanwil</Badge>
          </div>

          {user.provider === "google" || user.provider === "email_otp" ? (
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Mail className="size-4 text-primary" />
                Masuk menggunakan {user.provider === "google" ? "Google OAuth" : "Kode Verifikasi Email (OTP)"}
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                Akun ini terhubung langsung ke Supabase Auth tanpa password lokal. Pengelolaan akses email pegawai dapat
                dilakukan pada tabel <strong>Daftar Email Akses</strong> di bawah.
              </p>
            </div>
          ) : (
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
          )}
        </section>

        <div className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-primary">
                <KeyRound className="size-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-bold">Login Google &amp; Kode OTP Email</h3>
                <p className="text-xs text-muted-foreground">
                  {isCloud
                    ? "Terhubung ke Supabase Auth — login Google & OTP 6 digit aktif dan dicek di tabel user_access."
                    : "Mode demo lokal — tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY untuk mengaktifkan login Google & email OTP sungguhan."}
                </p>
              </div>
              <Badge variant={isCloud ? "solid" : "warning"}>{isCloud ? "Aktif" : "Lokal"}</Badge>
            </div>
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                <MapPin className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">Pembatasan Wilayah Potensi Bisnis</h3>
                <p className="text-xs text-muted-foreground">
                  Setiap akun area hanya bisa membuka dan mengekspor data <strong>Potensi Bisnis</strong> sesuai wilayahnya sendiri. Admin Kanwil tetap memiliki akses penuh ke semua area.
                </p>
              </div>
            </div>
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-primary">
                <Users className="size-5" />
              </span>
              <div>
                <h3 className="font-bold">Akses publik &amp; responden</h3>
                <p className="text-xs text-muted-foreground">
                  Pengunjung melihat dashboard umum dalam Mode Lihat (kecuali Potensi Bisnis). Responden mengisi form dengan kode 6 karakter.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── CLOUD EMAIL WHITELIST (WHEN SUPABASE IS CONNECTED) ─────────────── */}
      {isCloud ? (
        <CloudAccessManager currentEmail={user.email} />
      ) : (
        /* ── LOCAL AREA ACCOUNTS MANAGEMENT ───────────────────────────────── */
        <section className="panel space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                Akun Wilayah / Area (Khusus Potensi Bisnis)
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Tetapkan email &amp; wilayah untuk tiap akun area agar modul Potensi Bisnis terkunci pada area masing-masing.
                Password default akun contoh: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{DEMO_AREA_PASSWORD}</code>
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => void onSeedDemoAreas()}>
              <Sparkles className="size-4 text-primary" /> Pulihkan 5 Akun Contoh Area
            </Button>
          </div>

          <form
            onSubmit={areaForm.handleSubmit(onCreateAreaUser)}
            className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-6"
            noValidate
          >
            <div className="space-y-1">
              <Label htmlFor="area-name" className="text-xs">Nama pengguna</Label>
              <Input id="area-name" placeholder="mis. Tim Area Manado" {...areaForm.register("name")} />
              {fieldError(areaForm.formState.errors.name?.message)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="area-username" className="text-xs">Username</Label>
              <Input id="area-username" placeholder="mis. area.manado" {...areaForm.register("username")} />
              {fieldError(areaForm.formState.errors.username?.message)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="area-email" className="text-xs">Email (opsional)</Label>
              <Input id="area-email" type="email" placeholder="nama@pegadaian.co.id" {...areaForm.register("email")} />
              {fieldError(areaForm.formState.errors.email?.message)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="area-password" className="text-xs">Password (min 8 kar.)</Label>
              <Input id="area-password" type="password" placeholder={DEMO_AREA_PASSWORD} {...areaForm.register("password")} />
              {fieldError(areaForm.formState.errors.password?.message)}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wilayah / Area</Label>
              <Controller
                control={areaForm.control}
                name="assignedArea"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value && value !== field.value) field.onChange(value);
                    }}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KINERJA_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          Area {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {fieldError(areaForm.formState.errors.assignedArea?.message)}
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="w-full" disabled={areaForm.formState.isSubmitting}>
                <Plus className="size-4" /> Tambah
              </Button>
            </div>
          </form>

          {areaUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Belum ada akun wilayah. Tambahkan akun secara manual di atas atau klik{" "}
              <strong className="text-foreground">Pulihkan 5 Akun Contoh Area</strong> untuk uji coba cepat.
            </div>
          ) : (
            <>
              {/* Mobile card list (< sm) */}
              <div className="space-y-2.5 sm:hidden">
                {areaUsers.map((item) => {
                  const isBuiltIn = KINERJA_AREAS.some(
                    (area) => `area.${area.toLowerCase()}` === item.username.toLowerCase(),
                  );
                  return (
                    <div key={item.id} className="space-y-2.5 rounded-xl border border-border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">{item.email}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 px-2 text-destructive-foreground hover:bg-destructive-soft"
                          onClick={() => {
                            auth.removeAreaUser(item.id);
                            toast.info(`Akun @${item.username} dihapus`);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
                        {isBuiltIn ? (
                          <Badge className="gap-1.5 rounded-full border-0 bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-foreground hover:bg-gold-soft">
                            <MapPin className="size-3" /> Area {item.assignedArea}
                          </Badge>
                        ) : (
                          <Select
                            value={item.assignedArea ?? KINERJA_AREAS[0]}
                            onValueChange={(value) => {
                              if (!value || value === item.assignedArea) return;
                              auth.updateAreaUser(item.id, { assignedArea: value as KinerjaArea });
                              toast.success(`Wilayah ${item.name} diubah ke Area ${value}`);
                            }}
                          >
                            <SelectTrigger className="h-8 w-40 rounded-xl text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KINERJA_AREAS.map((area) => (
                                <SelectItem key={area} value={area}>
                                  Area {area}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.active}
                            onCheckedChange={(active) => {
                              auth.updateAreaUser(item.id, { active });
                              toast.info(active ? `Akun ${item.username} diaktifkan` : `Akun ${item.username} dinonaktifkan`);
                            }}
                            aria-label={item.active ? "Nonaktifkan akun area" : "Aktifkan akun area"}
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.active ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop & tablet table (sm+) */}
              <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Nama &amp; Email</TableHead>
                      <TableHead>Wilayah Potensi Bisnis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areaUsers.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{item.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {item.email} · @{item.username}
                          </div>
                        </TableCell>
                        <TableCell>
                          {KINERJA_AREAS.some((area) => `area.${area.toLowerCase()}` === item.username.toLowerCase()) ? (
                            <Badge className="gap-1.5 rounded-full border-0 bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-foreground hover:bg-gold-soft">
                              <MapPin className="size-3" /> Area {item.assignedArea}
                            </Badge>
                          ) : (
                            <Select
                              value={item.assignedArea ?? KINERJA_AREAS[0]}
                              onValueChange={(value) => {
                                if (!value || value === item.assignedArea) return;
                                auth.updateAreaUser(item.id, { assignedArea: value as KinerjaArea });
                                toast.success(`Wilayah ${item.name} diubah ke Area ${value}`);
                              }}
                            >
                              <SelectTrigger className="h-9 w-44 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {KINERJA_AREAS.map((area) => (
                                  <SelectItem key={area} value={area}>
                                    Area {area}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.active}
                              onCheckedChange={(active) => {
                                auth.updateAreaUser(item.id, { active });
                                toast.info(active ? `Akun ${item.username} diaktifkan` : `Akun ${item.username} dinonaktifkan`);
                              }}
                              aria-label={item.active ? "Nonaktifkan akun area" : "Aktifkan akun area"}
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {item.active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive-foreground hover:bg-destructive-soft"
                            onClick={() => {
                              auth.removeAreaUser(item.id);
                              toast.info(`Akun @${item.username} dihapus`);
                            }}
                          >
                            <Trash2 className="size-4" /> Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
