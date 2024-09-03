import { FastifyReply, FastifyRequest } from "fastify";
import {
  deleteSubscriptions,
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
} from "./subscription.service";
import { ByOrgIdParams } from "../org/org.schema";
import {
  deleteSubscriptionsInput,
  updateSubscriptionInput,
} from "./subscription.schema";
import { getRateuplanById } from "../payment/payment.service";
import {
  FreePlanSubscriptionFeatures,
  UnlimitedAccess,
} from "./subscription.data";
import dayjs from "dayjs";

export async function getUserSubscriptionHandler(req, res) {
  const { orgId } = req.user;
  const subscription = await getSubscription(orgId);
  if (!subscription) {
    return res.status(404).send({
      message: "Subscription not found",
    });
  }
  return res.send(subscription);
}
export async function getSubscriptionHandler(req, res) {
  const { orgId } = req.params;
  const subscription = await getSubscription(orgId);
  res.send(subscription);
}

export async function getAllSubscriptionsHandler(req, res) {
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
  if (updatedData?.basePlanId) {
    const rateupPlan = await getRateuplanById(updatedData?.basePlanId);
    if (rateupPlan.paymentPlanId)
      return res
        .code(403)
        .send({ message: "You cannot change to Razorpay plans manually" });
    if (rateupPlan.name === "FREE PLAN")
      updatedData.features = FreePlanSubscriptionFeatures;
    else if (rateupPlan.name === "RATEUP TRIAL")
      updatedData.features = UnlimitedAccess;
    else updatedData.features = rateupPlan.features;
    updatedData.expiresAt = dayjs().add(30, "days").toDate();
  }
  const subscription = await updateSubscription(orgId, updatedData);
  return res.send(subscription);
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
