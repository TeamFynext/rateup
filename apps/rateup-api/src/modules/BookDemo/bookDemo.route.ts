import { FastifyInstance } from "fastify";
import { bookDemoHandler, partnerDataHandler } from "./bookDemo.controller.js";
import {
  createBookDemoInputSchema,
  createPartnerDataInputSchema,
} from "./bookDemo.schema.js";

export async function bookDemoRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: createBookDemoInputSchema,
      },
    },
    bookDemoHandler,
  );
  server.post(
    "/partner",
    {
      schema: {
        body: createPartnerDataInputSchema,
      },
    },
    partnerDataHandler,
  );
}
