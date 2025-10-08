import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, getCurrencySymbol, type Currency } from "../lib/currency";

export function useCurrency() {
  const settings = useQuery(api.users.getUserSettings);
  const currency = settings?.currency ?? "USD";

  return {
    currency,
    formatCurrency: (amount: number) => formatCurrency(amount, currency),
    getCurrencySymbol: () => getCurrencySymbol(currency),
  };
}