import { FastifyReply, FastifyRequest } from "fastify";
import {
  lookupContactByPhone,
  searchContactsForEnrolment,
  awardPoints,
  createCustomerAccount,
  getCustomerAccountById,
  getCustomerAccountByContact,
  getCustomerAccountByPhone,
  getCustomerAccountByCardCode,
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
  CardCodeParam,
  AssignRewardInput,
  SearchQueryInput,
  ContactSearchQueryInput,
} from "./account.schema.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { toCsv } from "../../../utils/spreadsheet.js";
import { computeQualifyingSpend } from "../tiers/qualifyingSpend.js";
import { normalisePhone } from "../util.js";
import { parseCardCode } from "./cardCode.js";
import { sendMemberCard } from "./memberCard.service.js";
import { effectiveBonuses } from "../program/bonuses.js";

export async function createPublicCustomerAccountHandler(
  request: FastifyRequest<{ Body: CustomerLoyaltyAccountInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.body.orgId;
    if (!orgId) {
      return reply.code(400).send({ error: "orgId is required" });
    }
    // The honeypot was filled: a bot. Answer as if it worked, before touching the
    // database, so the bot learns nothing from the response.
    if ((request.body.website?.length ?? 0) > 0) {
      log.warn({ ip: request.ip, orgId }, "Loyalty signup honeypot tripped");
      return reply.code(201).send({ success: true });
    }
    const program = await getLoyaltyProgramByOrg(orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    if (program.status !== "active") {
      return reply.code(400).send({ error: "Loyalty program is not active" });
    }
    const phone = normalisePhone(request.body.phone, program.defaultCountryCode);
    if (!phone) {
      return reply.code(400).send({ error: "Enter a valid mobile number" });
    }
    // A web signup earns its bonus points once the customer is seen on WhatsApp or at the
    // till — a bot that never shows up gets nothing.
    const result = await createCustomerAccount(
      { ...request.body, phone },
      program.id,
      orgId,
      undefined,
      {
        holdBonuses: true,
      },
    );
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function createCustomerAccountHandler(
  request: FastifyRequest<{ Body: CustomerLoyaltyAccountInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user?.orgId;
    if (!orgId) {
      return reply.code(400).send({ error: "orgId is required" });
    }
    const program = await getLoyaltyProgramByOrg(orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    if (program.status !== "active") {
      return reply.code(400).send({ error: "Loyalty program is not active" });
    }
    // Staff at the counter saw the contact's stored details in the form; what they typed wins.
    const result = await createCustomerAccount(request.body, program.id, orgId, undefined, {
      trustedDetails: true,
      sendWelcome: true,
    });
    reply.code(201).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getCustomerAccountsHandler(
  request: FastifyRequest<{ Querystring: SearchQueryInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(200).send([]);
    }
    const { search, name } = request.query;
    const result = await getCustomerAccounts(program.id, search, name);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getCustomerAccountByIdHandler(
  request: FastifyRequest<{ Params: CustomerIdParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await getCustomerAccountById(request.params.customerId, program.id);
    if (!result) {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    const result = await getCustomerAccountByContact(program.id, request.params.contactId);
    if (!result) {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

/**
 * Powers the add-customer form's phone-first flow: given a number, say whether the org
 * already knows this person and whether they are already in the programme.
 *
 * Authenticated and org-scoped by `request.user.orgId`. It is deliberately not exposed
 * on the public registration route — an unauthenticated lookup would let anyone probe
 * phone numbers and read back a customer's name.
 */
export async function lookupContactByPhoneHandler(
  request: FastifyRequest<{ Params: PhoneNumberParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await lookupContactByPhone(request.params.phoneNumber, request.user.orgId);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

/** Authenticated only, like the lookup above: it lists the org's contacts by name. */
export async function searchContactsForEnrolmentHandler(
  request: FastifyRequest<{ Querystring: ContactSearchQueryInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await searchContactsForEnrolment(request.user.orgId, request.query);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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

    reply.code(200).send(await buildCashierCustomerPayload(program, account));
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

type CashierProgram = NonNullable<Awaited<ReturnType<typeof getLoyaltyProgramByOrg>>>;
type CashierAccount = NonNullable<Awaited<ReturnType<typeof getCustomerAccountByPhone>>>;

/**
 * The counter's view of one member — balance, what is waiting to be handed over, what they
 * can buy, where they stand on the ladder. One builder, however the member was found
 * (phone or scanned card), so the two lookups can never drift apart.
 */
export async function buildCashierCustomerPayload(
  program: CashierProgram,
  account: CashierAccount,
) {
  // Get all active rewards from the program
  const allRewards = await getActiveLoyaltyRewards(program.id);

  // Get assigned reward IDs for this customer (excluding redeemed ones)
  const assignedRewardIds = account.assignedRewards
    ? account.assignedRewards.filter((d) => d.status !== "REDEEMED").map((ar) => ar.rewardId)
    : [];

  // Get coupon redemptions (active ones)
  const couponRedemptions = account.redemptions
    ? account.redemptions
        .filter((r) => r.reward?.rewardType === "coupon" && r?.status === "APPROVED" && !r.usedAt)
        .map((r) => ({
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

  const eligibleRewards = availableRewards.filter((reward) => {
    if (reward.availableForTiers && reward.availableForTiers.length > 0) {
      if (!account.currentTier) return false;
      const allowed =
        reward.availableForTiers.includes(account.currentTier.id) ||
        reward.availableForTiers.includes(account.currentTier.name);
      if (!allowed) return false;
    }
    return true;
  });

  // Everything the counter still has to hand over. Two kinds, because two tables hold
  // them: an approved redemption is used with its code; an issued gift with its short
  // code. `kind` tells the cashier which endpoint to call.
  const pendingRedemptions = [
    ...(account.redemptions ?? [])
      .filter((r) => r.status === "APPROVED" && !r.usedAt)
      .map((r) => ({
        kind: "redemption" as const,
        id: r.id,
        code: r.redemptionCode,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt ?? null,
        reward: rewardSummary(r.reward),
      })),
    ...(account.assignedRewards ?? [])
      .filter((a) => a.status === "ISSUED")
      .map((a) => ({
        kind: "assigned" as const,
        id: a.id,
        code: a.shortCode,
        status: a.status,
        createdAt: a.assignedAt,
        expiresAt: null,
        reward: rewardSummary(a.reward),
      })),
  ];

  const awaitingApproval = (account.redemptions ?? [])
    .filter((r) => r.status === "PENDING")
    .map((r) => ({
      id: r.id,
      code: r.redemptionCode,
      createdAt: r.createdAt,
      reward: rewardSummary(r.reward),
    }));

  const recentTransactions = (account.transactions ?? []).slice(0, 5).map((t) => {
    const metadata = (t.metadata ?? {}) as { purchaseAmount?: unknown };
    return {
      id: t.id,
      transactionType: t.transactionType,
      source: t.source,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
      purchaseAmount: typeof metadata.purchaseAmount === "number" ? metadata.purchaseAmount : null,
    };
  });

  // Tier progress from the programme's own ladder. Thresholds are lifetime spend unless
  // the programme judges tiers on a trailing window, in which case the spend that
  // counts is what the ledger holds inside that window.
  const totalSpend = Number(account.totalSpend ?? 0);
  const windowMonths = program.tierQualificationWindowMonths ?? null;
  const qualifyingSpend =
    windowMonths === null
      ? totalSpend
      : await computeQualifyingSpend(account.id, program.id, windowMonths);
  const ladder = [...(program.tiers ?? [])].sort(
    (a, b) => Number(a.threshold) - Number(b.threshold),
  );
  const nextTier = program.tiersEnabled
    ? (ladder.find((tier) => Number(tier.threshold) > qualifyingSpend) ?? null)
    : null;

  return {
    customer: {
      id: account.id,
      contactId: account.contactId,
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      totalSpend,
      referralCode: account.referralCode,
      currentTier: account.currentTier,
      name: account.contact.name,
      phone: account.contact.phone,
      email: account.contact.email,
      points: account.currentPoints,
      status: account.status,
      createdAt: account.createdAt,
      cardCode: account.cardCode,
      cardSentAt: account.cardSentAt,
    },
    availableRewards: eligibleRewards,
    issuableRewards: issuableRewards,
    activeCoupons: couponRedemptions, // Active coupon redemptions
    redeemedRewards: account.redemptions || [], // Full redemption history
    pendingRedemptions,
    awaitingApproval,
    recentTransactions,
    tier: {
      current: account.currentTier
        ? {
            id: account.currentTier.id,
            name: account.currentTier.name,
            threshold: Number(account.currentTier.threshold),
            pointsMultiplier: Number(account.currentTier.pointsMultiplier),
            color: account.currentTier.color,
          }
        : null,
      next: nextTier
        ? { id: nextTier.id, name: nextTier.name, threshold: Number(nextTier.threshold) }
        : null,
      amountToNext: nextTier ? Number(nextTier.threshold) - qualifyingSpend : null,
      /** The spend the ladder is judged on — lifetime, or the trailing window's. */
      qualifyingSpend,
      qualificationWindowMonths: windowMonths,
    },
    program: {
      currencySymbol: program.currencySymbol,
      pointsName: program.currencyName,
      signupBonus: effectiveBonuses(program).signupBonus,
    },
  };
}

/**
 * `GET /accounts/card/:cardCode` — the member whose card the cashier just scanned. A code
 * that does not parse and a code from another programme are the same 404: the app has one
 * message for both.
 */
export async function getCustomerAccountByCardCodeHandler(
  request: FastifyRequest<{ Params: CardCodeParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const code = parseCardCode(request.params.cardCode);
    const account = code ? await getCustomerAccountByCardCode(program.id, code) : null;
    if (!account) {
      return reply.code(404).send({ error: "Card not found" });
    }
    reply.code(200).send(await buildCashierCustomerPayload(program, account));
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

/**
 * `POST /accounts/:customerId/card/send` — a cashier asks for the member's card to be sent
 * on WhatsApp. The outcome is returned as-is: `session_closed` is the common case for a
 * customer who has not messaged the business lately, and the counter says so.
 */
export async function sendMemberCardHandler(
  request: FastifyRequest<{ Params: CustomerIdParam }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const account = await getCustomerAccountById(request.params.customerId, program.id);
    if (!account) {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    const outcome = await sendMemberCard({ orgId: request.user.orgId, accountId: account.id });
    reply.code(200).send(outcome);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }
    const result = await updateCustomerAccount(request.params.customerId, request.body, program.id);
    reply.code(200).send(result);
  } catch (e) {
    log.error(e);
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2025") {
      return reply.code(404).send({ error: "Customer account not found" });
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
        ["Name", "Phone", "Email", "Tier", "Points", "Lifetime Points", "Referral Code"],
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

      const csv = toCsv(rows);

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="customers-${new Date().toISOString()}.csv"`,
      );

      return reply.send(csv);
    }
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
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
    if (e instanceof Error && e.message === "Reward is already assigned to this customer") {
      return reply.code(400).send({ error: e.message });
    }
    reply.code(500).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function getRewardByShortCodeHandler(
  request: FastifyRequest<{ Params: { shortCode: string } }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user?.orgId;
    if (!orgId) {
      return reply.code(400).send({ error: "orgId is required" });
    }
    const result = await getRewardByShortCode(request.params.shortCode, orgId);
    reply.send(result);
  } catch (e) {
    reply.code(400).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

export async function redeemRewardByShortCodeHandler(
  request: FastifyRequest<{ Params: { shortCode: string } }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user?.orgId;
    if (!orgId) {
      return reply.code(400).send({ error: "orgId is required" });
    }
    const result = await markRewardAsRedeemed(request.params.shortCode, orgId);
    reply.send(result);
  } catch (e) {
    log.error(e);
    reply.code(400).send({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

/** The few reward fields the counter shows on a pending strip. */
function rewardSummary(
  reward: { id: string; name: string; pointsCost: number; rewardType: string } | null | undefined,
) {
  if (!reward) return null;
  return {
    id: reward.id,
    name: reward.name,
    pointsCost: reward.pointsCost,
    rewardType: reward.rewardType,
  };
}
