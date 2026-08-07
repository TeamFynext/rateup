export function initials(name: string): string {
  const parts = (name ?? "")
    .replace(/[^a-zA-Z ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Catalog prices come from Meta already formatted with their own currency symbol
 * ("₹399.00"), but manually added products can carry a bare number. Only prefix the
 * symbol when the value doesn't already have one, otherwise it renders as "₹₹399.00".
 */
export function catalogPrice(value: string | number | null | undefined, symbol: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value).trim();
  return /^[\d.,]/.test(text) ? symbol + text : text;
}

export function money(amount: number, symbol = "₹"): string {
  const locale = symbol === "₹" ? "en-IN" : "en-US";
  return symbol + Number(amount || 0).toLocaleString(locale);
}
