import { cn } from "@/lib/utils";
import pegadaianLogo from "@/assets/logo-pegadaian.svg";
import { useThemeSettings } from "@/lib/formkanwil/hooks";

/** Institution logo: the uploaded branding logo when set, otherwise the Pegadaian mark. */
export function PegadaianLogo({ className }: { className?: string }) {
  const theme = useThemeSettings();
  return (
    <img
      src={theme.logoUrl ?? pegadaianLogo}
      alt="Pegadaian"
      className={cn("h-10 w-auto shrink-0 object-contain", className)}
    />
  );
}

export function Logo() {
  return <PegadaianLogo />;
}
