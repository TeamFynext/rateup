import { z } from "zod";
import { EMAIL_PURPOSES } from "./email.util.js";

const sendEmailSchema = z.object({
  toEmail: z.string(),
  subject: z.string(),
  purpose: z.enum(EMAIL_PURPOSES),
  text: z.string(),
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
