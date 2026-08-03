import { FastifyInstance } from "fastify";
import { sendEmailHandler, sendOTPEmailHandler, validateOTPHandler } from "./email.controller.js";
import {
  GenerateOtpSchema,
  sendEmailSchema,
  validateOtpSchema,
  type SendEmailInput,
  type GenerateOtpInput,
  type validateOtpInput,
} from "./email.schema.js";
import { rateLimit } from "../../utils/rateLimit.js";

export async function emailPublicRoutes(server: FastifyInstance) {
  server.post<{ Body: SendEmailInput }>(
    "/send-email",
    {
      preHandler: rateLimit({ max: 10, windowSeconds: 60 * 60, key: "sendEmail" }),
      schema: {
        body: sendEmailSchema,
      },
    },
    sendEmailHandler,
  );
  server.post<{ Body: GenerateOtpInput }>(
    "/otp/send-email",
    {
      preHandler: rateLimit({ max: 15, windowSeconds: 60 * 60, key: "otpSend" }),
      schema: {
        body: GenerateOtpSchema,
      },
    },
    sendOTPEmailHandler,
  );

  server.post<{ Body: validateOtpInput }>(
    "/otp/validate",
    {
      preHandler: rateLimit({ max: 30, windowSeconds: 60 * 60, key: "otpValidate" }),
      schema: {
        body: validateOtpSchema,
      },
    },
    validateOTPHandler,
  );
}
