import { FastifyInstance } from "fastify";
import { byIdParamsSchema } from "./testimonialCollection/testimonialCollection.schema.js";
import { getTestimonialCollectionByIdHandler } from "./testimonialCollection/testimonialCollection.controller.js";

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
