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
} from "./rule.controller.js";
import {
  createRuleSchema,
  getRulesQuerySchema,
  ruleIdParamSchema,
  updateRuleSchema,
  getRulesByAutomationIdQuerySchema,
} from "./rule.schema.js";
import { declareAccess } from "../../../authz/registry.js";

/**
 * `/api/automation/rules` (was `/api/wa/automated-reply/rule`): the automation rules.
 * Journeys (chatbots) are served by `/api/automation/journeys` (modules/automation/journeys).
 */
export async function waAutomatedReplyRoutes(fastify: FastifyInstance) {
  declareAccess(fastify, { read: "automation.read", write: "automation.manage" });
  fastify.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp]),
  );
  // --- Rule Routes ---
  fastify.post(
    "",
    {
      schema: {
        body: createRuleSchema,
      },
    },
    createRuleHandler,
  );
  fastify.get(
    "",
    {
      schema: {
        querystring: getRulesQuerySchema,
      },
    },
    getAllRulesHandler,
  );
  fastify.get(
    "/:id",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    getRuleByIdHandler,
  );
  fastify.put(
    "/:id",
    {
      schema: {
        params: ruleIdParamSchema,
        body: updateRuleSchema,
      },
    },
    updateRuleHandler,
  );
  fastify.delete(
    "/:id",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    deleteRuleHandler,
  );
  fastify.get(
    "/automation/:automationId",
    {
      schema: {
        params: getRulesByAutomationIdQuerySchema,
      },
    },
    getRulesByAutomationIdHandler,
  );
}
