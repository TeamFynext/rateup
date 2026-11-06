import dayjs from "dayjs";
import prisma from "../../prisma.js";
import { formatDateT1 } from "../../date.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import { log } from "../../logger.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import type { ExpiryStage } from "../../../emails/subscription-expiry.js";
import { renderSubscriptionExpiryEmail } from "../react/templates.js";
import { GATEWAY_BILLED_PLAN } from "../../../modules/subscription/planBilling.js";

type SubscriptionWithOwnerAndPlan = Prisma.SubscriptionGetPayload<{
  include: { org: { select: { owner: true } }; basePlan: true };
}>;

/**
 * The reminder schedule, in days before expiry. `0` is the day it lapses.
 * `text` is the plain-text alternative and doubles as the log line.
 */
const REMINDER_SCHEDULE: { daysBefore: number; stage: ExpiryStage; text: string }[] = [
  { daysBefore: 30, stage: "30-days", text: "Your Rateup Subscription Expires in One Month" },
  { daysBefore: 15, stage: "15-days", text: "Your Rateup Subscription Expires in 15 Days" },
  { daysBefore: 7, stage: "7-days", text: "Your Rateup Subscription Expires in 7 days" },
  { daysBefore: 3, stage: "3-days", text: "Your Rateup Subscription Expires in 3 Days" },
  { daysBefore: 1, stage: "tomorrow", text: "Your Rateup Subscription Expires Tomorrow!" },
  { daysBefore: 0, stage: "expired", text: "Your Rateup Subscription has Expired" },
];

const SUBJECT = "Rateup Subscription Expiry Alert - Rateup.app";

export async function subscriptionExpiryAlert() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        // Only plans a gateway bills on a schedule have a real deadline. Warning an
        // Enterprise customer that their contract "expires tomorrow" — when nothing will
        // actually happen to it — is worse than saying nothing.
        basePlan: GATEWAY_BILLED_PLAN,
      },
      include: {
        org: {
          select: {
            owner: true,
          },
        },
        basePlan: true,
      },
    });

    if (!subscriptions.length) return;

    const sends = REMINDER_SCHEDULE.flatMap(({ daysBefore, stage, text }) => {
      const target = dayjs().add(daysBefore, "day").toDate().toDateString();
      return subscriptions
        .filter((s) => s.expiresAt.toDateString() === target)
        .filter((s) => {
          if (s.org?.owner?.email) return true;
          // An org whose owner has been removed has nobody to tell; skip it rather than
          // failing the run for everyone else.
          log.warn({ orgId: s.orgId }, "Skipping expiry alert: the org has no owner email");
          return false;
        })
        .map((subscription) => sendExpiryEmail(subscription, stage, text));
    });

    // allSettled, not all: one org that cannot be queued must not cancel the rest.
    const results = await Promise.allSettled(sends);
    const failed = results.filter((r) => r.status === "rejected");
    for (const failure of failed) {
      log.error({ err: (failure as PromiseRejectedResult).reason }, "An expiry alert failed");
    }
    log.info(
      { sent: results.length - failed.length, failed: failed.length },
      "Subscription expiry alerts processed",
    );
  } catch (e) {
    log.error({ err: e }, "Error sending subscription expiry email");
  }
}

async function sendExpiryEmail(
  subscription: SubscriptionWithOwnerAndPlan,
  stage: ExpiryStage,
  text: string,
) {
  log.info(`....Sending Subcription Expiry Mail Alert......${subscription?.org?.owner?.email}`);

  await notificationQueue.add("notification", {
    emailData: {
      to: subscription?.org?.owner?.email,
      subject: SUBJECT,
      text,
      html: await renderSubscriptionExpiryEmail({
        stage,
        ownerName: subscription.org.owner.name ?? "there",
        planName: subscription.basePlan?.displayName ?? "",
        expiresAt: formatDateT1(subscription.expiresAt),
      }),
    },
  });
}

export function sendSubscriptionExpiryAlertEmail(subscription: SubscriptionWithOwnerAndPlan) {
  return sendExpiryEmail(subscription, "expired", "Your Rateup Subscription has Expired");
}
