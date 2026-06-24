import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";
import prisma from "../../utils/prisma.js";
import { SendEmailInput } from "./email.schema.js";
import { getEmailBodyTemplate } from "./email.util.js";
import crypto from "node:crypto";

export async function sendEmailService(emailParams: SendEmailInput) {
  const msg = {
    to: emailParams?.toEmail,
    subject: emailParams?.subject,
    text: emailParams?.text,
    html: getEmailBodyTemplate(emailParams?.purpose, emailParams?.data),
  };
  await sendAWSEmail(msg);
}

export async function storeOtp(otp, userId, surveyId = undefined) {
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

export async function validateOtp(otp, userId, surveyId = undefined) {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  const storedOtp = await prisma.otpStore.findUnique({
    where: {
      userId,
      surveyId,
      otp: hashedOtp,
    },
  });

  if (storedOtp) {
    if (parseInt(storedOtp.expiryDate) > Date.now()) return true;
    else {
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
