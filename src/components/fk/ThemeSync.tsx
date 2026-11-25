import { useEffect } from "react";

import { useThemeSettings } from "@/lib/formkanwil/hooks";
import { applyTheme } from "@/lib/formkanwil/theme";

/** Keeps the live CSS variables and light/dark mode in sync with Theme & Branding settings. */
export function ThemeSync() {
  const theme = useThemeSettings();
  useEffect(() => {
    applyTheme(theme);
    if ((theme.mode ?? "light") !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}
