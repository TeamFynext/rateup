import { CreateContactMessageInput } from "./contact.schema.js";
import { emailBodyContactForm } from "../../utils/email/emailBodyContactForm.js";
import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

export async function createMsg({ name, email, message, address }: CreateContactMessageInput) {
  if ((address?.length ?? 0) > 0) {
    return null;
  }

  const stored = await prisma.contactForm.create({
    data: {
      name,
      email,
      message,
    },
  });

  const msg = {
    to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app", // Change to your recipient
    // from: 'hello@rateup.app', // Change to your verified sender
    subject: "New Message in Rateup Website Contact Form",
    text: `You have received new contact message from ${email}`,
    html: emailBodyContactForm(name, email, message),
  };
  try {
    await notificationQueue.add("notification", {
      emailData: msg,
    });
  } catch (error) {
    log.error(
      { err: error, contactFormId: stored.id },
      "Contact form stored but its notification could not be queued",
    );
  }
  return stored;
}
