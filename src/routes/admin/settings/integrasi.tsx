import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Link2,
  RefreshCw,
  Sheet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageTitle } from "@/components/fk/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { driveFolderUrl } from "@/lib/formkanwil/daily-report";
import { nextScheduledRun, responsesToRows } from "@/lib/formkanwil/logic";
import { downloadBlob } from "@/lib/formkanwil/report-export";
import { repository } from "@/lib/formkanwil/repository";
import { useDb } from "@/lib/formkanwil/store";

export const Route = createFileRoute("/admin/settings/integrasi")({
  head: () => ({
    meta: [
      { title: "Integrasi & Backup — FormKanwil" },
      { name: "description", content: "Status Google Sheets Sync dan riwayat backup terjadwal ke Storage dan Google Drive." },
      { property: "og:title", content: "Integrasi & Backup — FormKanwil" },
      { property: "og:description", content: "Google Sheets Sync dan backup terjadwal FormKanwil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

const SHEETS_URL = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{10,}/;

function IntegrationsPage() {
  const db = useDb();
  const { integrations, backups, dailyReport } = db;
  const [sheetsUrl, setSheetsUrl] = useState(integrations.sheetsUrl);
  const [previewFormId, setPreviewFormId] = useState(db.forms[0]?.id ?? "");
  const previewForm = db.forms.find((form) => form.id === previewFormId) ?? db.forms[0];
  const columns = previewForm ? (responsesToRows(previewForm, [], db.users)[0] ?? []) : [];
  const nextBackup = nextScheduledRun(dailyReport.backupTime);
  const validUrl = SHEETS_URL.test(sheetsUrl.trim());

  function connectSheets() {
    if (!validUrl) {
      toast.error("Tempel link Google Spreadsheet yang valid.");
      return;
    }
    repository.integrations.save({ ...integrations, sheetsUrl: sheetsUrl.trim(), sheetsConnected: true });
    toast.success("Spreadsheet ditautkan", {
      description: "Sinkronisasi otomatis aktif setelah backend terhubung.",
    });
  }

  function manualBackup() {
    const log = repository.integrations.triggerBackup("manual");
    toast.success("Backup manual selesai", { description: `${(log.sizeBytes / 1024).toFixed(1)} KB` });
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Integrasi & Backup"
        subtitle="Sinkronisasi Google Sheets dan backup terjadwal ke Storage & Google Drive."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadBlob(repository.integrations.exportSnapshot(), `formkanwil-backup-${format(new Date(), "yyyyMMdd-HHmm")}.json`);
                toast.success("File backup JSON diunduh");
              }}
            >
              <Download /> Unduh JSON
            </Button>
            <Button onClick={manualBackup}>
              <HardDrive /> Trigger Manual Backup
            </Button>
          </div>
        }
      />

      {repository.mode === "local" && (
        <div className="rounded-2xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
          Mode lokal: data tersimpan di browser ini. Sinkronisasi Google Sheets & Drive berjalan otomatis setelah backend terhubung.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-mint-soft text-primary">
                <Sheet className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight">Google Sheets Sync</h2>
                <p className="text-sm text-muted-foreground">Setiap form = 1 sheet, kolom mengikuti schema form.</p>
              </div>
            </div>
            {integrations.sheetsConnected ? (
              <Badge variant="solid"><CheckCircle2 className="size-3" /> Tertaut</Badge>
            ) : (
              <Badge variant="secondary"><XCircle className="size-3" /> Belum tertaut</Badge>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="pl-9 font-mono text-sm"
              />
            </div>
            <Button variant="secondary" onClick={connectSheets}>Tautkan</Button>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Sinkron terakhir</dt>
              <dd className="mt-1 text-sm font-semibold">
                {integrations.lastSyncAt
                  ? formatDistanceToNow(new Date(integrations.lastSyncAt), { addSuffix: true, locale: localeId })
                  : "Belum pernah"}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <dt className="text-xs text-muted-foreground">Form tersinkron</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{db.forms.length} sheet</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                repository.integrations.syncSheets();
                toast.success("Sinkronisasi dijalankan");
              }}
            >
              <RefreshCw /> Sync sekarang
            </Button>
            {integrations.sheetsUrl && (
              <Button asChild variant="ghost" size="sm">
                <a href={integrations.sheetsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Buka spreadsheet
                </a>
              </Button>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Preview struktur kolom</h3>
              {db.forms.length > 0 && (
                <Select value={previewForm?.id ?? ""} onValueChange={setPreviewFormId}>
                  <SelectTrigger className="h-9 w-56 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {db.forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.emoji} {form.title || "Tanpa judul"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {previewForm ? (
              <>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">schema v{previewForm.schemaVersion ?? 1}</Badge>
                  Sheet <span className="font-mono font-semibold text-foreground">{previewForm.code}</span> · {columns.length} kolom
                </div>
                <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-muted/40 p-2">
                  {columns.map((column, index) => (
                    <span key={`${column}-${index}`} className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium">
                      <span className="mr-1 font-mono text-muted-foreground">{String.fromCharCode(65 + (index % 26))}</span>
                      {column}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada form.</p>
            )}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-mint-soft text-primary">
                <FolderOpen className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-tight">Scheduled Backup</h2>
                <p className="text-sm text-muted-foreground">Storage & Google Drive · setiap hari</p>
              </div>
            </div>
            <Badge variant="feed">
              <CalendarClock className="size-3" /> {dailyReport.backupTime}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gradient-hero-card p-4 text-on-hero">
              <div className="text-xs text-on-hero-muted">Backup berikutnya</div>
              <div className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                {format(nextBackup, "HH:mm")}
              </div>
              <div className="text-xs text-on-hero-muted">{format(nextBackup, "EEEE, d MMM", { locale: localeId })}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground">Folder Drive</div>
              {dailyReport.driveFolderId ? (
                <a
                  href={driveFolderUrl(dailyReport.driveFolderId)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 break-all font-mono text-sm font-semibold text-primary hover:underline"
                >
                  {dailyReport.driveFolderId.slice(0, 18)}… <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <Link to="/admin/daily-report/config" className="mt-1 block text-sm font-semibold text-primary hover:underline">
                  Atur folder Drive →
                </Link>
              )}
            </div>
          </div>

          <h3 className="mb-2 mt-6 text-sm font-bold">Riwayat backup</h3>
          {backups.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada backup. Jalankan backup manual untuk membuat snapshot pertama.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {backups.slice(0, 12).map((log) => (
                <li key={log.id} className="flex items-center gap-3 px-3 py-2.5">
                  {log.status === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {format(new Date(log.at), "d MMM yyyy, HH:mm", { locale: localeId })}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{log.note}</div>
                  </div>
                  <Badge variant={log.kind === "manual" ? "outline" : "secondary"}>
                    {log.kind === "manual" ? "Manual" : "Terjadwal"}
                  </Badge>
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                    {(log.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
