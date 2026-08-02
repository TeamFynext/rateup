import { CreateContactMessageInput } from "./contact.schema.js";
import { emailBodyContactForm } from "../../utils/email/emailBodyContactForm.js";
import prisma from "../../utils/prisma.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

/**
 * Stores a "contact us" submission and notifies the RateUp team.
 *
 * Returns the stored row, or null when the honeypot was filled. The caller answers
 * the SAME body either way — a honeypot a bot can detect is not a honeypot, and
 * this branch used to return the literal string "Error", which the handler sent
 * back as successful data. See issues.txt 22.2.
 *
 * The `if (user)` guard that used to wrap the notification is gone: prisma's create
 * either resolves with a row or rejects, so it could never be false (22.5).
 */
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
    // The row is already committed, so reporting a queue failure as a failed
    // submission told the visitor to send it again and quietly accumulated
    // duplicates nobody was notified about. The submission is kept and the failure
    // is logged with the row's id, so the message can be recovered from the table.
    // See issues.txt 22.4.
    log.error(
      { err: error, contactFormId: stored.id },
      "Contact form stored but its notification could not be queued",
    );
  }
  return stored;
}
