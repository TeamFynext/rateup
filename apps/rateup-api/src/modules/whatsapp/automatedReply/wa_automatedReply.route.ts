import { FastifyInstance } from "fastify/types/instance";
import {
  getAutomatedRepliesByTeamIdHandler,
  createAutomatedReplyHandler,
  updateAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
  getAllAutomatedRepliesByOrgIdHandler,
} from "./wa_automatedReply.controller";
import { checkSession } from "../../../utils/checkSession";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", checkSession);
  fastify.get("/team/:teamId", getAutomatedRepliesByTeamIdHandler);
  fastify.get("/", getAllAutomatedRepliesByOrgIdHandler);
  fastify.post("/", createAutomatedReplyHandler);
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
}
