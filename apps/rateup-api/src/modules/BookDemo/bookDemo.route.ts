import { FastifyInstance } from "fastify";
import { bookDemoHandler } from "./bookDemo.controller";
import { $Bref } from "./bookDemo.schema";

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
