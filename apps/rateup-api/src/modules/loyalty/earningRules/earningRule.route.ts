import { FastifyInstance } from "fastify";
import {
  createLoyaltyEarningRuleHandler,
  deleteLoyaltyEarningRuleHandler,
  getLoyaltyEarningRuleByIdHandler,
  getLoyaltyEarningRulesHandler,
  updateLoyaltyEarningRuleHandler,
} from "./earningRule.controller.js";
import {
  loyaltyEarningRuleSchema,
  ruleIdParamSchema,
  loyaltyEarningRuleUpdateSchema,
} from "./earningRule.schema.js";

export async function loyaltyEarningRuleRoutes(server: FastifyInstance) {
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
