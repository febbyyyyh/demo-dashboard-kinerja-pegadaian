import { cn } from "@/lib/utils";
import { useThemeSettings } from "@/lib/formkanwil/hooks";

/** Institution logo: renders only when a custom branding logo has been uploaded. */
export function PegadaianLogo({ className }: { className?: string }) {
  const theme = useThemeSettings();
  if (!theme.logoUrl) return null;
  return (
    <img
      src={theme.logoUrl}
      alt="Logo instansi"
      className={cn("h-10 w-auto shrink-0 object-contain", className)}
    />
  );
}

export function Logo() {
  return <PegadaianLogo />;
}
