import { FastifyInstance } from "fastify";
import { bookDemoHandler } from "./bookDemo.controller.js";
import { $Bref } from "./bookDemo.schema.js";

export async function bookDemoRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $Bref("createBookDemoInputSchema"),
      },
    },
    bookDemoHandler,
  );
}
