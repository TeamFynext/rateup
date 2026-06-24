import { FastifyInstance } from "fastify";
import { sendEmailHandler, sendOTPEmailHandler, validateOTPHandler } from "./email.controller.js";
import { GenerateOtpSchema, sendEmailSchema, validateOtpSchema } from "./email.schema.js";

export async function emailPublicRoutes(server: FastifyInstance) {
  server.post(
    "/send-email",
    {
      schema: {
        body: sendEmailSchema,
      },
    },
    sendEmailHandler,
  );
  server.post(
    "/otp/send-email",
    {
      schema: {
        body: GenerateOtpSchema,
      },
    },
    sendOTPEmailHandler,
  );

  server.post(
    "/otp/validate",
    {
      schema: {
        body: validateOtpSchema,
      },
    },
    validateOTPHandler,
  );
}
