import dayjs from "dayjs";
import prisma from "../../prisma.js";
import { formatDateT1 } from "../../date.js";
import { sendAWSEmail } from "../sendAWSEmail.js";
import { log } from "../../logger.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import type { ExpiryStage } from "../../../emails/subscription-expiry.js";
import { renderSubscriptionExpiryEmail } from "../react/templates.js";

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

    await Promise.all(
      REMINDER_SCHEDULE.flatMap(({ daysBefore, stage, text }) => {
        const target = dayjs().add(daysBefore, "day").toDate().toDateString();
        return subscriptions
          .filter((s) => s.expiresAt.toDateString() === target)
          .map((subscription) => sendExpiryEmail(subscription, stage, text));
      }),
    );
    log.info("....All Subscription expiry alert has sent....");
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

  await sendAWSEmail({
    to: subscription?.org?.owner?.email,
    subject: SUBJECT,
    text,
    html: await renderSubscriptionExpiryEmail({
      stage,
      ownerName: subscription.org.owner.name ?? "there",
      planName: subscription.basePlan?.displayName ?? "",
      expiresAt: formatDateT1(subscription.expiresAt),
    }),
  });
}

export function sendSubscriptionExpiryAlertEmail(subscription: SubscriptionWithOwnerAndPlan) {
  return sendExpiryEmail(subscription, "expired", "Your Rateup Subscription has Expired");
}
