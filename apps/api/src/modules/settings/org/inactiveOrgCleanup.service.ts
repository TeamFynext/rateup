import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { createInactivityWarningTemplate } from "../../../utils/email/OrgDeletionWarningEmail.js";
import { notificationQueue } from "../../../workers/bullmq/queues/notification.queue.js";
import { deleteOrg } from "./org.services.js";
import { resetOrgActivityThrottle } from "./orgActivity.js";

/**
 * Inactive workspace cleanup, run daily by the `inactiveOrgCleanup` scheduled job.
 *
 * 1. Warn: an org nobody has used for INACTIVE_DAYS gets an email to its owner and a
 *    `scheduledDeletionAt` GRACE_DAYS out.
 * 2. Delete: an org whose `scheduledDeletionAt` has passed is deleted with `deleteOrg`.
 *
 * Any signed-in request from a member cancels both (`touchOrgActivity` clears the columns),
 * so a deletion only happens to an org that stayed silent through the whole grace period.
 */
export const INACTIVE_DAYS = 365;
export const GRACE_DAYS = 30;
/** Per run, so a first run or a backlog cannot send thousands of emails or deletes at once. */
const WARN_BATCH = 100;
const DELETE_BATCH = 25;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Orgs that must never be cleaned up, however quiet: RateUp's own org, orgs staff have
 * suspended (staff decide those), orgs paying for a plan right now, and orgs whose API key
 * is still in use (an integration can run for years without anyone signing in).
 */
function protectedOrgFilter(now: Date, cutoff: Date): Prisma.OrgWhereInput {
  const rootOrg = process.env.ROOT_ORG || undefined;
  return {
    ...(rootOrg ? { id: { not: rootOrg } } : {}),
    suspendedAt: null,
    NOT: {
      Subscription: {
        is: {
          expiresAt: { gt: now },
          OR: [{ subscriptionRef: { not: null } }, { basePlan: { is: { price: { gt: 0 } } } }],
        },
      },
    },
    ApiAccessToken: { none: { lastUsedAt: { gt: cutoff } } },
  };
}

/** Idle since before `cutoff`. An org nobody has used yet counts from its creation. */
function idleSince(cutoff: Date): Prisma.OrgWhereInput {
  return {
    OR: [{ lastActiveAt: { lt: cutoff } }, { lastActiveAt: null, createdAt: { lt: cutoff } }],
  };
}

export async function warnInactiveOrgs(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);
  const deleteOn = new Date(now.getTime() + GRACE_DAYS * DAY_MS);

  const orgs = await prisma.org.findMany({
    where: { AND: [idleSince(cutoff), protectedOrgFilter(now, cutoff)], scheduledDeletionAt: null },
    select: { id: true, name: true, owner: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: WARN_BATCH,
  });

  let warned = 0;
  for (const org of orgs) {
    // Claimed with a conditional UPDATE: a member who signed in since the read above, or a
    // second worker running the same tick, makes this a no-op.
    const claimed = await prisma.org.updateMany({
      where: { id: org.id, scheduledDeletionAt: null, ...idleSince(cutoff) },
      data: { deletionMailSent: now, scheduledDeletionAt: deleteOn },
    });
    if (claimed.count === 0) continue;

    try {
      // The next request from this org must be stamped at once to cancel the warning.
      await resetOrgActivityThrottle(org.id);
      const ownerName = org.owner.name ?? "there";
      const html = await createInactivityWarningTemplate({
        orgName: org.name,
        ownerName,
        deadlineDate: deleteOn,
        idleFor: "over a year",
      });
      await notificationQueue.add("notification", {
        emailData: {
          to: org.owner.email,
          subject: `Action required: ${org.name} will be deleted on ${deleteOn.toDateString()}`,
          html,
          text: `Hi ${ownerName}, nobody has used "${org.name}" on RateUp for over a year. Sign in before ${deleteOn.toDateString()} to keep it; otherwise it will be permanently deleted with its surveys, responses and contacts.`,
        },
      });
      warned++;
    } catch (err) {
      // No email, no deletion: undo the claim so tomorrow's run tries again.
      await prisma.org.updateMany({
        where: { id: org.id, scheduledDeletionAt: deleteOn },
        data: { deletionMailSent: null, scheduledDeletionAt: null },
      });
      log.error({ err, orgId: org.id }, "Could not send the inactivity warning; claim undone");
    }
  }
  return warned;
}

export async function deleteWarnedOrgs(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * DAY_MS);

  const orgs = await prisma.org.findMany({
    where: {
      AND: [idleSince(cutoff), protectedOrgFilter(now, cutoff)],
      scheduledDeletionAt: { lte: now },
      // Only orgs that were actually told: the email went out with this stamp.
      deletionMailSent: { not: null },
    },
    select: { id: true, name: true, deletionMailSent: true },
    orderBy: { scheduledDeletionAt: "asc" },
    take: DELETE_BATCH,
  });

  let deleted = 0;
  for (const org of orgs) {
    try {
      const result = await deleteOrg(org.id);
      deleted++;
      log.info(
        {
          orgId: org.id,
          orgName: org.name,
          warnedAt: org.deletionMailSent,
          usersDeleted: result.usersDeleted.length,
          usersKept: result.usersKept.length,
        },
        "Deleted inactive org",
      );
    } catch (err) {
      log.error({ err, orgId: org.id }, "Could not delete inactive org");
    }
  }
  return deleted;
}

export async function runInactiveOrgCleanup(now = new Date()): Promise<void> {
  const warned = await warnInactiveOrgs(now);
  const deleted = await deleteWarnedOrgs(now);
  log.info({ warned, deleted }, "Inactive org cleanup finished");
}
