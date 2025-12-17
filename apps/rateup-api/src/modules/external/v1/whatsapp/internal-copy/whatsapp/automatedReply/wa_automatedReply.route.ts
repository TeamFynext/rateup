import { FastifyInstance } from "fastify/types/instance.js";
import {
  createAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
  updateAutomatedReplyHandler,
} from "../../../../../../whatsapp/automatedReply/wa_automatedReply.controller.js";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.post("/", createAutomatedReplyHandler);
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
}
