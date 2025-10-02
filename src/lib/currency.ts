export type Currency = "USD" | "EUR" | "GBP";

export interface CurrencyConfig {
  symbol: string;
  code: string;
  name: string;
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  USD: {
    symbol: "$",
    code: "USD",
    name: "US Dollar",
  },
  EUR: {
    symbol: "€",
    code: "EUR", 
    name: "Euro",
  },
  GBP: {
    symbol: "£",
    code: "GBP",
    name: "British Pound",
  },
};

export function formatCurrency(amount: number, currency: Currency = "USD"): string {
  const config = CURRENCY_CONFIG[currency];
  
  // Format with appropriate decimal places
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${config.symbol}${formatted}`;
}

export function getCurrencySymbol(currency: Currency = "USD"): string {
  return CURRENCY_CONFIG[currency].symbol;
}

export function getCurrencyCode(currency: Currency = "USD"): string {
  return CURRENCY_CONFIG[currency].code;
}

export function getCurrencyName(currency: Currency = "USD"): string {
  return CURRENCY_CONFIG[currency].name;
}