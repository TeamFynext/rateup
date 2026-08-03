import { z } from "zod";

const sendEmailSchema = z.object({
  toEmail: z.string(),
  subject: z.string(),
  purpose: z.string(),
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
