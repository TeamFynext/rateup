import { Prisma, WaCallStatus } from "../../../generated/prisma/client.js";
import type { Actor } from "../../../authz/actor.js";
import prisma from "../../../utils/prisma.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import type { CallAnalyticsQuery, CallLogQuery } from "./calling.schema.js";
import type { CallDto } from "./calling.types.js";

/**
 * The call log and call analytics behind WhatsApp → Calls.
 *
 * Both read only `WaCall`, scoped the way the inbox is: an org-wide role sees every
 * number, a team-scoped one only the numbers its teams reach, and a member limited to
 * their own chats only the calls they answered or placed.
 */

interface CallScope {
  /** Null means every number in the org. */
  phoneIds: string[] | null;
  /** Set for members limited to their own chats. */
  ownUserId: string | null;
}

async function callScope(actor: Actor): Promise<CallScope> {
  const ownUserId = actor.scope.inbox === "assigned_only" ? (actor.userId ?? "") : null;
  const scope = await getChannelScope(actor);
  if (scope.all) return { phoneIds: null, ownUserId };
  const numbers = await prisma.whatsappSettings.findMany({
    where: { orgId: actor.orgId, channelId: { in: Array.from(scope.ids) }, phoneId: { not: null } },
    select: { phoneId: true },
  });
  return { phoneIds: numbers.flatMap((n) => (n.phoneId ? [n.phoneId] : [])), ownUserId };
}

function scopeWhere(actor: Actor, scope: CallScope, phoneId?: string): Prisma.WaCallWhereInput {
  const phones = phoneId
    ? scope.phoneIds === null || scope.phoneIds.includes(phoneId)
      ? [phoneId]
      : []
    : scope.phoneIds;
  return {
    orgId: actor.orgId,
    ...(phones !== null && { phoneId: { in: phones } }),
    ...(scope.ownUserId !== null && {
      OR: [{ answeredById: scope.ownUserId }, { initiatedById: scope.ownUserId }],
    }),
  };
}

// ---------------------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------------------

export interface CallLogRow extends CallDto {
  contactPhone: string | null;
  /** The agent who took or placed the call. */
  agentId: string | null;
  agentName: string | null;
  /** Seconds from the first ring to pickup. */
  ringSeconds: number | null;
}

/** Outcome filter → statuses. "missed" includes calls nobody picked up and failures. */
const OUTCOME_STATUSES: Record<NonNullable<CallLogQuery["outcome"]>, WaCallStatus[]> = {
  answered: [WaCallStatus.COMPLETED, WaCallStatus.ACCEPTED],
  missed: [WaCallStatus.MISSED],
  declined: [WaCallStatus.REJECTED],
  failed: [WaCallStatus.FAILED],
};

/** Keyset cursor: the last row's createdAt and id, so new calls never shift a page. */
const encodeCursor = (createdAt: Date, id: string) =>
  Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const createdAt = new Date(at ?? "");
  return id && !Number.isNaN(createdAt.getTime()) ? { createdAt, id } : null;
}

export async function getCallLog(
  actor: Actor,
  query: CallLogQuery,
): Promise<{ items: CallLogRow[]; nextCursor: string | null }> {
  const scope = await callScope(actor);
  const limit = query.limit ?? 50;
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const search = query.search?.trim();

  const rows = await prisma.waCall.findMany({
    where: {
      AND: [
        scopeWhere(actor, scope, query.phoneId),
        { createdAt: { gte: query.from, lte: query.to } },
        query.direction ? { direction: query.direction } : {},
        query.outcome ? { status: { in: OUTCOME_STATUSES[query.outcome] } } : {},
        query.agentId
          ? { OR: [{ answeredById: query.agentId }, { initiatedById: query.agentId }] }
          : {},
        search
          ? {
              OR: [
                { customerWaId: { contains: search.replace(/\D/g, "") || search } },
                { contact: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {},
        after
          ? {
              OR: [
                { createdAt: { lt: after.createdAt } },
                { createdAt: after.createdAt, id: { lt: after.id } },
              ],
            }
          : {},
      ],
    },
    include: { contact: { select: { name: true, phone: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const page = rows.slice(0, limit);
  const agentIds = new Set(page.flatMap((r) => [r.answeredById, r.initiatedById].filter(Boolean)));
  const agents = agentIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(agentIds) as string[] } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(agents.map((a) => [a.id, a.name]));

  const items = page.map((call): CallLogRow => {
    const agentId = call.answeredById ?? call.initiatedById;
    return {
      id: call.id,
      waCallId: call.waCallId,
      phoneId: call.phoneId,
      direction: call.direction,
      status: call.status,
      customerWaId: call.customerWaId,
      contactId: call.contactId,
      contactName: call.contact?.name ?? null,
      contactPhone: call.contact?.phone ?? null,
      conversationId: call.conversationId,
      initiatedById: call.initiatedById,
      answeredById: call.answeredById,
      createdAt: call.createdAt.toISOString(),
      answeredAt: call.answeredAt?.toISOString() ?? null,
      endedAt: call.endedAt?.toISOString() ?? null,
      durationSeconds: call.durationSeconds,
      errorMessage: call.errorMessage,
      agentId,
      agentName: agentId ? (names.get(agentId) ?? null) : null,
      ringSeconds: call.answeredAt
        ? Math.max(0, Math.round((call.answeredAt.getTime() - call.createdAt.getTime()) / 1000))
        : null,
    };
  });

  const last = page.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

// ---------------------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------------------

export interface CallAnalytics {
  totals: {
    total: number;
    inbound: number;
    outbound: number;
    answered: number;
    missed: number;
    declined: number;
    failed: number;
    /** Answered ÷ inbound calls that finished, 0–1; null with no inbound calls. */
    answerRate: number | null;
    avgDurationSeconds: number | null;
    /** Average seconds an inbound call rang before an agent picked up. */
    avgAnswerSeconds: number | null;
    talkSeconds: number;
    /** Missed inbound calls followed, within the period, by a call to the same customer. */
    missedCalledBack: number;
  };
  /** One row per local day in the range, zero-filled. */
  daily: { date: string; answered: number; missed: number }[];
  /** Inbound calls by local weekday (0 = Monday) and hour. Only non-zero cells. */
  hourly: { weekday: number; hour: number; calls: number }[];
  agents: {
    userId: string;
    name: string | null;
    calls: number;
    talkSeconds: number;
    avgDurationSeconds: number | null;
  }[];
}

const ANSWERED_SQL = Prisma.sql`"status" IN ('COMPLETED', 'ACCEPTED')`;
const MISSED_SQL = Prisma.sql`"status" = 'MISSED'`;

/** `WaCall` rows this caller may see in the range, as a SQL condition. */
function scopeSql(actor: Actor, scope: CallScope, query: CallAnalyticsQuery) {
  const parts = [
    Prisma.sql`"orgId" = ${actor.orgId}::uuid`,
    Prisma.sql`"createdAt" >= ${query.from} AND "createdAt" <= ${query.to}`,
  ];
  const phones = query.phoneId
    ? scope.phoneIds === null || scope.phoneIds.includes(query.phoneId)
      ? [query.phoneId]
      : []
    : scope.phoneIds;
  if (phones !== null) {
    parts.push(
      phones.length ? Prisma.sql`"phoneId" IN (${Prisma.join(phones)})` : Prisma.sql`FALSE`,
    );
  }
  if (scope.ownUserId !== null) {
    parts.push(
      Prisma.sql`("answeredById" = ${scope.ownUserId}::uuid OR "initiatedById" = ${scope.ownUserId}::uuid)`,
    );
  }
  return Prisma.join(parts, " AND ");
}

const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown) =>
  value === null || value === undefined ? null : Math.round(Number(value));

/** Every local day from `from` to `to`, as YYYY-MM-DD in `tz`. */
export function daysInRange(from: Date, to: Date, tz: string): string[] {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const days: string[] = [];
  const last = format.format(to);
  // Step by 12 h so a DST day is never skipped; the set collapses repeats.
  for (let t = from.getTime(); t <= to.getTime() + 1; t += 12 * 3600 * 1000) {
    const day = format.format(new Date(t));
    if (days.at(-1) !== day) days.push(day);
    if (day === last) break;
  }
  if (days.at(-1) !== last) days.push(last);
  return days;
}

export async function getCallAnalytics(
  actor: Actor,
  query: CallAnalyticsQuery,
): Promise<CallAnalytics> {
  const scope = await callScope(actor);
  const where = scopeSql(actor, scope, query);
  // `createdAt` is a UTC timestamp without a zone: anchor it to UTC first, then convert.
  const local = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${query.tz})`;

  const [totalsRows, dailyRows, hourlyRows, agentRows, calledBackRows] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>`
      /* calls: totals */
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE "direction" = 'USER_INITIATED') AS inbound,
        COUNT(*) FILTER (WHERE "direction" = 'BUSINESS_INITIATED') AS outbound,
        COUNT(*) FILTER (WHERE ${ANSWERED_SQL}) AS answered,
        COUNT(*) FILTER (WHERE ${MISSED_SQL}) AS missed,
        COUNT(*) FILTER (WHERE "status" = 'REJECTED') AS declined,
        COUNT(*) FILTER (WHERE "status" = 'FAILED') AS failed,
        COUNT(*) FILTER (WHERE "direction" = 'USER_INITIATED' AND ${ANSWERED_SQL}) AS inbound_answered,
        COUNT(*) FILTER (WHERE "direction" = 'USER_INITIATED' AND "status" <> 'RINGING') AS inbound_finished,
        AVG("durationSeconds") FILTER (WHERE "durationSeconds" > 0) AS avg_duration,
        AVG(EXTRACT(EPOCH FROM ("answeredAt" - "createdAt")))
          FILTER (WHERE "direction" = 'USER_INITIATED' AND "answeredAt" IS NOT NULL) AS avg_answer,
        COALESCE(SUM("durationSeconds"), 0) AS talk
      FROM "WaCall" WHERE ${where}
    `,
    prisma.$queryRaw<{ day: string; answered: unknown; missed: unknown }[]>`
      /* calls: daily */
      SELECT to_char(${local}, 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE ${ANSWERED_SQL}) AS answered,
        COUNT(*) FILTER (WHERE ${MISSED_SQL} OR "status" IN ('REJECTED', 'FAILED')) AS missed
      FROM "WaCall" WHERE ${where}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.$queryRaw<{ weekday: unknown; hour: unknown; calls: unknown }[]>`
      /* calls: hourly */
      SELECT (EXTRACT(ISODOW FROM ${local})::int - 1) AS weekday,
        EXTRACT(HOUR FROM ${local})::int AS hour,
        COUNT(*) AS calls
      FROM "WaCall" WHERE ${where} AND "direction" = 'USER_INITIATED'
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<{ user_id: string; calls: unknown; talk: unknown; avg_duration: unknown }[]>`
      /* calls: agents */
      SELECT COALESCE("answeredById", "initiatedById") AS user_id,
        COUNT(*) AS calls,
        COALESCE(SUM("durationSeconds"), 0) AS talk,
        AVG("durationSeconds") FILTER (WHERE "durationSeconds" > 0) AS avg_duration
      FROM "WaCall"
      WHERE ${where} AND ${ANSWERED_SQL} AND COALESCE("answeredById", "initiatedById") IS NOT NULL
      GROUP BY 1 ORDER BY calls DESC
      LIMIT 50
    `,
    prisma.$queryRaw<{ called_back: unknown }[]>`
      /* calls: missed called back */
      SELECT COUNT(*) AS called_back FROM "WaCall" m
      WHERE ${where} AND m."direction" = 'USER_INITIATED' AND m."status" = 'MISSED'
        AND EXISTS (
          SELECT 1 FROM "WaCall" b
          WHERE b."orgId" = m."orgId" AND b."customerWaId" = m."customerWaId"
            AND b."direction" = 'BUSINESS_INITIATED' AND b."createdAt" > m."createdAt"
            AND b."createdAt" <= ${query.to}
        )
    `,
  ]);

  const t = totalsRows[0] ?? {};
  const inboundFinished = num(t.inbound_finished);

  const byDay = new Map(dailyRows.map((r) => [r.day, r]));
  const daily = daysInRange(query.from, query.to, query.tz).map((date) => ({
    date,
    answered: num(byDay.get(date)?.answered),
    missed: num(byDay.get(date)?.missed),
  }));

  const agentIds = agentRows.map((r) => r.user_id);
  const users = agentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name]));

  return {
    totals: {
      total: num(t.total),
      inbound: num(t.inbound),
      outbound: num(t.outbound),
      answered: num(t.answered),
      missed: num(t.missed),
      declined: num(t.declined),
      failed: num(t.failed),
      answerRate: inboundFinished ? num(t.inbound_answered) / inboundFinished : null,
      avgDurationSeconds: numOrNull(t.avg_duration),
      avgAnswerSeconds: numOrNull(t.avg_answer),
      talkSeconds: num(t.talk),
      missedCalledBack: num(calledBackRows[0]?.called_back),
    },
    daily,
    hourly: hourlyRows.map((r) => ({
      weekday: num(r.weekday),
      hour: num(r.hour),
      calls: num(r.calls),
    })),
    agents: agentRows.map((r) => ({
      userId: r.user_id,
      name: names.get(r.user_id) ?? null,
      calls: num(r.calls),
      talkSeconds: num(r.talk),
      avgDurationSeconds: numOrNull(r.avg_duration),
    })),
  };
}
