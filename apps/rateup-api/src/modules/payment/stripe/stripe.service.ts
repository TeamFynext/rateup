import { PrismaClient } from "@prisma/client";
import { sendAWSEmail } from "../../../utils/email/sendAWSEmail";

const prisma = new PrismaClient();

export async function createPayment(payload) {
  console.log("creating  payment....");
  console.log(payload);

  const {
    payment_intent,
    amount_paid,
    billing_reason,
    currency,
    customer_email,
    customer_name,
    invoice_pdf,
  } = payload?.data?.object;

  if (payment_intent && amount_paid) {
    // const payment = await prisma.payments.create({
    //   data: {
    //     payment_intent,
    //     amount_paid,
    //     billing_reason,
    //     currency,
    //     customer_email,
    //     customer_name,
    //   },
    // });
    // if (payment) {
    //   console.log("sending email....");
    //   const msg = {
    //     to: customer_email, // Change to your recipient
    //     // from: 'hello@rateup.app', // Change to your verified sender
    //     subject: "Payment Received - Rateup.app",
    //     text: `We have received a payment of ${amount_paid}`,
    //     html: createEmailBodyPaymentReceived(
    //       customer_name,
    //       customer_email,
    //       amount_paid,
    //       currency,
    //       invoice_pdf,
    //     ),
    //   };
    //   try {
    //     sendAWSEmail(msg);
    //   } catch (error) {
    //     console.error(error);
    //     throw new Error("Email sending failed. E:" + error);
    //   }
    // }
    // return payment;
  }
  return null;
}
