import { FastifyInstance } from "fastify";

import { getProgramGivebackHandler } from "./giveback.controller.js";
import { givebackResponseSchema } from "./giveback.schema.js";

export async function loyaltyGivebackRoutes(server: FastifyInstance) {
  server.get(
    "/",
    { schema: { response: { 200: givebackResponseSchema } } },
    getProgramGivebackHandler,
  );
}
