import { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { swaggerConfig } from "../config.js";

export async function registerSwagger(server: FastifyInstance) {
  await server.register(swagger, swaggerConfig);

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      defaultModelsExpandDepth: -1,
      persistAuthorization: true,
    },
  });

  await server.register(import("@scalar/fastify-api-reference"), {
    routePrefix: "/reference",
    configuration: {
      persistAuth: true,
    },
  });

  server.log.trace("Swagger registered. Exposing docs at /docs");
}
