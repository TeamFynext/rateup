import { FastifyReply, FastifyRequest } from "fastify";
import { endSurveyCronAction, publishSurveyCronAction } from "../survey/survey.service";

export async function updateSurveyPublish(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Running Hourly JOB --> Survey Updations........");
    await publishSurveyCronAction()
    await endSurveyCronAction()
    reply.code(200).send("Survey Status Updated Successfully");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function testServiceRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Srvice route testing........");
    reply.code(200).send("Hello World");
  } catch (error) {
    reply.code(500).send(error);
  }
}
