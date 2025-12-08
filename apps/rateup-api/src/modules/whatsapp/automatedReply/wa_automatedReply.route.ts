import { FastifyInstance } from "fastify/types/instance";
import {
  createAutomatedReplyHandler,
  updateAutomatedReplyHandler,
  deleteAutomatedReplyHandler,
  getAutomatedRepliesByIdHandler,
  getAllAutomatedRepliesByOrgIdHandler,
  getAutomatedRepliesMessagIdHandler,
  initiateAutomatedReplyByIdHandler,
  verifyAutomationTriggerLimitHandler,
} from "./wa_automatedReply.controller";
import { checkSession } from "../../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";
import { verifyAutomationLimit } from "./wa_automatedReply.utils";
// --- Rule Controller Imports ---
import {
  createRuleHandler,
  getAllRulesHandler,
  getRuleByIdHandler,
  updateRuleHandler,
  deleteRuleHandler,
} from "./wa_rule.controller"; // You need to implement these controllers
import {
  createRuleSchema,
  getRulesQuerySchema,
  ruleIdParamSchema,
  updateRuleSchema,
} from "./wa_rule.schema";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
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
    {
      preHandler: verifyAutomationTriggerLimitHandler,
    },
    initiateAutomatedReplyByIdHandler,
  );
  // --- Rule Routes ---
  fastify.post(
    "/rule",
    {
      schema: {
        body: createRuleSchema,
      },
    },
    createRuleHandler,
  );
  fastify.get(
    "/rule",
    {
      schema: {
        querystring: getRulesQuerySchema,
      },
    },
    getAllRulesHandler,
  );
  fastify.get(
    "/rule/:id",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    getRuleByIdHandler,
  );
  fastify.put(
    "/rule/:id",
    {
      schema: {
        params: ruleIdParamSchema,
        body: updateRuleSchema,
      },
    },
    updateRuleHandler,
  );
  fastify.delete(
    "/rule/:id",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    deleteRuleHandler,
  );
}
