import { log } from "../../logger.js";
import { notificationQueue } from "../../../bullmq/queues/notification.queue.js";
import prisma from "../../../../utils/prisma.js";
import { renderWeeklyReportEmailBodies } from "../../../../utils/email/react/templates.js";

/** The window the report's queries cover, and what the email calls it. */
const DATE_RANGE = "Last 7 Days";

export async function getWeeklyConversationReport() {
  try {
    const rows = await fetchWeeklyConversationStatsByOrg();

    const report = await Promise.all(
      rows.map(async (row: any) => {
        const seconds = Number(row.avg_response_time_seconds || 0);
        const formatted = formatTimeToNearestUnitFromSeconds(seconds);
        const teams = await fetchTeamOverviewByOrg(row.orgId);
        const usage = await fetchWeeklyWaUsageByOrg(row.orgId);

        return {
          orgId: row.orgId,
          orgName: row.orgName,
          email: row.email,

          totalConversations: Number(row.total_conversations || 0),
          resolvedChats: Number(row.resolved_chats || 0),
          pendingChats: Number(row.pending_chats || 0),

          averageResponseTime: formatted ? `${formatted.value} ${formatted.suffix}` : "—",

          averageResponseTimeSeconds: seconds,

          topPerformers: (row.top_performers || []).map((user: any) => {
            const userSeconds = Number(user.avgResponseTimeSeconds || 0);

            const formattedUserTime = formatTimeToNearestUnitFromSeconds(userSeconds);

            return {
              userId: user.userId,
              name: user.name,
              email: user.email,

              totalMessages: Number(user.totalMessages || 0),
              resolvedChats: Number(user.resolvedChats || 0),

              averageResponseTime: formattedUserTime
                ? `${formattedUserTime.value} ${formattedUserTime.suffix}`
                : "—",

              averageResponseTimeSeconds: userSeconds,
            };
          }),

          teams: (teams || []).map((team: any) => {
            const teamSeconds = Number(team.averageResponseTime || 0);
            const formattedTeamTime = formatTimeToNearestUnitFromSeconds(teamSeconds);

            return {
              teamId: team.teamId,
              name: team.teamName,
              color: team.teamColor,

              assignedConversations: Number(team.assignedConversations || 0),
              messagesSent: Number(team.messagesSent || 0),

              teamMembers: Number(team.teamMembers || 0),
              teamMembersOnline: Number(team.teamMembersOnline || 0),

              averageResponseTime: formattedTeamTime
                ? `${formattedTeamTime.value} ${formattedTeamTime.suffix}`
                : "—",

              averageResponseTimeSeconds: teamSeconds,
            };
          }),
          usage,
        };
      }),
    );

    for (const org of report) {
      const templateData = await renderWeeklyReportEmailBodies({
        // The template's heading is the org's name; this used to pass the owner's
        // email address, so every report was titled with an email.
        orgName: org.orgName ?? org.email,
        totalConversations: org.totalConversations,
        resolvedChats: org.resolvedChats,
        pendingChats: org.pendingChats,
        averageResponseTime: org.averageResponseTime,
        topPerformers: org.topPerformers,
        teams: org.teams,
        usage: org.usage,
        dateRange: DATE_RANGE,
      });

      await notificationQueue.add("notification", {
        emailData: {
          to: org.email,
          subject: `RateUp Weekly Report — ${DATE_RANGE}`,
          html: templateData.html,
          text: templateData.text,
        },
      });
    }
    return report;
  } catch (error) {
    log.error("Error fetching org-wise report: %o", error);
    throw error;
  }
}

async function fetchWeeklyConversationStatsByOrg() {
  const rows = await prisma.$queryRaw<any[]>`
    WITH org_stats AS (
      SELECT
        o.id AS "orgId",
        o.name AS "orgName",
        u.email,

        COUNT(DISTINCT c.id) FILTER (
          WHERE c."createdAt" >= NOW() - INTERVAL '7 days'
        ) AS total_conversations,

        AVG(
          EXTRACT(EPOCH FROM (
            c."firstRespondedAt" - c."createdAt"
          ))
        ) FILTER (
          WHERE c."firstRespondedAt" IS NOT NULL
          AND c."createdAt" >= NOW() - INTERVAL '7 days'
        ) AS avg_response_time_seconds,

        -- Status is read from the conversation, not from Contact. Since the inbox
        -- became conversation-grained, Contact."waMessageAssignStatus" is a
        -- per-person rollup: filtering tickets by it counted every ticket a
        -- contact had ever opened as resolved the moment that contact was.
        COUNT(DISTINCT c.id) FILTER (
          WHERE c."status" = 'RESOLVED'
          AND c."createdAt" >= NOW() - INTERVAL '7 days'
        ) AS resolved_chats,

        COUNT(DISTINCT c.id) FILTER (
          WHERE c."status" = 'UNASSIGNED'
          AND c."createdAt" >= NOW() - INTERVAL '7 days'
        ) AS pending_chats

      FROM "Org" o
      JOIN "User" u ON u.id = o."ownerId"
      LEFT JOIN "Contact" ct ON ct."orgId" = o.id
      LEFT JOIN "Conversation" c ON c."contactId" = ct.id

      WHERE u.active = TRUE

      GROUP BY o.id, o.name, u.email
    ),

    user_performance AS (
  SELECT
    ct."orgId",
    u.id as "userId",
    u.name,
    u.email,

    COUNT(wm.id) FILTER (
      WHERE wm."createdAt" >= NOW() - INTERVAL '7 days'
    ) AS total_messages_sent,

    AVG(
      EXTRACT(EPOCH FROM (
        wm_first."createdAt" - c."createdAt"
      ))
    ) AS avg_response_time_seconds,

    COUNT(DISTINCT c.id) FILTER (
      WHERE c."closedBy" = u.id
      AND c."closedAt" >= NOW() - INTERVAL '7 days'
    ) AS resolved_chats_by_user,

    ROW_NUMBER() OVER (
      PARTITION BY ct."orgId"
      ORDER BY COUNT(wm.id) DESC
    ) as rank

  FROM "User" u
  JOIN "WaMessage" wm ON wm."sendBy" = u.id
  JOIN "Conversation" c ON c.id = wm."conversationId"
  JOIN "Contact" ct ON ct.id = c."contactId"

  JOIN LATERAL (
    SELECT wm1.*
    FROM "WaMessage" wm1
    WHERE wm1."conversationId" = c.id
      AND wm1."sendBy" = u.id
    ORDER BY wm1."createdAt"
    LIMIT 1
  ) wm_first ON TRUE

  WHERE wm."createdAt" >= NOW() - INTERVAL '7 days'

  GROUP BY ct."orgId", u.id
)

    SELECT
      os.*,

      json_agg(
        json_build_object(
          'userId', up."userId",
          'name', up.name,
          'email', up.email,
          'totalMessages', up.total_messages_sent,
          'avgResponseTimeSeconds', up.avg_response_time_seconds,
          'resolvedChats', up.resolved_chats_by_user
        )
      ) FILTER (WHERE up.rank <= 3) AS top_performers

    FROM org_stats os
    LEFT JOIN user_performance up
      ON up."orgId" = os."orgId"

    GROUP BY os."orgId", os."orgName", os.email,
             os.total_conversations,
             os.avg_response_time_seconds,
             os.resolved_chats,
             os.pending_chats

    ORDER BY os."orgId"
  `;

  return rows;
}

export function formatTimeToNearestUnitFromSeconds(seconds: number) {
  if (seconds == null) return;
  if (seconds === 0) return { value: 0, suffix: "minute(s)" };

  if (seconds < 3600) {
    return {
      value: Math.round(seconds / 60),
      suffix: "minute(s)",
    };
  }

  if (seconds < 86400) {
    return {
      value: Math.round(seconds / 3600),
      suffix: "hour(s)",
    };
  }

  return {
    value: Math.round(seconds / 86400),
    suffix: "day(s)",
  };
}

async function fetchTeamOverviewByOrg(orgId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    WITH first_agent_message AS (
      SELECT wm."conversationId", MIN(wm."waCreatedAt") AS "firstAgentMessageAt"
      FROM "WaMessage" wm
      WHERE wm."sendBy" IS NOT NULL
        AND wm."waCreatedAt" >= NOW() - INTERVAL '7 days'
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
        AND wm."waCreatedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY cau."teamId"
    )

    SELECT
      t.id AS "teamId",
      t.name AS "teamName",
      t.color AS "teamColor",

      COUNT(DISTINCT c.id) FILTER (
        WHERE c."status" = 'ASSIGNED'
        AND c."createdAt" >= NOW() - INTERVAL '7 days'
      )::INTEGER AS "assignedConversations",

      AVG(
        EXTRACT(EPOCH FROM (
          COALESCE(c."firstRespondedByUserAt", fam."firstAgentMessageAt") - c."createdAt"
        ))
      ) FILTER (
        WHERE c."createdAt" >= NOW() - INTERVAL '7 days'
      ) AS "averageResponseTime",

      COUNT(DISTINCT u.id)::INTEGER AS "teamMembers",

      COUNT(DISTINCT u.id) FILTER (
        WHERE om."status" = 'online'
      )::INTEGER AS "teamMembersOnline",

      COALESCE(mpt."messagesSent", 0) AS "messagesSent"

    FROM "Team" t
    LEFT JOIN "ConversationAssignedUserTeamMap" cau ON cau."teamId" = t.id
    LEFT JOIN "Conversation" c ON c.id = cau."conversationId"
    LEFT JOIN "Contact" ct ON ct.id = c."contactId"
    LEFT JOIN first_agent_message fam ON fam."conversationId" = c.id
    LEFT JOIN "TeamMember" tm ON tm."teamId" = t.id
    LEFT JOIN "User" u ON tm."userId" = u.id
      AND u."active" = true
      AND u."deletedAt" IS NULL
    LEFT JOIN "OrgMember" om ON u.id = om."userId"
      AND om."orgId" = ${orgId}::uuid
    LEFT JOIN messages_per_team mpt ON mpt."teamId" = t.id

    WHERE t."orgId" = ${orgId}::uuid

    GROUP BY t.id, t.name, t.color, mpt."messagesSent"
    ORDER BY "assignedConversations" DESC
  `;

  return rows;
}

async function fetchWeeklyWaUsageByOrg(orgId: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      motm."externalApi",

      COUNT(*)::INT AS total_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      )::INT AS delivered_messages,

      COUNT(*) FILTER (
        WHERE wm.stats ? 'failed'
          AND wm.stats->>'failed' <> ''
      )::INT AS failed_messages,

      AVG(
        EXTRACT(
          EPOCH FROM (
            (wm.stats->>'delivered')::timestamptz -
            (wm.stats->>'sent')::timestamptz
          )
        )
      ) FILTER (
        WHERE wm.stats ? 'delivered'
          AND wm.stats->>'delivered' <> ''
      ) AS avg_delivery_time_seconds

    FROM "WaMessageOrgTeamMap" motm
    JOIN "WaMessage" wm ON wm.id = motm."messageId"

    WHERE motm."orgId" = ${orgId}::uuid
      AND wm."createdAt" >= NOW() - INTERVAL '7 days'

    GROUP BY motm."externalApi"
  `;

  const empty = {
    totalMessages: 0,
    deliveredMessages: 0,
    deliveredPercentage: 0,
    failedMessages: 0,
    failedPercentage: 0,
    avgDeliveryTimeSeconds: null,
  };

  const build = (row: any) => {
    if (!row) return empty;

    const total = Number(row.total_messages || 0);
    const delivered = Number(row.delivered_messages || 0);
    const failed = Number(row.failed_messages || 0);

    return {
      totalMessages: total,

      deliveredMessages: delivered,
      deliveredPercentage: total === 0 ? 0 : Number(((delivered / total) * 100).toFixed(2)),

      failedMessages: failed,
      failedPercentage: total === 0 ? 0 : Number(((failed / total) * 100).toFixed(2)),

      avgDeliveryTimeSeconds: row.avg_delivery_time_seconds
        ? Number(row.avg_delivery_time_seconds)
        : null,
    };
  };

  const externalRow = rows.find((r: any) => r.externalApi === true);
  const campaignRow = rows.find((r: any) => r.externalApi === false);

  return {
    external: build(externalRow),
    campaign: build(campaignRow),
  };
}
