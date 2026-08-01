import { FastifyReply, FastifyRequest } from "fastify";
import {
  createCustomerAccount,
  getCustomerAccounts,
} from "../../../modules/loyalty/accounts/account.service.js";
import {
  ApplyRedemptionInput,
  AssignRewardInput,
  AwardPointsInput,
  CustomerLoyaltyAccountInput,
  PhoneNumberParam,
  RedeemRewardInput,
} from "../../../modules/loyalty/accounts/account.schema.js";
import { getLoyaltyProgramByOrg } from "../../../modules/loyalty/program/program.service.js";
import {
  assignRewardToCustomer,
  awardPoints,
  getCustomerAccountByPhone,
} from "../../../modules/loyalty/accounts/account.service.js";
import { getActiveLoyaltyRewards } from "../../../modules/loyalty/rewards/reward.service.js";
import {
  applyRedemption,
  redeemReward,
} from "../../../modules/loyalty/redemptions/redemption.service.js";
import { log } from "../../../utils/logger.js";

export async function registerLoyaltyCustomerExternalController(
  request: FastifyRequest<{ Body: CustomerLoyaltyAccountInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.body.orgId || request.user.orgId;
    if (!orgId) {
      return reply.code(400).send({ error: "orgId is required" });
    }

    const program = await getLoyaltyProgramByOrg(orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await createCustomerAccount(request.body, program.id, orgId);
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getCustomerLoyaltyPointsExternalController(
  request: FastifyRequest<{ Params: PhoneNumberParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const account = await getCustomerAccountByPhone(
      program.id,
      request.params.phoneNumber,
      request.user.orgId,
    );

    if (!account) {
      return reply.code(404).send({ error: "Customer account not found" });
    }

    reply.code(200).send({
      customerId: account.id,
      contactId: account.contactId,
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      currentTier: account.currentTier,
      status: account.status,
      referralCode: account.referralCode,
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getAllLoyaltyCustomersExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const customers = await getCustomerAccounts(program.id);
    reply.code(200).send(customers);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getAvailableRewardsExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const rewards = await getActiveLoyaltyRewards(program.id);
    reply.code(200).send(rewards);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function redeemRewardExternalController(
  request: FastifyRequest<{ Body: RedeemRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await redeemReward(program.id, request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return reply.code(400).send({ error: "Reward already redeemed" });
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function redeemCouponExternalController(
  request: FastifyRequest<{ Body: ApplyRedemptionInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await applyRedemption(request.body);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function awardLoyaltyPointsExternalController(
  request: FastifyRequest<{ Body: AwardPointsInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await awardPoints(
      program.id,
      request.body.contactId,
      request.body.purchaseAmount,
      {
        locationId: request.body.locationId,
        productCategories: request.body.productCategories,
        productSkus: request.body.productSkus,
        paymentMethod: request.body.paymentMethod,
        channel: request.body.channel,
        orderId: request.body.orderId,
        notes: request.body.notes,
      },
    );

    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function assignRewardExternalController(
  request: FastifyRequest<{ Body: AssignRewardInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await assignRewardToCustomer(
      request.body.customerId,
      request.body.rewardId,
      request.body.notes,
    );

    reply.code(201).send({
      message: "Reward assigned successfully",
      assignment: result,
    });
  } catch (e) {
    log.error(e);
    if (e instanceof Error && e.message === "Reward is already assigned to this customer") {
      return reply.code(400).send({ error: e.message });
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}
