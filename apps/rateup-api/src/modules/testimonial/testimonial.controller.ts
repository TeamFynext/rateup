import { FastifyReply, FastifyRequest } from "fastify";
import {
  getAllTestimonialByOrgId,
  getAllTestimonialBySurveyId,
} from "./testimonial.service.js";
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
    );
    reply.code(201).send(testimonials);
  } catch (error) {
    reply.code(500).send({ message: "Failed" + error });
  }
}

export async function getAllTestimonialByOrgHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let testimonials = await getAllTestimonialByOrgId(request.user.orgId);
    reply.code(201).send(testimonials);
  } catch (error) {
    reply.code(500).send({ message: "Failed" + error });
  }
}
