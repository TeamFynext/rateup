import { FastifyInstance } from "fastify";
import { $UserRef } from "./user.schema";
import {
  checkEmailExistHandler,
  deleteUserFromSuperTokenHandler,
} from "./user.controller";

export async function userPublicRoutes(server: FastifyInstance) {
  server.post(
    "/check-email",
    {
      schema: {
        body: $UserRef("userEmailCheckSchema"),
      },
    },
    checkEmailExistHandler,
  );

  //for development
  server.delete(
    "/delete-user",
    {
      schema: {
        body: $UserRef("userEmailCheckSchema"),
      },
    },
    deleteUserFromSuperTokenHandler,
  );
}
