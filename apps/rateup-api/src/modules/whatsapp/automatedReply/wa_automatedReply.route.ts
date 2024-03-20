import { FastifyInstance } from "fastify/types/instance";
import {
  getAutomatedRepliesByTeamIdHandler,
  createAutomatedReplyHandler,
  updateAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
} from "./wa_automatedReply.controller";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.get("/team/:teamId", getAutomatedRepliesByTeamIdHandler);
  fastify.post("/", createAutomatedReplyHandler);
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
}
