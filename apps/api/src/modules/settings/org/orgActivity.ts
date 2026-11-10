import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";

/** How often one org's `lastActiveAt` is written: once an hour, not once per request. */
const TOUCH_INTERVAL_SECONDS = 60 * 60;

const touchKey = (orgId: string) => `orgActive:${orgId}`;

/**
 * Records that a member of `orgId` just used RateUp. Called for every signed-in request
 * (authz/authorize.ts), whatever the sign-in method, so it is the activity record the
 * inactive-org sweep trusts; `User.lastLoggedInAt` only covers email/password sign-ins.
 *
 * Any use also cancels a pending inactivity warning and scheduled deletion.
 *
 * Never throws and is not awaited by the caller: a lost stamp costs at most an hour of
 * accuracy, and must never fail the request it rides on.
 */
export async function touchOrgActivity(orgId: string): Promise<void> {
  try {
    const first = await redis.set(touchKey(orgId), "1", "EX", TOUCH_INTERVAL_SECONDS, "NX");
    if (first !== "OK") return;
    await prisma.org.update({
      where: { id: orgId },
      data: { lastActiveAt: new Date(), deletionMailSent: null, scheduledDeletionAt: null },
      select: { id: true },
    });
  } catch (err) {
    log.warn({ err, orgId }, "Could not record org activity");
  }
}

/**
 * Drops the hourly throttle, so the very next request after a warning is stamped and
 * cancels it, rather than one that lands up to an hour later.
 */
export async function resetOrgActivityThrottle(orgId: string): Promise<void> {
  try {
    await redis.del(touchKey(orgId));
  } catch (err) {
    log.warn({ err, orgId }, "Could not reset the org activity throttle");
  }
}
