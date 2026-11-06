/** Currencies the gateways quote in whole units (no cents). */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function currencyDecimals(currency: string): 0 | 2 | 3 {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * Three-decimal amounts are rounded to a multiple of 10 minor units: Stripe refuses any other
 * value, and prices are stored at two decimals (Decimal(12,2)) so nothing is lost.
 */
export function toMinorUnits(amount: number, currency: string): number {
  switch (currencyDecimals(currency)) {
    case 0:
      return Math.round(amount);
    case 3:
      return Math.round(amount * 100) * 10;
    default:
      return Math.round(amount * 100);
  }
}

export function fromMinorUnits(amount: number, currency: string): number {
  switch (currencyDecimals(currency)) {
    case 0:
      return amount;
    case 3:
      return amount / 1000;
    default:
      return amount / 100;
  }
}

export function formatMoney(amount: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

const KNOWN_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

/** An ISO 4217 code the runtime knows, so every money label and gateway accepts it. */
export const isCurrencyCode = (code: string) => KNOWN_CURRENCIES.has(code);
