import { useEffect } from "react";

import { useThemeSettings } from "@/lib/formkanwil/hooks";
import { applyTheme } from "@/lib/formkanwil/theme";

/** Keeps the live CSS variables in sync with the saved Theme & Branding settings. */
export function ThemeSync() {
  const theme = useThemeSettings();
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}
