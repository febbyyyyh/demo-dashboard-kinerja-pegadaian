import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, ExternalLink, PencilRuler, Share2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/fk/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getFeedingForm } from "@/lib/formkanwil/daily-report";
import { createFormShareLink, getFormStatus, responsesToRows } from "@/lib/formkanwil/logic";
import { repository } from "@/lib/formkanwil/repository";
import { useDb } from "@/lib/formkanwil/store";
import type { FeedingSlot } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/forms/$formId/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Form — FormKanwil" },
      { name: "description", content: "Status, kode, tautan, dan peran Daily Report sebuah form FormKanwil." },
      { property: "og:title", content: "Pengaturan Form — FormKanwil" },
      { property: "og:description", content: "Status, kode, dan peran Daily Report sebuah form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FormSettingsPage,
});

function FormSettingsPage() {
  const { formId } = Route.useParams();
  const db = useDb();
  const form = db.forms.find((item) => item.id === formId);

  if (!form) {
    return (
      <EmptyState
        emoji="🔍"
        title="Form tidak ditemukan"
        action={
          <Button asChild>
            <Link to="/admin/forms">Kembali ke daftar form</Link>
          </Button>
        }
      />
    );
  }

  const status = getFormStatus(form);
  const columns = responsesToRows(form, [], db.users)[0] ?? [];
  const responseCount = db.responses.filter((r) => r.formId === form.id).length;

  function setFeeding(slot: FeedingSlot | null) {
    if (!form) return;
    const current = { 1: getFeedingForm(db.forms, 1)?.id ?? null, 2: getFeedingForm(db.forms, 2)?.id ?? null };
    const next = {
      1: current[1] === form.id ? null : current[1],
      2: current[2] === form.id ? null : current[2],
    };
    if (slot) next[slot] = form.id;
    repository.dailyReport.saveConfig(db.dailyReport, next);
    toast.success(slot ? `Form menjadi Feed Daily Report ${slot}` : "Form tidak lagi menjadi feeding Daily Report");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/admin/forms">
            <ArrowLeft /> Semua form
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/forms/$formId" params={{ formId: form.id }}>
            <PencilRuler /> Buka Builder
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-mint-soft text-3xl">{form.emoji}</span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{form.title || "Form tanpa judul"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={status === "active" ? "solid" : "secondary"}>
              {status === "active" ? "Aktif" : status === "draft" ? "Draft" : "Ditutup"}
            </Badge>
            {form.feedingSlot && <Badge variant="feed">Feed Daily Report {form.feedingSlot}</Badge>}
            <span className="tabular-nums">{responseCount} jawaban</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel space-y-4 p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tight">Akses responden</h2>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Form aktif</div>
              <div className="text-xs text-muted-foreground">Responden bisa mengisi dengan kode form.</div>
            </div>
            <Switch
              checked={form.active}
              onCheckedChange={(active) => {
                repository.forms.setActive(form.id, active);
                toast.success(active ? "Form diaktifkan" : "Form dinonaktifkan");
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-border bg-card px-4 py-2 font-mono text-xl font-bold tracking-[0.3em]">
              {form.code}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(form.code);
                toast.success("Kode disalin");
              }}
            >
              <Copy /> Salin kode
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!form.active}
              onClick={() => {
                navigator.clipboard?.writeText(createFormShareLink(window.location.origin, form.code));
                toast.success("Tautan responden disalin");
              }}
            >
              <Share2 /> Salin tautan
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/isi/$code" params={{ code: form.code }} target="_blank">
                <ExternalLink /> Buka form
              </Link>
            </Button>
          </div>
        </section>

        <section className="panel space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight">Feeding Daily Report</h2>
            <p className="text-sm text-muted-foreground">Maksimal 2 form dapat menjadi sumber data Daily Report.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {([null, 1, 2] as const).map((slot) => {
              const owner = slot ? getFeedingForm(db.forms, slot) : undefined;
              const selected = (form.feedingSlot ?? null) === slot;
              return (
                <button
                  key={String(slot)}
                  type="button"
                  onClick={() => setFeeding(slot)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all",
                    selected ? "border-primary bg-mint-soft ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="block text-sm font-bold">{slot ? `Feed ${slot}` : "Tidak feeding"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {slot
                      ? owner && owner.id !== form.id
                        ? `Menggantikan: ${owner.title}`
                        : owner?.id === form.id
                          ? "Form ini"
                          : "Kosong"
                      : "Tidak ditarik ke laporan"}
                  </span>
                </button>
              );
            })}
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/daily-report/config">Atur pemetaan metrik</Link>
          </Button>
        </section>
      </div>

      <section className="panel p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight">Struktur kolom (Sheets & CSV)</h2>
            <p className="text-sm text-muted-foreground">Otomatis mengikuti pertanyaan di Builder.</p>
          </div>
          <Badge variant="outline">schema v{form.schemaVersion ?? 1}</Badge>
        </div>
        <ol className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {columns.map((column, index) => (
            <li key={`${column}-${index}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="w-6 font-mono text-xs text-muted-foreground">{index + 1}</span>
              <span className="truncate">{column}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
