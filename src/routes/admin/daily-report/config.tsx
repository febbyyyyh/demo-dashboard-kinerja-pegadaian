import { useEffect, useMemo } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Database,
  ExternalLink,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGGREGATION_LABEL,
  driveFolderUrl,
  METRIC_VIEW_LABEL,
  numericQuestionCandidates,
  parseDriveFolderId,
  unitQuestionCandidates,
} from "@/lib/formkanwil/daily-report";
import {
  dailyReportFormSchema,
  fromFormValues,
  NONE,
  toFormValues,
  type DailyReportFormValues,
} from "@/lib/formkanwil/daily-report-schema";
import { useDailyReportConfig, useForms } from "@/lib/formkanwil/hooks";
import { uid } from "@/lib/formkanwil/logic";
import { repository } from "@/lib/formkanwil/repository";
import type { Form, MetricViews } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/daily-report/config")({
  head: () => ({
    meta: [
      { title: "Konfigurasi Daily Report — FormKanwil" },
      { name: "description", content: "Atur form feeding, pemetaan unit, metrik, dan jadwal backup Daily Report." },
      { property: "og:title", content: "Konfigurasi Daily Report — FormKanwil" },
      { property: "og:description", content: "Atur form feeding, metrik, dan jadwal backup Daily Report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigPage,
});

const UNITS = ["Rp", "%", "Nasabah", "Unit", "gram", "Laporan", "Transaksi", "/5"];
const VIEW_KEYS = Object.keys(METRIC_VIEW_LABEL) as Array<keyof MetricViews>;

function Section({ title, description, children, aside }: { title: string; description: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}

function ConfigPage() {
  const config = useDailyReportConfig();
  const forms = useForms();
  const defaults = useMemo(() => toFormValues(config, forms), [config, forms]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportFormSchema),
    defaultValues: defaults,
  });
  const metrics = useFieldArray({ control, name: "metrics", keyName: "fieldKey" });
  const [feed1, feed2, driveFolder] = useWatch({ control, name: ["feed1", "feed2", "driveFolder"] });
  const feedForms = { 1: forms.find((f) => f.id === feed1), 2: forms.find((f) => f.id === feed2) };

  // Pick up external changes (e.g. demo data) while there are no local edits.
  useEffect(() => {
    if (!isDirty) reset(defaults);
  }, [defaults, isDirty, reset]);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  const driveId = driveFolder ? parseDriveFolderId(driveFolder) : null;

  function onSubmit(values: DailyReportFormValues) {
    const { config: next, feeding } = fromFormValues(values, config);
    repository.dailyReport.saveConfig(next, feeding);
    reset(values);
    toast.success("Konfigurasi Daily Report tersimpan", {
      description: `${next.metrics.length} metrik · Backup otomatis pukul ${next.backupTime}`,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Periksa kembali isian yang ditandai."))} className="space-y-5 pb-28" noValidate>
      <Section title="Pengaturan umum" description="Judul laporan, jadwal backup otomatis, dan folder Google Drive tujuan.">
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul Daily Report</Label>
            <Input id="title" {...register("title")} placeholder="Daily Report Kanwil Manado" />
            <FieldError message={errors.title?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backupTime">Jam backup otomatis</Label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="backupTime" type="time" step={300} className="pl-9 tabular-nums" {...register("backupTime")} />
            </div>
            <FieldError message={errors.backupTime?.message} />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="driveFolder">Google Drive Folder ID</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <FolderOpen className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="driveFolder"
                className="pl-9 font-mono text-sm"
                placeholder="Tempel link folder atau ID, mis. https://drive.google.com/drive/folders/1AbC…"
                {...register("driveFolder")}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!driveId}
              onClick={() => driveId && window.open(driveFolderUrl(driveId), "_blank", "noopener")}
            >
              <ExternalLink /> Buka folder
            </Button>
          </div>
          {driveId && !errors.driveFolder && (
            <p className="text-xs text-muted-foreground">
              ID terdeteksi: <span className="font-mono font-semibold text-foreground">{driveId}</span>
            </p>
          )}
          <FieldError message={errors.driveFolder?.message} />
        </div>
      </Section>

      <Section
        title="Sumber form (Feeding Daily Report)"
        description="Pilih maksimal 2 form yang datanya ditarik ke Daily Report, lalu petakan pertanyaan unit dan kolom area/cabangnya."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {([1, 2] as const).map((slot, index) => (
            <FeedCard
              key={slot}
              slot={slot}
              index={index}
              forms={forms}
              form={feedForms[slot]}
              control={control}
              otherFormId={slot === 1 ? feed2 : feed1}
              error={slot === 2 ? errors.feed2?.message : undefined}
              onFormChange={() => {
                setValue(`sources.${index}.unitQuestionId`, NONE, { shouldDirty: true });
                setValue(`sources.${index}.areaColumn`, NONE, { shouldDirty: true });
                setValue(`sources.${index}.branchColumn`, NONE, { shouldDirty: true });
              }}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Kelola metrik"
        description="Setiap metrik mengambil angka dari pertanyaan form feeding. Target diisi per unit per hari."
        aside={
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              metrics.append({
                id: uid("met"),
                name: "",
                unit: "Rp",
                slot: feed1 !== NONE ? 1 : 2,
                questionId: NONE,
                aggregation: "sum",
                target: "",
                views: { indicator: true, area: true, branch: true, unit: true },
              })
            }
          >
            <Plus /> Tambah metrik
          </Button>
        }
      >
        {metrics.fields.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-mint px-6 py-10 text-center">
            <p className="font-semibold">Belum ada metrik</p>
            <p className="mt-1 text-sm text-muted-foreground">Tambah metrik atau muat data contoh untuk mulai.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => {
                repository.dailyReport.loadDemo();
                toast.success("Data contoh dimuat");
              }}
            >
              <Database /> Muat data contoh
            </Button>
          </div>
        ) : (
          <ol className="space-y-3">
            {metrics.fields.map((field, index) => (
              <MetricRow
                key={field.fieldKey}
                index={index}
                count={metrics.fields.length}
                control={control}
                register={register}
                feedForms={feedForms}
                errors={errors.metrics?.[index]}
                onMove={(dir) => metrics.move(index, index + dir)}
                onRemove={() => metrics.remove(index)}
              />
            ))}
          </ol>
        )}
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur">
        <div className="flex items-center gap-2 px-2 text-sm">
          <span className={cn("size-2 rounded-full", isDirty ? "bg-warning" : "bg-primary")} />
          {isDirty ? "Ada perubahan yang belum disimpan" : "Semua perubahan tersimpan"}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset(defaults)}>
            <Undo2 /> Batalkan
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            <Save /> Simpan Konfigurasi
          </Button>
        </div>
      </div>

      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tinggalkan tanpa menyimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan konfigurasi Daily Report belum disimpan dan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Tetap di sini</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
              Tinggalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function FeedCard({
  slot,
  index,
  forms,
  form,
  control,
  otherFormId,
  error,
  onFormChange,
}: {
  slot: 1 | 2;
  index: number;
  forms: Form[];
  form: Form | undefined;
  control: Control<DailyReportFormValues>;
  otherFormId: string;
  error?: string | undefined;
  onFormChange: () => void;
}) {
  const unitQuestionId = useWatch({ control, name: `sources.${index}.unitQuestionId` });
  const unitQuestions = unitQuestionCandidates(form);
  const columns = form?.questions.find((q) => q.id === unitQuestionId)?.optionMetadataColumns ?? [];

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="feed">Form Feeding {slot}</Badge>
        {form && <span className="font-mono text-xs text-muted-foreground">{form.code}</span>}
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Form sumber</Label>
          <Controller
            control={control}
            name={slot === 1 ? "feed1" : "feed2"}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  // Radix re-emits the current value after a form reset; only a real change clears the mapping.
                  if (!value || value === field.value) return;
                  field.onChange(value);
                  onFormChange();
                }}
              >
                <SelectTrigger className="rounded-xl bg-card">
                  <SelectValue placeholder="Pilih form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Tidak ada —</SelectItem>
                  {forms.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.id === otherFormId}>
                      {item.emoji} {item.title || "Form tanpa judul"} {item.active ? "" : "(nonaktif)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={error} />
        </div>
        <div className="space-y-1.5">
          <Label>Pertanyaan unit (UPC)</Label>
          <Controller
            control={control}
            name={`sources.${index}.unitQuestionId`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => value && field.onChange(value)} disabled={!form}>
                <SelectTrigger className="rounded-xl bg-card">
                  <SelectValue placeholder="Pilih pertanyaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Tidak dipetakan —</SelectItem>
                  {unitQuestions.map((question) => (
                    <SelectItem key={question.id} value={question.id}>
                      {question.label || "Pertanyaan tanpa teks"} · {question.options?.length ?? 0} opsi
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form && unitQuestions.length === 0 && (
            <p className="text-xs text-muted-foreground">Tambahkan pertanyaan dropdown (Import UPC) di Builder.</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["areaColumn", "branchColumn"] as const).map((key) => (
            <div key={key} className="space-y-1.5">
              <Label>{key === "areaColumn" ? "Kolom Area" : "Kolom Cabang"}</Label>
              <Controller
                control={control}
                name={`sources.${index}.${key}`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => value && field.onChange(value)} disabled={columns.length === 0}>
                    <SelectTrigger className="rounded-xl bg-card">
                      <SelectValue placeholder="Pilih kolom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Tidak ada —</SelectItem>
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  index,
  count,
  control,
  register,
  feedForms,
  errors,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  control: Control<DailyReportFormValues>;
  register: ReturnType<typeof useForm<DailyReportFormValues>>["register"];
  feedForms: Record<1 | 2, Form | undefined>;
  errors: NonNullable<FieldErrors<DailyReportFormValues>["metrics"]>[number] | undefined;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [slot, aggregation] = useWatch({ control, name: [`metrics.${index}.slot`, `metrics.${index}.aggregation`] });
  const questions = numericQuestionCandidates(feedForms[slot]);

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-col gap-1 pt-6">
          <Button type="button" variant="ghost" size="iconSm" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Naikkan">
            <ArrowUp />
          </Button>
          <Button type="button" variant="ghost" size="iconSm" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Turunkan">
            <ArrowDown />
          </Button>
        </div>
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.9fr_0.8fr_1.4fr_0.9fr_0.9fr]">
          <div className="space-y-1.5">
            <Label>Nama metrik</Label>
            <Input {...register(`metrics.${index}.name`)} placeholder="Omzet Gadai" />
            <FieldError message={errors?.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Satuan</Label>
            <Input list="metric-units" {...register(`metrics.${index}.unit`)} placeholder="Rp" />
            <datalist id="metric-units">
              {UNITS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
            <FieldError message={errors?.unit?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Sumber</Label>
            <Controller
              control={control}
              name={`metrics.${index}.slot`}
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(value) => value && field.onChange(Number(value) as 1 | 2)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Feeding 1</SelectItem>
                    <SelectItem value="2">Feeding 2</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors?.slot?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Pertanyaan (question.id)</Label>
            <Controller
              control={control}
              name={`metrics.${index}.questionId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Pilih pertanyaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{aggregation === "count" ? "Semua laporan" : "— Pilih —"}</SelectItem>
                    {questions.map((question) => (
                      <SelectItem key={question.id} value={question.id}>
                        {question.label || question.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors?.questionId?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>Agregasi</Label>
            <Controller
              control={control}
              name={`metrics.${index}.aggregation`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AGGREGATION_LABEL) as Array<keyof typeof AGGREGATION_LABEL>).map((key) => (
                      <SelectItem key={key} value={key}>
                        {AGGREGATION_LABEL[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target/unit/hari</Label>
            <Input inputMode="decimal" className="tabular-nums" {...register(`metrics.${index}.target`)} placeholder="Opsional" />
            <FieldError message={errors?.target?.message} />
          </div>
        </div>
        <Button type="button" variant="ghost" size="iconSm" className="mt-6 hover:bg-destructive-soft hover:text-destructive-foreground" onClick={onRemove} aria-label="Hapus metrik">
          <Trash2 />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 pl-11">
        <span className="eyebrow">Tampil di</span>
        {VIEW_KEYS.map((view) => (
          <Controller
            key={view}
            control={control}
            name={`metrics.${index}.views.${view}`}
            render={({ field }) => (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                {METRIC_VIEW_LABEL[view]}
              </label>
            )}
          />
        ))}
      </div>
    </li>
  );
}
