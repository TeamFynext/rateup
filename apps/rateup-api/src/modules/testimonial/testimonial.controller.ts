import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import { getAllTestimonialByOrgId, getAllTestimonialBySurveyId } from "./testimonial.service.js";
import { BySurveyIdParamsInput } from "./testimonial.schema.js";

export async function getAllTestimonialBySurveyIdHandler(
  request: FastifyRequest<{
    Params: BySurveyIdParamsInput;
  }>,
  reply: FastifyReply,
) {
  try {
    let testimonials = await getAllTestimonialBySurveyId(
      request.params.surveyId,
      request.user.orgId,
    );
    reply.code(200).send(testimonials);
  } catch (error) {
    log.error({ err: error }, "Error reading testimonials by survey");
    reply.code(500).send({ message: "Something went wrong" });
  }
}

export async function getAllTestimonialByOrgHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    let testimonials = await getAllTestimonialByOrgId(request.user.orgId);
    reply.code(200).send(testimonials);
  } catch (error) {
    log.error({ err: error }, "Error reading testimonials by org");
    reply.code(500).send({ message: "Something went wrong" });
  }
}
