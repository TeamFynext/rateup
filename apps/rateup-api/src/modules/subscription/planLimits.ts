import type { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../utils/prisma.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import { getConversationBudget } from "./conversationBudget.js";
import { isUnlimitedAllowance } from "./subscription.data.js";
import { getSubscription } from "./subscription.service.js";

/**
 * The number at `path` in a stored features blob, or undefined when nothing is metered.
 *
 * Three stored values mean "no ceiling": absent, zero (the convention the upload gate
 * already uses), and the unlimited sentinel every Enterprise count carries. The sentinel
 * case is the load-bearing one — an Enterprise account can also be contracted to a real
 * number, and that number IS enforced; only the sentinel itself is not.
 */
export function planAllowance(features: unknown, path: string): number | undefined {
  const max = getNestedProperty<number>(features as object, path);
  if (typeof max !== "number" || max <= 0 || isUnlimitedAllowance(max)) return undefined;
  return max;
}

/**
 * Every count a plan can cap, in one place.
 *
 * Four, and only four: teams, users, conversations and monthly form responses. They are
 * what the plans actually sell, and every one of them is a number on the pricing page.
 *
 * There used to be five more — campaigns, automated replies, Flows, templates and loyalty
 * registrations — each with its own hand-written gate, all reading a `whatsapp.count.max`
 * that no tier has ever defined. They metered nothing, and pricing does not cap those
 * features, so they were deleted rather than wired up: a gate that enforces nothing is
 * worse than none, because it reads in review as though the limit is handled.
 *
 * The gates that remain had drifted apart in every way a gate can: some read the stored
 * number raw, some went through `planAllowance`; some counted per team where the plan
 * sells per org; some were commented-out stubs. The rules that matter — what "unlimited"
 * means, when an allowance is not metered, what the refusal says — now live here once,
 * and a new limit is a row in this table rather than another preHandler.
 *
 * A definition is deliberately small: where the ceiling is stored, what to call the thing
 * in the refusal, and how to count what the org has already spent.
 */
export interface PlanLimitDefinition {
  /** Dotted path to the ceiling inside the stored features blob. */
  path: string;
  /** Noun for the refusal: "maximum limit of 3 teams". */
  noun: { one: string; many: string };
  /** What the org has spent against this limit. */
  used: (orgId: string) => Promise<number>;
  /**
   * Overrides how the ceiling is derived, for a limit whose stored number is not the
   * whole answer. Conversations are the only one today: bought packs raise it and an
   * annual plan pools twelve months of it.
   */
  ceiling?: (orgId: string) => Promise<number | undefined>;
}

/**
 * The org's seats: people on a team, plus invitations still outstanding.
 *
 * Counted across the whole org and over distinct users rather than TeamMember rows — the
 * plan sells "10 users", so ten seats spread over three teams is the limit reached, and
 * one person on two teams is one seat.
 */
export async function seatsInUse(orgId: string): Promise<number> {
  const [members, pending] = await Promise.all([
    prisma.teamMember.findMany({
      where: { team: { orgId } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.invitation.findMany({
      where: { orgId, status: "PENDING" },
      select: { email: true },
      distinct: ["email"],
    }),
  ]);

  if (pending.length === 0) return members.length;

  // An invitation is a seat being held, but a pending one addressed to someone already on
  // a team in this org is not a second seat — resending or cross-team invites would
  // otherwise lock an org out of its own allowance.
  const memberIds = new Set(members.map((member) => member.userId));
  const invitedUsers = await prisma.user.findMany({
    where: { email: { in: pending.map((invite) => invite.email) } },
    select: { id: true, email: true },
  });
  const alreadyCounted = new Set(
    invitedUsers.filter((user) => memberIds.has(user.id)).map((user) => user.email),
  );

  return members.length + pending.filter((invite) => !alreadyCounted.has(invite.email)).length;
}

export const PLAN_LIMITS = {
  teams: {
    path: "team.count.max",
    noun: { one: "team", many: "teams" },
    used: (orgId) => prisma.team.count({ where: { orgId } }),
  },
  users: {
    path: "team.teamMember.count.max",
    noun: { one: "user", many: "users" },
    used: seatsInUse,
  },
  /**
   * The metered 24h conversation windows. The only limit whose ceiling is not simply the
   * stored number: `getConversationBudget` adds packs the org has bought and multiplies
   * out an annual pool, and the send gate has always measured against that.
   */
  conversations: {
    path: "whatsapp.conversation.count.max",
    noun: { one: "conversation", many: "conversations" },
    used: async (orgId) => (await getConversationBudget(orgId)).used,
    ceiling: async (orgId) => (await getConversationBudget(orgId)).max,
  },
  formResponses: {
    path: "webSurvey.count.monthlyResponseLimit",
    noun: { one: "form response", many: "form responses" },
    used: async (orgId) => {
      const usage = await prisma.usageStats.findUnique({
        where: { orgId },
        select: { monthlySurveyResponses: true },
      });
      return usage?.monthlySurveyResponses ?? 0;
    },
  },
} as const satisfies Record<string, PlanLimitDefinition>;

export type PlanLimitName = keyof typeof PLAN_LIMITS;

export interface PlanLimitStatus {
  /** False when this plan caps nothing here — absent, zero, or the unlimited sentinel. */
  metered: boolean;
  max?: number;
  used: number;
  /** What is left, floored at zero. Undefined when not metered. */
  remaining?: number;
  /** True when one more would go past the ceiling. */
  exceeded: boolean;
}

const NOT_METERED: PlanLimitStatus = { metered: false, used: 0, exceeded: false };

/**
 * Where an org stands against one limit.
 *
 * `features` is the stored blob when the caller already has it — a route gate does, since
 * `getVerifySubscriptionHandler` puts it on the request — and is loaded otherwise. It is
 * always the ORG's own blob rather than its tier's, which is what makes a contracted
 * Enterprise ceiling enforceable everywhere: the tier says unlimited, the subscription
 * says 200,000, and the number that binds is the one on the subscription.
 */
export async function checkPlanLimit(
  orgId: string,
  name: PlanLimitName,
  features?: unknown,
): Promise<PlanLimitStatus> {
  const limit: PlanLimitDefinition = PLAN_LIMITS[name];

  let max: number | undefined;
  if (limit.ceiling) {
    // The override reads whatever it needs itself, so the blob is never fetched here —
    // conversations would otherwise cost a second subscription query on every send.
    max = await limit.ceiling(orgId);
  } else {
    const blob = features ?? (await getSubscription(orgId))?.features;
    // No subscription to compare against: nothing is enforced, rather than everything
    // being refused over bookkeeping the customer cannot fix.
    if (!blob) return NOT_METERED;
    max = planAllowance(blob, limit.path);
  }
  if (max === undefined) return NOT_METERED;

  const used = await limit.used(orgId);

  return { metered: true, max, used, remaining: Math.max(max - used, 0), exceeded: used >= max };
}

/** The refusal, so the route gate, the service backstop and the UI all say the same thing. */
export function planLimitMessage(name: PlanLimitName, max: number): string {
  const { noun } = PLAN_LIMITS[name];
  return `You have reached the maximum limit of ${max} ${max === 1 ? noun.one : noun.many}.`;
}

/** Thrown by {@link assertPlanLimit} so a service can refuse the way a route does. */
export class PlanLimitError extends Error {
  statusCode = 403;
  constructor(
    public readonly limit: PlanLimitName,
    message: string,
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

/**
 * Throws when the org has no room left.
 *
 * For the paths a route gate does not cover: a service reached from an integration, a
 * worker, or anywhere else with no preHandler in front of it. A limit that lives only on
 * a route is one integration away from not existing.
 */
export async function assertPlanLimit(orgId: string, name: PlanLimitName, features?: unknown) {
  const status = await checkPlanLimit(orgId, name, features);
  if (status.exceeded) {
    throw new PlanLimitError(name, planLimitMessage(name, status.max ?? 0));
  }
}

export interface EnforceOptions {
  /**
   * Which org to meter, when the request body names one. Returning null refuses: both the
   * team and invite bodies carry a client-supplied `orgId` while the subscription on the
   * request is the session's, so a request naming another org would be measured against
   * an allowance it does not spend — a limit anyone could step around by editing a field.
   */
  org?: (request: FastifyRequest) => string | null;
  /** The refusal when `org` returns null. */
  orgMismatchMessage?: string;
}

/**
 * A preHandler that refuses the request when the org is at its limit.
 *
 * Reads the features off `request.subscription`, so it must be registered after
 * `getVerifySubscriptionHandler` — every route that has one of these already is.
 */
export function enforcePlanLimit(name: PlanLimitName, options: EnforceOptions = {}) {
  return async function enforce(request: FastifyRequest, reply: FastifyReply) {
    const orgId = options.org ? options.org(request) : request.user.orgId;
    if (!orgId) {
      return reply.code(403).send({
        message: options.orgMismatchMessage ?? "You cannot do that in another organisation",
        displayMessageInClient: true,
      });
    }

    // Every route carrying one of these gates registers `getVerifySubscriptionHandler`
    // first, so a missing subscription here means the chain is wired wrong rather than
    // that the org has no limits. Refused rather than waved through, which is what the
    // WhatsApp gates have always done.
    if (!request.subscription) {
      return reply.code(403).send({
        message: "Subscription not found",
        displayMessageInClient: true,
      });
    }

    const status = await checkPlanLimit(orgId, name, request.subscription.features);
    if (!status.exceeded) return;

    return reply.code(403).send({
      message: planLimitMessage(name, status.max ?? 0),
      displayMessageInClient: true,
    });
  };
}
