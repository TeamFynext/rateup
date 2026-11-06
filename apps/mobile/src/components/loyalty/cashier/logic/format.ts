/**
 * Money and points, formatted.
 *
 * The web reaches straight for `Intl.NumberFormat` and `toLocaleString`. Hermes ships
 * without full ICU unless the build opts in, so on some Android devices those either throw
 * or return an ungrouped string — and a receipt that throws while a customer is waiting is
 * a different class of problem from one that prints `1283` instead of `1,283`. Everything
 * here tries `Intl` first and falls back to grouping by hand.
 */

/** `1283` → `"1,283"`. */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(amount);
  } catch {
    return groupDigits(amount, maximumFractionDigits);
  }
}

/** Thousands separators without `Intl`. Always `,` and `.` — there is no locale to consult. */
function groupDigits(amount: number, fractionDigits: number): string {
  const fixed = Math.abs(amount).toFixed(fractionDigits);
  const [whole = "0", fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = amount < 0 ? "-" : "";
  return fraction ? `${sign}${grouped}.${fraction}` : `${sign}${grouped}`;
}

/**
 * `500` → `"₹500"`, `12.5` → `"₹12.50"`.
 *
 * Whole numbers read better in prose, but a 12.50 discount must not become 13. Decimal
 * columns also reach the client as strings, and `Number.isInteger("500")` is false — which
 * is what silently turned whole amounts into "₹500.00" on the web before it was coerced.
 */
export function formatMoney(rawAmount: number, currencyCode: string, symbol: string): string {
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return `${symbol}0`;
  const digits = Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    // An unrecognised currency code throws rather than falling back, and the code is free
    // text on the programme row — so is a Hermes build without ICU.
    return `${symbol}${groupDigits(amount, digits)}`;
  }
}

/**
 * The unit is whatever the merchant named it ("Points", "Beans", "Stars"), so there is no
 * dictionary to consult — trimming a trailing "s" is the whole of it.
 */
export function singularPoints(pointsName: string): string {
  return pointsName.endsWith("s") ? pointsName.slice(0, -1) : pointsName;
}

/** "43 Beans", "1 Bean". */
export function formatPoints(points: number, pointsName: string): string {
  const unit = Math.abs(points) === 1 ? singularPoints(pointsName) : pointsName;
  return `${formatNumber(points, 2)} ${unit}`;
}
