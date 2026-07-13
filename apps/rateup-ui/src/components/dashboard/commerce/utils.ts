export function initials(name: string): string {
  const parts = (name ?? "")
    .replace(/[^a-zA-Z ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function money(amount: number, symbol = "₹"): string {
  const locale = symbol === "₹" ? "en-IN" : "en-US";
  return symbol + Number(amount || 0).toLocaleString(locale);
}
