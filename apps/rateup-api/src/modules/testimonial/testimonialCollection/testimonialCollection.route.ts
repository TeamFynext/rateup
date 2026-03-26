import { FastifyInstance } from "fastify";
import { checkSession } from "../../../utils/checkSession.js";
import {
  createTestimonialCollectionSchema,
  byIdParamsSchema,
  updateTestimonialCollectionSchema,
  testimonialCollectionQuerySchema,
  MultipleTestimonialToCollectionSchema,
} from "./testimonialCollection.schema.js";
import {
  addMultipleTestimonialToCollectionHandler,
  createTestimonialCollectionHandler,
  deleteTestimonialCollectionHandler,
  deleteMultipleTestimonialsFromCollectionHandler,
  getTestimonialCollections,
  updateTestimonialCollectionHandler,
} from "./testimonialCollection.controller.js";
export async function testimonialCollectionRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post(
    "/create",
    {
      schema: {
        body: createTestimonialCollectionSchema,
      },
    },
    createTestimonialCollectionHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: testimonialCollectionQuerySchema,
      },
    },
    getTestimonialCollections,
  );
  server.put(
    "/update/:id",
    {
      schema: {
        params: byIdParamsSchema,
        body: updateTestimonialCollectionSchema,
      },
    },
    updateTestimonialCollectionHandler,
  );

  server.delete(
    "/:id",
    {
      schema: {
        params: byIdParamsSchema,
      },
    },
    deleteTestimonialCollectionHandler,
  );
  //the below routes is used to mamage a collection of testimonials in testimonialCollectionMap table
  server.post(
    "/:id/testimonials",
    {
      schema: {
        params: byIdParamsSchema,
        body: MultipleTestimonialToCollectionSchema,
      },
    },
    addMultipleTestimonialToCollectionHandler,
  );

  server.delete(
    "/:id/testimonials",
    {
      schema: {
        params: byIdParamsSchema,
        body: MultipleTestimonialToCollectionSchema,
      },
    },
    deleteMultipleTestimonialsFromCollectionHandler,
  );
}
