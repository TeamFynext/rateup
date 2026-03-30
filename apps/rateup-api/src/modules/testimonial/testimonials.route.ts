import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  getAllTestimonialByOrgHandler,
  getAllTestimonialBySurveyIdHandler,
} from "./testimonial.controller.js";
import { bySurveyIdParamsSchema } from "./testimonial.schema.js";

export async function testimonialRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
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
