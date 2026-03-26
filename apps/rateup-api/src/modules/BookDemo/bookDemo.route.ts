import { FastifyInstance } from "fastify";
import { bookDemoHandler } from "./bookDemo.controller.js";
import { createBookDemoInputSchema } from "./bookDemo.schema.js";

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
