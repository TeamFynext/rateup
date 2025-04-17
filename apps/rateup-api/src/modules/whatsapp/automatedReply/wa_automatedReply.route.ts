import { FastifyInstance } from "fastify/types/instance";
import {
  createAutomatedReplyHandler,
  updateAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
  getAllAutomatedRepliesByOrgIdHandler,
  getAutomatedRepliesMessagIdHandler,
  initiateAutomatedReplyByIdHandler,
} from "./wa_automatedReply.controller";
import { checkSession } from "../../../utils/checkSession";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", checkSession);
  fastify.get("/message/:id", getAutomatedRepliesMessagIdHandler);
  fastify.get("/", getAllAutomatedRepliesByOrgIdHandler);
  fastify.post("/", createAutomatedReplyHandler);
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
  fastify.post(
    "/initiate/:waAutomatedReplyId",
    initiateAutomatedReplyByIdHandler,
  );
}
