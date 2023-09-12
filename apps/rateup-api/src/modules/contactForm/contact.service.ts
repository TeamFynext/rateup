import { PrismaClient } from "@prisma/client";
import { CreateContactMessageInput } from "./contact.schema";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { emailBodyContactForm } from "../../utils/email/emailBodyContactForm";

const prisma = new PrismaClient();

export async function createMsg({ name, email, message }: CreateContactMessageInput) {
  const user = await prisma.contactForm.create({
    data: {
      name,
      email,
      message
    },
  });

  if(user){
    const msg = {
      to: 'hello@rateup.app', // Change to your recipient
     // from: 'hello@rateup.app', // Change to your verified sender
      subject: 'New Message in Rateup Website Contact Form',
      text: `You have received new contact message from ${email}`,
      html: emailBodyContactForm(name, email, message)
    }
    try {
      sendAWSEmail(msg)
    } catch (error) {
      console.error(error)
      throw new Error('Email sending failed. E:'+ error);
    }
}
  return user;
}
