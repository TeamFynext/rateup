import { FastifyReply, FastifyRequest } from "fastify";
import { CreateBookDemoInput } from "./bookDemo.schema";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";

export async function bookDemoHandler(
  request: FastifyRequest<{ Body: CreateBookDemoInput }>,
  reply: FastifyReply,
) {
  try {
    const { name, phone, email, reason } = request.body;
    const subject = `New Demo Request from ${name}`;
    const text = `
      You have a new demo request:

      Name: ${name}
      Email: ${email}
      Phone: ${phone}
      Reason: ${reason}
    `;

    const html = `
      <h2>New Demo Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Reason:</strong> ${reason}</p>
    `;

    await sendAWSEmail({
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      subject,
      text,
      html,
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
