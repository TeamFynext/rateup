import { FastifyInstance } from "fastify";
import {
  checkEmailExistHandler,
  deleteUserFromSuperTokenHandler,
} from "./user.controller.js";
import { userEmailCheckSchema } from "./user.schema.js";

export async function userPublicRoutes(server: FastifyInstance) {
  server.post(
    "/check-email",
    {
      schema: {
        body: userEmailCheckSchema,
      },
    },
    checkEmailExistHandler,
  );

  //for development
  server.delete(
    "/delete-user",
    {
      schema: {
        body: userEmailCheckSchema,
      },
    },
    deleteUserFromSuperTokenHandler,
  );
}
