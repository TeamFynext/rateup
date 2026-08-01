import { FastifyReply, FastifyRequest } from "fastify";
import {
  deleteSubscriptions,
  getAllSubscriptions,
  getMessageStatsByOrgId,
  getSubscription,
  updateSubscription,
} from "./subscription.service.js";
import { ByOrgIdParams } from "../org/org.schema.js";
import { deleteSubscriptionsInput, updateSubscriptionInput } from "./subscription.schema.js";
import { getRateuplanById } from "../payment/payment.service.js";
import { FreePlanSubscriptionFeatures } from "./subscription.data.js";
import dayjs from "dayjs";
import { updateUsageStatsLastReset } from "../stats/stats.service.js";
import { log } from "../../utils/logger.js";

export async function getUserSubscriptionHandler(req: FastifyRequest, res: FastifyReply) {
  const { orgId } = req.user;
  const subscription = await getSubscription(orgId);
  if (!subscription) {
    return res.status(404).send({
      message: "Subscription not found",
    });
  }
  return res.send(subscription);
}
export async function getSubscriptionHandler(
  req: FastifyRequest<{ Params: ByOrgIdParams }>,
  res: FastifyReply,
) {
  const { orgId } = req.params;
  const subscription = await getSubscription(orgId);
  res.send(subscription);
}

export async function getAllSubscriptionsHandler(_req: FastifyRequest, res: FastifyReply) {
  const subscriptions = await getAllSubscriptions();
  return res.send(subscriptions);
}

export async function updateSubscriptionHandler(
  req: FastifyRequest<{
    Params: ByOrgIdParams;
    Body: updateSubscriptionInput;
  }>,
  res: FastifyReply,
) {
  const { orgId } = req.params;
  const updatedData = req.body;
  //case: on changing to new plan
  if (updatedData?.basePlanId) {
    const rateupPlan = await getRateuplanById(updatedData?.basePlanId);
    if (!rateupPlan) {
      return res.code(404).send({ message: "Plan not found" });
    }
    if (rateupPlan.paymentPlanId)
      return res.code(403).send({ message: "You cannot change to Razorpay plans manually" });
    else if (rateupPlan.name === "RATEUP TRIAL")
      updatedData.features = FreePlanSubscriptionFeatures;
    else updatedData.features = rateupPlan?.features;
    updatedData.expiresAt = dayjs().add(30, "days").toISOString();
  }
  const subscription = await updateSubscription(orgId, updatedData);
  res.send(subscription);
  if ("isAnnualMessageLimit" in updatedData) {
    if (!updatedData.isAnnualMessageLimit)
      await updateUsageStatsLastReset(orgId, subscription.renewedAt ?? subscription.createdAt);
    // Switching to annual pooling needs no backfill — annualConversationsCount is
    // already incremented live on every conversation.
  }
}

export async function deleteSubscriptionsHandler(
  req: FastifyRequest<{
    Body: deleteSubscriptionsInput;
  }>,
  res: FastifyReply,
) {
  const orgIds = req.body;
  const subscriptions = await deleteSubscriptions(orgIds);
  return res.send(subscriptions);
}

export async function getMessageStatsHandler(
  req: FastifyRequest<{
    Params: ByOrgIdParams;
    Querystring: { dateRange?: string };
  }>,
  res: FastifyReply,
) {
  try {
    const orgId = req.params.orgId;
    const subscriptions = await getMessageStatsByOrgId(orgId, req.query);
    return res.send(subscriptions);
  } catch (e) {
    log.error(e);
    res.code(500).send(e);
  }
}
