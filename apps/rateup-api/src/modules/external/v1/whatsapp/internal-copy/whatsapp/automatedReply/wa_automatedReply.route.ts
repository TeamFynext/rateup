import { FastifyInstance } from "fastify/types/instance";
import {
  createAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
  updateAutomatedReplyHandler,
} from "../../../../../../whatsapp/automatedReply/wa_automatedReply.controller";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.post("/", createAutomatedReplyHandler);
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
}
