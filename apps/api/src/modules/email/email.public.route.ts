import { FastifyInstance, FastifyRequest } from "fastify";
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
import { declareAccess } from "../../authz/registry.js";
import { checkSession } from "../../utils/checkSession.js";

/** Per recipient, so one address cannot be flooded from many clients. */
const perRecipient = (key: string, max: number) =>
  rateLimit<FastifyRequest<{ Body: { toEmail?: string } }>>({
    max,
    windowSeconds: 60 * 60,
    key,
    keyFrom: (request) => request.body?.toEmail?.trim().toLowerCase(),
  });

export async function emailPublicRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "public" });
  server.post<{ Body: SendEmailInput }>(
    "/send-email",
    {
      // RateUp-branded mail with caller-chosen content: a signed-in member only, and only to
      // members of their own org (checked in the handler). No client calls it anonymously.
      config: { access: "session" },
      preHandler: [
        checkSession,
        rateLimit({ max: 10, windowSeconds: 60 * 60, key: "sendEmail" }),
        perRecipient("sendEmailRecipient", 5),
      ],
      schema: {
        body: sendEmailSchema,
      },
    },
    sendEmailHandler,
  );
  server.post<{ Body: GenerateOtpInput }>(
    "/otp/send-email",
    {
      preHandler: [
        rateLimit({ max: 15, windowSeconds: 60 * 60, key: "otpSend" }),
        perRecipient("otpSendRecipient", 5),
      ],
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
