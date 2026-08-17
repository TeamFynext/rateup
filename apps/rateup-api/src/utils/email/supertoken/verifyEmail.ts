import { enqueueTransactionalEmail } from "../../../workers/bullmq/queues/index.js";
import { renderVerifyEmail } from "../react/templates.js";

export async function sendVerifyMail(verify_link: string, email_id: string, user_name: string) {
  if (verify_link && email_id) {
    const msg = {
      to: email_id,
      subject: "Verify your email - RateUp.app",
      text: "Email verification for your rateup account.",
      html: await createEmailBody(verify_link, user_name),
    };
    try {
      // Fast lane: signup is blocked until this arrives.
      await enqueueTransactionalEmail(msg);
    } catch (error) {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    }
  }
}

export function createEmailBody(verify_link: string, user_name: string) {
  return renderVerifyEmail({ verifyLink: verify_link, userName: user_name });
}
