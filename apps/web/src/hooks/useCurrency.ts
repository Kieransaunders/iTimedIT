import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, getCurrencySymbol, type Currency } from "../lib/currency";

export function useCurrency() {
  const settings = useQuery(api.users.getUserSettings);
  const currency = settings?.currency ?? "USD";

  // Debug logging to track currency changes
  if (typeof window !== "undefined") {
    console.log("useCurrency - settings:", settings);
    console.log("useCurrency - currency:", currency);
  }

  return {
    currency,
    formatCurrency: (amount: number) => formatCurrency(amount, currency),
    getCurrencySymbol: () => getCurrencySymbol(currency),
  };
}