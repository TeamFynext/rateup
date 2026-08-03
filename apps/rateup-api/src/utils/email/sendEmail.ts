import sgMail from "@sendgrid/mail";
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

const sendEmail = (emailParams: EmailParams) => {
  sgMail
    .send(emailParams)
    .then(() => {
      console.log("Email sent");
    })
    .catch((error: unknown) => {
      console.error(error);
      throw new Error("Email sending failed. E:" + error);
    });
};

export default sendEmail;
