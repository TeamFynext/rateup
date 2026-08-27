import { sendTransactionalEmail } from "../../../workers/bullmq/queues/index.js";
import { renderPasswordResetEmail } from "../react/templates.js";

export async function sendResetPasswordMail(reset_link: string, email_id: string) {
  if (reset_link && email_id) {
    const msg = {
      to: email_id,
      subject: "Password Reset - RateUp.app",
      text: "Reset password for your rateup account.",
      html: await createEmailBody(reset_link),
    };
    try {
      // Sent inline: the user is sitting on the "check your email" screen. See
      // queues/notification.queue.ts.
      await sendTransactionalEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export function createEmailBody(reset_link: string) {
  return renderPasswordResetEmail(reset_link);
}
