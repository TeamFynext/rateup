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
}

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
