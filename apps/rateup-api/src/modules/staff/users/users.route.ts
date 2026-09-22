import type { FastifyInstance } from "fastify";
import { listUsers, userListQuerySchema, type UserListQuery } from "./users.service.js";

export async function staffUserRoutes(server: FastifyInstance) {
  server.get<{ Querystring: UserListQuery }>(
    "/users",
    { schema: { querystring: userListQuerySchema } },
    async (request) => listUsers(request.query),
  );
}
