import { FastifyInstance } from "fastify";
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
import { declareAccess } from "../../../authz/registry.js";
export async function testimonialCollectionRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

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
