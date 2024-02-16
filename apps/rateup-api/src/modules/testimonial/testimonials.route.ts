import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import { $Testimonialref } from "./testimonial.schema";
import {
  getAllTestimonialByOrgHandler,
  getAllTestimonialBySurveyIdHandler,
} from "./testimonial.controller";

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
