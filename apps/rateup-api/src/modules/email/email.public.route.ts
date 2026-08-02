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

/**
 * Three unauthenticated POSTs at /api/email.
 *
 * The per-IP limits below are a bound, not a fix. /send-email will still deliver a
 * caller-composed message from the verified hello@rateup.app to any address it is
 * given (issues.txt 25.1) — closing that means putting it behind checkSession,
 * which breaks whatever frontend calls it today and is left for an explicit
 * decision. The OTP limits blunt 25.4's free guessing: 10^6 codes cannot be walked
 * at 30 attempts an hour per address, though a distributed caller is only slowed.
 */
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
