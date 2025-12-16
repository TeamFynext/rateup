import { string } from "zod";
import { WaMessageAssignStatus } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { WaMessageClosedStatus } from "../../whatsapp/constants";
import {
  ConversationAssigneeUpdateSchema,
  ConversationCore,
  UpdateConversationSchema,
} from "./conversation.schema";

export async function createConversation(input: ConversationCore) {
  const { contactId, ...rest } = input;
  return await prisma.conversation.create({
    data: {
      contact: {
        connect: {
          id: contactId,
        },
      },
      ...rest,
    },
  });
}

export async function updateConversation(
  conversationId: string,
  data: UpdateConversationSchema,
) {
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
      const existingAssignees =
        await tx.conversationAssignedUserTeamMap.findMany({
          where: {
            conversationId: conversationId,
          },
        });

      const assigneesToRemove = existingAssignees.filter(
        (ea) => !assignees.find((a) => a.userId === ea.userId),
      );
      const assigneesToUpdate = existingAssignees.filter(
        (ea) =>
          !assignees.find(
            (a) =>
              a.userId === ea.userId &&
              a.teamId === ea.teamId &&
              !assigneesToRemove.find((as) => a.userId !== as.userId),
          ),
      );
      const assigneesToAdd = assignees.filter(
        (a) =>
          !existingAssignees.find(
            (ea) => ea.userId === a.userId && ea.teamId === a.teamId,
          ),
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
        const teamId = assignees.find(
          (as) => as.userId === assignee.userId,
        ).teamId;
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
          assignedAt: !existingAssignees.length
            ? assignedAt || new Date()
            : undefined,
          status: WaMessageAssignStatus.ASSIGNED,
        },
      });
    }
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

export async function updateClosedConversationStatus(
  conversationId: string,
  status: string,
  userId: string,
) {
  const conversation = await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      status: status,
      closedAt: new Date(),
      closedBy: userId,
    },
  });
  return conversation;
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
  resolutionRate: number;
}> {
  const whereClause: any = {
    contact: {
      orgId: orgId,
    },
  };
  const totalConversationWhereClause = {
    ...whereClause,
  };
  const resolvedConversationWhere = {
    ...whereClause,
  };
  const totalTilldate = {
    ...whereClause,
  };
  if (dateRange.length) {
    const [startDate, endDate] = dateRange;
    totalConversationWhereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
    resolvedConversationWhere.closedAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
    totalTilldate.createdAt = {
      lte: new Date(endDate),
    };
  }

  const totalConversations = await prisma.conversation.count({
    where: totalConversationWhereClause,
  });

  const totalConversationsTillTheday = await prisma.conversation.count({
    where: totalTilldate,
  });
  const respondedConversations = await prisma.conversation.findMany({
    where: {
      ...totalConversationWhereClause,
      firstRespondedAt: {
        not: null,
      },
    },
    select: {
      firstRespondedAt: true,
      createdAt: true,
    },
  });

  const totalRespondedConversation = respondedConversations.length;
  let averageResponseTime = null;

  if (totalRespondedConversation !== 0) {
    const totalResponseTime = respondedConversations.reduce((acc, curr) => {
      const diff =
        new Date(curr.firstRespondedAt).getTime() -
        new Date(curr.createdAt).getTime();
      acc += diff;
      return acc;
    }, 0);
    averageResponseTime = totalResponseTime / totalRespondedConversation / 1000;
  }

  const resolvedConversation = await prisma.conversation.count({
    where: {
      ...resolvedConversationWhere,
      status: {
        in: [WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED],
      },
    },
  });

  const resolutionRate =
    totalConversationsTillTheday > 0
      ? (resolvedConversation / totalConversationsTillTheday) * 100
      : 0;

  return {
    totalConversations, // conversation created on range of given days
    averageResponseTime,
    resolutionRate, // resolved conversation rate on the range of given day by total conversation till the date
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
      AND "status" = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
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
    AND "status" = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
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

export async function getAvargeResponseTimeofTodyaInEveryHour(
  orgId: string,
  dateKey,
  dateRange,
) {
  const startDate = new Date(dateRange[0]);
  const endDate = new Date(dateRange[1]);

  const groupByHour = dateKey === "today" || dateKey === "yesterday";
  const result = await prisma.$queryRaw<
    {
      period: string;
      averageResponseTime: number;
    }[]
  >`
WITH convo AS (
  SELECT
    c."createdAt",
    c."firstRespondedAt"
  FROM "Conversation" c
  WHERE c."contactId" IN (
      SELECT id FROM "Contact" WHERE "orgId" = ${orgId}::uuid
    )
    AND c."firstRespondedAt" IS NOT NULL
    AND c."createdAt" >= ${startDate}
    AND c."createdAt" < ${endDate}
)
SELECT
  ${
    groupByHour
      ? `to_char(date_trunc('hour', c."createdAt"), 'HH12 AM')`
      : `to_char(date_trunc('day', c."createdAt"), 'YYYY-MM-DD')`
  } AS period,
  AVG(EXTRACT(EPOCH FROM (c."firstRespondedAt" - c."createdAt"))) AS "averageResponseTime"
FROM convo c
GROUP BY period
HAVING COUNT(*) > 0
ORDER BY period;
`;
  return result;
}

export async function getConversationOnAccountDistribution(
  orgId: string,
  dateRange,
) {
  const startDate = new Date(dateRange[0]);
  const endDate = new Date(dateRange[1]);
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
    COUNT(*)::INTEGER AS "conversationCount",
    ws."phoneId",
    ws."ibaId",
    ws."phone",
    wm."sourcePlatform"
    FROM "Conversation" c
    JOIN "Contact" ct ON c."contactId" = ct.id
    LEFT JOIN "WaMessage" wm ON wm."conversationId" = c.id
    LEFT JOIN "WhatsappSettings" ws
    ON REGEXP_REPLACE(wm."sourceIdentifier", '^\\+', '') = 
       REGEXP_REPLACE(COALESCE(ws."phone", ws."ibaId"), '^\\+', '')
    WHERE ct."orgId" = ${orgId}::uuid AND wm."sourceIdentifier" IS NOT NULL AND c."createdAt" >= ${startDate}
    AND c."createdAt" < ${endDate}
    GROUP BY REGEXP_REPLACE(wm."sourceIdentifier", '^\\+', ''), ws."phoneId", ws."ibaId", ws."phone", wm."sourcePlatform";
  `;
  return result;
}

export async function getOverAllQuickStatsOfConversations(orgId: string) {
  const result = await prisma.$queryRaw<
    {
      activeConversations: number;
      resolvedToday: number;
      pendingConversations: number;
      staffOnline: number;
      totalStaff: number;
      conversationCreatedToday: number;
      totalConversation: number;
      resolvedYesterday: number;
    }[]
  >`
 SELECT
    COUNT(*) FILTER (WHERE c."status" = ${WaMessageAssignStatus.ASSIGNED})::INTEGER AS "activeConversations",
    COUNT(*) FILTER (WHERE c."status" = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}) AND c."closedAt"::date = CURRENT_DATE)::INTEGER AS "resolvedToday",
    COUNT(*) FILTER (WHERE c."status" = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]}) AND c."closedAt"::date = CURRENT_DATE - INTERVAL '1 day')::INTEGER AS "resolvedYesterday",
    COUNT(*) FILTER (WHERE c."createdAt"::date = CURRENT_DATE)::INTEGER AS "conversationCreatedToday",
    COUNT(*)::INTEGER AS "totalConversation",
    COUNT(*) FILTER (WHERE c."status" = ${WaMessageAssignStatus.UNASSIGNED})::INTEGER AS "pendingConversations",
    (SELECT COUNT(*)::INTEGER FROM "OrgMember" WHERE "orgId" = ${orgId} AND "status" = 'online') AS "staffOnline",
    (SELECT COUNT(*)::INTEGER FROM "OrgMember" WHERE "orgId" = ${orgId}) AS "totalStaff"
FROM "Conversation" c
JOIN "Contact" ct ON c."contactId" = ct.id
WHERE ct."orgId" = ${orgId}::uuid;
  `;
  const {
    resolvedYesterday,
    totalConversation,
    conversationCreatedToday,
    resolvedToday,
    ...rest
  } = result[0];
  const todayResolvedRate = totalConversation
    ? Math.round(
        ((resolvedToday / totalConversation) * 100 + Number.EPSILON) * 100,
      ) / 100
    : 0;
  const yesterdayResolvedRate = totalConversation
    ? Math.round(
        ((resolvedYesterday / (totalConversation - conversationCreatedToday)) *
          100 +
          Number.EPSILON) *
          100,
      ) / 100
    : 0;
  const reolvedRateDifference = todayResolvedRate - yesterdayResolvedRate;
  return { ...rest, resolvedToday, reolvedRateDifference };
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
  WHERE vc."status" = ${WaMessageAssignStatus.ASSIGNED}
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
  WHERE vc."status" = ANY (${[
    WaMessageAssignStatus.RESOLVED,
    WaMessageAssignStatus.CLOSED,
  ]})
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
    THEN 0
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
    THEN 0
    ELSE
      (
        (r.avg_response_time_last_7d - r.avg_response_time_prev_7d)
        / r.avg_response_time_prev_7d
      ) * 100
  END AS "responseTimeRateByLastWeek"

FROM "OrgMember" om
LEFT JOIN "User" u ON u.id = om."userId"
LEFT JOIN assigned_stats a ON a."userId" = om."userId"
LEFT JOIN closed_stats c ON c."userId" = om."userId"
LEFT JOIN message_stats m ON m."userId" = om."userId"
LEFT JOIN response_stats r ON r."userId" = om."userId"
WHERE om."orgId" = ${orgId};
  `;
  return result;
}

export async function getStaffDetailedConversationAnalytics(
  orgId,
  userId,
  days,
) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const result = await prisma.$queryRaw<{
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
 WITH dates AS (
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
            SELECT MIN((ah->>'date')::timestamptz)
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
        MIN(wm."waCreatedAt") FILTER (
            WHERE wm."sendBy" = ${userId}
        ) AS "firstResponded",
        MAX(wm."waCreatedAt") FILTER (WHERE wm."sendBy" = ${userId}) AS "lastResponded"
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
    ORDER BY t."lastResponded" DESC
    LIMIT 4
),

metrics AS (
    SELECT 
        -- resolution rate
        (
            SELECT 
                (COUNT(*) FILTER (
                    WHERE ac.status = ANY(${[WaMessageAssignStatus.RESOLVED, WaMessageAssignStatus.CLOSED]})
                    AND ac."closedBy" = ${userId}
                )::DECIMAL
                /
                NULLIF(COUNT(*), 0)) * 100
            FROM assigned_conversations ac
        ) AS "resolutionRate",

        -- first response time (assignment-based)
        (
            SELECT 
                AVG(EXTRACT(EPOCH FROM (t."firstResponded" - ac."firstAssignedAt")))
            FROM assigned_conversations ac
            JOIN user_message_times t ON t."conversationId" = ac.id
            WHERE t."firstResponded" IS NOT NULL AND ac."firstAssignedAt" IS NOT NULL
        ) AS "firstResponseTime",

        -- avg handling time
        (
            SELECT 
                AVG(EXTRACT(EPOCH FROM (t."lastResponded" - t."firstResponded")))
            FROM user_message_times t
            WHERE t."firstResponded" IS NOT NULL
              AND t."lastResponded" IS NOT NULL
        ) AS "avgHandlingTime"
)

SELECT 
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
    ) AS metrics;
  `;
  return result[0];
}
