import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Send,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { QuestionField } from "@/components/fk/QuestionField";
import { EmptyState, ErrorNote, Spinner } from "@/components/fk/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  formatAnswer,
  getFormPages,
  getPageQuestions,
  isAnswered,
  lookupForm,
  normalizeCode,
  validateAnswers,
  validateRespondentIdentity,
} from "@/lib/formkanwil/logic";
import { repository } from "@/lib/formkanwil/repository";
import { useDb } from "@/lib/formkanwil/store";
import {
  CHOICE_TYPES,
  QUESTION_TYPE_LABEL,
  type Answers,
  type Question,
} from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/isi/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Isi Form ${params.code} — FormKanwil` },
      { name: "description", content: "Isi form yang dibagikan kepada Anda." },
      { property: "og:title", content: `Isi Form ${params.code} — FormKanwil` },
      { property: "og:description", content: "Setiap isian berarti. Setiap suara didengar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FillFormPage,
});

function FillFormPage() {
  const { code } = Route.useParams();
  const db = useDb();
  const navigate = useNavigate();

  const form = useMemo(() => db.forms.find((f) => f.code === normalizeCode(code)), [db, code]);

  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  /** Popup dialog state for previewing answers before final submission */
  const [previewPopupOpen, setPreviewPopupOpen] = useState(false);

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link to="/app">
        <ArrowLeft className="size-4" /> Kembali ke kode form
      </Link>
    </Button>
  );

  if (!form || !form.active) {
    const message = lookupForm(db, code);
    return (
      <main className="min-h-screen bg-gradient-page px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          {back}
          <EmptyState
            emoji={form ? "😴" : "🔍"}
            title={!message.ok ? message.message : "Form tidak tersedia"}
            description={
              form
                ? "Form ini sudah ditutup oleh admin."
                : "Coba periksa kembali kode form yang diberikan."
            }
            action={
              <Button asChild>
                <Link to="/app">Masukkan kode lain</Link>
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  const shown = answers;
  const formPages = getFormPages(form);
  const currentPage = formPages[currentPageIndex] ??
    formPages[0] ?? { id: "page-1", title: "Halaman 1" };
  const required = form.questions.filter((q) => q.required);
  const identityErrors = validateRespondentIdentity({
    name: respondentName,
    email: respondentEmail,
  });
  const requiredCount = required.length + 2;
  const doneRequired =
    required.filter((q) => isAnswered(shown[q.id])).length +
    Number(!identityErrors["respondentName"]) +
    Number(!identityErrors["respondentEmail"]);
  const progress = Math.round((doneRequired / requiredCount) * 100);

  function clearError(key: string) {
    setErrors((current) => {
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  }

  function handleTriggerPreview() {
    if (!form) return;
    const allErrors = validateAnswers(form, answers);
    const idErrors = validateRespondentIdentity({
      name: respondentName,
      email: respondentEmail,
    });
    const combined = { ...idErrors, ...allErrors };
    if (Object.keys(combined).length > 0) {
      setErrors(combined);
      const firstIdentityError = combined["respondentName"]
        ? "respondent-name"
        : combined["respondentEmail"]
          ? "respondent-email"
          : null;
      if (firstIdentityError) {
        document
          .getElementById(firstIdentityError)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast.error("Identitas belum lengkap", {
          description: "Silakan isi nama dan email Anda terlebih dahulu.",
        });
        return;
      }
      const first = form.questions.find((q) => combined[q.id]);
      if (first) {
        // find page index
        const targetPageIndex = formPages.findIndex((p) =>
          getPageQuestions(form, p.id).some((item) => item.id === first.id),
        );
        if (targetPageIndex >= 0 && targetPageIndex !== currentPageIndex) {
          setCurrentPageIndex(targetPageIndex);
        }
        window.setTimeout(() => {
          document
            .getElementById(`card-${first.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
      toast.error("Masih ada pertanyaan wajib yang belum diisi", {
        description: "Periksa pertanyaan bertanda merah sebelum melanjutkan.",
      });
      return;
    }
    setErrors({});
    setPreviewPopupOpen(true);
  }

  function handleEditQuestionFromPopup(qId: string) {
    setPreviewPopupOpen(false);
    if (!form) return;
    const targetPageIndex = formPages.findIndex((p) =>
      getPageQuestions(form, p.id).some((item) => item.id === qId),
    );
    if (targetPageIndex >= 0) {
      setCurrentPageIndex(targetPageIndex);
    }
    window.setTimeout(() => {
      const el = document.getElementById(`card-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "ring-offset-2");
        window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 1500);
      }
    }, 200);
  }

  function handleEditIdentityFromPopup() {
    setPreviewPopupOpen(false);
    setCurrentPageIndex(0);
    window.setTimeout(() => {
      document
        .getElementById("respondent-name")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("respondent-name")?.focus();
    }, 200);
  }

  function doFinalSubmit() {
    if (!form) return;
    setSubmitting(true);

    window.setTimeout(() => {
      const result = repository.responses.submit({
        formId: form.id,
        answers,
        respondent: { name: respondentName, email: respondentEmail },
      });
      setSubmitting(false);
      if (!result.ok) {
        if (result.reason === "invalid") {
          setErrors(result.errors ?? {});
          setPreviewPopupOpen(false);
          toast.error("Masih ada data yang belum lengkap", {
            description: "Cek identitas dan pertanyaan yang ditandai merah, ya.",
          });
        } else {
          toast.error("Form sedang tidak aktif");
        }
        return;
      }
      setPreviewPopupOpen(false);
      navigate({ to: "/app/sukses/$code", params: { code: form.code }, replace: true });
    }, 500);
  }

  return (
    <main className="min-h-screen bg-gradient-page px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl animate-page-in space-y-5">
        {back}

        {/* ── HEADER FORM CARD ──────────────────────────────────────────────── */}
        <section className="card-soft overflow-hidden">
          {db.theme.bannerUrl ? (
            <img src={db.theme.bannerUrl} alt="" className="h-32 w-full object-cover sm:h-40" />
          ) : (
            <div className="h-2 bg-gradient-brand" />
          )}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip font-mono">Kode: {form.code}</span>
              <span className="chip">{formPages.length} halaman</span>
              <span className="chip">{form.questions.length} pertanyaan</span>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <span className="text-4xl leading-none" aria-hidden>
                {form.emoji}
              </span>
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {form.title}
                </h1>
                {form.description && (
                  <p className="mt-2 text-muted-foreground">{form.description}</p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 border-t border-border/60 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Progres Pengisian Wajib</span>
                <span className="text-primary font-bold">
                  {doneRequired}/{requiredCount} ({progress}%)
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-mint-soft [&>div]:bg-gradient-brand" />
            </div>
          </div>
        </section>

        {/* ── FORM CONTENT ──────────────────────────────────────────────────── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentPageIndex < formPages.length - 1) {
              // Next page validation
              const currentQuestions = getPageQuestions(form, currentPage.id);
              const pageErrors = validateAnswers(
                { ...form, questions: currentQuestions },
                answers,
              );
              const idErrors = validateRespondentIdentity({
                name: respondentName,
                email: respondentEmail,
              });
              setErrors((current) => ({ ...current, ...idErrors, ...pageErrors }));
              const firstIdError = idErrors["respondentName"]
                ? "respondent-name"
                : idErrors["respondentEmail"]
                  ? "respondent-email"
                  : null;
              if (firstIdError) {
                document
                  .getElementById(firstIdError)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              const firstInvalid = currentQuestions.find((q) => pageErrors[q.id]);
              if (firstInvalid) {
                document
                  .getElementById(`card-${firstInvalid.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
              setCurrentPageIndex((idx) => idx + 1);
            } else {
              handleTriggerPreview();
            }
          }}
          className="space-y-4"
          noValidate
        >
          {/* Identity Card (Only on Page 1) */}
          {currentPageIndex === 0 && (
            <section className="card-soft space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="font-display text-xl font-extrabold">Identitas Responden</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Silakan isi nama lengkap dan email Anda sebelum menjawab pertanyaan.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="respondent-name" className="text-sm font-medium">
                    Nama lengkap <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="respondent-name"
                    required
                    autoComplete="name"
                    value={respondentName}
                    aria-invalid={Boolean(errors["respondentName"])}
                    onChange={(event) => {
                      setRespondentName(event.target.value);
                      clearError("respondentName");
                    }}
                    placeholder="Masukkan nama lengkap"
                  />
                  {errors["respondentName"] && <ErrorNote>{errors["respondentName"]}</ErrorNote>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="respondent-email" className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="respondent-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={respondentEmail}
                    aria-invalid={Boolean(errors["respondentEmail"])}
                    onChange={(event) => {
                      setRespondentEmail(event.target.value);
                      clearError("respondentEmail");
                    }}
                    placeholder="nama@contoh.com"
                  />
                  {errors["respondentEmail"] && <ErrorNote>{errors["respondentEmail"]}</ErrorNote>}
                </div>
              </div>
            </section>
          )}

          {/* Questions on Current Page */}
          {[currentPage].map((page) => {
            const questions = getPageQuestions(form, page.id);
            return (
              <section key={page.id} className="space-y-4">
                <h2 className="font-display text-xl font-extrabold">{page.title}</h2>
                {questions.map((q) => (
                  <section
                    key={q.id}
                    id={`card-${q.id}`}
                    className={cn(
                      "card-soft p-5 transition-colors sm:p-6",
                      errors[q.id] && "border-destructive/50",
                    )}
                  >
                    <label htmlFor={`q-${q.id}`} className="flex gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint-soft text-xs font-bold text-mint-foreground">
                        {form.questions.indexOf(q) + 1}
                      </span>
                      <span className="pt-0.5 font-display text-base font-bold text-foreground">
                        {q.label}
                        {q.required && <span className="ml-1 text-destructive">*</span>}
                      </span>
                    </label>
                    {q.help && <p className="ml-10 mt-1 text-sm text-muted-foreground">{q.help}</p>}
                    <div className="mt-4 sm:ml-10">
                      <QuestionField
                        question={q}
                        value={shown[q.id]}
                        error={errors[q.id] ?? ""}
                        onChange={(v) => {
                          setAnswers((a) => ({ ...a, [q.id]: v }));
                          setErrors((e) => {
                            const { [q.id]: _removed, ...rest } = e;
                            return rest;
                          });
                        }}
                      />
                      {errors[q.id] && <ErrorNote className="mt-3">{errors[q.id]}</ErrorNote>}
                    </div>
                  </section>
                ))}
              </section>
            );
          })}

          {/* Footer Navigation Buttons */}
          <div className="sticky bottom-4 z-10 flex flex-col-reverse items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-lift backdrop-blur sm:flex-row">
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
              <p className="text-sm text-muted-foreground">
                Halaman {currentPageIndex + 1} dari {formPages.length} ·{" "}
                <span className="text-destructive">*</span> wajib diisi
              </p>
              {currentPageIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPageIndex((index) => index - 1)}
                >
                  <ArrowLeft className="size-4" /> Kembali
                </Button>
              )}
            </div>
            {currentPageIndex < formPages.length - 1 ? (
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto gap-1.5"
              >
                Halaman berikutnya <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto gap-2 bg-primary font-bold shadow-md"
              >
                <ClipboardList className="size-4" /> Pratinjau & Kirim Jawaban
              </Button>
            )}
          </div>
        </form>

        {/* ── POPUP DIALOG: PRATINJAU JAWABAN SEBELUM KIRIM ───────────────────── */}
        <Dialog open={previewPopupOpen} onOpenChange={setPreviewPopupOpen}>
          <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-2xl overflow-y-auto rounded-2xl sm:rounded-[28px] p-4 sm:p-7">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary">
                  <ClipboardList className="size-4 sm:size-5" />
                </div>
                <div>
                  <DialogTitle className="font-display text-lg sm:text-xl font-extrabold text-foreground">
                    Pratinjau Jawaban Anda
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Periksa kembali identitas dan jawaban Anda sebelum dikirimkan ke sistem.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Respondent Identity Summary */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Identitas Responden
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs text-primary font-semibold hover:bg-primary/10 px-2"
                    onClick={handleEditIdentityFromPopup}
                  >
                    <Edit3 className="size-3" /> Ubah
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nama:</span>{" "}
                    <span className="font-bold text-foreground">{respondentName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-semibold text-foreground">{respondentEmail}</span>
                  </div>
                </div>
              </div>

              {/* Questions & Answers Review List */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Daftar Jawaban Pertanyaan:
                </span>
                {form.questions.map((q, i) => {
                  const answerValue = answers[q.id];
                  const answered = formatAnswer(q, answerValue) || "";
                  const isEmpty = !answered;

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[11px] mt-0.5">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground leading-snug">
                              {q.label}
                              {q.required && <span className="ml-1 text-destructive">*</span>}
                            </p>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {QUESTION_TYPE_LABEL[q.type]}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 shrink-0 gap-1 text-xs text-primary font-semibold hover:bg-primary/10 px-2"
                          onClick={() => handleEditQuestionFromPopup(q.id)}
                        >
                          <Edit3 className="size-3" /> Ubah
                        </Button>
                      </div>

                      {/* Answer presentation */}
                      <div className="pl-7 pt-1">
                        {isEmpty ? (
                          <div className="text-xs italic text-muted-foreground">
                            {q.required ? (
                              <span className="text-destructive font-semibold flex items-center gap-1">
                                <AlertCircle className="size-3" /> Belum dijawab (Wajib)
                              </span>
                            ) : (
                              <span>Tidak dijawab (opsional)</span>
                            )}
                          </div>
                        ) : q.type === "rating" ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }, (_, starIdx) => {
                                const ratingNum = Number(answerValue);
                                return (
                                  <Star
                                    key={starIdx}
                                    className={`size-3.5 ${
                                      starIdx < ratingNum
                                        ? "fill-amber-400 text-amber-500"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <span className="font-display font-extrabold text-foreground text-xs">
                              {answered}
                            </span>
                          </div>
                        ) : CHOICE_TYPES.includes(q.type) ? (
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(answerValue) ? (
                              answerValue.map((opt, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="bg-mint-soft text-mint-foreground font-semibold px-2 py-0.5 text-xs"
                                >
                                  {opt}
                                </Badge>
                              ))
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-mint-soft text-mint-foreground font-semibold px-2 py-0.5 text-xs"
                              >
                                {String(answerValue)}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs font-medium text-foreground whitespace-pre-wrap">
                            {answered}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewPopupOpen(false)}
                className="rounded-full w-full sm:w-auto text-xs sm:text-sm"
              >
                Kembali Edit
              </Button>
              <Button
                type="button"
                onClick={doFinalSubmit}
                disabled={submitting}
                className="rounded-full bg-primary text-primary-foreground font-bold gap-2 shadow-md w-full sm:w-auto text-xs sm:text-sm"
              >
                {submitting ? (
                  <Spinner className="text-primary-foreground" />
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Kirim Jawaban Sekarang
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}