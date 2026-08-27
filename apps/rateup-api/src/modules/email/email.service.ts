import { sendTransactionalEmail } from "../../workers/bullmq/queues/index.js";
import prisma from "../../utils/prisma.js";
import { SendEmailInput } from "./email.schema.js";
import { getEmailBodyTemplate } from "./email.util.js";
import crypto from "node:crypto";

export async function sendEmailService(
  emailParams: SendEmailInput,
  data: EmailTemplateData | undefined = emailParams?.data,
) {
  const msg = {
    to: emailParams?.toEmail,
    subject: emailParams?.subject,
    text: emailParams?.text,
    html: await getEmailBodyTemplate(emailParams?.purpose, data),
  };
  // Direct SES call, no queue hop: OTP mail is the most latency-sensitive email here, and a
  // code that arrives seconds late is a code the user has already given up on. A failed send
  // falls back to the transactional queue for retries — see queues/notification.queue.ts.
  try {
    await sendTransactionalEmail(msg);
  } catch (error) {
    throw new Error("The email could not be sent", { cause: error });
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
