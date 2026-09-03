import prisma from "../../prisma.js";
import { log } from "../../logger.js";
import { renderUsageLimitEmail } from "../react/templates.js";
import { notificationQueue } from "../../../workers/bullmq/queues/index.js";

//Send limit reached alert (only 1 mail in a week)
export async function sendUsageLimitMailAlert(orgId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    include: {
      org: {
        include: {
          owner: true,
        },
      },
    },
  });

  if (
    !subscription ||
    (subscription.lastLimitAlertSentAt &&
      subscription.lastLimitAlertSentAt >= new Date(new Date().setDate(new Date().getDate() - 7)))
  ) {
    // Alert already sent within the last week or subscription does not exist
    return { message: "No action needed" };
  }

  const to = subscription.org?.owner?.email;

  // No recipient, nothing to send. `EmailParams.to` is typed `string` but nothing checked
  // it here, so an org whose owner could not be read queued an email addressed to
  // `undefined`: SES refused it with "Missing required header 'To'", and BullMQ retried
  // that same doomed job five times with backoff. The alert is also NOT stamped as sent
  // below, so the org is not silenced for a week over a mail that never went out.
  if (!to) {
    log.warn({ orgId }, "No owner email for the usage-limit alert; skipping the send");
    return { message: "No recipient" };
  }

  log.debug({ orgId, to }, "Sending the usage-limit alert");
  const msg = {
    to,
    // from: 'hello@rateup.app', // Change to your verified sender
    subject: "Rateup Subscription Limit Reached - Rateup.app",
    text: `Rateup Usage Limit Exceeded Alert. Please upgrade your plan`,
    html: await usageLimitMailBody(),
  };
  try {
    await notificationQueue.add("notification", { emailData: msg });
  } catch (error) {
    log.error({ err: error, orgId }, "Could not queue the usage-limit alert");
    throw new Error("Email sending failed. E:" + error);
  }

  await prisma.subscription.update({
    where: { orgId },
    data: { lastLimitAlertSentAt: new Date() },
  });

  return "Done";
}

export function usageLimitMailBody() {
  return renderUsageLimitEmail();
}
