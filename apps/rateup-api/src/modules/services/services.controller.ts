import { FastifyReply, FastifyRequest } from "fastify";

export async function testServiceRoute(request: FastifyRequest, reply: FastifyReply) {
  try {
    console.log(".......Srvice route testing........");
    reply.code(200).send("Hello World");
  } catch (error) {
    reply.code(500).send(error);
  }
}
