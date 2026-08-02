import { z } from "zod";
import { EMAIL_PURPOSES } from "./email.util.js";

const sendEmailSchema = z.object({
  toEmail: z.string(),
  subject: z.string(),
  // `purpose` was an unconstrained string matched case-sensitively against two
  // literals, so a typo sent a bodyless email and answered 200. See issues.txt 25.9.
  purpose: z.enum(EMAIL_PURPOSES),
  text: z.string(),
  // `data` is z.any(), which Zod accepts as null — and the OTP handler used to
  // assign `data.otp` onto it. See issues.txt 25.10.
  data: z.any(),
});

const GenerateOtpSchema = sendEmailSchema.extend({
  userId: z.string(),
  surveyId: z.string().optional(),
});

const validateOtpSchema = z.object({
  otp: z.string(),
  userId: z.string(),
  surveyId: z.string().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type GenerateOtpInput = z.infer<typeof GenerateOtpSchema>;
export type validateOtpInput = z.infer<typeof validateOtpSchema>;

// Auto-exported after fastify-zod migration
export { sendEmailSchema, GenerateOtpSchema, validateOtpSchema };
