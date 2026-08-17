import prisma from "../../prisma.js";
import { renderUsageLimitEmail } from "../react/templates.js";
import { sendAWSEmail } from "../sendAWSEmail.js";

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
  } else {
    console.log(
      "....Sending Usage Limit Reached Mail Alert......" + subscription?.org?.owner?.email,
    );
    const msg = {
      to: subscription?.org?.owner?.email, // Change to your recipient
      // from: 'hello@rateup.app', // Change to your verified sender
      subject: "Rateup Subscription Limit Reached - Rateup.app",
      text: `Rateup Usage Limit Exceeded Alert. Please upgrade your plan`,
      html: await usageLimitMailBody(),
    };
    try {
      sendAWSEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }

    await prisma.subscription.update({
      where: { orgId },
      data: { lastLimitAlertSentAt: new Date() },
    });
  }

  return "Done";
}

export function usageLimitMailBody() {
  return renderUsageLimitEmail();
}
