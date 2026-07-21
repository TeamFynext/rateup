import {
  CloseReason,
  InboxStatus,
  ResolutionResult,
  WaMessageAssignStatus,
} from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  ConversationAssigneeUpdateSchema,
  ConversationCore,
  InboxActor,
  UpdateConversationSchema,
} from "./conversation.schema.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { isTerminalInboxStatus } from "../../whatsapp/constants.js";
import {
  mapStatusToField,
  transitionInboxStat,
} from "../../whatsapp/inbox/inboxStats/inboxStats.service.js";
import { incrementConversationCount } from "../../stats/stats.service.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/// The subset of the client available inside `prisma.$transaction(fn)`.
type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function createConversation(input: ConversationCore) {
  const { contactId, ...rest } = input;
  const conversation = await prisma.conversation.create({
    data: {
      contact: {
        connect: {
          id: contactId,
        },
      },
      ...rest,
    },
  });
  await incrementConversationCount(rest.orgId);
  return conversation;
}

/// Automation and rule closes have no acting user, so `closedBy` stays null and
/// the attribution lives in `closeReason` / `closedByAutomation` instead. Only a
/// genuine user id may be written to `closedBy`, which is an FK to User: callers
/// pass sentinels like "RateUp" for non-human actors.
function resolveClosedBy(actor: InboxActor): string | null {
  if (actor.source !== "user") return null;
  return actor.userId && UUID_PATTERN.test(actor.userId) ? actor.userId : null;
}

export const resolveClosedByUserId = resolveClosedBy;

/// Legacy callers thread a bare `userId` that may be a sentinel such as "RateUp"
/// or "Automation" rather than a real id. Map those onto a structured actor.
export function resolveInboxActor(userId?: string): InboxActor {
  if (userId && UUID_PATTERN.test(userId)) return { source: "user", userId };
  return { source: "system" };
}

function resolveCloseReason(status: InboxStatus, actor: InboxActor): CloseReason | null {
  if (status === WaMessageAssignStatus.SPAM) return CloseReason.SPAM;
  switch (actor.source) {
    case "user":
      return CloseReason.MANUAL;
    case "automation":
      return CloseReason.AUTOMATION_IDLE;
    case "rule":
      return CloseReason.RULE;
    default:
      return null;
  }
}

/// Everything a status transition writes to `Conversation`, in one place, so
/// that the transactional mirror and `setInboxStatus` cannot disagree.
export function conversationStatusData(
  status: InboxStatus,
  actor: InboxActor,
  closeReason?: CloseReason,
  now: Date = new Date(),
  resolutionResult?: ResolutionResult | null,
) {
  if (!isTerminalInboxStatus(status)) {
    // Reopening clears the previous close stamp (and any resolution result).
    return {
      status,
      closedAt: null,
      closedBy: null,
      resolvedAt: null,
      closeReason: null,
      closedByAutomation: false,
      resolutionResult: null,
    };
  }
  return {
    status,
    closedAt: now,
    closedBy: resolveClosedBy(actor),
    closeReason: closeReason ?? resolveCloseReason(status, actor),
    closedByAutomation: actor.source === "automation",
    resolvedAt: status === WaMessageAssignStatus.RESOLVED ? now : null,
    resolutionResult: resolutionResult ?? null,
  };
}

/// Mirrors `status` onto the contact's latest conversation using the caller's
/// transaction, so `Contact.waMessageAssignStatus` and `Conversation.status`
/// commit together. Callers that already own a transaction use this directly;
/// everyone else goes through `setInboxStatus`.
export async function mirrorConversationStatusTx(
  tx: TxClient,
  contactId: string,
  status: InboxStatus,
  actor: InboxActor,
  opts: {
    closeReason?: CloseReason;
    conversationId?: string;
    now?: Date;
    resolutionResult?: ResolutionResult | null;
  } = {},
) {
  const target = opts.conversationId
    ? await tx.conversation.findUnique({ where: { id: opts.conversationId } })
    : await tx.conversation.findFirst({
        where: { contactId },
        orderBy: { createdAt: "desc" },
      });
  if (!target) return null;

  // Moving a *closed* conversation back to a live status is a reopen. A closed
  // conversation is a finished record -- its closedAt and resolution timings
  // must stay put -- so it is left alone and the caller opens a successor via
  // `openConversationForContact`. Resurrecting it here would also mean no new
  // conversation is ever created, since the contact would appear to have a live
  // one already.
  if (isTerminalInboxStatus(target.status) && !isTerminalInboxStatus(status)) return null;

  return await tx.conversation.update({
    where: { id: target.id },
    data: conversationStatusData(status, actor, opts.closeReason, opts.now, opts.resolutionResult),
  });
}

/// The single authoritative inbox-status transition.
///
/// `Contact.waMessageAssignStatus` remains the live-inbox source of truth (the
/// chat list, per-tab counts and `InboxStats` all read it); `Conversation.status`
/// mirrors it. Both are written in one transaction so the two cannot drift.
export async function setInboxStatus(
  contactId: string,
  status: InboxStatus,
  actor: InboxActor,
  opts: {
    closeReason?: CloseReason;
    conversationId?: string;
    resolutionResult?: ResolutionResult | null;
  } = {},
) {
  const terminal = isTerminalInboxStatus(status);
  const now = new Date();
  const closedBy = resolveClosedBy(actor);

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.contact.findUnique({
      where: { id: contactId },
      select: {
        orgId: true,
        waMessageAssignStatus: true,
        blockedOnWhatsApp: true,
        lastReceivedMessageTimeStamp: true,
      },
    });
    if (!before) throw new Error(`Contact ${contactId} not found`);

    const contact = await tx.contact.update({
      where: { id: contactId },
      data: {
        waMessageAssignStatus: status,
        ...(terminal ? { closedAt: now, closedBy } : { closedAt: null, closedBy: null }),
      },
    });

    const conversation = await mirrorConversationStatusTx(tx, contactId, status, actor, {
      ...opts,
      now,
    });

    return { before, contact, conversation };
  });

  // InboxStats is an org-level counter cache, not part of the status invariant.
  // It is maintained after commit, the same way every other writer treats it.
  const { before, contact } = result;
  const statusChanged = before.waMessageAssignStatus !== contact.waMessageAssignStatus;
  if (statusChanged && before.lastReceivedMessageTimeStamp && !contact.blockedOnWhatsApp) {
    await transitionInboxStat(
      contact.orgId,
      mapStatusToField(before.waMessageAssignStatus),
      mapStatusToField(contact.waMessageAssignStatus),
      1,
    );
  }

  return result;
}

export async function updateConversation(conversationId: string, data: UpdateConversationSchema) {
  return await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data,
  });
}

export async function getConversationById(conversationId: string) {
  return await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });
}

export async function deleteConversation(conversationId: string) {
  return await prisma.conversation.delete({
    where: {
      id: conversationId,
    },
  });
}

export async function updateConversationAssignees(
  conversationId: string,
  data: ConversationAssigneeUpdateSchema,
  userId?: string,
) {
  await prisma.$transaction(async (tx) => {
    const { assignees, assignedAt, removedAt, assignedBy, removedBy } = data;
    if (assignees && assignees.length > 0) {
      const existingAssignees = await tx.conversationAssignedUserTeamMap.findMany({
        where: {
          conversationId: conversationId,
        },
      });

      const assigneesToRemove = existingAssignees.filter(
        (ea) => !assignees.find((a) => a.userId === ea.userId),
      );
      const assigneesToUpdate = existingAssignees.filter((ea) =>
        assignees.some((a) => a.userId === ea.userId && a.teamId !== ea.teamId),
      );

      const assigneesToAdd = assignees.filter(
        (a) => !existingAssignees.find((ea) => ea.userId === a.userId),
      );
      for (const assignee of assigneesToRemove) {
        await tx.conversationAssignedUserTeamMap.update({
          where: {
            userId_conversationId: {
              userId: assignee.userId,
              conversationId,
            },
          },
          data: {
            lastRemovedAt: removedAt || new Date(),
            lastRemovedBy: removedBy || userId,
            actionHistory: [
              ...assignee.actionHistory,
              {
                action: "assignment-revoked",
                date: removedAt || new Date(),
                by: removedBy || userId,
              },
            ],
          },
        });
      }
      for (const assignee of assigneesToUpdate) {
        const teamId = assignees.find((as) => as.userId === assignee.userId).teamId;
        await tx.conversationAssignedUserTeamMap.update({
          where: {
            userId_conversationId: {
              userId: assignee.userId,
              conversationId,
            },
          },
          data: {
            teamId,
            actionHistory: [
              ...assignee.actionHistory,
              {
                action: "updated-team",
                date: new Date(),
                by: userId,
              },
            ],
          },
        });
      }
      for (const assignee of assigneesToAdd) {
        await tx.conversationAssignedUserTeamMap.create({
          data: {
            conversationId: conversationId,
            userId: assignee.userId,
            teamId: assignee.teamId,
            lastAssignedAt: assignedAt || new Date(),
            lastAssignedBy: assignedBy || userId,
            isAssignedByAutomation: !assignedBy && !userId,
            actionHistory: [
              {
                action: "assigned",
                date: assignedAt || new Date(),
                by: assignedBy || userId,
              },
            ],
          },
        });
      }
      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          assignedAt: !existingAssignees.length ? assignedAt || new Date() : undefined,
          status: WaMessageAssignStatus.ASSIGNED,
        },
      });
    }
  });
}

/**
 * Inbox Tickets v2 — a contact's full ticket history, newest first.
 *
 * Backs the thread's "previous conversations" strip. Org scoping goes through the
 * contact rather than `Conversation.orgId`, which is a nullable denormalized copy
 * and is not reliably populated on older rows.
 */
export async function getConversationsByContactId(orgId: string, contactId: string) {
  return await prisma.conversation.findMany({
    where: { contactId, contact: { orgId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      subject: true,
      description: true,
      status: true,
      resolutionResult: true,
      createdAt: true,
      closedAt: true,
      lastMessageAt: true,
      messageCount: true,
      assignedUsers: {
        where: { lastRemovedAt: null },
        select: { userId: true, teamId: true, user: { select: { name: true } } },
      },
    },
  });
}

export async function getLastCreatedConversationForContact(contactId: string) {
  return await prisma.conversation.findFirst({
    where: {
      contactId: contactId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/// The conversation a new inbound message belongs to: the most recent one that
/// has not reached a terminal status. Returns null when the last conversation
/// was closed, which is the signal to open a fresh one.
export async function getActiveConversationForContact(contactId: string) {
  const latest = await getLastCreatedConversationForContact(contactId);
  if (!latest || isTerminalInboxStatus(latest.status)) return null;
  return latest;
}

/// Opens the next conversation for a contact, carrying the reopen counter
/// forward from the conversation it succeeds. A thread that is closed and then
/// messaged again becomes a *new* conversation, so that `closedAt`,
/// `firstRespondedAt` and the resolution-time metrics keep describing exactly
/// one open-to-close cycle.
export async function openConversationForContact(
  contactId: string,
  orgId: string,
  status: InboxStatus = WaMessageAssignStatus.UNASSIGNED,
) {
  const previous = await getLastCreatedConversationForContact(contactId);
  const conversation = await prisma.conversation.create({
    data: {
      contactId,
      orgId,
      status,
      reopenCount: previous ? previous.reopenCount + 1 : 0,
    },
  });
  await incrementConversationCount(orgId);
  return conversation;
}

export async function updateClosedConversationStatus(
  conversationId: string,
  status: InboxStatus,
  actor: InboxActor,
  closeReason?: CloseReason,
) {
  return await prisma.conversation.update({
    where: { id: conversationId },
    data: conversationStatusData(status, actor, closeReason),
  });
}

export async function checkIfFirstSendMessageInConversation(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const messages = await prisma.waMessage.findMany({
    where: {
      conversationId: conversationId,
      messageBody: {
        path: ["exchangeProcess"],
        equals: "send",
      },
    },
    orderBy: {
      waCreatedAt: "asc",
    },
    take: 1,
  });
  if (messages.length === 0) return true;
  return messages[0].id === messageId;
}

export async function checkIfFirstUserSendMessageInConversation(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const messages = await prisma.waMessage.findMany({
    where: {
      conversationId: conversationId,
      messageBody: {
        path: ["exchangeProcess"],
        equals: "send",
      },
      sendBy: {
        not: null,
      },
    },
    orderBy: {
      waCreatedAt: "asc",
    },
    take: 1,
  });
  if (messages.length === 0) return true;
  return messages[0].id === messageId;
}

export async function getConversationOverview(
  orgId: string,
  dateRange: string[],
): Promise<{
  totalConversations: number;
  averageResponseTime: number;
  averageResponseTimeByAgent: number;
  resolutionRate: number;
}> {
  let startDate, endDate;
  if (dateRange.length) {
    startDate = new Date(dateRange[0]);
    endDate = new Date(dateRange[1]);
  }

  const res = await prisma.$queryRaw<{
    totalConversations: number; // conversation created on range of given days
    averageResponseTime: number;
    averageResponseTimeByAgent: number;
    resolutionRate: number; // resolved conversation rate on the range of given day by total conversation till the date
  }>`
  WITH first_agent_message AS (
   SELECT wm."conversationId", MIN(wm."waCreatedAt") AS "firstAgentMessageAt"
   FROM "WaMessage" wm
   WHERE wm."sendBy" IS NOT NULL
   GROUP BY wm."conversationId"
  )
  SELECT 
   (COUNT(*) FILTER (WHERE c."createdAt" BETWEEN COALESCE(${startDate}, '1970-01-01'::timestamptz) AND COALESCE(${endDate}, NOW())))::INTEGER AS "totalConversations",
   AVG(EXTRACT(EPOCH FROM (c."firstRespondedAt" - c."createdAt"))) FILTER (WHERE c."firstRespondedAt" IS NOT NULL AND c."createdAt" BETWEEN ${startDate} AND ${endDate})
   AS "averageResponseTime",
   AVG(EXTRACT(EPOCH FROM (COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") - c."createdAt"))) FILTER (WHERE COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") IS NOT NULL AND c."createdAt" BETWEEN ${startDate} AND ${endDate})
   AS "averageResponseTimeByAgent",
   CASE WHEN COUNT(*) FILTER (WHERE c."createdAt" <= COALESCE(${endDate}, NOW())) = 0 THEN 0
        ELSE ( 
         COUNT(*) FILTER (
         WHERE c."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}) AND c."closedAt" BETWEEN 
         COALESCE(${startDate}, '1970-01-01'::timestamptz) AND COALESCE(${endDate}, NOW())
        )::float / COUNT(*) FILTER (WHERE c."createdAt" <= COALESCE(${endDate}, NOW())) * 100)
   END AS "resolutionRate"
  FROM "Conversation" c
  JOIN "Contact" ct ON ct.id = c."contactId"
  LEFT JOIN first_agent_message fam ON fam."conversationId" = c.id
  WHERE ct."orgId" = ${orgId}::uuid;`;
  return res
    ? res[0]
    : {
        totalConversations: null,
        averageResponseTime: null,
        averageResponseTimeByAgent: null,
        resolutionRate: null,
      };
}

export async function getResolvedConversationWeeklyStats(orgId: string) {
  const result = await prisma.$queryRaw<
    {
      weekStart: Date;
      resolvedCount: number;
    }[]
  >`
    SELECT 
      DATE_TRUNC('week', "closedAt") AS "weekStart",
      COUNT(*)::INTEGER AS "resolvedCount"
    FROM "Conversation"
    WHERE 
      "contactId" IN (
        SELECT id FROM "Contact" WHERE "orgId" = ${orgId}::uuid
      )
      AND "status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
    GROUP BY "weekStart"
    ORDER BY "weekStart" DESC
    LIMIT 12;
  `;
  return result;
}

export async function getResolvedCountandTotalCountofDailyInLastNDays(
  orgId: string,
  days: number,
  dateRange,
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  let startDate = sinceDate;
  let endDate = new Date();
  if (dateRange.length) {
    startDate = new Date(dateRange[0]);
    endDate = new Date(dateRange[1]);
  }
  const result = await prisma.$queryRaw<
    {
      date: string;
      resolvedCount: number;
      totalCount: number;
    }[]
  >`
WITH dates AS (
  SELECT generate_series(
    ${startDate}::date,
    ${endDate}::date,
    INTERVAL '1 day'
  )::date AS day
),

created_per_day AS (
  SELECT
    DATE("createdAt") AS day,
    COUNT(*)::INTEGER AS createdCount
  FROM "Conversation"
  WHERE
    "contactId" IN (
      SELECT id FROM "Contact" WHERE "orgId" = ${orgId}::uuid
    )
    AND "createdAt"::date >= ${startDate}
  GROUP BY DATE("createdAt")
),

resolved_per_day AS (
  SELECT
    DATE("closedAt") AS day,
    COUNT(*)::INTEGER AS resolvedCount
  FROM "Conversation"
  WHERE
    "contactId" IN (
      SELECT id FROM "Contact" WHERE "orgId" = ${orgId}::uuid
    )
    AND "status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
    AND "closedAt" IS NOT NULL
    AND "closedAt"::date >= ${startDate}
  GROUP BY DATE("closedAt")
),

merged AS (
  SELECT
    d.day,
    COALESCE(c.createdCount, 0) AS createdCount,
    COALESCE(r.resolvedCount, 0) AS "resolvedCount"
  FROM dates d
  LEFT JOIN created_per_day c ON d.day = c.day
  LEFT JOIN resolved_per_day r ON d.day = r.day
)

SELECT
  day AS date,
  "resolvedCount",
  (
    SUM(createdCount) OVER (ORDER BY day)
    - COALESCE(
        SUM("resolvedCount") OVER (
          ORDER BY day
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ),
        0
      )
  )::INTEGER AS "totalCount"
FROM merged
ORDER BY day;
`;
  return result;
}

export async function getAvargeResponseTimeofTodyaInEveryHour(orgId: string, dateKey, dateRange) {
  const startDate = new Date(dateRange[0]);
  const endDate = new Date(dateRange[1]);

  const groupByHour = dateKey === "today" || dateKey === "yesterday";
  const periodColumn = groupByHour
    ? `date_trunc('hour', c."createdAt")`
    : `date_trunc('day', c."createdAt")`;

  const query = `
WITH first_agent_message AS (
  SELECT
    wm."conversationId",
    MIN(wm."waCreatedAt") AS "firstAgentMessageAt"
  FROM "WaMessage" wm
  WHERE wm."sendBy" IS NOT NULL
  GROUP BY wm."conversationId"
),
convo AS (
  SELECT
    c."createdAt",
    COALESCE(
      c."firstRespondedByUserAt",
      fam."firstAgentMessageAt"
    ) AS "respondedAt"
  FROM "Conversation" c
  LEFT JOIN first_agent_message fam
    ON fam."conversationId" = c.id
  WHERE c."contactId" IN (
      SELECT id FROM "Contact" WHERE "orgId" = $1::uuid
    )
    AND COALESCE(
      c."firstRespondedByUserAt",
      fam."firstAgentMessageAt"
    ) IS NOT NULL
    AND c."createdAt" >= $2
    AND c."createdAt" < $3
)
SELECT
  ${periodColumn} AS period,
  AVG(
    EXTRACT(EPOCH FROM (c."respondedAt" - c."createdAt"))
  ) AS "averageResponseTime"
FROM convo c
GROUP BY period
HAVING COUNT(*) > 0
ORDER BY period;
`;

  const result = await prisma.$queryRawUnsafe<
    {
      period: string;
      averageResponseTime: number;
    }[]
  >(query, orgId, startDate, endDate);

  return result;
}

export async function getConversationOnAccountDistribution(orgId: string, dateRange) {
  let startDate, endDate;
  if (dateRange.length) {
    startDate = new Date(dateRange[0]);
    endDate = new Date(dateRange[1]);
  }
  const result = await prisma.$queryRaw<
    {
      phoneId: string;
      ibaId: string;
      phone: string;
      conversationCount: number;
      sourcePlatform: string;
    }[]
  >`
 SELECT
    COUNT(DISTINCT c.id)::INTEGER AS "conversationCount",
    ws."phoneId",
    ws."ibaId",
    ws."phone",
    wm."sourcePlatform"
FROM "Conversation" c
JOIN "Contact" ct
    ON c."contactId" = ct.id
LEFT JOIN "WaMessage" wm
    ON wm."conversationId" = c.id
LEFT JOIN "WhatsappSettings" ws
    ON ltrim(wm."sourceIdentifier", '+') =
       ltrim(COALESCE(ws."phone", ws."ibaId"), '+')
WHERE ct."orgId" = ${orgId}::uuid
  AND (
        wm."sourceIdentifier" IS NOT NULL
        OR (
            wm."sourceIdentifier" IS NULL
            AND wm."sourcePlatform" = ${PlatformType.WEBCHAT}
        )
      )
  AND c."createdAt" >= COALESCE(${startDate}, '1970-01-01'::timestamptz)
  AND c."createdAt" < COALESCE(${endDate}, NOW())
GROUP BY
    ws."phoneId",
    ws."ibaId",
    ws."phone",
    wm."sourcePlatform";
  `;
  return result;
}

export async function getOverAllQuickStatsOfConversations(orgId: string) {
  const result = await prisma.$queryRaw<
    {
      conversationInProgress: number;
      resolved: number;
      newConversations: number;
      staffOnline: number;
      totalStaff: number;
      conversationCreatedToday: number;
      totalConversation: number;
      resolvedLastWeek: number;
      resolvedThisWeek: number;
    }[]
  >`
 SELECT
    COUNT(*) FILTER (WHERE c."status"::text = ${WaMessageAssignStatus.ASSIGNED})::INTEGER AS "conversationInProgress",
    COUNT(*) FILTER (WHERE c."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}))::INTEGER AS "resolved",
    COUNT(*) FILTER (WHERE c."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}) AND c."closedAt" >= date_trunc('week',CURRENT_DATE))::INTEGER AS "resolvedThisWeek",
    (COUNT(*) FILTER (WHERE c."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}) AND c."closedAt" >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
    AND c."closedAt" <  date_trunc('week', CURRENT_DATE)))::INTEGER AS "resolvedLastWeek",
    COUNT(*) FILTER (WHERE c."createdAt"::date = CURRENT_DATE)::INTEGER AS "conversationCreatedToday",
    COUNT(*)::INTEGER AS "totalConversation",
    COUNT(*) FILTER (WHERE c."status"::text = ${WaMessageAssignStatus.UNASSIGNED})::INTEGER AS "newConversations",
    (SELECT COUNT(*)::INTEGER
 FROM "OrgMember" om
 JOIN "User" u ON u.id = om."userId"
 WHERE om."orgId" = ${orgId}
   AND om."status" = 'online'
   AND u."active" = true
) AS "staffOnline",

(SELECT COUNT(*)::INTEGER
 FROM "OrgMember" om
 JOIN "User" u ON u.id = om."userId"
 WHERE om."orgId" = ${orgId}
   AND u."active" = true
) AS "totalStaff"
FROM "Conversation" c
JOIN "Contact" ct ON c."contactId" = ct.id
WHERE ct."orgId" = ${orgId}::uuid;
  `;
  const {
    resolvedLastWeek,
    totalConversation,
    conversationCreatedToday,
    resolvedThisWeek,
    ...rest
  } = result[0];
  const thisWeekResolvedRate = totalConversation
    ? Math.round(((resolvedThisWeek / totalConversation) * 100 + Number.EPSILON) * 100) / 100
    : 0;
  const lastWeekResolvedRate = totalConversation
    ? Math.round(
        ((resolvedLastWeek / (totalConversation - conversationCreatedToday)) * 100 +
          Number.EPSILON) *
          100,
      ) / 100
    : 0;
  const resolvedRateDifference = thisWeekResolvedRate - lastWeekResolvedRate;
  return { ...rest, resolvedRateDifference };
}

export async function getStaffConverSationMetrics(orgId: string, dateRange) {
  const sevenDaysAgo = new Date();
  const fourteenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  let rangeStart, rangeEnd;
  if (dateRange.length) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }
  const result = await prisma.$queryRaw<
    {
      staff: {
        userId: string;
        name: string;
        status: string;
        email: string;
      };
      totalAssignedConversations: number;
      totalClosedConversations: number;
      totalMessagesHandled: number;
      averageResponseTime: number;
      messagesHandledRateByLastWeek: number;
      responseTimeRateByLastWeek: number;
    }[]
  >`
WITH valid_conversations AS (
  SELECT
    c.id,
    c."status",
    c."createdAt",
    c."firstRespondedAt",
    c."closedBy",
    c."closedAt"
  FROM "Conversation" c
  JOIN "Contact" ct ON ct.id = c."contactId"
  WHERE ct."orgId" = ${orgId}
),

assignments AS (
  SELECT
    ca."userId",
    ca."conversationId",
    ca."lastRemovedAt",
    ca."lastAssignedAt"
  FROM "ConversationAssignedUserTeamMap" ca
  JOIN valid_conversations vc
    ON vc.id = ca."conversationId"
),

-- total active chats

assigned_stats AS (
  SELECT
    ca."userId",
    COUNT(DISTINCT ca."conversationId")::INT AS total_assigned
  FROM assignments ca
  JOIN valid_conversations vc
    ON vc.id = ca."conversationId"
  WHERE vc."status"::text = ${WaMessageAssignStatus.ASSIGNED}
    AND ca."lastAssignedAt" <= COALESCE(${rangeEnd}, NOW())
    AND (
      ca."lastRemovedAt" IS NULL
      OR ca."lastRemovedAt" >= COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
    )
  GROUP BY ca."userId"
),

-- resolved chats

closed_stats AS (
  SELECT
    vc."closedBy" AS "userId",
    COUNT(*)::INT AS total_closed
  FROM valid_conversations vc
  WHERE vc."status"::text = ANY (${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
    AND vc."closedAt" BETWEEN COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
                             AND COALESCE(${rangeEnd}, NOW())
  GROUP BY vc."closedBy"
),


-- Response time stats

response_stats AS (
  SELECT
    a."userId",

    -- Avg response time 
    AVG(
      EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
    ) FILTER (
      WHERE vc."firstRespondedAt"
            BETWEEN COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
                AND COALESCE(${rangeEnd}, NOW())
    ) AS avg_response_time_range,

    -- Avg response time last 7 days
    AVG(
      EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
    ) FILTER (
      WHERE vc."firstRespondedAt" >= ${sevenDaysAgo}
    ) AS avg_response_time_last_7d,

    -- Avg response time previous 7 days
    AVG(
      EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
    ) FILTER (
      WHERE vc."firstRespondedAt" >= ${fourteenDaysAgo}
        AND vc."firstRespondedAt" < ${sevenDaysAgo}
    ) AS avg_response_time_prev_7d

  FROM assignments a
  JOIN valid_conversations vc
    ON vc.id = a."conversationId"
  WHERE vc."firstRespondedAt" IS NOT NULL
  GROUP BY a."userId"
),


-- Message stats

message_stats AS (
  SELECT
    wm."sendBy" AS "userId",

    -- Messages handled 
    COUNT(*) FILTER (
      WHERE wm."waCreatedAt" BETWEEN COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
                                AND COALESCE(${rangeEnd}, NOW())
    )::INT AS total_messages_range,

    -- Messages handled last 7 days
    COUNT(*) FILTER (
      WHERE wm."waCreatedAt" >= ${sevenDaysAgo}
    )::INT AS messages_last_7d,

    -- Messages handled previous 7 days
    COUNT(*) FILTER (
      WHERE wm."waCreatedAt" >= ${fourteenDaysAgo}
        AND wm."waCreatedAt" < ${sevenDaysAgo}
    )::INT AS messages_prev_7d

  FROM "WaMessage" wm
  JOIN valid_conversations vc
    ON vc.id = wm."conversationId"
  GROUP BY wm."sendBy"
)

SELECT
  json_build_object(
    'userId', om."userId",
    'name', u."name",
    'status', om."status",
    'email', u."email"
  ) AS staff,

  -- Totals (optional DATE RANGE)
  COALESCE(a.total_assigned, 0)        AS "totalAssignedConversations",
  COALESCE(c.total_closed, 0)          AS "totalClosedConversations",
  COALESCE(m.total_messages_range, 0)  AS "totalMessagesHandled",
  r.avg_response_time_range            AS "averageResponseTime",

  -- Messages last 7 days
  COALESCE(m.messages_last_7d, 0) AS "messagesHandledLastWeek",

  -- % Messages handled
CASE
  WHEN m.messages_prev_7d IS NULL
       OR m.messages_prev_7d = 0
  THEN
    CASE
      WHEN m.messages_last_7d > 0 THEN 100
      ELSE 0
    END
  ELSE
    (
      (m.messages_last_7d - m.messages_prev_7d)::DECIMAL
      / m.messages_prev_7d
    ) * 100
END AS "messagesHandledRateByLastWeek",

  -- % Response time
  CASE
  WHEN r.avg_response_time_prev_7d IS NULL
       OR r.avg_response_time_prev_7d = 0
  THEN
    CASE
      WHEN r.avg_response_time_last_7d IS NOT NULL THEN 100
      ELSE 0
    END
  ELSE
    (
      (r.avg_response_time_prev_7d - r.avg_response_time_last_7d)
      / r.avg_response_time_prev_7d
    ) * 100
END AS "responseTimeRateByLastWeek"

FROM "OrgMember" om
LEFT JOIN "User" u ON u.id = om."userId"
LEFT JOIN assigned_stats a ON a."userId" = om."userId"
LEFT JOIN closed_stats c ON c."userId" = om."userId"
LEFT JOIN message_stats m ON m."userId" = om."userId"
LEFT JOIN response_stats r ON r."userId" = om."userId"
WHERE om."orgId" = ${orgId}
AND u."active" = true
AND u."deletedAt" IS NULL;
  `;
  return result;
}

export async function getStaffDetailedConversationAnalytics(orgId, userId, days) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sevenDaysAgo = new Date();
  const fourteenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const result = await prisma.$queryRaw<{
    userPerformance: {
      name: string;
      status: string;
      email: string;
      totalAssignedConversations: number;
      totalClosedConversations: number;
      totalMessagesHandled: number;
      averageResponseTime: number;
      messagesHandledRateByLastWeek: number;
      responseTimeRateByLastWeek: number;
      resolutionRateByLastWeek: number;
      conversationsTransferred: number;
      conversationsRecieved: number;
    };
    weeklyMessageStats: {
      date: string;
      messageCount: number;
    }[];
    recentConversations: {
      id: string;
      customer: {
        name: string;
        phone: string;
      };
      topic: string;
      duration: number;
      lastRespondedAt: string;
      status: string;
    }[];
    metrics: {
      resolutionRate: number;
      firstResponseTime: string;
      avgHandlingTime: number;
    };
  }>`

  WITH valid_conversations AS (
  SELECT
    c.id,
    c."status",
    c."createdAt",
    c."firstRespondedAt",
    c."closedBy",
    c."closedAt"
  FROM "Conversation" c
  JOIN "Contact" ct ON ct.id = c."contactId"
  WHERE ct."orgId" = ${orgId}
),
assignments AS (
  SELECT 
   ca."userId",
   ca."conversationId",
   ca."lastRemovedAt",
   ca."lastAssignedAt"
   FROM "ConversationAssignedUserTeamMap" ca 
   JOIN valid_conversations vc 
    ON vc.id = ca."conversationId"
    WHERE ca."userId" = ${userId}
),

assigned_stats AS (
    SELECT
      COUNT(DISTINCT a."conversationId")::INT AS total_assigned
    FROM assignments a
    JOIN valid_conversations vc
      ON vc.id = a."conversationId"
    WHERE vc."status"::text = ${WaMessageAssignStatus.ASSIGNED}
      AND a."lastAssignedAt" <= NOW()
      AND (
        a."lastRemovedAt" IS NULL
        OR a."lastRemovedAt" >= ${sinceDate}
      )
  ),

  closed_stats AS (
    SELECT
      COUNT(*)::INT AS total_closed
    FROM valid_conversations vc
    WHERE vc."status"::text = ANY (${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
      AND vc."closedBy" = ${userId}
      AND vc."closedAt" >= ${sinceDate}
  ),

  response_stats AS (
    SELECT
      AVG(
        EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
      ) FILTER (
        WHERE vc."firstRespondedAt" >= ${sinceDate}
      ) AS avg_response_time_range,

      AVG(
        EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
      ) FILTER (
        WHERE vc."firstRespondedAt" >= ${sevenDaysAgo}
      ) AS avg_response_time_last_7d,

      AVG(
        EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))
      ) FILTER (
        WHERE vc."firstRespondedAt" >= ${fourteenDaysAgo}
          AND vc."firstRespondedAt" < ${sevenDaysAgo}
      ) AS avg_response_time_prev_7d
    FROM assignments a
    JOIN valid_conversations vc
      ON vc.id = a."conversationId"
    WHERE vc."firstRespondedAt" IS NOT NULL
  ),

  message_stats AS (
    SELECT
      COUNT(*) FILTER (
        WHERE wm."waCreatedAt" >= ${sinceDate}
      )::INT AS total_messages_range,

      COUNT(*) FILTER (
        WHERE wm."waCreatedAt" >= ${sevenDaysAgo}
      )::INT AS messages_last_7d,

      COUNT(*) FILTER (
        WHERE wm."waCreatedAt" >= ${fourteenDaysAgo}
          AND wm."waCreatedAt" < ${sevenDaysAgo}
      )::INT AS messages_prev_7d
    FROM "WaMessage" wm
    JOIN valid_conversations vc
      ON vc.id = wm."conversationId"
    WHERE wm."sendBy" = ${userId}
  ),
resolution_stats AS (
  SELECT
    COUNT(*) FILTER (
      WHERE vc."closedAt" >= ${sevenDaysAgo}
        AND vc."status"::text IN (${WaMessageAssignStatus.RESOLVED})
    ) AS resolved_last_7d,

    COUNT(*) FILTER (
      WHERE vc."closedAt" >= ${sevenDaysAgo}
        AND vc."status"::text IN (${WaMessageAssignStatus.RESOLVED}, ${WaMessageAssignStatus.CLOSED})
    ) AS total_last_7d,

    COUNT(*) FILTER (
      WHERE vc."closedAt" >= ${fourteenDaysAgo}
        AND vc."closedAt" < ${sevenDaysAgo}
        AND vc."status"::text IN (${WaMessageAssignStatus.RESOLVED})
    ) AS resolved_prev_7d,

    COUNT(*) FILTER (
      WHERE vc."closedAt" >= ${fourteenDaysAgo}
        AND vc."closedAt" < ${sevenDaysAgo}
        AND vc."status"::text IN (${WaMessageAssignStatus.RESOLVED}, ${WaMessageAssignStatus.CLOSED})
    ) AS total_prev_7d
  FROM valid_conversations vc
  WHERE vc."closedBy" = ${userId}
),

dates AS (
    SELECT generate_series(
        ${sinceDate.toISOString()}::date,
        NOW()::date,
        '1 day'
    ) AS day
),

handled_messages AS (
    SELECT 
        DATE(wm."waCreatedAt") AS day,
        COUNT(*) FILTER (WHERE wm."sendBy" = ${userId})::INTEGER AS "messageCount"
    FROM "WaMessage" wm
    JOIN "Conversation" cv ON cv.id = wm."conversationId"
    JOIN "Contact" c ON c.id = cv."contactId"
    WHERE c."orgId" = ${orgId}::uuid
    GROUP BY DATE(wm."waCreatedAt")
),

assigned_conversations AS (
    SELECT 
        cv.id,
        cv.status,
        cv."createdAt",
        cv."closedBy",
        cau."lastAssignedAt",
      (
  SELECT MIN(
    (ah->>'date')::timestamptz AT TIME ZONE 'UTC'
  )
  FROM unnest(cau."actionHistory") AS ah
  WHERE ah->>'action' = 'assigned'
) AS "firstAssignedAt",

        json_build_object(
            'name', c."name",
            'phone', c."phone"
        ) AS customer
    FROM "Conversation" cv
    JOIN "ConversationAssignedUserTeamMap" cau
        ON cau."conversationId" = cv.id
        AND cau."userId" = ${userId} 
    LEFT JOIN "Contact" c 
        ON c.id = cv."contactId" AND c."orgId" = ${orgId}
),

user_message_times AS (
    SELECT 
        ac.id AS "conversationId",
       MIN(wm."waCreatedAt"::timestamptz) FILTER (
  WHERE wm."sendBy" = ${userId}
) AS "firstResponded",

MAX(wm."waCreatedAt"::timestamptz) FILTER (
  WHERE wm."sendBy" = ${userId}
) AS "lastResponded"

    FROM assigned_conversations ac
    JOIN "WaMessage" wm ON wm."conversationId" = ac.id
    GROUP BY ac.id
),

recent_conv AS (
    SELECT 
        ac.id,
        ac.status,
        ac.customer,
        t."firstResponded",
        t."lastResponded"
    FROM assigned_conversations ac
    JOIN user_message_times t ON t."conversationId" = ac.id
    ORDER BY t."lastResponded" DESC NULLS LAST
    LIMIT 4
),

metrics AS (
    SELECT 
        -- resolution rate
        (
            SELECT 
                (COUNT(*) FILTER (
                    WHERE ac.status::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]} )
                    AND ac."closedBy" = ${userId}
                )::DECIMAL
                /
                NULLIF(COUNT(*), 0)) * 100
            FROM assigned_conversations ac
        ) AS "resolutionRate",

        -- first response time (assignment-based)
       (
  SELECT 
      AVG(
        EXTRACT(
          EPOCH FROM (
            t."firstResponded"
            - COALESCE(ac."firstAssignedAt", ac."lastAssignedAt")
          )
        )
      )
  FROM assigned_conversations ac
  LEFT JOIN user_message_times t 
    ON t."conversationId" = ac.id
  WHERE 
    t."firstResponded" IS NOT NULL
    AND COALESCE(ac."firstAssignedAt", ac."lastAssignedAt") IS NOT NULL
) AS "firstResponseTime",

        -- avg handling time (firstAssignedAt → lastResponded)
        (
            SELECT 
                AVG(EXTRACT(EPOCH FROM (t."lastResponded" - ac."firstAssignedAt")))
            FROM assigned_conversations ac
            JOIN user_message_times t ON t."conversationId" = ac.id
            WHERE t."lastResponded" IS NOT NULL AND ac."firstAssignedAt" IS NOT NULL
        ) AS "avgHandlingTime"
)

SELECT 

 json_build_object(
  'name', u."name",
    'status', om."status",
    'email', u."email",
    'totalAssignedConversations', COALESCE((SELECT total_assigned FROM assigned_stats), 0),
    'totalClosedConversations', COALESCE((SELECT total_closed FROM closed_stats), 0),
    'totalMessagesHandled', COALESCE((SELECT total_messages_range FROM message_stats), 0),
    'averageResponseTime', (SELECT avg_response_time_range FROM response_stats),
    'messagesHandledRateByLastWeek', 
      CASE
        WHEN (SELECT messages_prev_7d FROM message_stats) IS NULL OR (SELECT messages_prev_7d FROM message_stats) = 0
        THEN CASE WHEN (SELECT messages_last_7d FROM message_stats) > 0 THEN 100 ELSE 0 END
        ELSE (((SELECT messages_last_7d FROM message_stats) - (SELECT messages_prev_7d FROM message_stats))::DECIMAL / (SELECT messages_prev_7d FROM message_stats)) * 100
      END,
    'responseTimeRateByLastWeek',
      CASE
        WHEN (SELECT avg_response_time_prev_7d FROM response_stats) IS NULL OR (SELECT avg_response_time_prev_7d FROM response_stats) = 0
        THEN CASE WHEN (SELECT avg_response_time_last_7d FROM response_stats) IS NOT NULL THEN 100 ELSE 0 END
        ELSE (((SELECT avg_response_time_prev_7d FROM response_stats) - (SELECT avg_response_time_last_7d FROM response_stats)) / (SELECT avg_response_time_prev_7d FROM response_stats)) * 100
      END,
 'resolutionRateByLastWeek',
(
  COALESCE(
    (rs.resolved_last_7d::DECIMAL / NULLIF(rs.total_last_7d, 0)) * 100,
    0
  )
  -
  COALESCE(
    (rs.resolved_prev_7d::DECIMAL / NULLIF(rs.total_prev_7d, 0)) * 100,
    0
  )
),


      'conversationsTransferred',
       COALESCE(
        (
          SELECT COUNT(DISTINCT cau2."conversationId")::INT
          FROM "ConversationAssignedUserTeamMap" cau2
          JOIN "Conversation" cv2 ON cv2.id = cau2."conversationId"
          JOIN "Contact" ct2 ON ct2.id = cv2."contactId"
          WHERE cau2."lastAssignedBy" = ${userId}
            AND cau2."userId" <> ${userId}
            AND cau2."lastAssignedAt" >= ${sinceDate}
            AND ct2."orgId" = ${orgId}::uuid
        ), 0
      ),
       'conversationsRecieved',
          COALESCE(
            (
              SELECT COUNT(DISTINCT cau3."conversationId")::INT
              FROM "ConversationAssignedUserTeamMap" cau3
              JOIN "Conversation" cv3 ON cv3.id = cau3."conversationId"
              JOIN "Contact" ct3 ON ct3.id = cv3."contactId"
              WHERE cau3."userId" = ${userId}
                AND cau3."lastAssignedBy" IS NOT NULL
                AND cau3."lastAssignedBy" <> ${userId}
                AND cau3."lastAssignedAt" >= ${sinceDate}
                AND ct3."orgId" = ${orgId}::uuid
            ), 0
          )
  ) AS "userPerformance",
    -- weekly message stats
    (
        SELECT json_agg(
            json_build_object(
                'date', d.day,
                'messageCount', COALESCE(h."messageCount", 0)
            )
        )
        FROM dates d
        LEFT JOIN handled_messages h ON d.day = h.day
    ) AS "weeklyMessageStats",

    -- recent conversations
    (
        SELECT json_agg(
            json_build_object(
                'id', r.id,
                'customer', r.customer,
                'duration',
                    EXTRACT(EPOCH FROM (r."lastResponded" - r."firstResponded")),
                'lastRespondedAt', r."lastResponded",
                'status', r.status
            )
        )
        FROM recent_conv r
    ) AS "recentConversations",

    -- metrics
    (
        SELECT json_build_object(
            'resolutionRate', m."resolutionRate",
            'firstResponseTime', m."firstResponseTime",
            'avgHandlingTime', m."avgHandlingTime"
        )
        FROM metrics m
    ) AS metrics
     FROM "OrgMember" om 
     LEFT JOIN "User" u ON u.id = om."userId"
     CROSS JOIN resolution_stats rs
     WHERE om."userId" = ${userId} AND om."orgId" = ${orgId};
  `;
  return result[0];
}

export async function getTeamOverview(orgId: string, dateRange) {
  const sevenDaysAgo = new Date();
  const fourteenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  if (dateRange.length) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }
  const result = await prisma.$queryRaw<
    {
      teamId: string;
      teamName: string;
      teamColor: string;
      assignedConversations: number;
      averageResponseTime: number;
      teamMembers: number;
      teamMembersOnline: number;
      messagesSent: number;
    }[]
  >`
  WITH first_agent_message AS (
    SELECT wm."conversationId", MIN(wm."waCreatedAt") AS "firstAgentMessageAt"
    FROM "WaMessage" wm
    WHERE wm."sendBy" IS NOT NULL
    GROUP BY wm."conversationId"
  ),
     messages_per_team AS (
     SELECT cau."teamId", COUNT(*)::INTEGER AS "messagesSent"
    FROM "WaMessage" wm
    JOIN "Conversation" c ON c.id = wm."conversationId"
    JOIN "ConversationAssignedUserTeamMap" cau ON cau."conversationId" = c.id
    JOIN "Contact" ct ON ct.id = c."contactId"
    WHERE ct."orgId" = ${orgId}::uuid
      AND wm."sendBy" IS NOT NULL
      AND wm."waCreatedAt" >= COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
      AND wm."waCreatedAt" < COALESCE(${rangeEnd}, NOW())
    GROUP BY cau."teamId"
  )
  SELECT
    t.id AS "teamId",
    t.name AS "teamName",
    t.color AS "teamColor",
    (COUNT(DISTINCT c.id) FILTER(WHERE c."status"::text = ${WaMessageAssignStatus.ASSIGNED}
    AND c."createdAt" >= COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
         AND c."createdAt" < COALESCE(${rangeEnd}, NOW())
    ))::INTEGER AS "assignedConversations",
    AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") - c."createdAt"
      ))
    ) FILTER (
      WHERE COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") IS NOT NULL
        AND c."createdAt" >= COALESCE(${rangeStart}, '1970-01-01'::timestamptz)
        AND c."createdAt" < COALESCE(${rangeEnd}, NOW())
    ) AS "averageResponseTime",
  COUNT(DISTINCT u.id)::INTEGER AS "teamMembers",
COUNT(DISTINCT u.id) FILTER (
  WHERE om."status" = 'online'
)::INTEGER AS "teamMembersOnline",
   COALESCE(mpt."messagesSent",0) AS "messagesSent"
  FROM "Team" t
  LEFT JOIN "ConversationAssignedUserTeamMap" cau ON cau."teamId" = t.id
  LEFT JOIN "Conversation" c ON c.id = cau."conversationId"
  LEFT JOIN "Contact" ct ON ct.id = c."contactId"
  LEFT JOIN first_agent_message fam ON fam."conversationId" = c.id
  LEFT JOIN "TeamMember" tm ON tm."teamId" = t.id
  LEFT JOIN "User" u 
  ON tm."userId" = u.id
 AND u."active" = true
 AND u."deletedAt" IS NULL
LEFT JOIN "OrgMember" om 
  ON u."id" = om."userId"
 AND om."orgId" = ${orgId}
  LEFT JOIN "messages_per_team" mpt ON mpt."teamId" = t.id
  WHERE t."orgId" = ${orgId}::uuid
  GROUP BY t.id, t.name,t."color", mpt."messagesSent"
  ORDER BY "assignedConversations" DESC;
  `;
  return result;
}

export async function getTeamDetailedMetrics(teamId: string, orgId: string, days) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sevenDaysAgo = new Date();
  const fourteenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const result = await prisma.$queryRaw<{
    teamId: string;
    teamName: string | null;
    teamColor: string | null;
    averageResponseTime: number | null;
    activeChats: number;
    resolutionRate: number;
    resolutionRateComparedToLastWeek: number;
    averageResponseTimeComparedToLastWeek: number;
    teamMembers: number;
    teamMembersOnline: number;
    members:
      | {
          userId: string;
          name: string;
          onlineStatus: string | null;
          averageResponseTime: number | null;
          staffActiveChats: number;
          messagesHandled: number;
        }[]
      | null;
  }>`
  WITH first_agent_message AS (
    SELECT wm."conversationId", MIN(wm."waCreatedAt") AS "firstAgentMessageAt"
    FROM "WaMessage" wm
    WHERE wm."sendBy" IS NOT NULL
    GROUP BY wm."conversationId"
  ),

  team_convos AS (
    SELECT DISTINCT c.id, c."createdAt",
      COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") AS respondedAt,
      c."status",
      c."closedAt"
    FROM "Conversation" c
    JOIN "Contact" ct ON ct.id = c."contactId" AND ct."orgId" = ${orgId}::uuid
    JOIN "ConversationAssignedUserTeamMap" cau ON cau."conversationId" = c.id AND cau."teamId" = ${teamId}::uuid
    LEFT JOIN first_agent_message fam ON fam."conversationId" = c.id
    WHERE (
      c."createdAt" >= ${sinceDate}
    )
  )

  SELECT
    ${teamId}::uuid AS "teamId",
    (SELECT "name" FROM "Team" WHERE id = ${teamId}::uuid) AS "teamName",
    (SELECT "color" FROM "Team" WHERE id = ${teamId}::uuid) AS "teamColor",
    AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt IS NOT NULL) AS "averageResponseTime",
    COUNT(*) FILTER (WHERE tc."status"::text = ${WaMessageAssignStatus.ASSIGNED})::INTEGER AS "activeChats",
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE (COUNT(*) FILTER (WHERE tc."status"::text  = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}))::float / COUNT(*)::float * 100)
    END AS "resolutionRate",
    (
      COALESCE(
        (COUNT(*) FILTER (WHERE tc."closedAt" >= ${sevenDaysAgo} AND tc."status"::text = ${WaMessageAssignStatus.RESOLVED})::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE tc."closedAt" >= ${sevenDaysAgo} AND tc."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})), 0)) * 100,
        0
      )
      -
      COALESCE(
        (COUNT(*) FILTER (WHERE tc."closedAt" >= ${fourteenDaysAgo} AND tc."closedAt" < ${sevenDaysAgo} AND tc."status"::text = ${WaMessageAssignStatus.RESOLVED})::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE tc."closedAt" >= ${fourteenDaysAgo} AND tc."closedAt" < ${sevenDaysAgo} AND tc."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})), 0)) * 100,
        0
      )
    ) AS "resolutionRateComparedToLastWeek",
    CASE
      WHEN AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${fourteenDaysAgo} AND tc.respondedAt < ${sevenDaysAgo}) IS NULL OR 
           AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${fourteenDaysAgo} AND tc.respondedAt < ${sevenDaysAgo}) = 0
      THEN CASE WHEN AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${sevenDaysAgo}) IS NOT NULL THEN 100 ELSE 0 END
      ELSE ((AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${fourteenDaysAgo} AND tc.respondedAt < ${sevenDaysAgo}) - AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${sevenDaysAgo})) / AVG(EXTRACT(EPOCH FROM (tc.respondedAt - tc."createdAt"))) FILTER (WHERE tc.respondedAt >= ${fourteenDaysAgo} AND tc.respondedAt < ${sevenDaysAgo})) * 100
    END AS "averageResponseTimeComparedToLastWeek",
    (SELECT COUNT(DISTINCT u.id)::INTEGER
 FROM "TeamMember" tm
 JOIN "User" u 
   ON u.id = tm."userId"
  AND u."active" = true
  AND u."deletedAt" IS NULL
 WHERE tm."teamId" = ${teamId}::uuid
) AS "teamMembers",
   (SELECT COUNT(DISTINCT u.id)::INTEGER
 FROM "TeamMember" tm
 JOIN "User" u 
   ON u.id = tm."userId"
  AND u."active" = true
  AND u."deletedAt" IS NULL
 JOIN "OrgMember" om 
   ON om."userId" = u.id
  AND om."orgId" = ${orgId}::uuid
 WHERE tm."teamId" = ${teamId}::uuid
   AND om."status" = 'online'
) AS "teamMembersOnline",
    (
      SELECT json_agg(json_build_object(
        'userId', ms."userId",
        'name', ms."name",
        'onlineStatus', ms."onlineStatus",
        'averageResponseTime', ms."avgResponseTime",
        'staffActiveChats', ms."staffActiveChats",
        'messagesHandled', ms."messagesHandled"
      ))
      FROM (
        SELECT tm."userId",
          u."name",
          om."status" AS "onlineStatus",
          AVG(EXTRACT(EPOCH FROM (vc."firstRespondedAt" - vc."createdAt"))) FILTER (WHERE vc."firstRespondedAt" IS NOT NULL) AS "avgResponseTime",
          COUNT(DISTINCT cau."conversationId") FILTER (WHERE NOT (vc."status"::text = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})))::INT AS "staffActiveChats",
          COUNT(DISTINCT wm.id)::INT AS "messagesHandled"
        FROM "TeamMember" tm
        JOIN "User" u ON u.id = tm."userId"
        AND u."active" = true
        AND u."deletedAt" IS NULL
        LEFT JOIN "OrgMember" om ON om."userId" = tm."userId" AND om."orgId" = ${orgId}::uuid
        LEFT JOIN "ConversationAssignedUserTeamMap" cau ON cau."userId" = tm."userId" AND cau."teamId" = ${teamId}::uuid
        LEFT JOIN "Conversation" vc ON vc.id = cau."conversationId"
        LEFT JOIN "WaMessage" wm ON wm."conversationId" = vc.id AND wm."sendBy" = tm."userId"
        JOIN "Contact" c ON c.id = vc."contactId" AND c."orgId" = ${orgId}::uuid
        WHERE tm."teamId" = ${teamId}::uuid
        GROUP BY tm."userId", u."name", om."status"
      ) ms
    ) AS "members"
  FROM team_convos tc;
  `;
  return result[0];
}
