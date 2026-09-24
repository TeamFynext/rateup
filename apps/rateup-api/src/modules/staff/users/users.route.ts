import type { FastifyInstance } from "fastify";
import { idParamSchema, type IdParam } from "../staff.schema.js";
import {
  listUsers,
  setUserPaused,
  userListQuerySchema,
  userPauseSchema,
  type UserListQuery,
  type UserPauseInput,
} from "./users.service.js";

export async function staffUserRoutes(server: FastifyInstance) {
  server.get<{ Querystring: UserListQuery }>(
    "/users",
    { schema: { querystring: userListQuerySchema } },
    async (request) => listUsers(request.query),
  );

  /** Pause or resume one person's account; the customer app shows them its paused screen. */
  server.put<{ Params: IdParam; Body: UserPauseInput }>(
    "/users/:id/pause",
    { schema: { params: idParamSchema, body: userPauseSchema } },
    async (request) => ({ data: await setUserPaused(request, request.params.id, request.body) }),
  );
}
