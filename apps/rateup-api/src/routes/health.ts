import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export default async function healthRoutes(server: FastifyInstance) {
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: "pong" });
  });
}
