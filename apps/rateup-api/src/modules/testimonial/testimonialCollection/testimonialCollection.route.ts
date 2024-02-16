import { FastifyInstance } from "fastify";
import { checkSession } from "../../../utils/checkSession";
import { $TestimonialCollectionRef } from "./testimonialCollection.schema";
import {
  addMultipleTestimonialToCollectionHandler,
  createTestimonialCollectionHandler,
  deleteTestimonialCollectionHandler,
  deleteMultipleTestimonialsFromCollectionHandler,
  getTestimonialCollectionByIdHandler,
  getTestimonialCollections,
  updateTestimonialCollectionHandler,
} from "./testimonialCollection.controller";
export async function testimonialCollectionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post(
    "/create",
    {
      schema: {
        body: $TestimonialCollectionRef("createTestimonialCollectionSchema"),
      },
    },
    createTestimonialCollectionHandler,
  );
  server.get(
    "/:id",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
      },
    },
    getTestimonialCollectionByIdHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: $TestimonialCollectionRef(
          "testimonialCollectionQuerySchema",
        ),
      },
    },
    getTestimonialCollections,
  );
  server.put(
    "/update/:id",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
        body: $TestimonialCollectionRef("updateTestimonialCollectionSchema"),
      },
    },
    updateTestimonialCollectionHandler,
  );

  server.delete(
    "/:id",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
      },
    },
    deleteTestimonialCollectionHandler,
  );
  //the below routes is used to mamage a collection of testimonials in testimonialCollectionMap table
  server.post(
    "/:id/testimonials",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
        body: $TestimonialCollectionRef(
          "MultipleTestimonialToCollectionSchema",
        ),
      },
    },
    addMultipleTestimonialToCollectionHandler,
  );

  server.delete(
    "/:id/testimonials",
    {
      schema: {
        params: $TestimonialCollectionRef("byIdParamsSchema"),
        body: $TestimonialCollectionRef(
          "MultipleTestimonialToCollectionSchema",
        ),
      },
    },
    deleteMultipleTestimonialsFromCollectionHandler,
  );
}
