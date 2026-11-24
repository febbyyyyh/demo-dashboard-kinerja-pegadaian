import { cn } from "@/lib/utils";

export function achievementTone(percent: number | null) {
  if (percent === null) return "muted" as const;
  if (percent >= 100) return "great" as const;
  if (percent >= 75) return "good" as const;
  return "low" as const;
}

const TONE_TEXT = {
  muted: "bg-muted text-muted-foreground",
  great: "bg-primary text-primary-foreground",
  good: "bg-mint-soft text-mint-foreground",
  low: "bg-warning-soft text-gold-foreground",
} as const;

export function AchievementPill({ percent }: { percent: number | null }) {
  const tone = achievementTone(percent);
  return (
    <span className={cn("pill", TONE_TEXT[tone])}>
      {percent === null ? "Tanpa target" : `${Math.round(percent)}%`}
    </span>
  );
}

export function AchievementBar({ percent, className }: { percent: number | null; className?: string }) {
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          achievementTone(percent) === "low" ? "bg-warning" : "bg-gradient-progress",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
