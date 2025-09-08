import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import {
  updateRateupPlanFeature,
  updateSubscriptionAutomation,
  updateUsageStatsTemplateMessageCount,
} from "./update.service";

export async function updateUsageStatsTemplateMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsTemplateMessageCount();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateSubscriptionAutomation();
    // Logic to update subscription goes here
    // This is a placeholder for the actual implementation
    reply.code(200).send("Subscription updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateRateupPlanFeatureHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateRateupPlanFeature();
    reply.code(200).send("plans updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
