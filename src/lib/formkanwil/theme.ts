import type { ThemeFontId, ThemeMode, ThemePresetId, ThemeSettings } from "./types";

export interface ThemePalette {
  primary: string;
  primaryDeep: string;
  primaryGlow: string;
  lime: string;
}

export const THEME_PRESETS: Array<{
  id: Exclude<ThemePresetId, "custom">;
  name: string;
  description: string;
  palette: ThemePalette;
}> = [
  {
    id: "emerald",
    name: "Pegadaian Emerald",
    description: "Default resmi — hijau emerald pekat dengan aksen lime segar.",
    palette: { primary: "#146C43", primaryDeep: "#0F5132", primaryGlow: "#4ADE80", lime: "#D9F99D" },
  },
  {
    id: "forest",
    name: "Forest Slate",
    description: "Hijau hutan teredam, cocok untuk laporan yang lebih formal.",
    palette: { primary: "#2F5D4A", primaryDeep: "#1C3A2E", primaryGlow: "#86EFAC", lime: "#DCFCE7" },
  },
  {
    id: "teal",
    name: "Corporate Teal",
    description: "Teal korporat yang tenang dan modern.",
    palette: { primary: "#0F766E", primaryDeep: "#115E59", primaryGlow: "#2DD4BF", lime: "#CCFBF1" },
  },
];

export const THEME_FONTS: Array<{ id: ThemeFontId; name: string; family: string }> = [
  { id: "jakarta", name: "Plus Jakarta Sans", family: '"Plus Jakarta Sans"' },
  { id: "inter", name: "Inter", family: '"Inter"' },
  { id: "dmsans", name: "DM Sans", family: '"DM Sans"' },
];

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function paletteFor(theme: ThemeSettings): ThemePalette {
  if (theme.preset !== "custom") {
    return (THEME_PRESETS.find((preset) => preset.id === theme.preset) ?? THEME_PRESETS[0]!).palette;
  }
  const primary = HEX_COLOR.test(theme.customPrimary) ? theme.customPrimary : "#146C43";
  return {
    primary,
    primaryDeep: `color-mix(in oklab, ${primary} 74%, black)`,
    primaryGlow: `color-mix(in oklab, ${primary} 55%, white)`,
    lime: `color-mix(in oklab, ${primary} 18%, white)`,
  };
}

export function resolveThemeMode(mode: ThemeMode = "light"): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

const DEFAULT_FAVICON_HREF = "/favicon.svg?v=2";

function mimeTypeFromDataUrl(dataUrl: string): string | undefined {
  const match = /^data:([^;,]+)[;,]/i.exec(dataUrl);
  return match?.[1];
}

/** Writes the theme into the CSS variables read by src/styles.css — live, no rebuild. */
export function applyTheme(theme: ThemeSettings, root: HTMLElement = document.documentElement) {
  const palette = paletteFor(theme);
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-deep", palette.primaryDeep);
  root.style.setProperty("--primary-glow", palette.primaryGlow);
  root.style.setProperty("--lime", palette.lime);
  const font = THEME_FONTS.find((item) => item.id === theme.font) ?? THEME_FONTS[0]!;
  root.style.setProperty("--font-ui", font.family);

  const resolvedMode = resolveThemeMode(theme.mode ?? "light");
  root.classList.toggle("dark", resolvedMode === "dark");
  root.dataset["theme"] = resolvedMode;

  if (typeof document !== "undefined" && document.head) {
    const href = theme.faviconUrl || DEFAULT_FAVICON_HREF;
    const type = theme.faviconUrl ? mimeTypeFromDataUrl(theme.faviconUrl) : "image/svg+xml";

    let iconLink = document.head.querySelector<HTMLLinkElement>("#fk-app-favicon");
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.id = "fk-app-favicon";
      iconLink.rel = "icon";
      document.head.appendChild(iconLink);
    }
    if (type) iconLink.setAttribute("type", type);
    else iconLink.removeAttribute("type");
    iconLink.setAttribute("href", href);
  }
}

export const MAX_ASSET_BYTES = 600 * 1024;

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File harus berupa gambar (PNG, JPG, SVG, atau ICO)."));
      return;
    }
    if (file.size > MAX_ASSET_BYTES) {
      reject(new Error("Ukuran gambar maksimal 600 KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gambar gagal dibaca. Coba file lain."));
    reader.readAsDataURL(file);
  });
}
