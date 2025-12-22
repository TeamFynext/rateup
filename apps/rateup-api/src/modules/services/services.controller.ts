import { FastifyReply, FastifyRequest } from "fastify";
import {
  endSurveyCronAction,
  publishSurveyCronAction,
} from "../survey/survey.service.js";

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
