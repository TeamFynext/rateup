import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { $Testimonialref } from "./testimonial.schema.js";
import {
  getAllTestimonialByOrgHandler,
  getAllTestimonialBySurveyIdHandler,
} from "./testimonial.controller.js";

export async function testimonialRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/:surveyId",
    {
      schema: {
        params: $Testimonialref("bySurveyIdParamsSchema"),
      },
    },
    getAllTestimonialBySurveyIdHandler,
  );

  server.get("/", {}, getAllTestimonialByOrgHandler);
}
