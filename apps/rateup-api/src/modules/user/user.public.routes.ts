import { FastifyInstance } from "fastify";
import { $UserRef } from "./user.schema";
import { checkEmailExistHandler } from "./user.controller";

export async function userPublicRoutes(server: FastifyInstance) {

  server.post(
    "/check-email",
    {
      schema: {
        body: $UserRef("userEmailCheckSchema"),
      },
    },
    checkEmailExistHandler
  );
}
