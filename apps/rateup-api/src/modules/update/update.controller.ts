import { FastifyReply, FastifyRequest } from "fastify";
import { updateSubscriptionFeatures } from "../../../subscription-update";

export async function updateDatabase(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Updating Database........");
    updateSubscriptionFeatures();
    reply.code(201).send("Database Updated Successfully");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function testUpdateRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Update route testing........");
    reply.code(201).send("Hello World");
  } catch (error) {
    reply.code(500).send(error);
  }
}
