import prisma from "../../prisma.js";
import { log } from "../../logger.js";
import { renderUsageLimitEmail } from "../react/templates.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { recipientsWhere } from "../../../authz/recipients.js";
import type { UsageLimitKind } from "../../../emails/usage-limit.js";

const SUBJECT: Record<UsageLimitKind, string> = {
  activeContacts: "You've reached your monthly active contacts - Rateup.app",
  campaignCredits: "You've used all your campaign credits - Rateup.app",
  formResponses: "Your form response limit is reached - Rateup.app",
};

/**
 * Emails everyone who can act on a spent allowance — the owner and admins, i.e. members
 * holding `billing.manage`. Callers guarantee once-per-limit-per-period; nothing is
 * de-duplicated here.
 */
export async function sendUsageLimitMailAlert(orgId: string, limit: UsageLimitKind) {
  const [members, org] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId, ...recipientsWhere("billing.manage") },
      select: { user: { select: { email: true } } },
    }),
    prisma.org.findUnique({ where: { id: orgId }, select: { owner: { select: { email: true } } } }),
  ]);

  // The owner always holds billing.manage, but an org whose roles predate the authz
  // migration can still miss them in the member query.
  const recipients = new Set(
    [org?.owner?.email, ...members.map((member) => member.user?.email)].filter(
      (email): email is string => Boolean(email),
    ),
  );

  if (recipients.size === 0) {
    log.warn({ orgId, limit }, "No owner or admin email for the usage-limit alert");
    return { sent: 0 };
  }

  const html = await renderUsageLimitEmail(limit);
  for (const to of recipients) {
    await notificationQueue.add("notification", {
      emailData: {
        to,
        subject: SUBJECT[limit],
        text: "Your Rateup plan limit has been reached. Upgrade or add a pack to keep going.",
        html,
      },
    });
  }

  return { sent: recipients.size };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The form-response alert is fired from every refused respondent request, so it carries
 * its own once-a-week guard on the subscription.
 */
export async function sendFormResponseLimitAlert(orgId: string) {
  const claimed = await prisma.subscription.updateMany({
    where: {
      orgId,
      OR: [
        { lastLimitAlertSentAt: null },
        { lastLimitAlertSentAt: { lt: new Date(Date.now() - WEEK_MS) } },
      ],
    },
    data: { lastLimitAlertSentAt: new Date() },
  });
  if (claimed.count === 0) return { sent: 0 };
  return sendUsageLimitMailAlert(orgId, "formResponses");
}
