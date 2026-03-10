import { log } from "../logger.js";

import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// 1. Configure the AWS SDK client (uses default credential chain if omitted)
const sesClient = new SESv2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// 2. Create a Nodemailer transport that points at SES
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

export interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: [{ filename: string; path: string }];
}

export const sendAWSEmail = async (emailParams: EmailParams) => {
  try {
    const { to, subject, text, html, attachments } = emailParams;
    const from = "RateUp.app <hello@rateup.app>"; // replace with your verified email address

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments,
    });

    log.debug("Email sent successfully to %s", to);
  } catch (error) {
    log.error("Email sent failed\n" + JSON.stringify(error));
  }
};
