import type { FastifyReply, FastifyRequest } from "fastify";
import type z from "zod";

import {
  assignRewardToCustomer,
  awardPoints,
  createCustomerAccount,
  getCustomerAccountsPaged,
  getRewardByShortCode,
  lookupContactByPhone,
  markRewardAsRedeemed,
  updateCustomerAccount,
} from "../../../modules/loyalty/accounts/account.service.js";
import { buildCashierCustomerPayload } from "../../../modules/loyalty/accounts/account.controller.js";
import { sendMemberCard } from "../../../modules/loyalty/accounts/memberCard.service.js";
import { getLoyaltyTiers } from "../../../modules/loyalty/tiers/tier.service.js";
import { getLoyaltyEarningRules } from "../../../modules/loyalty/earningRules/earningRule.service.js";
import {
  getActiveLoyaltyRewards,
  getLoyaltyRewardByCode,
} from "../../../modules/loyalty/rewards/reward.service.js";
import {
  applyRedemption,
  getTransactions,
  redeemReward,
  verifyRedemption,
} from "../../../modules/loyalty/redemptions/redemption.service.js";
import { createApprovalRequest } from "../../../modules/loyalty/approvals/approval.service.js";

import { ExternalApiError } from "../errors.js";
import { loadProgram } from "./guards.js";
import { resolveMember, normaliseRefPhone, type MemberRef } from "./memberRef.js";
import {
  presentAssignedVoucher,
  presentEarningRule,
  presentMember,
  presentProgram,
  presentRedemptionVoucher,
  presentReward,
  presentTier,
  presentTierRef,
  presentTransaction,
} from "./presenters.js";
import type * as S from "./loyalty.external.schema.js";

/**
 * Partner-API loyalty handlers.
 *
 * There is no try/catch anywhere in this file, deliberately. The previous version wrapped
 * every handler and ended each one `reply.code(500).send({ error: e.message })`, which is
 * how "Insufficient points" and "Redemption already applied" — ordinary answers a till
 * needs to act on — became server errors carrying raw internal text. Handlers now throw and
 * `externalErrorHandler` decides the status.
 */

interface Body<T extends z.ZodType> {
  Body: z.infer<T>;
}
interface Query<T extends z.ZodType> {
  Querystring: z.infer<T>;
}
interface Params<T extends z.ZodType> {
  Params: z.infer<T>;
}

/** Tier ids are meaningless outside RateUp; rewards publish tier names instead. */
async function tierNames(programId: string): Promise<Map<string, string>> {
  const tiers = await getLoyaltyTiers(programId);
  return new Map(tiers.map((t) => [t.id, t.name]));
}

// ---------------------------------------------------------------------------
// Programme and catalogue
// ---------------------------------------------------------------------------

export async function pingHandler(request: FastifyRequest, reply: FastifyReply) {
  const program = await loadProgram(request);
  return reply.send({ ok: true, orgId: request.user.orgId, programStatus: program.status });
}

export async function getProgramHandler(request: FastifyRequest, reply: FastifyReply) {
  const program = await loadProgram(request);
  return reply.send(presentProgram(program as unknown as Record<string, unknown>));
}

export async function getTiersHandler(request: FastifyRequest, reply: FastifyReply) {
  const program = await loadProgram(request);
  const tiers = await getLoyaltyTiers(program.id);
  return reply.send(tiers.map((t) => presentTier(t as unknown as Record<string, unknown>)));
}

export async function getEarningRulesHandler(request: FastifyRequest, reply: FastifyReply) {
  const program = await loadProgram(request);
  const rules = await getLoyaltyEarningRules(program.id);
  return reply.send(
    rules
      .filter((r) => r.status === "active")
      .map((r) => presentEarningRule(r as unknown as Record<string, unknown>)),
  );
}

export async function getRewardsHandler(request: FastifyRequest, reply: FastifyReply) {
  const program = await loadProgram(request);
  const [rewards, names] = await Promise.all([
    getActiveLoyaltyRewards(program.id),
    tierNames(program.id),
  ]);
  return reply.send(
    rewards.map((r) => presentReward(r as unknown as Record<string, unknown>, names)),
  );
}

export async function getRewardHandler(
  request: FastifyRequest<Params<typeof S.rewardCodeParamSchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request);
  const reward = await getLoyaltyRewardByCode(program.id, request.params.rewardCode);
  if (!reward) {
    throw new ExternalApiError(404, "reward_not_found", "No reward with that code");
  }
  const names = await tierNames(program.id);
  return reply.send(presentReward(reward as unknown as Record<string, unknown>, names));
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * Everything a till needs to serve someone, in one call: balance, what they can buy, what
 * is already paid for and waiting, tier progress, and the last few transactions. The old
 * `GET /customers/:phone/points` returned seven scalars, so a POS had to guess the rest.
 */
export async function lookupMemberHandler(
  request: FastifyRequest<{ Querystring: MemberRef }>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request);
  const account = await resolveMember(program, request.user.orgId, request.query);
  const payload = await buildCashierCustomerPayload(program as never, account as never);

  const names = await tierNames(program.id);
  const rewards = (list: unknown[]) =>
    list.map((r) => presentReward(r as Record<string, unknown>, names));

  return reply.send({
    member: presentMember(account as unknown as Record<string, unknown>),
    availableRewards: rewards(payload.availableRewards ?? []),
    issuableRewards: rewards(payload.issuableRewards ?? []),
    pendingVouchers: (payload.pendingRedemptions ?? []).map((p) =>
      p.kind === "redemption"
        ? presentRedemptionVoucher(p as unknown as Record<string, unknown>)
        : presentAssignedVoucher(p as unknown as Record<string, unknown>),
    ),
    awaitingApproval: (payload.awaitingApproval ?? []).map((p) =>
      presentRedemptionVoucher(p as unknown as Record<string, unknown>),
    ),
    recentTransactions: (payload.recentTransactions ?? []).map((t) =>
      presentTransaction(t as unknown as Record<string, unknown>),
    ),
    tier: {
      current: presentTierRef(payload.tier.current as Record<string, unknown> | null),
      next: payload.tier.next
        ? { name: payload.tier.next.name, threshold: Number(payload.tier.next.threshold) }
        : null,
      amountToNext: payload.tier.amountToNext,
      qualifyingSpend: payload.tier.qualifyingSpend,
      qualificationWindowMonths: payload.tier.qualificationWindowMonths,
    },
    program: {
      currencySymbol: payload.program.currencySymbol ?? "",
      pointsName: payload.program.pointsName ?? "points",
      signupBonus: Number(payload.program.signupBonus ?? 0),
    },
  });
}

export async function listMembersHandler(
  request: FastifyRequest<Query<typeof S.memberListQuerySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request);
  const { rows, pagination } = await getCustomerAccountsPaged(program.id, request.query);
  return reply.send({
    data: rows.map((r) => presentMember(r as unknown as Record<string, unknown>)),
    pagination,
  });
}

/**
 * Whether enrolling this number will reuse a contact the org already knows, and whether
 * they have already joined — so a till can confirm a name instead of asking for it again.
 */
export async function preflightHandler(
  request: FastifyRequest<Query<typeof S.preflightQuerySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request);
  const phone = normaliseRefPhone(program, request.query.phone);
  const { contact, alreadyMember } = await lookupContactByPhone(phone, request.user.orgId);
  return reply.send({
    contactExists: Boolean(contact),
    alreadyMember,
    name: contact?.name ?? null,
  });
}

export async function createMemberHandler(
  request: FastifyRequest<Body<typeof S.createMemberSchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const orgId = request.user.orgId;
  const phone = normaliseRefPhone(program, request.body.phone);

  const account = await createCustomerAccount(
    {
      ...request.body,
      phone,
      orgId,
      referCode: request.body.referralCode,
      // Stamped here, not taken from the caller: how someone joined is a fact about the
      // system, not a field.
      source: "external_api",
    } as never,
    program.id,
    orgId,
    undefined,
    // Staff-entered details are trusted over whatever the contact record holds, matching
    // the counter. An API key is an authenticated operator, not a public form.
    { trustedDetails: true },
  );

  return reply.code(201).send(presentMember(account as unknown as Record<string, unknown>));
}

export async function updateMemberHandler(
  request: FastifyRequest<Body<typeof S.updateMemberSchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);
  const { member: _ref, ...changes } = request.body;
  const updated = await updateCustomerAccount(account.id, changes as never, program.id);
  return reply.send(presentMember(updated as unknown as Record<string, unknown>));
}

export async function sendCardHandler(
  request: FastifyRequest<Body<typeof S.sendCardBodySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);
  const outcome = await sendMemberCard({ orgId: request.user.orgId, accountId: account.id });
  // Reported honestly rather than as a failure: `session_closed` simply means the customer
  // has not messaged the business lately, which is not an error the caller can fix.
  return reply.send({
    sent: outcome.sent,
    skippedReason: outcome.skippedReason ?? null,
    cardCode: outcome.cardCode ?? null,
    cardSentAt: outcome.cardSentAt ? new Date(outcome.cardSentAt).toISOString() : null,
  });
}

// ---------------------------------------------------------------------------
// Points
// ---------------------------------------------------------------------------

export async function awardPointsHandler(
  request: FastifyRequest<Body<typeof S.awardPointsBodySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);
  const { member: _ref, ...ctx } = request.body;

  const result = await awardPoints(program.id, account.contactId, request.body.purchaseAmount, {
    ...ctx,
    idempotencyKey: request.headers["idempotency-key"] as string,
  });

  const balance = result.replayed
    ? { current: result.transaction.balanceAfter, lifetime: 0 }
    : {
        current: Number(result.customer?.currentPoints ?? 0),
        lifetime: Number(result.customer?.lifetimePoints ?? 0),
      };

  return reply.send({
    replayed: result.replayed,
    transactionId: result.transaction.id,
    pointsAwarded: result.pointsAwarded,
    balance,
    rule: result.rule
      ? {
          name: result.rule.name,
          multiplier: Number(result.rule.multiplier ?? 1),
          bonusPoints: Number(result.rule.bonusPoints ?? 0),
        }
      : null,
    tier: {
      current: presentTierRef(result.tier.current as Record<string, unknown> | null),
      upgraded: result.tier.upgraded,
      next: result.tier.next
        ? { name: result.tier.next.name, threshold: Number(result.tier.next.threshold) }
        : null,
      amountToNext: result.tier.amountToNext,
    },
  });
}

/**
 * Correcting a balance — and the only way to undo an award.
 *
 * It goes through the approval system rather than writing a ledger row directly, because
 * that is where the audit trail lives: who asked, why, who signed it off. A programme that
 * auto-approves adjustments applies it immediately; otherwise it waits for staff, and the
 * caller is told which happened.
 */
export async function adjustPointsHandler(
  request: FastifyRequest<Body<typeof S.adjustPointsBodySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);

  const approval = await createApprovalRequest({
    requestType: "POINTS_ADJUSTMENT",
    accountId: account.id,
    points: request.body.points,
    reason: request.body.reason,
    requestedByType: "SYSTEM",
    requestedByName: "External API",
    requestData: {},
  } as never);

  // Always pending: approving needs a reviewer, and a key identifies an organisation
  // rather than a person. Staff sign it off in the dashboard, which is what keeps the
  // "who reversed these points, and why" trail intact.
  return reply.send({
    status: "pending_approval",
    approvalId: approval.id,
    transactionId: null,
    balance: null,
  });
}

/**
 * The ledger.
 *
 * Filterable by `orderId` and `idempotencyKey` on purpose: without a read like this, a
 * client that loses the reply to an award has no safe move — it cannot retry (that risks a
 * double award) and it cannot check. The mobile cashier's offline outbox documents exactly
 * this pattern, and until now could not perform it through the partner API at all.
 */
export async function listTransactionsHandler(
  request: FastifyRequest<Query<typeof S.transactionQuerySchema>>,
  reply: FastifyReply,
) {
  const program = await loadProgram(request);
  const { phone, cardCode, orderId, idempotencyKey, type, from, to, page, limit } = request.query;

  let accountId: string | undefined;
  if (phone || cardCode) {
    const account = await resolveMember(program, request.user.orgId, { phone, cardCode });
    accountId = account.id;
  }

  const result = await getTransactions(program.id, {
    customerId: accountId,
    referenceId: orderId,
    idempotencyKey,
    transactionType: type,
    fromDate: from,
    toDate: to,
    page,
    limit,
  });

  const rows = (result as { transactions?: unknown[] }).transactions ?? [];
  const pagination = (result as { pagination?: Record<string, number> }).pagination ?? {
    page,
    limit,
    total: rows.length,
    totalPages: 1,
  };

  return reply.send({
    data: rows.map((t) => presentTransaction(t as Record<string, unknown>)),
    pagination,
  });
}

// ---------------------------------------------------------------------------
// Rewards and vouchers
// ---------------------------------------------------------------------------

async function rewardByCodeOr404(programId: string, code: string) {
  const reward = await getLoyaltyRewardByCode(programId, code);
  if (!reward) {
    throw new ExternalApiError(404, "reward_not_found", "No reward with that code");
  }
  return reward;
}

export async function issueRewardHandler(
  request: FastifyRequest<
    Params<typeof S.rewardCodeParamSchema> & Body<typeof S.issueRewardBodySchema>
  >,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);
  const reward = await rewardByCodeOr404(program.id, request.params.rewardCode);

  const assigned = await assignRewardToCustomer(account.id, reward.id, request.body.notes);

  return reply.code(201).send({
    voucherCode: (assigned as { shortCode: string }).shortCode,
    kind: "issued_reward",
    reward: { code: reward.code, name: reward.name },
  });
}

export async function redeemRewardHandler(
  request: FastifyRequest<
    Params<typeof S.rewardCodeParamSchema> & Body<typeof S.redeemRewardBodySchema>
  >,
  reply: FastifyReply,
) {
  const program = await loadProgram(request, { forWrite: true });
  const account = await resolveMember(program, request.user.orgId, request.body.member);
  const reward = await rewardByCodeOr404(program.id, request.params.rewardCode);

  const result = await redeemReward(program.id, {
    customerId: account.id,
    rewardId: reward.id,
    locationId: request.body.locationId,
    orderId: request.body.orderId,
    notes: request.body.notes,
  });

  const redemption = (result as { redemption?: Record<string, unknown> }).redemption ?? {};
  return reply.send({
    voucherCode:
      (result as { redemptionCode?: string }).redemptionCode ??
      (redemption.redemptionCode as string | undefined) ??
      null,
    status: String(redemption.status ?? "APPROVED"),
    pointsSpent: reward.pointsCost,
    balance: {
      current: Number(account.currentPoints) - reward.pointsCost,
      lifetime: Number(account.lifetimePoints),
    },
    expiresAt: redemption.expiresAt ? new Date(redemption.expiresAt as string).toISOString() : null,
  });
}

/** A redemption code looks like `RU-XXXXXXXXXX`; a gift's short code does not. */
const isRedemptionCode = (code: string) => /^RU-/i.test(code.trim());

/**
 * Reading a voucher without spending it — the check a till makes between scanning and
 * handing anything over. The old surface had no equivalent: `POST /coupons/redeem` applied
 * blind, so the only way to find out a code was expired was to try to use it.
 */
export async function getVoucherHandler(
  request: FastifyRequest<Params<typeof S.voucherCodeParamSchema>>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
  await loadProgram(request);
  const code = request.params.code.trim();

  if (isRedemptionCode(code)) {
    const result = await verifyRedemption(code, orgId);
    const redemption = (result as { redemption?: Record<string, unknown> }).redemption;
    if (!redemption) {
      throw new ExternalApiError(404, "voucher_not_found", "No voucher with that code");
    }
    return reply.send(
      presentRedemptionVoucher(redemption, {
        valid: Boolean((result as { valid?: boolean }).valid),
        invalidReason: (result as { message?: string }).message ?? null,
      }),
    );
  }

  const assigned = await getRewardByShortCode(code, orgId);
  const status = String((assigned as { status?: string }).status ?? "");
  return reply.send(
    presentAssignedVoucher(assigned as unknown as Record<string, unknown>, {
      valid: status === "ISSUED",
      invalidReason: status === "ISSUED" ? null : `Voucher is ${status.toLowerCase()}`,
    }),
  );
}

/** Marks a voucher used, whichever of the two kinds it is. */
export async function redeemVoucherHandler(
  request: FastifyRequest<
    Params<typeof S.voucherCodeParamSchema> & Body<typeof S.applyVoucherBodySchema>
  >,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
  await loadProgram(request, { forWrite: true });
  const code = request.params.code.trim();

  if (isRedemptionCode(code)) {
    const applied = await applyRedemption(
      {
        redemptionCode: code,
        appliedBy: request.body.appliedBy,
        notes: request.body.notes,
      },
      orgId,
    );
    const row = applied as unknown as Record<string, unknown>;
    const reward = (row.reward ?? {}) as Record<string, unknown>;
    return reply.send({
      code,
      kind: "redemption",
      status: "redeemed",
      redeemedAt: new Date((row.usedAt as string) ?? Date.now()).toISOString(),
      reward: { code: (reward.code as string | null) ?? null, name: String(reward.name ?? "") },
    });
  }

  const redeemed = await markRewardAsRedeemed(code, orgId);
  const row = redeemed as unknown as Record<string, unknown>;
  const reward = (row.reward ?? {}) as Record<string, unknown>;
  return reply.send({
    code,
    kind: "issued_reward",
    status: "redeemed",
    redeemedAt: new Date((row.redeemedAt as string) ?? Date.now()).toISOString(),
    reward: { code: (reward.code as string | null) ?? null, name: String(reward.name ?? "") },
  });
}
