/**
 * Whether an invitation's emailed link has stopped working.
 *
 * `undefined` means the listing did not say, so the row is not marked. `null` is a row issued
 * before invite links expired: it has no working token, and the API refuses it like an expired
 * one, so a resend is what it needs.
 */
export function isInviteExpired(
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (expiresAt === undefined) return false;
  if (expiresAt === null) return true;
  const time = Date.parse(expiresAt);
  return !Number.isNaN(time) && time <= now;
}
