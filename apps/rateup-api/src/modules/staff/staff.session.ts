import { createHash, randomBytes } from "node:crypto";
import type { StaffSession, StaffUser } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { StaffHttpError } from "./staff.errors.js";

/** Signed out after this long without a request. */
export const SESSION_IDLE_MS = 45 * 60_000;
/** Signed out this long after Google authenticated them, however active they are. */
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60_000;
/** Deleting an org or applying maintenance needs a Google login at most this old. */
export const STEP_UP_MAX_AGE_MS = 15 * 60_000;
/** `lastSeenAt` is only written when it is at least this stale: one UPDATE a minute, not per request. */
const TOUCH_INTERVAL_MS = 60_000;
/** Ended sessions are kept this long (for the console's session list), then purged. */
const PURGE_AFTER_MS = 30 * 24 * 60 * 60_000;

export type SessionWithStaff = StaffSession & { staffUser: StaffUser };

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes for the cookie; only the hash is ever stored. */
export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

export type SessionRejection = "revoked" | "expired" | "idle" | "inactive";

/** Why a stored session may not be used, or null when it may. */
export function judgeSession(session: SessionWithStaff, now: Date): SessionRejection | null {
  if (session.revokedAt) return "revoked";
  if (now >= session.expiresAt) return "expired";
  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS) return "idle";
  if (!session.staffUser.active) return "inactive";
  return null;
}

export async function createStaffSession(
  staffUserId: string,
  meta: { ip?: string; userAgent?: string },
  now = new Date(),
): Promise<{ token: string; session: StaffSession }> {
  const { token, tokenHash } = newSessionToken();
  const session = await prisma.staffSession.create({
    data: {
      tokenHash,
      staffUserId,
      authenticatedAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 512),
    },
  });
  return { token, session };
}

export function findStaffSession(token: string): Promise<SessionWithStaff | null> {
  return prisma.staffSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { staffUser: true },
  });
}

export async function touchStaffSession(session: StaffSession, now = new Date()): Promise<void> {
  if (now.getTime() - session.lastSeenAt.getTime() < TOUCH_INTERVAL_MS) return;
  await prisma.staffSession.update({ where: { id: session.id }, data: { lastSeenAt: now } });
}

export async function revokeStaffSession(id: string, now = new Date()): Promise<void> {
  await prisma.staffSession.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now },
  });
}

/**
 * Ends the session a new sign-in replaces. Scoped to the person who just signed in, so the
 * hash carried in the sign-in cookie can only ever close that person's own session.
 */
export async function revokeReplacedStaffSession(
  tokenHash: string,
  staffUserId: string,
  now = new Date(),
): Promise<void> {
  await prisma.staffSession.updateMany({
    where: { tokenHash, staffUserId, revokedAt: null },
    data: { revokedAt: now },
  });
}

/** For deactivation: every open session of that staff member ends in the same statement. */
export async function revokeAllStaffSessions(staffUserId: string, now = new Date()) {
  return prisma.staffSession.updateMany({
    where: { staffUserId, revokedAt: null },
    data: { revokedAt: now },
  });
}

/**
 * Step-up for destructive actions: refuse unless Google authenticated this person in the
 * last 15 minutes. The console answers REAUTH_REQUIRED by re-running Google sign-in with
 * `prompt=login`, which issues a fresh session.
 */
export function assertRecentAuth(session: StaffSession | undefined, now = new Date()): void {
  if (!session || now.getTime() - session.authenticatedAt.getTime() > STEP_UP_MAX_AGE_MS) {
    throw new StaffHttpError(
      401,
      "REAUTH_REQUIRED",
      "Confirm it's you: sign in with Google again.",
    );
  }
}

/** Daily sweep (scheduledJobs `staffSessionPurge`). */
export async function purgeStaffSessions(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_MS);
  const { count } = await prisma.staffSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
  });
  return count;
}
