import { FastifyReply, FastifyRequest } from "fastify";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createBookDemo } from "./bookDemo.service";
import { CreateBookDemoInput } from "./bookDemo.schema";

export async function bookDemoHandler(
  request: FastifyRequest<{ Body: CreateBookDemoInput }>,
  reply: FastifyReply,
) {
  try {
    const {
      firstName,
      lastName,
      workEmail,
      phoneNumber,
      companyName,
      teamSize,
      preferredTime,
      primaryUseCase,
      additionalInfo,
    } = request.body;

    const savedDemo = await createBookDemo({
      firstName,
      lastName,
      workEmail,
      phoneNumber,
      companyName,
      teamSize,
      preferredTime,
      primaryUseCase,
      additionalInfo,
    });

    const subject = `New Demo Request from ${firstName} ${lastName}`;
    const text = `
      You have a new demo request:

      Name: ${firstName} ${lastName}
      Email: ${workEmail}
      Phone: ${phoneNumber}
      Company: ${companyName}
      Team Size: ${teamSize}
      Preferred Time: ${preferredTime}
      Use Case: ${primaryUseCase}
      Additional Info: ${additionalInfo}
    `;

    const html = `
      <h2>New Demo Request</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${workEmail}</p>
      <p><strong>Phone:</strong> ${phoneNumber}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Team Size:</strong> ${teamSize}</p>
      <p><strong>Preferred Time:</strong> ${preferredTime}</p>
      <p><strong>Primary Use Case:</strong> ${primaryUseCase}</p>
      <p><strong>Additional Info:</strong> ${additionalInfo}</p>
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
      data: savedDemo,
    });
  } catch (err) {
    console.error("Error handling demo booking:", err);
    return reply.status(500).send({
      success: false,
      message: "Something went wrong while booking a demo.",
    });
  }
}
