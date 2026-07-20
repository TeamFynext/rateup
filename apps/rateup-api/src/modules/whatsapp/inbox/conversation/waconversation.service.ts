import prisma from "../../../../utils/prisma.js";
import { Role } from "../../../../utils/enums/index.js";
import { WaAssignedChatPermission } from "../../../../types/enums.js";
import { WaMessageClosedStatus } from "../../constants.js";
import { ConversationFilterSchema } from "./waconversation.schema.js";

const PAGE_SIZE = 20;

/// An assignment row that is currently in force: never revoked, or re-assigned
/// after its last revocation. The conversation-side counterpart of a
/// `WaInboxAssign` row existing.
const ACTIVE_ASSIGNMENT = `(cam."lastRemovedAt" IS NULL OR cam."lastAssignedAt" > cam."lastRemovedAt")`;

function activeAssignmentExists(conditions: string[]): string {
  return `EXISTS (
    SELECT 1 FROM "ConversationAssignedUserTeamMap" cam
    WHERE cam."conversationId" = conv.id AND ${ACTIVE_ASSIGNMENT}
    ${conditions.length ? `AND ${conditions.join(" AND ")}` : ""}
  )`;
}

/**
 * The session-centric chat list: one row per *conversation*, joined with its
 * contact. The successor of the contact-keyed `filterChats`.
 *
 * Tab semantics (openness is `closedAt IS NULL`, never the status string):
 *   - New        open, UNASSIGNED, never replied to, customer activity < 24h
 *   - UnAssigned open + UNASSIGNED
 *   - Assigned   open + ASSIGNED
 *   - mine       open + actively assigned to the caller
 *   - Closed     every past session — one row per conversation, so a contact
 *                appears once per closed session by design
 *   - open/all   openness only / no constraint
 *
 * Assignment predicates read `ConversationAssignedUserTeamMap` active rows,
 * not the legacy `WaInboxAssign` table.
 */
export async function filterConversations(
  orgId: string,
  filter: ConversationFilterSchema,
  userId: string,
  role: Role,
) {
  const params: any[] = [orgId, (filter.page - 1) * PAGE_SIZE, userId];
  let p = 4;
  const filters: string[] = [`conv."orgId" = $1::uuid`];

  applyTabFilters(filters, params, filter, userId, () => p++);

  // Optional narrowing shared by every tab.
  if (filter.assignedTeams?.length) {
    params.push(filter.assignedTeams);
    filters.push(activeAssignmentExists([`cam."teamId" = ANY($${p++}::uuid[])`]));
  }
  if (filter.assignedUserIds?.length && filter.tab !== "mine") {
    params.push(filter.assignedUserIds);
    filters.push(activeAssignmentExists([`cam."userId" = ANY($${p++}::uuid[])`]));
  }
  if (filter.labels?.length) {
    params.push(filter.labels);
    filters.push(`EXISTS (
      SELECT 1 FROM "ContactLabelMap" clm
      WHERE clm."contactId" = c.id AND clm."labelId" = ANY($${p++}::uuid[])
    )`);
  }
  if (filter.lifecycle) {
    params.push(filter.lifecycle);
    filters.push(`c."lifecycleId" = $${p++}::uuid`);
  }
  // Channel filter: the conversation must carry a message on the selected
  // channel (WhatsApp number matched with and without a leading '+'), scoped to
  // the conversation rather than the whole contact so a session that never used
  // this channel is excluded.
  if (filter.channel && filter.channel !== "all") {
    params.push(filter.channel);
    params.push(`+${filter.channel}`);
    filters.push(`EXISTS (
      SELECT 1 FROM "WaMessage" wm
      WHERE wm."conversationId" = conv.id
        AND (wm."sourceIdentifier" = $${p} OR wm."sourceIdentifier" = $${p + 1})
    )`);
    p += 2;
  }
  if (filter.searchTerm?.length) {
    params.push(`%${filter.searchTerm}%`);
    params.push(`%${filter.searchTerm.replace(/\s+/g, "")}%`);
    filters.push(
      `(c."name" ILIKE $${p}::TEXT OR REPLACE(c."phone", ' ', '') LIKE $${p + 1}::TEXT)`,
    );
    p += 2;
  }
  filters.push(`c."blockedOnWhatsApp" = ${filter.blockedUsers ? "TRUE" : "FALSE"}`);

  // Org-level visibility permission, mirrored from the legacy list: with
  // "TeamMembers", members only see assigned chats of their own teams; with
  // "Admins", members only see chats assigned to themselves. Unassigned tabs
  // stay visible to everyone (someone has to pick new chats up).
  if (role === Role.MEMBER && (filter.tab === "Assigned" || filter.tab === "all")) {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { waAssignedChatPermission: true },
    });
    if (org?.waAssignedChatPermission === WaAssignedChatPermission.TeamMembers) {
      // Lazy: team.service transitively initializes supertokens; only this
      // rare branch needs it.
      const { getTeamIdsByUserId } = await import("../../../team/team.service.js");
      const teamIds = await getTeamIdsByUserId(userId);
      params.push(teamIds);
      const scoped = activeAssignmentExists([`cam."teamId" = ANY($${p++}::uuid[])`]);
      filters.push(
        filter.tab === "Assigned"
          ? scoped
          : `(conv."status"::TEXT <> 'ASSIGNED' OR ${scoped})`,
      );
    } else if (org?.waAssignedChatPermission === WaAssignedChatPermission.Admins) {
      const scoped = activeAssignmentExists([`cam."userId" = $3::uuid`]);
      filters.push(
        filter.tab === "Assigned"
          ? scoped
          : `(conv."status"::TEXT <> 'ASSIGNED' OR ${scoped})`,
      );
    }
  }

  const dir = filter.sortBy === "oldest" ? "ASC" : "DESC";
  const query = `
    WITH filtered AS (
      SELECT
        conv.id                       AS "conversationId",
        conv."status"                 AS "conversationStatus",
        conv."createdAt"              AS "conversationCreatedAt",
        conv."closedAt",
        conv."closedBy",
        conv."closeReason",
        conv."closedByAutomation",
        conv."firstRespondedAt",
        conv."assignedAt",
        conv."lastMessageAt",
        conv."lastCustomerMessageAt",
        conv."lastAgentMessageAt",
        conv."messageCount",
        conv."reopenCount",
        conv."openTrigger",
        (conv."firstRespondedAt" IS NOT NULL)             AS "isReplied",
        (
          SELECT COUNT(*)::INTEGER FROM "WaMessage" w
          WHERE w."conversationId" = conv.id
            AND w."messageBody"->>'exchangeProcess' = 'receive'
            AND NOT($3::TEXT = ANY(w."readUsers"))
        ) AS "unReadMessageCount",
        c.id                          AS "contactId",
        c."name",
        c."phone",
        c."other",
        c."aiWaChat",
        c."waMessageAssignStatus",
        c."lastReceivedMessageTimeStamp",
        c."consent",
        c."whatsappUserName",
        c."blockedOnWhatsApp",
        c."source",
        c."igsId",
        c."psid",
        c."profilePic",
        c."followerCount",
        c."isIgVerifiedUser",
        c."lifecycleId",
        COALESCE(c.tags, '{}'::jsonb) AS tags,
        c."lastReceivedMetadata"
      FROM "Conversation" conv
      JOIN "Contact" c ON c.id = conv."contactId"
      WHERE ${filters.join(" AND ")}
      ORDER BY conv."lastMessageAt" ${dir} NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET $2
    ),
    assigned_users AS (
      SELECT
        cam."conversationId",
        json_agg(json_build_object('id', u.id, 'teamId', cam."teamId", 'name', u.name)) AS users
      FROM "ConversationAssignedUserTeamMap" cam
      INNER JOIN "User" u ON cam."userId" = u.id
      WHERE cam."conversationId" IN (SELECT "conversationId" FROM filtered)
        AND ${ACTIVE_ASSIGNMENT}
      GROUP BY cam."conversationId"
    ),
    contact_labels AS (
      SELECT
        clm."contactId",
        json_agg(json_build_object('id', cl.id, 'name', cl.name, 'color', cl.color)) AS labels
      FROM "ContactLabelMap" clm
      INNER JOIN "ContactLabel" cl ON clm."labelId" = cl.id
      WHERE clm."contactId" IN (SELECT "contactId" FROM filtered)
      GROUP BY clm."contactId"
    )
    SELECT
      f.*,
      COALESCE(au.users, '[]'::json)   AS "assignedUsers",
      COALESCE(cls.labels, '[]'::json) AS "contactLabels",
      l."name"                         AS "lifecycleName",
      cu."name"                        AS "closedByName",
      lm."messageBody"                 AS "lastMessageBody",
      lm."waCreatedAt"                 AS "lastMessageWaCreatedAt",
      lm."sourcePlatform"              AS "lastMessagePlatform",
      lm."sourceIdentifier"            AS "lastMessageSourceIdentifier"
    FROM filtered f
    LEFT JOIN assigned_users au ON au."conversationId" = f."conversationId"
    LEFT JOIN contact_labels cls ON cls."contactId" = f."contactId"
    LEFT JOIN "Lifecycle" l ON l.id = f."lifecycleId"
    LEFT JOIN "User" cu ON cu.id = f."closedBy"
    LEFT JOIN LATERAL (
      SELECT w."messageBody", w."waCreatedAt", w."sourcePlatform", w."sourceIdentifier"
      FROM "WaMessage" w
      WHERE w."conversationId" = f."conversationId"
      ORDER BY w."waCreatedAt" DESC
      LIMIT 1
    ) lm ON TRUE
    ORDER BY f."lastMessageAt" ${dir} NULLS LAST;
  `;

  const rows: any[] = await prisma.$queryRawUnsafe(query, ...params);

  return rows.map((r) => ({
    conversation: {
      id: r.conversationId,
      status: r.conversationStatus,
      createdAt: r.conversationCreatedAt,
      closedAt: r.closedAt,
      closedBy: r.closedBy,
      closedUser: r.closedBy ? { id: r.closedBy, name: r.closedByName } : null,
      closeReason: r.closeReason,
      closedByAutomation: r.closedByAutomation,
      firstRespondedAt: r.firstRespondedAt,
      assignedAt: r.assignedAt,
      lastMessageAt: r.lastMessageAt,
      lastCustomerMessageAt: r.lastCustomerMessageAt,
      lastAgentMessageAt: r.lastAgentMessageAt,
      messageCount: r.messageCount,
      reopenCount: r.reopenCount,
      openTrigger: r.openTrigger,
      isReplied: r.isReplied,
      unReadMessageCount: r.unReadMessageCount,
      assignedUsers: r.assignedUsers,
      lastMessage: r.lastMessageBody
        ? {
            messageBody: r.lastMessageBody,
            waCreatedAt: r.lastMessageWaCreatedAt,
            sourcePlatform: r.lastMessagePlatform,
            sourceIdentifier: r.lastMessageSourceIdentifier,
          }
        : null,
    },
    contact: {
      id: r.contactId,
      name: r.name,
      phone: r.phone,
      other: r.other,
      aiWaChat: r.aiWaChat,
      waMessageAssignStatus: r.waMessageAssignStatus,
      lastReceivedMessageTimeStamp: r.lastReceivedMessageTimeStamp,
      consent: r.consent,
      whatsappUserName: r.whatsappUserName,
      blockedOnWhatsApp: r.blockedOnWhatsApp,
      source: r.source,
      igsId: r.igsId,
      psid: r.psid,
      profilePic: r.profilePic,
      followerCount: r.followerCount,
      isIgVerifiedUser: r.isIgVerifiedUser,
      lifecycleId: r.lifecycleId,
      lifecycleName: r.lifecycleName,
      tags: r.tags,
      contactLabels: r.contactLabels,
      metadata: r.lastReceivedMetadata,
    },
  }));
}

function applyTabFilters(
  filters: string[],
  params: any[],
  filter: ConversationFilterSchema,
  userId: string,
  nextParam: () => number,
) {
  switch (filter.tab) {
    case "New":
      filters.push(
        `conv."closedAt" IS NULL`,
        `conv."status"::TEXT = 'UNASSIGNED'`,
        `conv."firstRespondedAt" IS NULL`,
        `conv."lastCustomerMessageAt" > NOW() - INTERVAL '24 hours'`,
      );
      break;
    case "UnAssigned":
      filters.push(`conv."closedAt" IS NULL`, `conv."status"::TEXT = 'UNASSIGNED'`);
      break;
    case "Assigned":
      filters.push(`conv."closedAt" IS NULL`, `conv."status"::TEXT = 'ASSIGNED'`);
      break;
    case "mine":
      filters.push(`conv."closedAt" IS NULL`, activeAssignmentExists([`cam."userId" = $3::uuid`]));
      break;
    case "Closed": {
      filters.push(`conv."closedAt" IS NOT NULL`);
      const statuses = filter.status.length ? filter.status : [...WaMessageClosedStatus];
      params.push(statuses);
      filters.push(`conv."status"::TEXT = ANY($${nextParam()}::TEXT[])`);
      break;
    }
    case "open":
      filters.push(`conv."closedAt" IS NULL`);
      break;
    case "all":
    default:
      if (filter.status.length) {
        params.push(filter.status);
        filters.push(`conv."status"::TEXT = ANY($${nextParam()}::TEXT[])`);
      }
      break;
  }
}

/// Per-tab counts for the session-centric inbox. Counts conversation rows —
/// unlike the legacy `getInboxCountsFromConversations`, which stays
/// contact-distinct for the contact-keyed UI.
export async function getConversationCountsByTab(orgId: string, userId: string) {
  const [row]: any[] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (
        WHERE "closedAt" IS NULL AND status = 'UNASSIGNED'
          AND "firstRespondedAt" IS NULL
          AND "lastCustomerMessageAt" > NOW() - INTERVAL '24 hours'
      )::INT AS "new",
      COUNT(*) FILTER (WHERE "closedAt" IS NULL AND status = 'UNASSIGNED')::INT AS "unassigned",
      COUNT(*) FILTER (WHERE "closedAt" IS NULL AND status = 'ASSIGNED')::INT   AS "assigned",
      COUNT(*) FILTER (WHERE "closedAt" IS NULL)::INT                           AS "open",
      COUNT(*) FILTER (WHERE "closedAt" IS NOT NULL)::INT                       AS "closed",
      COUNT(*)::INT                                                             AS "all"
    FROM "Conversation"
    WHERE "orgId" = ${orgId}::uuid
  `;

  const [mineRow]: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::INT AS "mine"
    FROM "Conversation" conv
    WHERE conv."orgId" = ${orgId}::uuid
      AND conv."closedAt" IS NULL
      AND EXISTS (
        SELECT 1 FROM "ConversationAssignedUserTeamMap" cam
        WHERE cam."conversationId" = conv.id
          AND cam."userId" = ${userId}::uuid
          AND (cam."lastRemovedAt" IS NULL OR cam."lastAssignedAt" > cam."lastRemovedAt")
      )
  `;

  return { ...row, mine: mineRow?.mine ?? 0 };
}

/// A conversation scoped to the caller's org, or null. Every :conversationId
/// endpoint resolves through this so cross-org probing 404s.
export async function getOrgConversation(conversationId: string, orgId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });
  if (!conversation || conversation.orgId !== orgId) return null;
  return conversation;
}

export async function getWaMessagesByConversationId(conversationId: string, cursor?: string | null) {
  const messages = await prisma.waMessage.findMany({
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: { conversationId },
    include: {
      sender: {
        select: {
          name: true,
          profilePhoto: true,
        },
      },
    },
    orderBy: { waCreatedAt: "desc" },
  });
  const hasNextPage = messages.length === 50;
  const nextCursor = hasNextPage ? messages.at(-1)!.id : null;
  return { messages, nextCursor, hasNextPage };
}
