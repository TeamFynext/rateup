import { log } from "../logger";

const aws = require("@aws-sdk/client-ses");
const nodemailer = require("nodemailer");

const ses = new aws.SES({
  apiVersion: "2010-12-01",
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { ses, aws },
});

interface EmailParams {
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
