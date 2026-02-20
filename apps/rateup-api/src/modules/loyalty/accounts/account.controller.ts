import { FastifyReply, FastifyRequest } from "fastify";
import {
  awardPoints,
  createCustomerAccount,
  getCustomerAccountById,
  getCustomerAccountByContact,
  getCustomerAccountByPhone,
  getCustomerAccounts,
  getCustomerAccountsForExport,
  updateCustomerAccount,
  assignRewardToCustomer,
  getRewardByShortCode,
  markRewardAsRedeemed,
} from "./account.service.js";
import { log } from "../../../utils/logger.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import {
  AwardPointsInput,
  CustomerIdParam,
  CustomerLoyaltyAccountInput,
  CustomerLoyaltyAccountUpdateInput,
  ContactIdParam,
  PhoneNumberParam,
  AssignRewardInput,
} from "./account.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

export async function createCustomerAccountHandler(
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
    reply.code(500).send({ error: e.message });
  }
}

export async function getCustomerAccountsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await getCustomerAccounts(program.id);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getCustomerAccountByIdHandler(
  request: FastifyRequest<{ Params: CustomerIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getCustomerAccountById(request.params.customerId);
    if (!result) {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getCustomerAccountByContactHandler(
  request: FastifyRequest<{ Params: ContactIdParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await getCustomerAccountByContact(
      program.id,
      request.params.contactId,
    );
    if (!result) {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function getCustomerAccountByPhoneHandler(
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

    // Get all active rewards from the program
    const allRewards = await getActiveLoyaltyRewards(program.id);

    // Get assigned reward IDs for this customer (excluding redeemed ones)
    const assignedRewardIds = (account as any).assignedRewards
      ? (account as any).assignedRewards
          .filter((d) => d.status !== "REDEEMED")
          .map((ar: any) => ar.rewardId)
      : [];

    // Get coupon redemptions (active ones)
    const couponRedemptions = (account as any).redemptions
      ? (account as any).redemptions
          .filter(
            (r: any) =>
              r.reward?.rewardType === "coupon" &&
              r?.status === "APPROVED" &&
              !r.usedAt,
          )
          .map((r: any) => ({
            id: r.id,
            rewardId: r.rewardId,
            redemptionCode: r.redemptionCode,
            status: r.status,
            createdAt: r.createdAt,
            reward: r.reward,
          }))
      : [];

    // Filter rewards based on type and assignment status
    const availableRewards = allRewards.filter((reward) => {
      // For "assigned" and "point" type rewards: only include if assigned to this customer and not redeemed
      if (reward.rewardType === "assigned" || reward.rewardType === "point") {
        return assignedRewardIds.includes(reward.id);
      }
      // For coupon and other reward types: available to all (subject to tier checks)
      return true;
    });
    const issuableRewards = allRewards.filter((reward) => {
      if (reward.rewardType === "point") {
        return assignedRewardIds.includes(reward.id);
      } else if (reward.rewardType === "assigned") {
        return true;
      }
      // For coupon and other reward types: available to all (subject to tier checks)
      return false;
    });

    // Further filter by tier eligibility
    const eligibleRewards = availableRewards.filter((reward: any) => {
      // Check if reward is restricted to specific tiers
      if (reward.availableForTiers && reward.availableForTiers.length > 0) {
        if (
          !account.currentTier ||
          !reward.availableForTiers.includes(account.currentTier.name)
        ) {
          return false;
        }
      }
      return true;
    });

    reply.code(200).send({
      customer: {
        id: account.id,
        contactId: account.contactId,
        currentPoints: account.currentPoints,
        lifetimePoints: account.lifetimePoints,
        referralCode: account.referralCode,
        currentTier: account.currentTier,
        name: account.contact.name,
        phone: account.contact.phone,
        email: account.contact.email,
        points: account.currentPoints,
        status: account.status,
      },
      availableRewards: eligibleRewards,
      issuableRewards: issuableRewards,
      activeCoupons: couponRedemptions, // Active coupon redemptions
      redeemedRewards: account.redemptions || [], // Full redemption history
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function updateCustomerAccountHandler(
  request: FastifyRequest<{
    Params: CustomerIdParam;
    Body: CustomerLoyaltyAccountUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await updateCustomerAccount(
      request.params.customerId,
      request.body,
    );
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function awardPointsHandler(
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
    reply.code(500).send({ error: e.message });
  }
}

export async function exportCustomerAccountsHandler(
  request: FastifyRequest<{ Querystring: { format?: "csv" | "excel" } }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const customers = await getCustomerAccountsForExport(program.id);

    if (request.query.format === "excel") {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Customers");

      worksheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Phone", key: "phone", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Tier", key: "tier", width: 15 },
        { header: "Points", key: "points", width: 12 },
        { header: "Lifetime Points", key: "lifetimePoints", width: 15 },
        { header: "Referral Code", key: "referralCode", width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true };

      customers.forEach((customer) => {
        worksheet.addRow({
          name: customer.contact?.name || "",
          phone: customer.contact?.phone || "",
          email: customer.contact?.email || "",
          tier: customer.currentTier?.name || "N/A",
          points: customer.currentPoints,
          lifetimePoints: customer.lifetimePoints,
          referralCode: customer.referralCode,
        });
      });

      reply.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      reply.header(
        "Content-Disposition",
        `attachment; filename="customers-${new Date().toISOString()}.xlsx"`,
      );

      const buffer = await workbook.xlsx.writeBuffer();
      return reply.send(buffer);
    } else {
      // CSV
      const rows = [
        [
          "Name",
          "Phone",
          "Email",
          "Tier",
          "Points",
          "Lifetime Points",
          "Referral Code",
        ],
      ];

      customers.forEach((customer) => {
        rows.push([
          customer.contact?.name || "",
          customer.contact?.phone || "",
          customer.contact?.email || "",
          customer.currentTier?.name || "N/A",
          customer.currentPoints.toString(),
          customer.lifetimePoints.toString(),
          customer.referralCode,
        ]);
      });

      const csv = rows.map((row) => row.join(",")).join("\n");

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="customers-${new Date().toISOString()}.csv"`,
      );

      return reply.send(csv);
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e.message });
  }
}

export async function assignRewardToCustomerHandler(
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
    if (e.message === "Reward is already assigned to this customer") {
      return reply.code(400).send({ error: e.message });
    }
    reply.code(500).send({ error: e.message });
  }
}

export async function getRewardByShortCodeHandler(
  request: FastifyRequest<{ Params: { shortCode: string } }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user?.orgId;
    const result = await getRewardByShortCode(request.params.shortCode, orgId);
    reply.send(result);
  } catch (e) {
    reply.code(400).send({ error: e.message });
  }
}

export async function redeemRewardByShortCodeHandler(
  request: FastifyRequest<{ Params: { shortCode: string } }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user?.orgId;
    const result = await markRewardAsRedeemed(request.params.shortCode, orgId);
    reply.send(result);
  } catch (e) {
    log.error(e);
    reply.code(400).send({ error: e.message });
  }
}
