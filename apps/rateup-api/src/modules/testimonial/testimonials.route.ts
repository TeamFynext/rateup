import { FastifyInstance } from "fastify";
import {
  getAllTestimonialByOrgHandler,
  getAllTestimonialBySurveyIdHandler,
} from "./testimonial.controller.js";
import { bySurveyIdParamsSchema } from "./testimonial.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function testimonialRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.get(
    "/:surveyId",
    {
      schema: {
        params: bySurveyIdParamsSchema,
      },
    },
    getAllTestimonialBySurveyIdHandler,
  );

  server.get("/", {}, getAllTestimonialByOrgHandler);
}
