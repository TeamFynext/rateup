import { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { swaggerConfig } from "../config.js";

export async function registerSwagger(server: FastifyInstance) {
  await server.register(swagger, swaggerConfig);

  await server.register(import("@scalar/fastify-api-reference"), {
    routePrefix: "/reference",
    configuration: {
      persistAuth: true,
    },
  });

  server.log.trace("Swagger registered. Exposing docs at /reference");
}
