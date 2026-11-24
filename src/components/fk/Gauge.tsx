import { useId } from "react";

/** Semicircular progress gauge with the lime → emerald brand gradient. */
export function SemiGauge({ value, max, label }: { value: number; max: number; label: string }) {
  const id = useId();
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const radius = 80;
  const circumference = Math.PI * radius;
  return (
    <div className="relative mx-auto w-full max-w-[15rem]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--lime)" }} />
            <stop offset="55%" style={{ stopColor: "var(--primary-glow)" }} />
            <stop offset="100%" style={{ stopColor: "var(--primary-deep)" }} />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          strokeWidth="18"
          strokeLinecap="round"
          style={{ stroke: "var(--muted)" }}
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-display text-4xl font-extrabold tabular-nums tracking-tight">
          {Math.round(ratio * 100)}%
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
