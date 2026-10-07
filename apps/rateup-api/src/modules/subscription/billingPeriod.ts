/**
 * The plan meters count per calendar month in UTC. A period is named by its first day,
 * which is what the `@db.Date` period columns store.
 */
export function currentPeriodStart(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}

/** The first instant of the following period, i.e. when the current meters restart. */
export function nextPeriodStart(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
}

/** Whether a stored `@db.Date` period column names the same month as `period`. */
export function isSamePeriod(stored: Date | null | undefined, period: Date): boolean {
  return Boolean(stored) && stored!.getTime() === period.getTime();
}

/** The period as `YYYY-MM-DD`, for raw SQL: a JS Date cast to `::date` follows the session time zone. */
export function periodKey(period: Date): string {
  return period.toISOString().slice(0, 10);
}
