import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import prisma from "../../utils/prisma.js";
import { SendEmailInput } from "./email.schema.js";
import { getEmailBodyTemplate } from "./email.util.js";
import crypto from "node:crypto";

/**
 * Renders and sends one message.
 *
 * `data` is passed separately rather than read off the request body: the OTP
 * handler used to mutate `request.body.data` to inject the code, which threw when a
 * caller sent `data: null` — after the code had already been stored.
 * See issues.txt 25.10.
 *
 * sendAWSEmail swallowed its transport error and resolved with nothing, so the
 * handlers answered 200 whether or not anything was delivered; it reports now, and
 * a failed send is an error here rather than a silent success. See issues.txt 25.7.
 */
export async function sendEmailService(
  emailParams: SendEmailInput,
  data: EmailTemplateData | undefined = emailParams?.data,
) {
  const msg = {
    to: emailParams?.toEmail,
    subject: emailParams?.subject,
    text: emailParams?.text,
    html: getEmailBodyTemplate(emailParams?.purpose, data),
  };
  const sent = await sendAWSEmail(msg);
  if (!sent) {
    throw new Error("The email could not be sent");
  }
}

export async function storeOtp(otp: string, userId: string, surveyId?: string) {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  const expiryTime = Date.now() + 10 * 60 * 1000;
  await prisma.otpStore.upsert({
    where: {
      userId,
      surveyId,
    },
    update: {
      otp: hashedOtp,
      expiryDate: expiryTime.toString(),
    },
    create: {
      otp: hashedOtp,
      expiryDate: expiryTime.toString(),
      userId,
      surveyId,
    },
  });
}

export async function validateOtp(otp: string, userId: string, surveyId?: string) {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  const storedOtp = await prisma.otpStore.findUnique({
    where: {
      userId,
      surveyId,
      otp: hashedOtp,
    },
  });

  if (storedOtp) {
    if (parseInt(storedOtp.expiryDate) > Date.now()) {
      // Consumed on success. A code that had done its job used to keep working for
      // the rest of its ten minutes, for as many checks as anyone cared to make —
      // so one that leaked (a forwarded mail, a lock-screen preview) stayed usable
      // instead of being spent on first use. It also meant rows accumulated after a
      // successful check with nothing to sweep them. See issues.txt 25.5.
      await prisma.otpStore.delete({ where: { userId, surveyId, otp: hashedOtp } });
      return true;
    } else {
      await prisma.otpStore.delete({
        where: {
          userId,
          surveyId,
          otp: hashedOtp,
        },
      });
      return false;
    }
  }
  return false;
}
