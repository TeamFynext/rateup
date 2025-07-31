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
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { verifyAutomationLimit } from "./wa_automatedReply.utils";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", checkSession);
  fastify.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppAutomation,
    ]),
  );
  fastify.get("/message/:id", getAutomatedRepliesMessagIdHandler);
  fastify.get("/", getAllAutomatedRepliesByOrgIdHandler);
  fastify.post(
    "/",
    {
      preHandler: verifyAutomationLimit,
    },
    createAutomatedReplyHandler,
  );
  fastify.get("/:waAutomatedReplyId", getAutomatedRepliesByIdHandler);
  fastify.put("/:waAutomatedReplyId", updateAutomatedReplyHandler);
  fastify.delete("/:waAutomatedReplyId", deleteAutomatedReplyHandler);
  fastify.post(
    "/initiate/:waAutomatedReplyId",
    initiateAutomatedReplyByIdHandler,
  );
}
