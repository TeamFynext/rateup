import { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { swaggerConfig } from "../config.js";

/**
 * The spec is the partner API's contract, so it is always generated and always served as
 * JSON at `/api/openapi.json` — an integrator should not need us to redeploy with a flag
 * set before they can see what they are integrating against.
 *
 * The browsable Scalar UI stays behind `SWAGGER=1`, since that is the part with a cost.
 */
export async function registerSwagger(server: FastifyInstance) {
  await server.register(swagger, swaggerConfig);

  server.get("/api/openapi.json", { schema: { hide: true } }, async () => server.swagger());

  if (process.env.SWAGGER === "1") {
    await server.register(import("@scalar/fastify-api-reference"), {
      routePrefix: "/reference",
      configuration: {
        persistAuth: true,
      },
    });
    server.log.trace("Swagger UI registered at /reference");
  }

  server.log.trace("OpenAPI spec available at /api/openapi.json");
}
