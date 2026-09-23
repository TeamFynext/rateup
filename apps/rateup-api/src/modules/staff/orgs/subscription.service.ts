import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import merge from "lodash/merge.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { addonExpiryFrom } from "../../subscription/addons.js";
import { CONVERSATION_ADDON } from "../../subscription/catalog.js";
import { hasContractedCap, isUnlimitedAllowance } from "../../subscription/subscription.data.js";
import { applyPlanToOrg } from "../../subscription/subscription.service.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";
import type {
  AddonGrantInput,
  ExpiryChangeInput,
  FeatureOverrideInput,
  PlanChangeInput,
  ReasonOnlyInput,
} from "./subscription.schema.js";

/*
 * The subscription changes staff make by hand. Each one runs in a transaction with its
 * audit row, so a change is never saved without the record of who made it and why.
 */

const orgNotFound = () => new StaffHttpError(404, "ORG_NOT_FOUND", "Organisation not found.");
const noSubscription = () =>
  new StaffHttpError(409, "NO_SUBSCRIPTION", "This organisation has no subscription to change.");

const subscriptionSelect = {
  features: true,
  expiresAt: true,
  subscriptionRef: true,
  basePlan: { select: { id: true, name: true, displayName: true, features: true } },
} satisfies Prisma.SubscriptionSelect;

async function loadOrg(db: Prisma.TransactionClient | typeof prisma, orgId: string) {
  const org = await db.org.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, Subscription: { select: subscriptionSelect } },
  });
  if (!org) throw orgNotFound();
  return org;
}

type LoadedSubscription = NonNullable<Awaited<ReturnType<typeof loadOrg>>["Subscription"]>;

/** What the audit row stores as before / after: enough to put it back by hand. */
function snapshot(subscription: LoadedSubscription) {
  return {
    planId: subscription.basePlan?.id ?? null,
    plan: subscription.basePlan ? planName(subscription.basePlan) : null,
    expiresAt: subscription.expiresAt,
    features: subscription.features,
  };
}

const planName = (plan: { name: string; displayName: string | null }) =>
  plan.displayName ?? plan.name;

/** The subscription as the plan editor needs it: what the org has, and what its tier gives. */
export async function getOrgSubscription(orgId: string) {
  const org = await loadOrg(prisma, orgId);
  const subscription = org.Subscription;
  if (!subscription) return null;
  const tierFeatures = subscription.basePlan?.features ?? null;
  return {
    plan: subscription.basePlan
      ? { id: subscription.basePlan.id, name: planName(subscription.basePlan) }
      : null,
    expiresAt: subscription.expiresAt,
    gatewayRef: subscription.subscriptionRef,
    features: subscription.features,
    planFeatures: tierFeatures,
    contractedCap: hasContractedCap(tierFeatures, subscription.features),
  };
}

export async function changeOrgPlan(
  request: FastifyRequest,
  orgId: string,
  input: PlanChangeInput,
) {
  const plan = await prisma.rateupPlan.findUnique({
    where: { id: input.rateupPlanId },
    select: { id: true, name: true, displayName: true, planType: true, features: true },
  });
  if (!plan) throw new StaffHttpError(404, "PLAN_NOT_FOUND", "That plan no longer exists.");
  if (plan.planType !== "BASE") {
    throw new StaffHttpError(
      422,
      "NOT_A_BASE_PLAN",
      "Add-on packs are granted, not set as a plan.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const org = await loadOrg(tx, orgId);
    const before = org.Subscription ? snapshot(org.Subscription) : null;

    await applyPlanToOrg(tx, orgId, plan, {
      expiresAt: input.expiresAt,
      preserveContractedCaps: input.preserveContractedCaps,
      currentFeatures: org.Subscription?.features ?? null,
    });
    const after = await loadOrg(tx, orgId);

    await recordStaffAction(tx, request, {
      action: "subscription.plan_change",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.reason,
      before,
      after: snapshot(after.Subscription!),
    });
    return { plan: planName(plan), expiresAt: input.expiresAt };
  });
}

export async function changeOrgExpiry(
  request: FastifyRequest,
  orgId: string,
  input: ExpiryChangeInput,
) {
  return prisma.$transaction(async (tx) => {
    const org = await loadOrg(tx, orgId);
    if (!org.Subscription) throw noSubscription();

    await tx.subscription.update({
      where: { orgId },
      data: { expiresAt: input.expiresAt },
    });
    await recordStaffAction(tx, request, {
      action: "subscription.expiry_change",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.reason,
      before: { expiresAt: org.Subscription.expiresAt },
      after: { expiresAt: input.expiresAt },
    });
    return { expiresAt: input.expiresAt };
  });
}

/**
 * Replaces the org's limits and feature switches. Keys the typed schema does not know are
 * kept from what was stored, so an older blob loses nothing it had.
 */
export async function overrideOrgFeatures(
  request: FastifyRequest,
  orgId: string,
  input: FeatureOverrideInput,
) {
  return prisma.$transaction(async (tx) => {
    const org = await loadOrg(tx, orgId);
    if (!org.Subscription) throw noSubscription();

    const features = merge(
      {},
      org.Subscription.features as object,
      input.features,
    ) as Prisma.InputJsonObject;
    await tx.subscription.update({
      where: { orgId },
      data: { features, lastLimitAlertSentAt: null },
    });
    await recordStaffAction(tx, request, {
      action: "subscription.features_override",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.reason,
      before: { features: org.Subscription.features },
      after: { features },
    });
    return { features };
  });
}

/** Marks a pack as granted by staff: it carries the audit row's id instead of a payment. */
const STAFF_REF_PREFIX = "staff:";

export async function grantAddonPacks(
  request: FastifyRequest,
  orgId: string,
  input: AddonGrantInput,
  now = new Date(),
) {
  const addonPlan = await prisma.rateupPlan.findFirst({
    where: { name: CONVERSATION_ADDON.name, planType: "ADDON" },
    select: { id: true },
  });
  if (!addonPlan) {
    throw new StaffHttpError(409, "ADDON_MISSING", "The conversation pack is not in the catalog.");
  }

  return prisma.$transaction(async (tx) => {
    const org = await loadOrg(tx, orgId);
    if (!org.Subscription) throw noSubscription();
    const planMax = (
      org.Subscription.features as {
        whatsapp?: { conversation?: { count?: { max?: number } } };
      } | null
    )?.whatsapp?.conversation?.count?.max;
    // Packs only raise a metered allowance (see getConversationAllowance); on an uncapped
    // plan the pack would be recorded and count for nothing.
    if (planMax === undefined || planMax <= 0 || isUnlimitedAllowance(planMax)) {
      throw new StaffHttpError(
        422,
        "ADDON_NOT_APPLICABLE",
        "This plan's conversations are not metered, so a pack would add nothing.",
      );
    }

    const auditId = randomUUID();
    const expiresAt = input.expiresAt ?? addonExpiryFrom(now);
    const pack = await tx.subscriptionAddon.create({
      data: {
        orgId,
        addonPlanId: addonPlan.id,
        quantity: input.quantity,
        paymentRef: `${STAFF_REF_PREFIX}${auditId}`,
        expiresAt,
      },
      select: { id: true, quantity: true, expiresAt: true },
    });
    await recordStaffAction(tx, request, {
      id: auditId,
      action: "addon.grant",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.reason,
      after: {
        ...pack,
        conversations: pack.quantity * CONVERSATION_ADDON.conversations,
      },
    });
    return pack;
  });
}

/**
 * Ends a staff-granted pack now. The row stays, so the grant is still on record. A pack the
 * customer paid for is refunded in the gateway, not here.
 */
export async function revokeAddonPack(
  request: FastifyRequest,
  orgId: string,
  addonId: string,
  input: ReasonOnlyInput,
  now = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    const org = await loadOrg(tx, orgId);
    const pack = await tx.subscriptionAddon.findFirst({
      where: { id: addonId, orgId },
      select: { id: true, quantity: true, expiresAt: true, paymentRef: true },
    });
    if (!pack) throw new StaffHttpError(404, "ADDON_NOT_FOUND", "That pack does not exist.");
    if (!pack.paymentRef?.startsWith(STAFF_REF_PREFIX)) {
      throw new StaffHttpError(
        409,
        "ADDON_PAID",
        "The customer paid for this pack. Refund it in the payment gateway instead.",
      );
    }
    if (pack.expiresAt <= now) {
      throw new StaffHttpError(409, "ADDON_EXPIRED", "This pack has already run out.");
    }

    await tx.subscriptionAddon.update({ where: { id: pack.id }, data: { expiresAt: now } });
    await recordStaffAction(tx, request, {
      action: "addon.revoke",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.reason,
      before: { id: pack.id, quantity: pack.quantity, expiresAt: pack.expiresAt },
      after: { id: pack.id, quantity: pack.quantity, expiresAt: now },
    });
    return { id: pack.id, expiresAt: now };
  });
}
