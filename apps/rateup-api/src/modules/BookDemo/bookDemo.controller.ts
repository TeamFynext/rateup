import { FastifyReply, FastifyRequest } from "fastify";
import {
  renderBookDemoConfirmationEmailBodies,
  renderBookDemoRequestEmailBodies,
  renderPartnerInquiryEmailBodies,
} from "../../utils/email/react/templates.js";
import { CreateBookDemoInput, CreatePartnerDataInput } from "./bookDemo.schema.js";
import { notificationQueue } from "../../workers/bullmq/queues/index.js";

/**
 * `HH:mm` (what the form submits, and what the schema enforces) rendered the way the visitor
 * picked it in the form's own dropdown — "14:30" reads as an oddity in an email to a restaurant
 * owner, "2:30 PM" does not.
 */
export function formatPreferredTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export async function bookDemoHandler(
  request: FastifyRequest<{ Body: CreateBookDemoInput }>,
  reply: FastifyReply,
) {
  try {
    const { name, businessName, phone, message, workEmail, preferredDate, preferredTime } =
      request.body;

    // The visitor may give a date, both, or neither — render whatever they gave rather than
    // printing a half-empty "Preferred Slot: 2026-09-01 at " line.
    const preferredSlot =
      [preferredDate, preferredTime && formatPreferredTime(preferredTime)]
        .filter(Boolean)
        .join(" at ") || "No preference";

    const [inbound, confirmation] = await Promise.all([
      renderBookDemoRequestEmailBodies({
        name,
        workEmail,
        businessName,
        phone,
        preferredSlot,
        message,
      }),
      renderBookDemoConfirmationEmailBodies({
        name,
        businessName,
        phone,
        preferredSlot,
        message,
      }),
    ]);

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: `New Demo Request from ${name}`,
        html: inbound.html,
        text: inbound.text,
      },
    });

    await notificationQueue.add("notification", {
      emailData: {
        to: workEmail,
        subject: "RateUp - Demo Booked Successfully",
        html: confirmation.html,
        text: confirmation.text,
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Your demo request has been received. We’ll contact you soon!",
    });
  } catch (err) {
    console.error("Error handling demo booking:", err);
    return reply.status(500).send({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  }
}

export async function partnerDataHandler(
  request: FastifyRequest<{ Body: CreatePartnerDataInput }>,
  reply: FastifyReply,
) {
  try {
    const {
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    } = request.body;

    const { html, text } = await renderPartnerInquiryEmailBodies({
      fullName,
      workEmail,
      phone,
      companyName,
      website,
      country,
      businessType,
      companySize,
      yearsInBusiness,
      whyPartner,
      services,
      referralVolume,
      managesClients,
      apiExperience,
      canOnboard,
    });

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: `New Partner Inquiry from ${fullName}`,
        html,
        text,
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Partner inquiry submitted successfully",
    });
  } catch (error) {
    console.error("Error in partnerDataHandler:", error);
    return reply.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}
