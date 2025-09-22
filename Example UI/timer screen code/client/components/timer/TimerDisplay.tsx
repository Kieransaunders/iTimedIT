import { cn } from "@/lib/utils";
import { formatMMSS } from "@/lib/format";

interface TimerDisplayProps {
  elapsedMs: number;
  className?: string;
}

export function TimerDisplay({ elapsedMs, className }: TimerDisplayProps) {
  return (
    <div
      className={cn(
        "select-none font-extrabold tracking-tight text-center",
        "text-6xl sm:text-7xl md:text-8xl lg:text-9xl",
        "bg-gradient-to-br from-primary to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_6px_24px_rgba(139,92,246,0.35)]",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatMMSS(elapsedMs)}
    </div>
  );
}
