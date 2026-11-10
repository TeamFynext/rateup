import { FastifyInstance, FastifyRequest } from "fastify";
import { checkEmailExistHandler } from "./user.controller.js";
import { userEmailCheckSchema } from "./user.schema.js";
import { rateLimit } from "../../../utils/rateLimit.js";

export async function userPublicRoutes(server: FastifyInstance) {
  // Answers whether an address has an account, so it is throttled per client and per
  // address being probed.
  server.post(
    "/check-email",
    {
      preHandler: [
        rateLimit({ max: 30, windowSeconds: 60 * 60, key: "checkEmail" }),
        rateLimit<FastifyRequest<{ Body: { email?: string } }>>({
          max: 10,
          windowSeconds: 60 * 60,
          key: "checkEmailAddress",
          keyFrom: (request) => request.body?.email?.trim().toLowerCase(),
        }),
      ],
      schema: {
        body: userEmailCheckSchema,
      },
    },
    checkEmailExistHandler,
  );
}
