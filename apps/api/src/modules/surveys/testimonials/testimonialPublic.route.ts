import { FastifyInstance } from "fastify";
import { byIdParamsSchema } from "./collections/testimonialCollection.schema.js";
import { getTestimonialCollectionByIdHandler } from "./collections/testimonialCollection.controller.js";

export async function testimonialPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      schema: {
        params: byIdParamsSchema,
      },
    },
    getTestimonialCollectionByIdHandler,
  );
}
