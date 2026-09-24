import prisma from "../../utils/prisma.js";
import redis from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

/*
 * Suspension: RateUp staff switching an account off (src/modules/staff). Read on every
 * authenticated request, so the answer is cached for a minute; suspending and unsuspending
 * both clear the key, which is why a customer is let back in immediately rather than up to
 * a minute later.
 *
 * `Org.isPaused` is a different thing and is deliberately not consulted here: the
 * customer's own admin and a Shopify uninstall set that one.
 */

const CACHE_SECONDS = 60;
const cacheKey = (orgId: string) => `org:suspended:${orgId}`;

/** The message the customer sees. Says who to talk to, and never why. */
export const ORG_SUSPENDED_MESSAGE =
  "This account is suspended. Please contact RateUp support to restore it.";

/** The code clients branch on to show the suspended screen. */
export const ORG_SUSPENDED_CODE = "ORG_SUSPENDED";

export async function isOrgSuspended(orgId: string): Promise<boolean> {
  if (!orgId) return false;
  try {
    const cached = await redis.get(cacheKey(orgId));
    if (cached !== null) return cached === "1";
  } catch (err) {
    // Redis being down must not lock everyone out, nor let a suspended org back in: fall
    // through to the database, which is the truth anyway.
    log.warn({ err, orgId }, "Suspension cache unavailable; reading the org instead");
  }

  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { suspendedAt: true },
  });
  const suspended = Boolean(org?.suspendedAt);
  try {
    await redis.set(cacheKey(orgId), suspended ? "1" : "0", "EX", CACHE_SECONDS);
  } catch {
    // Cache-only failure; the answer above still stands.
  }
  return suspended;
}

/** Called by the staff suspend / unsuspend actions, so the change takes effect at once. */
export async function clearOrgSuspensionCache(orgId: string): Promise<void> {
  try {
    await redis.del(cacheKey(orgId));
  } catch (err) {
    log.warn({ err, orgId }, "Could not clear the suspension cache; it expires in a minute");
  }
}

/**
 * The routes a suspended org may still reach. Its people have to be able to sign in far
 * enough to be told what happened — a blank 403 on the first call would look like an
 * outage, and the screen that explains the suspension needs the user and the org to render.
 */
const EXEMPT_ROUTES = new Set(["/api/user/info", "/api/user/profile", "/api/org", "/api/org/"]);

export function isSuspensionExemptRoute(url: string | undefined): boolean {
  if (!url) return false;
  return EXEMPT_ROUTES.has(url.split("?")[0]);
}
