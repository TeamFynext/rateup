import { PlatformType } from "../../../../generated/prisma/enums.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { isRoleKey, legacyRoleToKey, ROLES } from "../../../authz/roles.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getOrgInvoices } from "../../payment/payment.service.js";
import { getMessageStatsByOrgId } from "../../subscription/subscription.service.js";
import { getConversationBudget } from "../../subscription/conversationBudget.js";
import { checkPlanLimit, planAllowance, PLAN_LIMITS } from "../../subscription/planLimits.js";
import { StaffHttpError } from "../staff.errors.js";
import { channelsMatchingDigits, lastActiveByOrg } from "../staff.lookup.js";
import { asPhoneDigits, asUuid, pageArgs, type Page } from "../staff.schema.js";
import type { OrgListQuery, UsageDays } from "./orgs.schema.js";

const DAY_MS = 24 * 60 * 60_000;

const orgNotFound = () => new StaffHttpError(404, "ORG_NOT_FOUND", "Organisation not found.");

export type SubscriptionStatus = "active" | "expired" | "no_plan";

export function subscriptionStatus(
  subscription: { expiresAt: Date } | null | undefined,
  now = new Date(),
): SubscriptionStatus {
  if (!subscription) return "no_plan";
  return subscription.expiresAt > now ? "active" : "expired";
}

/**
 * The org filter the list and its count share. Free text matches the org's name, a pasted
 * org id, its owner's or any member's email and name, or a WhatsApp number / WABA id.
 */
export async function orgListWhere(
  query: Partial<Omit<OrgListQuery, "page" | "pageSize" | "sort" | "order">>,
  now = new Date(),
): Promise<Prisma.OrgWhereInput> {
  const and: Prisma.OrgWhereInput[] = [];

  if (query.q) {
    const id = asUuid(query.q);
    const digits = asPhoneDigits(query.q);
    if (id) {
      and.push({ id });
    } else {
      const text = { contains: query.q, mode: "insensitive" as const };
      const or: Prisma.OrgWhereInput[] = [
        { name: text },
        { owner: { OR: [{ email: text }, { name: text }] } },
        { members: { some: { user: { OR: [{ email: text }, { name: text }] } } } },
      ];
      if (digits) {
        const channels = await channelsMatchingDigits(digits, 200);
        if (channels.length) or.push({ id: { in: channels.map((c) => c.orgId) } });
      }
      and.push({ OR: or });
    }
  }

  switch (query.status) {
    case "active":
      and.push({ Subscription: { is: { expiresAt: { gt: now } } } });
      break;
    case "expired":
      and.push({ Subscription: { is: { expiresAt: { lte: now } } } });
      break;
    case "no_plan":
      and.push({ Subscription: { is: null } });
      break;
    case "paused":
      and.push({ isPaused: true });
      break;
    case "suspended":
      and.push({ suspendedAt: { not: null } });
      break;
    case "paid":
      and.push({
        Subscription: { is: { expiresAt: { gt: now }, basePlan: { is: { price: { gt: 0 } } } } },
      });
      break;
  }

  if (query.planId) and.push({ Subscription: { is: { basePlanId: query.planId } } });
  if (query.expiringInDays) {
    const until = new Date(now.getTime() + query.expiringInDays * DAY_MS);
    and.push({ Subscription: { is: { expiresAt: { gt: now, lte: until } } } });
  }
  if (query.createdWithinDays) {
    and.push({ createdAt: { gte: new Date(now.getTime() - query.createdWithinDays * DAY_MS) } });
  }

  return and.length ? { AND: and } : {};
}

function orgListOrder(
  query: Pick<OrgListQuery, "sort" | "order">,
): Prisma.OrgOrderByWithRelationInput[] {
  const { order } = query;
  switch (query.sort) {
    case "name":
      return [{ name: order }, { id: "asc" }];
    case "expires":
      return [{ Subscription: { expiresAt: order } }, { id: "asc" }];
    case "conversations":
      return [{ UsageStats: { monthlyMeteredConversationsCount: order } }, { id: "asc" }];
    default:
      return [{ createdAt: order }, { id: "asc" }];
  }
}

const orgRowSelect = {
  id: true,
  name: true,
  logo: true,
  createdAt: true,
  isPaused: true,
  suspendedAt: true,
  suspendedReason: true,
  owner: { select: { id: true, name: true, email: true } },
  Subscription: {
    select: {
      expiresAt: true,
      features: true,
      isAnnualMessageLimit: true,
      basePlan: { select: { id: true, name: true, displayName: true, price: true } },
    },
  },
  UsageStats: {
    select: { monthlyMeteredConversationsCount: true, annualMeteredConversationsCount: true },
  },
  _count: { select: { members: true } },
} satisfies Prisma.OrgSelect;

type OrgRowRecord = Prisma.OrgGetPayload<{ select: typeof orgRowSelect }>;

export interface OrgRow {
  id: string;
  name: string;
  logo: string | null;
  createdAt: Date;
  pausedByCustomer: boolean;
  /** Switched off by RateUp staff. `pausedByCustomer` is the customer's own pause. */
  suspendedAt: Date | null;
  suspendedReason: string | null;
  owner: { id: string; name: string | null; email: string };
  plan: { id: string; name: string; paid: boolean } | null;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  members: number;
  /**
   * This period's metered conversations against the plan's own ceiling. Packs are left
   * out here (one query per row); the org's usage tab shows the full budget.
   */
  conversations: { used: number; max: number | null };
  lastActiveAt: Date | null;
}

function toOrgRow(org: OrgRowRecord, lastActive: Date | undefined, now: Date): OrgRow {
  const subscription = org.Subscription;
  const plan = subscription?.basePlan;
  const annual = Boolean(subscription?.isAnnualMessageLimit);
  const monthlyMax = subscription
    ? planAllowance(subscription.features, PLAN_LIMITS.conversations.path)
    : undefined;
  return {
    id: org.id,
    name: org.name,
    logo: org.logo,
    createdAt: org.createdAt,
    pausedByCustomer: Boolean(org.isPaused),
    suspendedAt: org.suspendedAt,
    suspendedReason: org.suspendedReason,
    owner: org.owner,
    plan: plan
      ? { id: plan.id, name: plan.displayName ?? plan.name, paid: Number(plan.price ?? 0) > 0 }
      : null,
    status: subscriptionStatus(subscription, now),
    expiresAt: subscription?.expiresAt ?? null,
    members: org._count.members,
    conversations: {
      used:
        (annual
          ? org.UsageStats?.annualMeteredConversationsCount
          : org.UsageStats?.monthlyMeteredConversationsCount) ?? 0,
      max: monthlyMax === undefined ? null : annual ? monthlyMax * 12 : monthlyMax,
    },
    lastActiveAt: lastActive ?? null,
  };
}

export async function listOrgs(query: OrgListQuery, now = new Date()): Promise<Page<OrgRow>> {
  const where = await orgListWhere(query, now);
  const [orgs, total] = await Promise.all([
    prisma.org.findMany({
      where,
      select: orgRowSelect,
      orderBy: orgListOrder(query),
      ...pageArgs(query),
    }),
    prisma.org.count({ where }),
  ]);
  const lastActive = await lastActiveByOrg(orgs.map((org) => org.id));
  return {
    data: orgs.map((org) => toOrgRow(org, lastActive.get(org.id), now)),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

/** The plans an org can be filtered by: every base tier, cheapest first. */
export async function listPlanOptions() {
  const plans = await prisma.rateupPlan.findMany({
    where: { planType: "BASE" },
    select: { id: true, name: true, displayName: true, price: true, features: true },
    orderBy: [{ price: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.displayName ?? plan.name,
    paid: Number(plan.price ?? 0) > 0,
    // For the plan picker's before / after comparison.
    features: plan.features,
  }));
}

export async function getOrgSummary(orgId: string, now = new Date()) {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: {
      ...orgRowSelect,
      phone: true,
      address: true,
      onboarding: true,
      onboardingCompleted: true,
      deletionMailSent: true,
      Subscription: {
        select: {
          ...orgRowSelect.Subscription.select,
          renewedAt: true,
          createdAt: true,
          subscriptionRef: true,
          lastLimitAlertSentAt: true,
        },
      },
      _count: {
        select: {
          members: true,
          teams: true,
          templates: true,
          WhatsappSettings: true,
          invitations: { where: { status: "PENDING" } },
        },
      },
    },
  });
  if (!org) throw orgNotFound();

  const lastActive = await lastActiveByOrg([org.id]);
  const onboarding = (org.onboarding ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" && value ? value : null);
  const subscription = org.Subscription;

  return {
    ...toOrgRow(org, lastActive.get(org.id), now),
    phone: org.phone,
    address: org.address,
    industry: text(onboarding.industry),
    website: text(onboarding.website),
    location: text(onboarding.location),
    onboardingCompleted: org.onboardingCompleted,
    deletionWarningSentAt: org.deletionMailSent,
    subscription: subscription
      ? {
          startedAt: subscription.createdAt,
          renewedAt: subscription.renewedAt,
          expiresAt: subscription.expiresAt,
          annualAllowance: subscription.isAnnualMessageLimit,
          gatewayRef: subscription.subscriptionRef,
          limitAlertSentAt: subscription.lastLimitAlertSentAt,
        }
      : null,
    counts: {
      members: org._count.members,
      teams: org._count.teams,
      pendingInvites: org._count.invitations,
      channels: org._count.WhatsappSettings,
      templates: org._count.templates,
    },
  };
}

async function assertOrgExists(orgId: string) {
  const org = await prisma.org.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org) throw orgNotFound();
  return org;
}

export async function getOrgMembers(orgId: string) {
  const { ownerId } = await assertOrgExists(orgId);
  const [members, teams, invitations] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        role: true,
        roleKey: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePhoto: true,
            active: true,
            isPaused: true,
            lastLoggedInAt: true,
            teamMember: {
              where: { team: { orgId } },
              select: { team: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.team.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        color: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.invitation.findMany({
      where: { orgId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true, invitedBy: true },
    }),
  ]);

  return {
    members: members.map((member) => {
      const isOwner = member.user.id === ownerId;
      const roleKey =
        member.roleKey && isRoleKey(member.roleKey)
          ? member.roleKey
          : legacyRoleToKey(member.role, isOwner);
      return {
        id: member.id,
        joinedAt: member.createdAt,
        role: ROLES[roleKey].label,
        roleKey,
        isOwner,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          phone: member.user.phone,
          avatarUrl: member.user.profilePhoto,
          active: member.user.active,
          paused: Boolean(member.user.isPaused),
          lastLoginAt: member.user.lastLoggedInAt,
        },
        teams: member.user.teamMember.map((entry) => entry.team),
      };
    }),
    teams: teams.map(({ _count, ...team }) => ({ ...team, members: _count.members })),
    invitations,
  };
}

export type DailyConversations = { date: string; conversations: number }[];

/** Metered conversations opened per UTC day over the last `days` days, today included. */
export async function dailyConversations(
  orgId: string,
  days: number,
  now = new Date(),
): Promise<DailyConversations> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = new Date(today - (days - 1) * DAY_MS);
  // "openedAt" is a timestamp without time zone holding UTC, so date_trunc buckets by UTC day.
  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>`
    SELECT to_char(date_trunc('day', "openedAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "MeteredConversation"
    WHERE "orgId" = ${orgId}::uuid AND "openedAt" >= ${start}
    GROUP BY 1`;
  const counts = new Map(rows.map((row) => [row.day, Number(row.count)]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, conversations: counts.get(date) ?? 0 };
  });
}

/** The four plan limits as the gates see them, plus the raw counters behind them. */
export async function getOrgUsage(orgId: string, days: UsageDays = 30, now = new Date()) {
  await assertOrgExists(orgId);
  const [teams, users, conversations, formResponses, budget, usage, packs, daily] =
    await Promise.all([
      checkPlanLimit(orgId, "teams"),
      checkPlanLimit(orgId, "users"),
      checkPlanLimit(orgId, "conversations"),
      checkPlanLimit(orgId, "formResponses"),
      getConversationBudget(orgId),
      prisma.usageStats.findUnique({ where: { orgId } }),
      prisma.subscriptionAddon.findMany({
        where: { orgId, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "asc" },
        select: {
          id: true,
          quantity: true,
          expiresAt: true,
          createdAt: true,
          paymentRef: true,
          addon: { select: { name: true, displayName: true } },
        },
      }),
      dailyConversations(orgId, days, now),
    ]);

  return {
    limits: { teams, users, conversations, formResponses },
    conversationPeriod: budget.isAnnual ? "annual" : "monthly",
    daily,
    packs: packs.map((pack) => ({
      id: pack.id,
      name: pack.addon.displayName ?? pack.addon.name,
      quantity: pack.quantity,
      expiresAt: pack.expiresAt,
      boughtAt: pack.createdAt,
      paymentRef: pack.paymentRef,
    })),
    counters: usage
      ? {
          updatedAt: usage.updatedAt,
          lastMonthlyReset: usage.lastMonthlyResettedDate,
          messages: usage.messagesCount,
          templateMessagesThisMonth: usage.monthlyTemplateMessageCount,
          inboxConversationsThisMonth: usage.monthlyConversationsCount,
          meteredConversationsThisMonth: usage.monthlyMeteredConversationsCount,
          meteredConversationsThisYear: usage.annualMeteredConversationsCount,
          formResponsesThisMonth: usage.monthlySurveyResponses,
          whatsappSurveyResponsesThisMonth: usage.monthlyWaSurveyResponses,
          automationTriggersThisMonth: usage.monthlyAutomationTriggerCount,
          campaigns: usage.waAutomationCount,
          aiTokens: usage.aiPromptTokensCount + usage.aiCompletionTokensCount,
        }
      : null,
  };
}

/**
 * Connected channels of every platform, one per `Channel` row, with no token, secret or key in
 * the selection. Kept in the console's row shape: WhatsApp numbers carry their settings
 * (`type` Automated/Manual), every other platform's `type` is its platform.
 */
export async function getOrgChannels(orgId: string) {
  await assertOrgExists(orgId);
  const channels = await prisma.channel.findMany({
    where: { orgId },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      platform: true,
      accountId: true,
      address: true,
      name: true,
      username: true,
      status: true,
      createdAt: true,
      whatsapp: {
        select: { type: true, wabaId: true, messagesPerSecond: true, paymentMethod: true },
      },
    },
  });
  return channels.map(({ whatsapp, platform, accountId, address, name, username, ...channel }) => {
    const instagram = platform === PlatformType.INSTAGRAM;
    const facebook = platform === PlatformType.FACEBOOK;
    return {
      ...channel,
      platform,
      accountId,
      type: whatsapp?.type ?? platform,
      phone: whatsapp ? address : null,
      phoneDisplayName: whatsapp ? name : null,
      phoneId: whatsapp ? accountId : null,
      wabaId: whatsapp?.wabaId ?? null,
      messagesPerSecond: whatsapp?.messagesPerSecond ?? null,
      paymentMethod: whatsapp?.paymentMethod ?? null,
      fbPageId: facebook ? accountId : null,
      fbUserName: facebook ? name : null,
      ibaId: instagram ? accountId : null,
      igUserName: instagram ? username : null,
      igDisplayName: instagram ? name : null,
    };
  });
}

/** Razorpay invoices, read live per subscription (the gateway keeps them; we do not). */
export async function getOrgInvoicesForStaff(orgId: string) {
  await assertOrgExists(orgId);
  try {
    return await getOrgInvoices(orgId);
  } catch (err) {
    log.warn({ err, orgId }, "staff: invoices could not be read from Razorpay");
    throw new StaffHttpError(
      502,
      "GATEWAY_ERROR",
      "Razorpay did not answer. Try again in a minute.",
    );
  }
}

const DEFAULT_STATS_DAYS = 30;
/** The count scans the org's messages, so one request is held to a year. */
const MAX_STATS_DAYS = 366;

/** Template messages sent between two dates (inclusive), last 30 days by default. */
export async function getOrgMessageStats(
  orgId: string,
  range: { from?: Date; to?: Date },
  now = new Date(),
) {
  await assertOrgExists(orgId);
  const to = range.to ?? now;
  const from = range.from ?? new Date(to.getTime() - (DEFAULT_STATS_DAYS - 1) * DAY_MS);
  if (from > to)
    throw new StaffHttpError(400, "VALIDATION", "The start date is after the end date.");
  if (to.getTime() - from.getTime() > MAX_STATS_DAYS * DAY_MS) {
    throw new StaffHttpError(400, "VALIDATION", "Pick a range of a year or less.");
  }
  const dateRange = `${from.toISOString().slice(0, 10)},${to.toISOString().slice(0, 10)}`;
  const result = await getMessageStatsByOrgId(orgId, { dateRange });
  return { from, to, templateMessages: result?.count ?? 0 };
}

/**
 * What the org's own people did (their AuditLog), or what RateUp staff did to it
 * (StaffAuditLog), newest first.
 */
export async function getOrgActivity(
  orgId: string,
  query: { source: "customer" | "staff"; page: number; pageSize: number },
) {
  await assertOrgExists(orgId);
  if (query.source === "staff") {
    const where = { targetOrgId: orgId };
    const [rows, total] = await Promise.all([
      prisma.staffAuditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...pageArgs(query),
        select: { id: true, createdAt: true, action: true, staffEmail: true, reason: true },
      }),
      prisma.staffAuditLog.count({ where }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      data: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        action: row.action,
        actor: row.staffEmail,
        detail: row.reason,
      })),
    };
  }

  const where = { orgId };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      ...pageArgs(query),
      select: {
        id: true,
        createdAt: true,
        action: true,
        method: true,
        route: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    data: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      action: row.action,
      actor: row.user.name ? `${row.user.name} (${row.user.email})` : row.user.email,
      detail: `${row.method} ${row.route}`,
    })),
  };
}
