import { FastifyInstance } from "fastify";
import {
  createLoyaltyEarningRuleHandler,
  deleteLoyaltyEarningRuleHandler,
  getLoyaltyEarningRuleByIdHandler,
  getInstagramMentionRuleHandler,
  getLoyaltyEarningRulesHandler,
  saveInstagramMentionRuleHandler,
  updateLoyaltyEarningRuleHandler,
} from "./earningRule.controller.js";
import {
  instagramMentionRuleSchema,
  loyaltyEarningRuleSchema,
  ruleIdParamSchema,
  loyaltyEarningRuleUpdateSchema,
} from "./earningRule.schema.js";
import { declareAccess } from "../../../authz/registry.js";

export async function loyaltyEarningRuleRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.manage" });
  server.post(
    "/",
    {
      schema: {
        body: loyaltyEarningRuleSchema,
      },
    },
    createLoyaltyEarningRuleHandler,
  );

  server.get("/", getLoyaltyEarningRulesHandler);

  // Before `/:ruleId` in reading order; find-my-way prefers the static path either way.
  server.get("/instagram-mentions", getInstagramMentionRuleHandler);
  server.put(
    "/instagram-mentions",
    { schema: { body: instagramMentionRuleSchema } },
    saveInstagramMentionRuleHandler,
  );

  server.get(
    "/:ruleId",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    getLoyaltyEarningRuleByIdHandler,
  );

  server.put(
    "/:ruleId",
    {
      schema: {
        params: ruleIdParamSchema,
        body: loyaltyEarningRuleUpdateSchema,
      },
    },
    updateLoyaltyEarningRuleHandler,
  );

  server.delete(
    "/:ruleId",
    {
      schema: {
        params: ruleIdParamSchema,
      },
    },
    deleteLoyaltyEarningRuleHandler,
  );
}
