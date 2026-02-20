import { FastifyInstance } from "fastify";
import {
  createLoyaltyEarningRuleHandler,
  deleteLoyaltyEarningRuleHandler,
  getLoyaltyEarningRuleByIdHandler,
  getLoyaltyEarningRulesHandler,
  updateLoyaltyEarningRuleHandler,
} from "./earningRule.controller.js";
import { $earningRuleRef } from "./earningRule.schema.js";

export async function loyaltyEarningRuleRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $earningRuleRef("loyaltyEarningRuleSchema"),
      },
    },
    createLoyaltyEarningRuleHandler,
  );

  server.get("/", getLoyaltyEarningRulesHandler);

  server.get(
    "/:ruleId",
    {
      schema: {
        params: $earningRuleRef("ruleIdParamSchema"),
      },
    },
    getLoyaltyEarningRuleByIdHandler,
  );

  server.put(
    "/:ruleId",
    {
      schema: {
        params: $earningRuleRef("ruleIdParamSchema"),
        body: $earningRuleRef("loyaltyEarningRuleUpdateSchema"),
      },
    },
    updateLoyaltyEarningRuleHandler,
  );

  server.delete(
    "/:ruleId",
    {
      schema: {
        params: $earningRuleRef("ruleIdParamSchema"),
      },
    },
    deleteLoyaltyEarningRuleHandler,
  );
}
