import axios from "axios";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { log } from "../utils/logger.js";

export default async function healthRoutes(server: FastifyInstance) {
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: "pong" });
  });
  server.get(
    "/invita",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await axios.post(
          "https://www.invita.com.kw/api/send-confiramtion-result-test",
          { user: "919876543210", action: "ping", buttonPayload: "rateup" },
          {
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Rateup-API/1.0.1",
            },
          },
        );
        log.info("Invita health check response: %o", data?.data);
        return reply.send({ message: "pong" });
      } catch (error) {
        log.error({ error }, "Error checking Invita health");
        return reply
          .status(500)
          .send({ message: "Error checking Invita health" });
      }
    },
  );
}
