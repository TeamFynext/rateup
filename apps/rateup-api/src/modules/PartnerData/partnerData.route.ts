import { FastifyInstance } from "fastify";
import { partnerDataHandler } from "./partnerData.controller.js";
import { createPartnerDataInputSchema } from "./partnerData.schema.js";

export async function partnerDataRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: createPartnerDataInputSchema,
      },
    },
    partnerDataHandler,
  );
}
