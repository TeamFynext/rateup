import { FastifyInstance } from "fastify/types/instance.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import {
  createRuleHandler,
  getAllRulesHandler,
  getRuleByIdHandler,
  updateRuleHandler,
  deleteRuleHandler,
  getRulesByAutomationIdHandler,
} from "./wa_rule.controller.js";
import {
  createRuleSchema,
  getRulesQuerySchema,
  ruleIdParamSchema,
  updateRuleSchema,
  getRulesByAutomationIdQuerySchema,
} from "./wa_rule.schema.js";
import { declareAccess } from "../../../authz/registry.js";

/**
 * `/api/wa/automated-reply/rule`: the automation rules. Chatbots themselves are served by
 * `/api/chatbots` (modules/chatbots).
 */
export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  declareAccess(fastify, { read: "automation.read", write: "automation.manage" });
  fastify.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp]),
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
  fastify.get(
    "/rule/automation/:automationId",
    {
      schema: {
        params: getRulesByAutomationIdQuerySchema,
      },
    },
    getRulesByAutomationIdHandler,
  );
}
