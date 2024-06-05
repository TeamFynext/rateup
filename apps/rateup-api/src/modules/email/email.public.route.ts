import { FastifyInstance } from "fastify";
import {
  sendEmailHandler,
  sendOTPEmailHandler,
  validateOTPHandler,
} from "./email.controller";
import { $Eref } from "./email.schema";

export async function emailPublicRoutes(server: FastifyInstance) {
  server.post(
    "/send-email",
    {
      schema: {
        body: $Eref("sendEmailSchema"),
      },
    },
    sendEmailHandler,
  );
  server.post(
    "/otp/send-email",
    {
      schema: {
        body: $Eref("GenerateOtpSchema"),
      },
    },
    sendOTPEmailHandler,
  );

  server.post(
    "/otp/validate",
    {
      schema: {
        body: $Eref("validateOtpSchema"),
      },
    },
    validateOTPHandler,
  );
}
