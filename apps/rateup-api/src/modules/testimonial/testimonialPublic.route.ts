import { FastifyInstance } from "fastify";
import { $TestimonialCollectionRef } from "./testimonialCollection/testimonialCollection.schema";
import { getTestimonialCollectionByIdHandler } from "./testimonialCollection/testimonialCollection.controller";

export async function testimonialPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:id",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
      },
    },
    getTestimonialCollectionByIdHandler,
  );
}
