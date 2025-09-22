import { formatCurrency } from "@/lib/format";

interface CostTickerProps {
  seconds: number;
  hourlyRate: number;
  clientName: string;
  currency?: string;
}

export function CostTicker({ seconds, hourlyRate, clientName, currency = "USD" }: CostTickerProps) {
  const cost = (seconds * hourlyRate) / 3600;
  return (
    <p className="text-muted-foreground text-base sm:text-lg md:text-xl" aria-live="polite">
      This task has cost <span className="font-semibold text-foreground">{clientName}</span> {formatCurrency(cost, currency)} so far
    </p>
  );
}
