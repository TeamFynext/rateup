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
import { updateSubscriptionFeatures } from "./update-sub-features";
import { getRateuplanById } from "../payment/payment.service";
import {
  FreePlanSubscriptionFeatures,
  UnlimitedAccess,
} from "./subscription.data";

//SUBB TEMP
export async function subUpgradeHandler(req, res) {
  try {
    const subscription = await updateSubscriptionFeatures();

    return res.send("Success...:" + subscription);
  } catch (e) {
    return res.send("failed...:" + e);
  }
}

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
    if (rateupPlan.name === "FREE PLAN")
      updatedData.features = FreePlanSubscriptionFeatures;
    else if (rateupPlan.name === "RATEUP TRIAL")
      updatedData.features = UnlimitedAccess;
    else updatedData.features = rateupPlan.features;
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
