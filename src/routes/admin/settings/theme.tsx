import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AssetDropzone } from "@/components/fk/AssetDropzone";
import { PegadaianLogo } from "@/components/fk/Logo";
import { PageTitle } from "@/components/fk/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeSettings } from "@/lib/formkanwil/hooks";
import { repository } from "@/lib/formkanwil/repository";
import { createDefaultTheme } from "@/lib/formkanwil/seed";
import { HEX_COLOR, paletteFor, THEME_FONTS, THEME_PRESETS } from "@/lib/formkanwil/theme";
import type { ThemeSettings } from "@/lib/formkanwil/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings/theme")({
  head: () => ({
    meta: [
      { title: "Tema & Branding — FormKanwil" },
      { name: "description", content: "Atur palet warna, tipografi, logo, favicon, dan banner form FormKanwil." },
      { property: "og:title", content: "Tema & Branding — FormKanwil" },
      { property: "og:description", content: "Palet warna, tipografi, dan aset branding FormKanwil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThemePage,
});

function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="flex -space-x-1.5">
      {colors.map((color) => (
        <span key={color} className="size-7 rounded-full border-2 border-card shadow-card" style={{ background: color }} />
      ))}
    </div>
  );
}

function ThemePage() {
  const theme = useThemeSettings();
  const update = (patch: Partial<ThemeSettings>) => repository.theme.save({ ...theme, ...patch });
  const palette = paletteFor(theme);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Tema & Branding"
        subtitle="Perubahan langsung diterapkan ke seluruh dashboard, laporan, dan form responden."
        action={
          <Button
            variant="outline"
            onClick={() => {
              repository.theme.save(createDefaultTheme());
              toast.success("Tema dikembalikan ke Pegadaian Emerald");
            }}
          >
            <RotateCcw /> Reset default
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Palet warna</h2>
            <p className="text-sm text-muted-foreground">Mengubah --primary, --sidebar-accent, gradien kartu, dan grafik.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {THEME_PRESETS.map((preset) => {
                const selected = theme.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => update({ preset: preset.id })}
                    className={cn(
                      "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift",
                      selected ? "border-primary bg-mint-soft ring-2 ring-primary/20" : "border-border bg-card",
                    )}
                  >
                    <Swatches colors={[preset.palette.primaryDeep, preset.palette.primary, preset.palette.primaryGlow, preset.palette.lime]} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{preset.name}</span>
                      <span className="block text-xs text-muted-foreground">{preset.description}</span>
                    </span>
                    {selected && <Check className="size-4 text-primary" />}
                  </button>
                );
              })}
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-4",
                  theme.preset === "custom" ? "border-primary bg-mint-soft ring-2 ring-primary/20" : "border-border bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Custom Hex</span>
                  {theme.preset === "custom" && <Check className="size-4 text-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Pilih warna utama"
                    value={HEX_COLOR.test(theme.customPrimary) ? theme.customPrimary : "#146C43"}
                    onChange={(e) => update({ preset: "custom", customPrimary: e.target.value.toUpperCase() })}
                    className="size-10 shrink-0 cursor-pointer rounded-xl border border-border bg-card p-1"
                  />
                  <Input
                    value={theme.customPrimary}
                    maxLength={7}
                    onChange={(e) => {
                      const value = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                      update({ customPrimary: value.toUpperCase(), ...(HEX_COLOR.test(value) ? { preset: "custom" as const } : {}) })
                    }}
                    className="font-mono uppercase"
                  />
                </div>
                {!HEX_COLOR.test(theme.customPrimary) && (
                  <p className="text-xs text-destructive">Gunakan format #RRGGBB.</p>
                )}
              </div>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Tipografi</h2>
            <p className="text-sm text-muted-foreground">Font antarmuka untuk dashboard dan laporan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {THEME_FONTS.map((font) => {
                const selected = theme.font === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => update({ font: font.id })}
                    style={{ fontFamily: font.family }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all hover:shadow-lift",
                      selected ? "border-primary bg-mint-soft ring-2 ring-primary/20" : "border-border bg-card",
                    )}
                  >
                    <span className="block text-3xl font-extrabold tracking-tight">Aa 128</span>
                    <span className="mt-2 block text-sm font-semibold">{font.name}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">Rp 1.250.000 · 98,4%</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Aset branding</h2>
            <p className="text-sm text-muted-foreground">PNG, JPG, atau SVG maksimal 600 KB. Disimpan di browser ini sampai penyimpanan file terhubung.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AssetDropzone label="Logo instansi" hint="Tampil di sidebar & kop export JPEG" value={theme.logoUrl} onChange={(logoUrl) => update({ logoUrl })} />
              <AssetDropzone label="Favicon" hint="Persegi, idealnya 64×64 px" value={theme.faviconUrl} onChange={(faviconUrl) => update({ faviconUrl })} previewClassName="size-16" />
              <div className="md:col-span-2">
                <AssetDropzone
                  label="Banner header form responden"
                  hint="Rasio lebar, mis. 1600×400 px"
                  value={theme.bannerUrl}
                  onChange={(bannerUrl) => update({ bannerUrl })}
                  previewClassName="max-h-32 w-full rounded-xl object-cover"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="eyebrow">Pratinjau langsung</div>
          <div className="panel overflow-hidden">
            <div className="flex">
              <div className="w-16 shrink-0 space-y-2 border-r border-border bg-sidebar p-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-brand text-xs font-extrabold text-primary-foreground">FK</span>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("relative block h-10 rounded-xl", i === 1 ? "bg-sidebar-accent" : "bg-muted")}>
                    {i === 1 && <span className="absolute -left-3 top-1 bottom-1 w-1 rounded-r-full bg-primary" />}
                  </span>
                ))}
              </div>
              <div className="flex-1 space-y-3 bg-background p-4">
                <PegadaianLogo className="h-7" />
                <div className="rounded-2xl bg-gradient-hero-card p-4 text-on-hero">
                  <div className="text-xs text-on-hero-muted">Total Jawaban Masuk</div>
                  <div className="font-display text-3xl font-extrabold tabular-nums">1.284</div>
                  <span className="pill mt-2 bg-lime text-primary-deep">+12%</span>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Capaian unit</div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-full w-3/4 rounded-full bg-gradient-progress" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Simpan</Button>
                  <Button size="sm" variant="secondary">Batal</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="panel p-4 text-xs text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">Variabel aktif</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
              <dt>--primary</dt><dd className="truncate">{palette.primary}</dd>
              <dt>--primary-deep</dt><dd className="truncate">{palette.primaryDeep}</dd>
              <dt>--primary-glow</dt><dd className="truncate">{palette.primaryGlow}</dd>
              <dt>--lime</dt><dd className="truncate">{palette.lime}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
