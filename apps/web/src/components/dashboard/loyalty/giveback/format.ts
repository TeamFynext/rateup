/**
 * Money and percentage formatting for the giveback surfaces.
 *
 * `money()` already exists in `dashboard/commerce/utils.ts`, but importing across
 * features to reuse eight lines couples loyalty to commerce for no benefit.
 */

export function formatMoney(
  rawAmount: number,
  currencyCode: string,
  currencySymbol: string,
): string {
  // Decimal columns reach the client as strings, and `Number.isInteger("500")` is false —
  // which silently turned whole amounts into "₹500.00".
  const amount = Number(rawAmount);
  // Whole numbers read better in prose, but a 12.50 discount must not become 13. Both
  // bounds have to move together: most currencies default to a minimum of 2, and leaving
  // that in place while dropping the maximum to 0 is a RangeError.
  const digits = Number.isInteger(amount) ? 0 : 2;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    // An unrecognised currency code throws rather than falling back, and the code is
    // free text on the program row.
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }
}

/** One decimal, except where that would render a real difference as "0.0%". */
export function formatPercent(pct: number): string {
  if (pct > 0 && pct < 0.05) return "<0.1%";
  return `${pct.toFixed(1)}%`;
}

export function formatPoints(points: number, pointsName: string): string {
  const value = points.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${value} ${points === 1 ? singularPoints(pointsName) : pointsName}`;
}

/**
 * The unit is whatever the merchant named it ("Points", "Beans", "Stars"), so there is no
 * dictionary to consult — trimming a trailing "s" is the whole of it, and a name that does
 * not end in one is left alone.
 */
export function singularPoints(pointsName: string): string {
  return pointsName.endsWith("s") ? pointsName.slice(0, -1) : pointsName;
}
