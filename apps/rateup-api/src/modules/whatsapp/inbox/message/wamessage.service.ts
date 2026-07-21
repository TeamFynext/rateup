import {
  Campaign,
  Contact,
  ContactGroup,
  PlatformType,
  Prisma,
  WaAccountSettings,
  WaMessage,
} from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import {
  DateType,
  GenerateInboxResponseBody,
  WaChatExportConstraints,
  WaChatFilterSchema,
  WaMessageAssignBody,
} from "./wamessage.schema.js";
import { log } from "../../../../utils/logger.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaSettings } from "../../settings/wa_settings.service.js";
import axios from "axios";
import { WaAssignedChatPermission, WaMessageAssignStatus } from "../../../../types/enums.js";
import { updateContactById } from "../../../contact/contact.service.js";
import { wait } from "../../whatsappSurvey/wasurvey.controller.js";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service.js";
import {
  createReplyImageMessage,
  createDocumentMessage,
  createVideoMessage,
  createAudioMessage,
  createContactMessage,
  createLocationMessage,
} from "../../whatsappSurvey/wasurvey.utils.js";
import { WaMessageAssignStatusTab, WaMessageClosedStatus } from "../../constants.js";
import { getInboxCountsFromConversations } from "../inboxStats/inboxStats.service.js";
import { Role } from "../../../org/org.services.js";
import { getTeamIdsByUserId } from "../../../team/team.service.js";
import { UserAvailabilityStatus } from "../../../user/user.schema.js";
import { getNotificationSettings } from "../../../notification/notification.service.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../integrations/external/zapier/zapier.service.js";
import { faker } from "@faker-js/faker";
import {
  getLastCreatedConversationForContact,
  openConversationForContact,
  updateConversationAssignees,
} from "../../../contact/conversation/conversation.service.js";
import { isTerminalInboxStatus } from "../../constants.js";
import { notificationQueue, sendMessageQueue } from "../../../../utils/redisConnection.js";
import dayjs from "dayjs";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  sourcePlatform: PlatformType,
  sourceIdentifier: string,
  conversationId: string,
  componentParams?: any,
  messageId?: string,
  sendBy?: string,
  failed: boolean = false,
  sourceMessage: string = "inbox",
  logs = {},
) {
  const initialStats = {
    read: "",
    sent: "",
    failed: "",
    delivered: "",
  };
  if (sourcePlatform === PlatformType.WEBCHAT) {
    initialStats.sent = waCreatedAt;
    initialStats.delivered = waCreatedAt;
  }

  if (sourcePlatform === PlatformType.INSTAGRAM || sourcePlatform === PlatformType.FACEBOOK) {
    initialStats.sent = waCreatedAt;
  }

  if (failed) {
    initialStats.failed = waCreatedAt;
  }
  let statsData = {};
  if (
    failed ||
    sourcePlatform === PlatformType.WEBCHAT ||
    sourcePlatform === PlatformType.INSTAGRAM ||
    sourcePlatform === PlatformType.FACEBOOK
  ) {
    statsData = { stats: initialStats };
  }

  const createMessage = prisma.waMessage.create({
    data: {
      messageBody: messageBody as any,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
      sendBy,
      sourcePlatform,
      sourceIdentifier,
      conversationId,
      ...statsData,
      sourceMessage,
      logs,
    },
    include: {
      sender: {
        select: {
          name: true,
          profilePhoto: true,
        },
      },
    },
  });

  // Keep the denormalized conversation metrics in step with the message that
  // produced them. INTERNAL messages (system notes, private notes) carry a
  // `sendBy` but are not agent replies, so they must not touch these counters.
  const tracksMetrics = Boolean(conversationId) && sourcePlatform !== PlatformType.INTERNAL;
  if (!tracksMetrics) return await createMessage;

  const messageAt = waCreatedAt ? new Date(waCreatedAt) : new Date();
  const [newMessage] = await prisma.$transaction([
    createMessage,
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: messageAt,
        // Direction is inferred from `sendBy`: null means inbound.
        ...(sendBy ? { lastAgentMessageAt: messageAt } : { lastCustomerMessageAt: messageAt }),
      },
    }),
  ]);

  return newMessage;
}

export async function getWaMessagesByContactId(
  contactId: string,
  cursor: string | null,
  phone?: string,
  conversationId?: string | null,
) {
  let messages: WaMessage[];
  const sourceIdentifierCondition =
    phone && phone !== "all"
      ? {
          OR: [
            { sourceIdentifier: phone },
            { sourceIdentifier: `+${phone}` },
            { sourceIdentifier: "internal" },
          ],
        }
      : {};
  // Scope the thread to one conversation (ticket). Legacy messages predate the
  // conversation backfill and carry a null conversationId — keep showing them so
  // an un-backfilled contact's history doesn't vanish; once backfilled, the null
  // branch matches nothing and the filter becomes strict.
  const conversationCondition = conversationId
    ? { OR: [{ conversationId }, { conversationId: null }] }
    : {};
  const where = {
    contactId,
    AND: [sourceIdentifierCondition, conversationCondition],
  };
  if (cursor) {
    messages = await prisma.waMessage.findMany({
      skip: 1,
      take: 50,
      cursor: {
        id: cursor,
      },
      where,
      include: {
        sender: {
          select: {
            name: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: {
        waCreatedAt: "desc",
      },
    });
  } else {
    messages = await prisma.waMessage.findMany({
      take: 50,
      where,
      include: {
        sender: {
          select: {
            name: true,
            profilePhoto: true,
          },
        },
      },
      orderBy: {
        waCreatedAt: "desc",
      },
    });
  }
  const hasNextPage = messages.length === 50;
  const nextCursor = hasNextPage ? messages.at(-1).id : null;
  return { messages, nextCursor, hasNextPage };
}

export async function generateChatFilterData(orgId: string) {
  try {
    const [contactTags, tagsFromContacts, cGroups, campaigns] = await Promise.all([
      prisma.$queryRaw<Partial<WaAccountSettings>[]>`
    SELECT "contactTags" 
    FROM "WaAccountSettings" 
    WHERE "orgId" = ${orgId}::uuid`,
      prisma.$queryRaw<Array<Partial<Contact>>>`
    SELECT DISTINCT ON ("tags") "tags" 
    FROM "Contact" 
    WHERE "tags" <> '{}'::jsonb 
    AND "tags" NOTNULL 
    AND "orgId" = ${orgId}::uuid`,
      prisma.$queryRaw<Partial<ContactGroup>[]>`
    SELECT cg."id",cg."name" 
    FROM "ContactGroup" cg 
    INNER JOIN "Team" tm 
    ON cg."teamId" = tm.id 
    WHERE tm."orgId" = ${orgId}::uuid
    `,
      prisma.$queryRaw<Partial<Campaign>[]>`
    SELECT cn."id",cn."name" 
    FROM "Campaign" cn 
    INNER JOIN "Team" tm 
    ON cn."teamId" = tm."id" 
    WHERE "orgId" = ${orgId}::uuid`,
    ]);

    const groupData = {
      group: "Groups",
      items: cGroups?.map((item) => ({
        label: item?.name,
        value: `contactGroups|-${item?.id}`,
      })),
    };

    const campaignsData = {
      group: "Campaigns",
      items: campaigns?.map((item) => ({
        label: item?.name,
        value: `campaigns|-${item?.id}`,
      })),
    };
    const multiSelectTagsData =
      contactTags?.length > 0
        ? contactTags[0]?.contactTags?.map((tag) => {
            const uniqueTags = new Set();
            tagsFromContacts?.forEach((t) => {
              if (t?.tags[tag]) {
                uniqueTags.add(t.tags[tag]);
              }
            });
            return {
              group: tag,
              items: Array.from(uniqueTags).map((item) => ({
                label: item,
                value: `${tag}|-${item}`,
              })),
            };
          })
        : [];
    const chatFilters = [groupData, campaignsData, ...multiSelectTagsData];
    return chatFilters;
  } catch (error) {
    log.error({ err: error }, "Error in inbox chat filter get api");
    return null;
  }
}

export async function filterChats(
  orgId: string,
  page: number,
  bodyFilterProps: WaChatFilterSchema,
  userId: string,
  role: Role,
) {
  try {
    let teamIdsCache: string[] | null = null;
    const getTeamIdsLazy = async () => {
      if (!teamIdsCache) {
        teamIdsCache = await getTeamIdsByUserId(userId);
      }
      return teamIdsCache;
    };

    const params: any[] = [orgId, (page - 1) * 20, userId];
    let paramIndex = 4;
    const filters: string[] = [`c."orgId" = $1::uuid`];
    // Inbox Tickets v2: the list is conversation-grained — one row per ticket, not
    // per contact. Recency is therefore the conversation's own clock; `createdAt`
    // covers tickets that exist but have not been messaged in yet.
    let orderBy = `COALESCE(conv."lastMessageAt", conv."createdAt")`;
    let allOrderBy = `fc."conversationLastMessageAt"`;
    let sortBy = "DESC";
    if (bodyFilterProps?.sortBy === "oldest") {
      sortBy = "ASC";
    } else if (bodyFilterProps?.sortBy === "newest_wa_created") {
      orderBy = `COALESCE(conv."lastCustomerMessageAt", conv."lastMessageAt", conv."createdAt")`;
      allOrderBy = `fc."conversationLastCustomerMessageAt"`;
    } else if (bodyFilterProps?.sortBy === "oldest_wa_created") {
      orderBy = `COALESCE(conv."lastCustomerMessageAt", conv."lastMessageAt", conv."createdAt")`;
      allOrderBy = `fc."conversationLastCustomerMessageAt"`;
      sortBy = "ASC";
    }

    const isSearchMode = bodyFilterProps?.searchTerm?.length > 0;

    if (!isSearchMode) {
      if (bodyFilterProps?.waMessageAssignStatus === "UnAssigned") {
        filters.push(`(c."lastReceivedMessageTimeStamp" IS NOT NULL)`);
      }

      if (bodyFilterProps?.labels?.length > 0) {
        params.push(bodyFilterProps.labels);
        filters.push(`EXISTS (
          SELECT 1 FROM "ContactLabelMap" clm 
          WHERE clm."contactId" = c.id 
          AND clm."labelId" = ANY($${paramIndex++}::uuid[])
        )`);
      }

      if (bodyFilterProps?.lifecycle) {
        params.push(bodyFilterProps.lifecycle);
        filters.push(`c."lifecycleId" = $${paramIndex++}::uuid`);
      }

      // Inbox Tickets v2: favourite / @mention filters. Favourite is per-ticket.
      if (bodyFilterProps?.favorite) {
        filters.push(`conv."isFavorite" = TRUE`);
      }

      if (bodyFilterProps?.mentions) {
        // $3 is the current userId (see params init). Only unseen mentions for me.
        // Mentions are matched per-ticket now, but `conversationId` is nullable on
        // InboxMention (rows written before a note was threaded), so those fall back
        // to the contact and surface on every one of that contact's tickets.
        filters.push(`EXISTS (
          SELECT 1 FROM "InboxMention" m
          WHERE (
            m."conversationId" = conv.id
            OR (m."conversationId" IS NULL AND m."contactId" = c.id)
          )
          AND m."mentionedUserId" = $3::uuid
          AND m."clearedAt" IS NULL
        )`);
      }

      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { waAssignedChatPermission: true },
      });
      const waAssignedChatPermission = org?.waAssignedChatPermission;

      const isAssignedToMe = bodyFilterProps?.waMessageAssignStatus === "mine";
      const isNew = bodyFilterProps?.waMessageAssignStatus === "New";
      const isNotSent = bodyFilterProps?.waMessageAssignStatus !== "Sent";

      /**
       * Assignment moved onto the conversation in v2 (`ConversationAssignedUserTeamMap`),
       * but every pre-v2 assignment was only ever written contact-grained to
       * `WaInboxAssign`. Both are checked, or historical tickets read as unassigned.
       * The same `$n` placeholder is reused across the two branches — one push, one
       * param, referenced twice.
       */
      const assignExists = (convConds: string[], contactConds: string[]) => {
        const convWhere = [
          `cam."conversationId" = conv.id`,
          `cam."lastRemovedAt" IS NULL`,
          ...convConds,
        ];
        const contactWhere = [`winb."contactId" = c.id`, ...contactConds];
        return `(
          EXISTS (SELECT 1 FROM "ConversationAssignedUserTeamMap" cam WHERE ${convWhere.join(" AND ")})
          OR EXISTS (SELECT 1 FROM "WaInboxAssign" winb WHERE ${contactWhere.join(" AND ")})
        )`;
      };

      if (bodyFilterProps?.waMessageAssignStatus && isNotSent) {
        if (isNew) {
          params.push(WaMessageAssignStatus.UNASSIGNED);
          filters.push(`COALESCE(conv."lastMessageAt", conv."createdAt") > NOW() - INTERVAL '24 hours' AND conv."status"::TEXT = $${paramIndex++}::TEXT`);
        } else {
          // FIX: Handle case mismatch (e.g. "Addressed" vs "ADDRESSED")
          const rawStatus = bodyFilterProps.waMessageAssignStatus;
          const assignedStatus = WaMessageAssignStatusTab[rawStatus] || rawStatus.toUpperCase();

          if (assignedStatus === "ADDRESSED") {
            if (bodyFilterProps.status?.length) {
              params.push(bodyFilterProps.status);
            } else {
              params.push(WaMessageClosedStatus);
            }
            filters.push(`conv."status"::TEXT = ANY($${paramIndex++}::TEXT[])`);
          } else {
            params.push(assignedStatus);
            filters.push(`conv."status"::TEXT = $${paramIndex++}::TEXT`);
          }

          if (isAssignedToMe) {
            params.push(userId);
            const userParam = paramIndex++;
            const convConds = [`cam."userId" = $${userParam}::uuid`];
            const contactConds = [`winb."assignedUserId" = $${userParam}::uuid`];

            if (bodyFilterProps?.assignedTeams?.length) {
              params.push(bodyFilterProps.assignedTeams);
              const teamParam = paramIndex++;
              convConds.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
              contactConds.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
            }

            filters.push(assignExists(convConds, contactConds));
          }
        }
      }
      if (!bodyFilterProps?.waMessageAssignStatus) {
        if (bodyFilterProps.status?.length) {
          params.push(bodyFilterProps.status);
          filters.push(`(conv."status"::TEXT = ANY($${paramIndex++}::TEXT[]))`);
        }
      }

      // --- CLEANED ASSIGNMENT FILTER LOGIC ---

      const wantsAssignedOnly = !bodyFilterProps?.waMessageAssignStatus && bodyFilterProps?.status?.includes("ASSIGNED");
      const hasTeamFilter = Boolean(bodyFilterProps?.assignedTeams?.length);
      const hasUserFilter = Boolean(bodyFilterProps?.assignedUserIds?.length && !isAssignedToMe);
      const isStrict = hasTeamFilter || hasUserFilter;

      // Only evaluate this block if specific teams/users are requested OR we are fetching general 'ASSIGNED' chats
      if (wantsAssignedOnly || isStrict) {
        const convConditions: string[] = [];
        const contactConditions: string[] = [];

        // Build team conditions
        if (hasTeamFilter) {
          params.push(bodyFilterProps.assignedTeams);
          const teamParam = paramIndex++;
          convConditions.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
          contactConditions.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
        } else if (waAssignedChatPermission === WaAssignedChatPermission.TeamMembers && !isStrict) {
          // If they are TeamMembers, and NO strict filters are applied, limit to their own teams implicitly
          const teamIds = await getTeamIdsLazy();
          params.push(teamIds);
          const teamParam = paramIndex++;
          convConditions.push(`cam."teamId" = ANY($${teamParam}::uuid[])`);
          contactConditions.push(`winb."teamId" = ANY($${teamParam}::uuid[])`);
        }

        // Build user conditions
        if (hasUserFilter) {
          if (waAssignedChatPermission === WaAssignedChatPermission.Admins && role === Role.MEMBER) {
             if (bodyFilterProps.assignedUserIds.includes(userId)) {
                params.push(userId);
                const userParam = paramIndex++;
                convConditions.push(`cam."userId" = $${userParam}::uuid`);
                contactConditions.push(`winb."assignedUserId" = $${userParam}::uuid`);
             }
          } else {
             params.push(bodyFilterProps.assignedUserIds);
             const userParam = paramIndex++;
             convConditions.push(`cam."userId" = ANY($${userParam}::uuid[])`);
             contactConditions.push(`winb."assignedUserId" = ANY($${userParam}::uuid[])`);
          }
        }

        const existsQuery = assignExists(convConditions, contactConditions);

        if (isStrict) {
          filters.push(existsQuery);
        } else {
          filters.push(`(conv."status" != 'ASSIGNED' OR ${existsQuery})`);
        }
      }

      // Phone filter
      // if (bodyFilterProps?.phone && bodyFilterProps.phone !== "all") {
      //   params.push(bodyFilterProps.phone);
      //   params.push(`+${bodyFilterProps.phone}`);
      //   filters.push(
      //     `(c."lastMessageSourceIdentifier" = $${paramIndex++} OR c."lastMessageSourceIdentifier" = $${paramIndex++})`,
      //   );
      // }
      if (bodyFilterProps?.phone && bodyFilterProps.phone !== "all") {
        params.push(bodyFilterProps.phone);
        params.push(`+${bodyFilterProps.phone}`);
        filters.push(`EXISTS (
          SELECT 1 FROM "WaMessage" wm
          WHERE wm."contactId" = c.id
          AND (
            wm."sourceIdentifier" = $${paramIndex++}
            OR wm."sourceIdentifier" = $${paramIndex++}
          )
        )`);
      }

      filters.push(`c."blockedOnWhatsApp" = ${bodyFilterProps?.blockedUsers ? "TRUE" : "FALSE"}`);
    }

    if (isSearchMode) {
      params.push(`%${bodyFilterProps.searchTerm}%`);
      params.push(`%${bodyFilterProps.searchTerm.replace(/\s+/g, "")}%`);
      filters.push(
        `(c."name" ILIKE $${paramIndex}::TEXT OR REPLACE(c."phone", ' ', '') LIKE $${paramIndex + 1}::TEXT)`,
      );
      paramIndex += 2;
    }

    const whereClause = filters.join(" AND ");

    const query = `
      WITH filtered_conversations AS (
        SELECT
          conv."id"                AS "conversationId",
          conv."number"            AS "ticketNumber",
          conv."subject"           AS "ticketSubject",
          conv."description"       AS "ticketDescription",
          conv."resolutionResult"  AS "resolutionResult",
          conv."status"            AS "conversationStatus",
          conv."createdAt"         AS "ticketCreatedAt",
          conv."closedAt"          AS "ticketClosedAt",
          conv."reopenCount"       AS "ticketReopenCount",
          COALESCE(conv."lastMessageAt", conv."createdAt")         AS "conversationLastMessageAt",
          COALESCE(conv."lastCustomerMessageAt", conv."createdAt") AS "conversationLastCustomerMessageAt",
          c.id,
          c."name",
          c."phone",
          c."other",
          c."aiWaChat",
          c."waMessageAssignStatus",
          c."lastReceivedMessageTimeStamp",
          c."consent",
          c."whatsappUserName",
          c."blockedOnWhatsApp",
          conv."isFavorite",
          c."source",
          c."igsId",
          c."psid",
          c."profilePic",
          c."followerCount",
          c."isIgVerifiedUser",
          c."lifecycleId",
          c."closedAt",
          json_build_object('id', conv."closedBy", 'name', cu.name)  AS "closedUser",
          COALESCE(c.tags, '{}'::jsonb) as tags,
         (
          SELECT COUNT(*)::INTEGER
          FROM "WaMessage" w
          WHERE w."conversationId" = conv.id
          AND w."messageBody"->>'exchangeProcess' = 'receive'
          AND NOT($3::TEXT = ANY(w."readUsers"))
        ) as "unReadMessageCount",
          -- Fallback preview for environments where historical messages were never
          -- linked to a conversation. Only safe to use when the contact has a single
          -- ticket; otherwise it would show a newer ticket's message on an old one.
          c."lastMessageBody"             AS "contactLastMessageBody",
          c."lastMessageWaCreatedAt"      AS "contactLastMessageWaCreatedAt",
          c."lastMessagePlatform"         AS "contactLastMessagePlatform",
          c."lastMessageSourceIdentifier" AS "contactLastMessageSourceIdentifier",
          c."lastReceivedMetadata"
        FROM "Conversation" conv
        INNER JOIN "Contact" c ON c.id = conv."contactId"
        LEFT JOIN "User" cu ON cu.id = conv."closedBy"
        WHERE ${whereClause}
        ORDER BY ${orderBy} ${sortBy} NULLS LAST
        LIMIT 20 OFFSET $2
      ),
      assigned_users AS (
        SELECT
          a."conversationId",
          json_agg(
            json_build_object('id', a."userId", 'teamId', a."teamId", 'name', a."name")
          ) as users
        FROM (
          -- v2 assignment: per conversation.
          SELECT cam."conversationId", u.id AS "userId", cam."teamId", u.name
          FROM "ConversationAssignedUserTeamMap" cam
          INNER JOIN "User" u ON u.id = cam."userId"
          WHERE cam."conversationId" IN (SELECT "conversationId" FROM filtered_conversations)
            AND cam."lastRemovedAt" IS NULL
          UNION
          -- Legacy assignment: per contact, projected onto that contact's tickets.
          SELECT fc."conversationId", u.id AS "userId", winb."teamId", u.name
          FROM filtered_conversations fc
          INNER JOIN "WaInboxAssign" winb ON winb."contactId" = fc.id
          INNER JOIN "User" u ON u.id = winb."assignedUserId"
        ) a
        GROUP BY a."conversationId"
      ),
      contact_labels AS (
        SELECT
          clm."contactId",
          json_agg(
            json_build_object('id', cl.id, 'name', cl.name, 'color', cl.color)
          ) as labels
        FROM "ContactLabelMap" clm
        INNER JOIN "ContactLabel" cl ON clm."labelId" = cl.id
        WHERE clm."contactId" IN (SELECT id FROM filtered_conversations)
        GROUP BY clm."contactId"
      ),
      conversation_last_message AS (
        SELECT DISTINCT ON (w."conversationId")
          w."conversationId",
          w."messageBody"       AS "lastMessageBody",
          w."waCreatedAt"       AS "lastMessageWaCreatedAt",
          w."sourcePlatform"    AS "lastMessagePlatform",
          w."sourceIdentifier"  AS "lastMessageSourceIdentifier"
        FROM "WaMessage" w
        WHERE w."conversationId" IN (SELECT "conversationId" FROM filtered_conversations)
        ORDER BY w."conversationId", w."waCreatedAt" DESC
      ),
      conversation_mentions AS (
        SELECT
          fc."conversationId",
          COUNT(*)::INTEGER as "mentionCount"
        FROM filtered_conversations fc
        INNER JOIN "InboxMention" m
          ON (
            m."conversationId" = fc."conversationId"
            OR (m."conversationId" IS NULL AND m."contactId" = fc.id)
          )
        WHERE m."mentionedUserId" = $3::uuid
          AND m."clearedAt" IS NULL
        GROUP BY fc."conversationId"
      ),
      -- Sibling ticket count, so the thread can offer its history strip without a
      -- second round trip. Excludes the row's own ticket.
      contact_ticket_counts AS (
        SELECT fc."conversationId", COUNT(sib.*)::INTEGER AS "otherTicketCount"
        FROM filtered_conversations fc
        LEFT JOIN "Conversation" sib
          ON sib."contactId" = fc.id AND sib.id <> fc."conversationId"
        GROUP BY fc."conversationId"
      )
      SELECT
        fc.*,
        COALESCE(au.users, '[]'::json) as "assignedUsers",
        COALESCE(cls.labels, '[]'::json) as "contactLabels",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageBody"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageBody"
        END AS "lastMessageBody",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageWaCreatedAt"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageWaCreatedAt"
        END AS "lastMessageWaCreatedAt",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessagePlatform"::TEXT
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessagePlatform"::TEXT
        END AS "lastMessagePlatform",
        CASE WHEN clm."lastMessageBody" IS NOT NULL THEN clm."lastMessageSourceIdentifier"
             WHEN COALESCE(ctc."otherTicketCount", 0) = 0 THEN fc."contactLastMessageSourceIdentifier"
        END AS "lastMessageSourceIdentifier",
        COALESCE(cm."mentionCount", 0) as "mentionCount",
        COALESCE(ctc."otherTicketCount", 0) as "otherTicketCount",
        l."name" as "lifecycleName"
      FROM filtered_conversations fc
      LEFT JOIN assigned_users au ON au."conversationId" = fc."conversationId"
      LEFT JOIN contact_labels cls ON cls."contactId" = fc.id
      LEFT JOIN conversation_last_message clm ON clm."conversationId" = fc."conversationId"
      LEFT JOIN conversation_mentions cm ON cm."conversationId" = fc."conversationId"
      LEFT JOIN contact_ticket_counts ctc ON ctc."conversationId" = fc."conversationId"
      LEFT JOIN "Lifecycle" l ON l.id = fc."lifecycleId"
      ORDER BY ${allOrderBy} ${sortBy} NULLS LAST;
    `;

    const conversations: any[] = await prisma.$queryRawUnsafe(query, ...params);
    if (conversations.length === 0) return [];

    const conversationIds = conversations.map((row) => row.conversationId);

    const messagesRows: any[] = await prisma.$queryRaw`
      WITH ranked AS (
        SELECT
          w.id,
          w."contactId",
          w."conversationId",
          w."waCreatedAt",
          w."messageBody",
          w."sourcePlatform",
          w."sourceIdentifier",
          w."sendBy",
          w."stats",
          w."messageId",
          ROW_NUMBER() OVER (PARTITION BY w."conversationId" ORDER BY w."waCreatedAt" DESC) AS rn
        FROM "WaMessage" w
        WHERE w."conversationId" = ANY(${conversationIds}::uuid[])
      )
      SELECT
        r.*,
        u."name" AS "senderName",
        u."profilePhoto" AS "senderProfilePhoto"
      FROM ranked r
      LEFT JOIN "User" u ON r."sendBy" = u.id
      WHERE r.rn <= 10
      ORDER BY r."conversationId", r."waCreatedAt" DESC
    `;

    const messagesByConversation = new Map<string, any[]>();
    for (const row of messagesRows) {
      const list = messagesByConversation.get(row.conversationId) || [];
      list.push({
        id: row.id,
        contactId: row.contactId,
        conversationId: row.conversationId,
        waCreatedAt: row.waCreatedAt,
        messageBody: row.messageBody,
        sourcePlatform: row.sourcePlatform,
        sourceIdentifier: row.sourceIdentifier,
        sendBy: row.sendBy,
        sender:
          row.senderName || row.senderProfilePhoto
            ? { name: row.senderName, profilePhoto: row.senderProfilePhoto }
            : null,
        stats: row.stats,
        messageId: row.messageId,
      });
      messagesByConversation.set(row.conversationId, list);
    }

    return conversations.map((row: any) => ({
      ...row,
      lastMessage: row.lastMessageBody
        ? {
            messageBody: row.lastMessageBody,
            waCreatedAt: row.lastMessageWaCreatedAt,
            sourcePlatform: row.lastMessagePlatform,
            sourceIdentifier: row.lastMessageSourceIdentifier,
          }
        : null,
      metadata: row.lastReceivedMetadata,
      messages: messagesByConversation.get(row.conversationId) || [],
    }));
  } catch (error) {
    // If Postgres threw a parameter bounds error earlier, it was swallowed here.
    log.error("Error in inbox chat filter API: %o", error);
    return [];
  }
}

export async function getMediaFile(mediaId: string, orgId: string) {
  const waSettings = await getWaSettings(orgId);
  const fileUrl = await callMetaApi(`/${mediaId}`, "GET", waSettings.accessToken);
  if (fileUrl?.data) {
    // Step 2: Convert the downloaded media to a Buffer (for binary data)
    const fileResponse = await axios.get(fileUrl?.data.url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${waSettings.accessToken}`,
      },
    });
    // const imageBuffer = Buffer.from(fileResponse.data, "binary");
    return {
      type: fileResponse?.headers?.["content-type"],
      data: fileResponse.data,
    };
  } else {
    log.error("Failed to download media file from WhatsApp API.");
  }
}

export async function exportWhatsapChats(
  orgId: string,
  constraints: WaChatExportConstraints,
  bodyFilterProps: WaChatFilterSchema,
  limit?: number,
  offset?: number,
): Promise<
  Array<{
    date: string;
    from: string;
    name: string;
    receivebody: string;
    sendbody: string;
    templatename: string;
  }>
> {
  function extendedWhereClause(): string {
    let extendedWhereClause = "";

    // Handling date constraints
    if (constraints?.date) {
      switch (constraints.date.type) {
        case DateType.BETWEEN:
          extendedWhereClause += `
          AND wm."createdAt" >= '${constraints.date.between.from}'
          AND wm."createdAt" < '${dayjs(constraints.date.between.to)
            .add(1, "day")
            .format("YYYY-MM-DD")}'
          `;
          break;
        case DateType.BEFORE:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${constraints.date.inclusive ? "<=" : "<"} '${constraints.date.before}' `;
          break;
        case DateType.AFTER:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${constraints.date.inclusive ? ">=" : ">"} '${constraints.date.after}' `;
          break;
        case DateType.ON:
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') = '${constraints.date.on}' `;
          break;
      }
    }

    // Handling repliesOnly constraint
    if (constraints?.repliesOnly) {
      extendedWhereClause += `AND wm."messageBody"->>'exchangeProcess' = 'receive' `;
    }

    return extendedWhereClause.trim();
  }
  const query = `
    SELECT
      wm."createdAt" AS date,
      c."phone" AS "from",
      c."name" AS "name",
      COALESCE(
        wm."messageBody"->'receive'->'messages'->0->'text'->>'body',
        wm."messageBody"->'receive'->'messages'->0->'button'->>'text'
        ) AS receivebody,
      wm."messageBody"->'send'->'text'->>'body' AS sendbody,
      wm."messageBody"->'send'->'template'->>'name' AS templatename
    FROM 
      "WaMessage" wm 
    JOIN 
      "Contact" c ON wm."contactId" = c.id
    LEFT JOIN 
        "ContactGroupMap" cgm ON cgm."contactId" = c."id" 
    LEFT JOIN 
        "ContactGroup" cg ON cg.id = cgm."contactGroupId" 
    LEFT JOIN 
        "CampaignParticipant" cpt ON cpt."contactId" = c."id"
    WHERE
      c."orgId" = $1::uuid ${extendedWhereClause()}
    ORDER BY
      wm."createdAt" ASC
    ${limit != null ? `LIMIT ${Number(limit)} OFFSET ${Number(offset ?? 0)}` : ""}`;

  const result = await prisma.$queryRawUnsafe(query, orgId);
  return result as Array<{
    date: string;
    from: string;
    name: string;
    receivebody: string;
    sendbody: string;
    templatename: string;
  }>;
}

export async function assignWaMessageToUser(
  data: WaMessageAssignBody,
  orgId: string,
  userId?: string,
) {
  try {
    const existingUsers = await prisma.waInboxAssign.findMany({
      where: {
        contactId: data.contactId,
      },
    });
    const assignIfOnline = data.assignIfOnline ?? false;
    const newUsers = [];
    const existingUserIds = existingUsers.map((u) => u.assignedUserId);

    const incomingUserIds = data.assignees.map((a) => a.userId);

    const addedUsers = data.assignees.filter((a) => !existingUserIds.includes(a.userId));

    const revokedUsers = existingUsers.filter((u) => !incomingUserIds.includes(u.assignedUserId));

    const isReassignment = revokedUsers.length > 0 && addedUsers.length > 0;

    for (const assignee of data.assignees) {
      let updateCount = false;
      const existingUser =
        existingUsers?.length > 0
          ? existingUsers.find((user) => user.assignedUserId === assignee.userId)
          : false;
      if (!existingUser) {
        if (assignIfOnline) {
          const user = await prisma.orgMember.findUnique({
            where: {
              userId_orgId: {
                userId: assignee.userId,
                orgId,
              },
            },
          });
          if (
            [UserAvailabilityStatus.busy, UserAvailabilityStatus.online].includes(
              user?.status as UserAvailabilityStatus,
            )
          ) {
            newUsers.push(assignee);
            updateCount = true;
          } else {
            const error: any = new Error(`User is offline and cannot be assigned`);
            error.statusCode = 400;
            throw error;
          }
        } else {
          newUsers.push(assignee);
          updateCount = true;
        }
      } else if (existingUser.teamId !== assignee.teamId) {
        await prisma.waInboxAssign.update({
          where: {
            contact_id_assigned_user_id_unique: {
              contactId: data.contactId,
              assignedUserId: existingUser.assignedUserId,
            },
          },
          data: {
            teamId: assignee.teamId,
          },
        });
      }
      if (updateCount)
        await prisma.userAssignedCount.upsert({
          where: {
            user_org_unique: {
              userId: assignee.userId,
              orgId,
            },
          },
          update: {
            assignCount: {
              increment: 1,
            },
          },
          create: {
            userId: assignee.userId,
            orgId,
            assignCount: 1,
          },
        });
    }

    await prisma.waInboxAssign.createMany({
      data: newUsers.map((user) => ({
        contactId: data.contactId,
        assignedUserId: user.userId,
        teamId: user.teamId,
      })),
      skipDuplicates: true,
    });

    if (isReassignment) {
      await createInternalWaMessage({
        contactId: data.contactId,
        waMessageAssignStatus: "REASSIGNED",
        assignedUsers: {
          removed: revokedUsers.map((u) => ({
            userId: u.assignedUserId,
            teamId: u.teamId,
          })),
          added: addedUsers.map((u) => ({
            userId: u.userId,
            teamId: u.teamId,
          })),
        },
        trigerredByUser: userId ?? "RateUp",
        messageId: data.messageId,
      });
    } else {
      if (newUsers.length) {
        await createInternalWaMessage({
          contactId: data.contactId,
          waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
          assignedUsers: newUsers,
          trigerredByUser: userId ?? "RateUp",
          messageId: data.messageId,
        });
      }

      if (revokedUsers.length) {
        await createInternalWaMessage({
          contactId: data.contactId,
          waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
          assignedUsers: revokedUsers.map((u) => ({
            userId: u.assignedUserId,
            teamId: u.teamId,
          })),
          trigerredByUser: userId ?? "RateUp",
          messageId: data.messageId,
        });
      }
    }

    await prisma.waInboxAssign.deleteMany({
      where: {
        contactId: data.contactId,
        assignedUserId: {
          notIn: data.assignees.map((assignee) => assignee.userId),
        },
      },
    });

    const updatedContact = await updateContactById(data.contactId, {
      waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    });
    // Assigning a contact whose last conversation is already closed starts a fresh
    // engagement. Open a new conversation (mirroring the inbound-message reopen path)
    // instead of resurrecting the finished one, so the closed record's closedAt /
    // resolution-time metrics stay frozen and the reopen counter advances.
    let conversation = await getLastCreatedConversationForContact(updatedContact.id);
    if (!conversation || isTerminalInboxStatus(conversation.status)) {
      conversation = await openConversationForContact(
        updatedContact.id,
        updatedContact.orgId,
        WaMessageAssignStatus.ASSIGNED,
      );
    }
    if (conversation) {
      const updatedAssignees = [
        ...newUsers,
        ...data.assignees.filter(
          (t) => !newUsers.find((n) => n.userId === t.userId && n.teamId === t.teamId),
        ),
      ];
      await updateConversationAssignees(conversation.id, { assignees: updatedAssignees }, userId);
    }

    for (const user of newUsers) {
      const notificationSetting = await getNotificationSettings(user.userId, updatedContact.orgId);
      if (notificationSetting && notificationSetting.waMessageAssignNotification) {
        await notificationQueue.add("notification", {
          systemNotificationData: {
            userId: user.userId,
            orgId: updatedContact.orgId,
            source: "whatsapp",
            subSource: "chat-assigned",
            data: {
              contactId: updatedContact.id,
              contactName: updatedContact.name,
            },
          },
        });
      }
    }

    //Change zapier schema
    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_ASSIGN,
      {
        [ZapierTriggers.CONTACT_ASSIGN]: {
          contact: updatedContact,
          newAssignees: newUsers,
        },
      },
      orgId,
    );
    return data.assignees;
  } catch (e) {
    if (e) {
      throw e;
    } else {
      const error: any = new Error(`Internal error`);
      error.statusCode = 500;
      throw error;
    }
  }
}

export async function getAssignedUserForContact(contactId) {
  return await prisma.waInboxAssign.findMany({
    where: {
      contactId,
    },
    include: {
      assignedUser: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getAssignedUsersCountForContactByTeam(contactId: string, teamId: string) {
  return await prisma.waInboxAssign.count({
    where: {
      contactId,
      teamId,
    },
  });
}

export async function deleteAssignedUsersforContact(contactId) {
  return await prisma.waInboxAssign.deleteMany({
    where: {
      contactId,
    },
  });
}
export async function getContactsCountByInbox(orgId: string, userId: string, role: string) {
  const teamIds = await getTeamIdsByUserId(userId);
  const stats = await getInboxCountsFromConversations(orgId);
  const count: {
    new_assigned_count: number;
    new_unassigned_count: number;
  }[] = await prisma.$queryRaw`WITH message_flags AS (
    SELECT
      conv.id AS conversation_id,
      conv."status" AS "waMessageAssignStatus",
      (
        EXISTS (
          SELECT 1 FROM "ConversationAssignedUserTeamMap" cam
          WHERE cam."conversationId" = conv.id
          AND cam."lastRemovedAt" IS NULL
          AND cam."teamId" = ANY(${teamIds}::uuid[])
          LIMIT 1
        )
        OR EXISTS (
          SELECT 1 FROM "WaInboxAssign" wa
          WHERE wa."contactId" = c.id
          AND wa."teamId" = ANY(${teamIds}::uuid[])
          LIMIT 1
        )
      ) AS is_assigned_to_my_team
    FROM "Conversation" conv
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid
      AND NOT c."blockedOnWhatsApp"
      AND COALESCE(conv."lastMessageAt", conv."createdAt") > NOW() - INTERVAL '24 hours'
  ), orgDetails AS (
    SELECT o."waAssignedChatPermission" AS permission FROM "Org" o WHERE o."id" = ${orgId}::uuid
  )
  SELECT
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus"::TEXT = ${WaMessageAssignStatus.ASSIGNED} AND (
      CASE 
        WHEN orgDetails.permission = ${WaAssignedChatPermission.All} THEN 1
        WHEN orgDetails.permission = ${WaAssignedChatPermission.Admins} THEN ${role === Role.MEMBER ? 0 : 1}
        WHEN orgDetails.permission = ${WaAssignedChatPermission.TeamMembers} THEN is_assigned_to_my_team::int
      END 
    ) = 1)::INTEGER AS new_assigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus"::TEXT = ${WaMessageAssignStatus.UNASSIGNED})::INTEGER AS new_unassigned_count
  FROM message_flags mf CROSS JOIN orgDetails;`;

  // Ticket counts per team, from the conversation-grained assignment map with the
  // legacy contact-grained one folded in. Now org-scoped — the previous version
  // grouped over all of WaInboxAssign and leaked other orgs' counts.
  const assignedTeamWiseCount = await prisma.$queryRaw`
  SELECT
    a."teamId",
    COUNT(DISTINCT a."conversationId")::INTEGER AS "assignedCount"
  FROM (
    SELECT cam."teamId", cam."conversationId"
    FROM "ConversationAssignedUserTeamMap" cam
    INNER JOIN "Conversation" conv ON conv.id = cam."conversationId"
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid AND cam."lastRemovedAt" IS NULL
    UNION
    SELECT winb."teamId", conv.id AS "conversationId"
    FROM "WaInboxAssign" winb
    INNER JOIN "Conversation" conv ON conv."contactId" = winb."contactId"
    INNER JOIN "Contact" c ON c.id = conv."contactId"
    WHERE c."orgId" = ${orgId}::uuid
  ) a
  GROUP BY a."teamId";
  `;

  // Inbox Tickets v2: favourite + @mention nav counts, ticket-grained to match the list.
  const favouriteCount = await prisma.conversation.count({
    where: { isFavorite: true, contact: { orgId, blockedOnWhatsApp: false } },
  });
  const mentionedConversations = await prisma.inboxMention.findMany({
    where: { orgId, mentionedUserId: userId, clearedAt: null },
    select: { conversationId: true, contactId: true },
  });
  // A mention with no conversationId predates threading and lands on every one of
  // that contact's tickets, so it is counted per contact rather than per ticket.
  const mentionKeys = new Set(
    mentionedConversations.map((m) => m.conversationId ?? `contact:${m.contactId}`),
  );

  return {
    // The "New" tab lists UNASSIGNED conversations only (see `filterChats`), so its
    // badge counts unassigned — not assigned-to-team — to match the list.
    new: count[0].new_unassigned_count,
    newAssigned: count[0].new_assigned_count,
    newUnassigned: count[0].new_unassigned_count,
    newAssignedTome: 0,
    assignedToMe: 0,
    open: stats.open_count,
    closed: stats.closed_count,
    total: stats.all_count,
    favourite: favouriteCount,
    mentions: mentionKeys.size,
    assignedTeamWiseCount,
    // assigned: stats.assigned_count,
    // blocked: stats.blocked_count,
    // unassigned: stats.unassignedCount,
  };
}

/**
 * Inbox Tickets v2 — set the favourite/star flag on a single conversation (ticket),
 * org-scoped via the owning contact.
 */
export async function setConversationFavorite(
  orgId: string,
  conversationId: string,
  isFavorite: boolean,
) {
  const result = await prisma.conversation.updateMany({
    where: { id: conversationId, contact: { orgId } },
    data: { isFavorite },
  });
  return { success: result.count > 0, isFavorite };
}

export interface WaMedia {
  type?: "audio" | "image" | "document" | "video";
  url?: string;
  name?: string;
}

export async function sendMediaMessages(
  media: WaMedia[],
  to,
  orgId,
  userId,
  platform: PlatformType,
  caption = "",
  whatsappSettingsPhoneId = "",
  teamId,
) {
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const isLastItem = i === media.length - 1;
    let captionMsg = isLastItem ? caption : "";
    let messageBody;
    switch (item.type) {
      case "image": {
        messageBody = createReplyImageMessage(to, item.url, platform, captionMsg);
        break;
      }
      case "document": {
        messageBody = createDocumentMessage(to, item.url, item.name, captionMsg, platform);
        break;
      }
      case "video": {
        messageBody = createVideoMessage(to, item.url, platform, captionMsg);
        break;
      }
      case "audio": {
        messageBody = createAudioMessage(to, item.url, platform);
        break;
      }
    }
    await sendMessage(
      orgId,
      messageBody,
      null,
      userId,
      whatsappSettingsPhoneId,
      platform,
      undefined,
      teamId,
    );
    if (!isLastItem) wait(50);
  }
}

export async function markMessagesAsRead(contactId: string, userId: string) {
  await prisma.$executeRawUnsafe(
    `
    UPDATE "WaMessage"
    SET "readUsers" = "readUsers" || $2::TEXT
    WHERE "contactId" = $1::uuid AND
    "messageBody"->>'exchangeProcess' = 'receive'
    AND NOT ($2::TEXT = ANY("readUsers"))
  `,
    contactId,
    userId,
  );

  // NOTE: opening a conversation deliberately does NOT clear the reader's
  // @mentions — the "@Mentions" tab must keep the conversation until the user
  // acts on it. Mentions are cleared when the user replies (see
  // `clearMentionsForConversation`, called from the send path).
}

/**
 * Clear the given user's unseen @mentions on a conversation (or, for legacy
 * mentions with no conversationId, on the contact). Called when the user replies,
 * so the "@Mentions" tab/badge drops the conversation only after they engage.
 */
export async function clearMentionsForConversation(
  userId: string,
  contactId: string,
  conversationId?: string | null,
) {
  await prisma.inboxMention.updateMany({
    where: {
      mentionedUserId: userId,
      clearedAt: null,
      ...(conversationId
        ? { OR: [{ conversationId }, { conversationId: null, contactId }] }
        : { contactId }),
    },
    data: { clearedAt: new Date() },
  });
}

export async function sendContactMessage(
  contacts: { contactIds?: string[]; groupIds?: string[] },
  phone,
  orgId,
  userId,
  whatsappSettingsPhoneId,
  teamId,
) {
  if (!contacts.contactIds && !contacts.groupIds) return;
  let filterCondition = {
    OR: [],
  };
  if (contacts.contactIds && contacts.contactIds.length) {
    filterCondition.OR.push({
      id: {
        in: contacts.contactIds,
      },
    });
  }
  if (contacts.groupIds && contacts.groupIds.length) {
    filterCondition.OR.push({
      contactGroups: {
        some: {
          contactGroupId: {
            in: contacts?.groupIds,
          },
        },
      },
    });
  }
  const contactsData = await prisma.contact.findMany({
    where: filterCondition,
    select: {
      name: true,
      phone: true,
      dob: true,
      email: true,
      whatsappUserName: true,
      org: {
        select: {
          name: true,
        },
      },
    },
  });

  const messageBody = createContactMessage(phone, contactsData);
  await sendMessage(
    orgId,
    messageBody,
    null,
    userId,
    whatsappSettingsPhoneId,
    undefined,
    undefined,
    teamId,
  );
}

export async function sendLocationMessage(
  location,
  phone,
  orgId,
  userId,
  whatsappSettingsPhoneId,
  teamId,
) {
  const messageBody = createLocationMessage(phone, location);
  await sendMessage(
    orgId,
    messageBody,
    null,
    userId,
    whatsappSettingsPhoneId,
    undefined,
    undefined,
    teamId,
  );
}

export async function getWaMessageByMessageId(messageId: string): Promise<WaMessage> {
  return await prisma.waMessage.findFirst({
    where: {
      messageId,
    },
  });
}

export async function updateWaMessageByMessageId(
  messageId: string,
  data: Partial<WaMessage>,
  id?: string,
) {
  const whereClause = id ? { id } : { messageId };

  const message = await prisma.waMessage.findFirst({
    where: whereClause,
  });

  if (!message) {
    log.trace("Message not found on %s: %s", id ? "id" : "messageId", id || messageId);
    return null;
  }

  return await prisma.waMessage.update({
    where: {
      id: message.id,
    },
    data: {
      ...data,
      stats: data.stats
        ? {
            ...(message.stats as Record<string, any>),
            ...(data.stats as Record<string, any>),
          }
        : undefined,
    },
  });
}

export async function generateChatAnalytics(orgId: string) {
  const analytics = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*)::INTEGER FROM "Contact" c WHERE c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours' AND c."orgId" = ${orgId}::uuid) 
        AS "newChatCount",
      (SELECT COUNT(*)::INTEGER FROM "WaMessage" wm 
        JOIN "Contact" c ON wm."contactId" = c.id 
        WHERE c."orgId" = ${orgId}::uuid) 
        AS "waMessageCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'UNASSIGNED') 
        AS "unassignedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'ASSIGNED') 
        AS "assignedContactCount",
      -- "NEW" is a derived tab (unassigned + received within 24h), never a stored
      -- status. This previously compared against a literal 'NEW' and so always
      -- counted zero.
      (SELECT COUNT(*)::INTEGER FROM "Contact" c
        WHERE c."orgId" = ${orgId}::uuid
          AND c."waMessageAssignStatus" = 'UNASSIGNED'
          AND c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours')
        AS "newContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'CLOSED') 
        AS "closedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."blockedOnWhatsApp" = true) 
        AS "blockedContactCount",
      (SELECT COUNT(*)::INTEGER FROM "WaInboxAssign" wa 
        JOIN "Contact" c ON wa."contactId" = c.id 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" != 'UNASSIGNED') 
        AS "waInboxAssignedCount"
  `;
  const assignedUserCounts = await prisma.$queryRaw`
      SELECT 
        uac."userId",
        uac."assignCount"::INTEGER,
        uac."createdAt"::TIMESTAMP AS "createdAt",
        u."name" as "userName"
      FROM "UserAssignedCount" uac
      JOIN "User" u ON uac."userId" = u.id
      WHERE uac."orgId" = ${orgId}::uuid
      ORDER BY uac."createdAt" DESC
  `;

  return { ...analytics?.[0], assignedUserCounts };
}

export async function getChatByContactId(req, res) {
  const { contactId } = req.params;
  try {
    const chat = await prisma.waMessage.findMany({
      where: {
        contactId,
        sourcePlatform: "WEBCHAT",
      },
      orderBy: {
        waCreatedAt: "asc",
      },
    });
    return res.status(200).send(chat);
  } catch (error) {
    log.error("Error in getChatByContactId: %o", error);
    res.status(500).send({ error: "Failed to retrieve chat" });
  }
}

/**
 * Seed chats for all contacts
 */
export async function generateInboxResponse(
  body: GenerateInboxResponseBody,
  orgId: string,
  _userId: string,
) {
  let skip = 0;
  if (body.numberOfContacts === 1) {
    skip = Math.floor(Math.random() * 100);
  }
  let contacts = await prisma.contact.findMany({
    where: { orgId: orgId },
    take: body.numberOfContacts || 5,
    skip,
  });

  //if contact table does n't have 100 records
  if (body.numberOfContacts === 1 && !contacts.length) {
    contacts = await prisma.contact.findMany({
      where: { orgId: orgId },
      take: body.numberOfContacts || 5,
    });
  }

  const settings = await getWaSettings(orgId);

  for (const contact of contacts) {
    console.log(`Seeding chats for contact: ${contact.name} (${contact.phone})`);

    for (let i = 0; i < (body.messagesPerContact || 1); i++) {
      const isSend = faker.datatype.boolean();
      sendMessageQueue.add("send-message", {
        message: faker.lorem.sentence(),
        contactId: contact.id,
        options: {
          accessToken: settings.accessToken,
          phoneId: settings.phoneId,
          phone: settings.phone,
          sourceIdentifier: settings.phone?.replace("+", "") || "",
          orgId: orgId,
          profileName: contact?.name,
          to: contact.phone,
        },
        type: isSend ? "send" : "receive",
      });
    }
  }
}

export async function createInternalWaMessage({
  contactId,
  waMessageAssignStatus,
  trigerredByUser,
  assignedUsers,
  mentionedUsers,
  mentionedUserIds,
  exchangeProcess = "internal",
  orgId,
  privateMessageText,
  messageId,
}: {
  contactId: string;
  waMessageAssignStatus?: string;
  trigerredByUser?: string;
  assignedUsers?:
    | { userId: string; teamId: string }[]
    | {
        added: { userId: string; teamId: string }[];
        removed: { userId: string; teamId: string }[];
      };
  mentionedUsers?: string[];
  /** Explicit mentioned user ids from the client mention picker (preferred over name matching). */
  mentionedUserIds?: string[];
  exchangeProcess?: "internal" | "privateNote";
  orgId?: string;
  privateMessageText?: string;
  messageId: string;
}) {
  const conversation = await getLastCreatedConversationForContact(contactId);

  let triggeredByUserDetails: { id: string; name: string } | null = null;

  if (trigerredByUser && trigerredByUser !== "RateUp" && trigerredByUser !== "Automation") {
    const user = await prisma.user.findUnique({
      where: { id: trigerredByUser },
      select: { id: true, name: true },
    });

    if (user?.name) {
      triggeredByUserDetails = { id: user.id, name: user.name };
    }
  }
  if (trigerredByUser === "RateUp" || trigerredByUser === "Automation") {
    triggeredByUserDetails = { id: null, name: trigerredByUser };
  }
  let addedUsers: { userId: string; teamId: string }[] = [];
  let removedUsers: { userId: string; teamId: string }[] = [];

  if (Array.isArray(assignedUsers)) {
    addedUsers = assignedUsers;
  } else if (assignedUsers) {
    addedUsers = assignedUsers.added || [];
    removedUsers = assignedUsers.removed || [];
  }

  if (exchangeProcess === "internal") {
    let messageText: string;
    let assignStatus: string;
    let assignedUserDetails: { id: string; name: string }[] = [];

    if (
      (waMessageAssignStatus === WaMessageAssignStatus.ASSIGNED ||
        waMessageAssignStatus === WaMessageAssignStatus.UNASSIGNED ||
        waMessageAssignStatus === "REASSIGNED") &&
      (addedUsers.length || removedUsers.length)
    ) {
      const userIds = [...addedUsers.map((u) => u.userId), ...removedUsers.map((u) => u.userId)];

      if (userIds.length) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        });

        assignedUserDetails = users.filter((u) => u.name).map((u) => ({ id: u.id, name: u.name! }));
      }
    }

    switch (waMessageAssignStatus) {
      case WaMessageAssignStatus.ASSIGNED:
        messageText = assignedUserDetails.length
          ? `Chat assigned to ${assignedUserDetails.map((u) => u.name).join(", ")}`
          : "Assigned this chat";
        assignStatus = WaMessageAssignStatus.ASSIGNED;
        break;

      case WaMessageAssignStatus.UNASSIGNED:
        messageText = assignedUserDetails.length
          ? `Chat revoked from ${assignedUserDetails.map((u) => u.name).join(", ")}`
          : "Unassigned this chat";
        assignStatus = WaMessageAssignStatus.UNASSIGNED;
        break;

      case "REASSIGNED":
        const addedNames = assignedUserDetails
          .filter((u) => addedUsers.find((a) => a.userId === u.id))
          .map((u) => u.name);

        const removedNames = assignedUserDetails
          .filter((u) => removedUsers.find((r) => r.userId === u.id))
          .map((u) => u.name);

        messageText = `Chat reassigned${
          removedNames.length ? ` from ${removedNames.join(", ")}` : ""
        }${addedNames.length ? ` to ${addedNames.join(", ")}` : ""}`;
        assignStatus = "REASSIGNED";
        break;

      default:
        messageText =
          (trigerredByUser === "RateUp" || trigerredByUser === "Automation") &&
          waMessageAssignStatus === WaMessageAssignStatus.CLOSED
            ? "marked this chat as closed by automation"
            : `marked this chat as ${getStatusLabel(waMessageAssignStatus)}`;
        assignStatus = waMessageAssignStatus;
    }

    const wamessage = await prisma.waMessage.create({
      data: {
        contactId,
        messageId: messageId,
        conversationId: conversation?.id,
        sourcePlatform: PlatformType.INTERNAL,
        sourceIdentifier: "internal",
        sendBy: triggeredByUserDetails?.id,
        waCreatedAt: new Date(),
        messageBody: {
          exchangeProcess: "internal",
          send: null,
          receive: null,
          internal: {
            text: { body: messageText },
            triggeredByUser: triggeredByUserDetails,
            assignStatus,
            assignedUsers: assignedUserDetails,
          },
        },
        sourceMessage: "inbox",
      },
    });
    return wamessage;
  } else {
    let mentionedUserDetails: { id: string; name: string }[] = [];
    if (!orgId) {
      throw new Error("orgId is required to create notifications");
    }
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!contact) {
      throw new Error("Contact not found");
    }

    if (mentionedUserIds?.length) {
      // Preferred: the client resolved the mentions to ids, so names with spaces
      // (which the `@name` text match can't capture) still work.
      const users = await prisma.user.findMany({
        where: { id: { in: mentionedUserIds } },
        select: { id: true, name: true },
      });
      mentionedUserDetails = users.map((u) => ({ id: u.id, name: u.name ?? "" }));
    } else if (mentionedUsers?.length > 0) {
      const users = await prisma.user.findMany({
        where: { name: { in: mentionedUsers } },
        select: { id: true, name: true },
      });

      mentionedUserDetails = users.filter((u) => u.name).map((u) => ({ id: u.id, name: u.name! }));
    }
    const wamessage = await prisma.waMessage.create({
      data: {
        contactId,
        conversationId: conversation?.id,
        sourcePlatform: PlatformType.INTERNAL,
        sendBy: triggeredByUserDetails?.id,
        waCreatedAt: new Date(),
        sourceIdentifier: "internal",
        messageId: messageId,
        messageBody: {
          exchangeProcess: "privateNote",
          send: null,
          receive: null,
          privateNote: {
            text: { body: privateMessageText },
            triggeredByUser: triggeredByUserDetails,
            mentionedUser: mentionedUserDetails,
          },
        },
        sourceMessage: "inbox",
      },
    });

    if (mentionedUserDetails.length > 0) {
      const notificationData = {
        contactId: contact.id,
        contactName: contact.name,
      };

      // Inbox Tickets v2: persist an indexable mention signal so the "@Mentions"
      // inbox filter can query it (the notification queue alone isn't queryable).
      await prisma.inboxMention.createMany({
        data: mentionedUserDetails.map((user) => ({
          orgId: orgId!,
          contactId: contact.id,
          conversationId: conversation?.id ?? null,
          mentionedUserId: user.id,
          messageId: wamessage.id,
        })),
      });

      await Promise.all(
        mentionedUserDetails.map((user) =>
          notificationQueue.add("notification", {
            systemNotificationData: {
              userId: user.id,
              orgId: orgId,
              source: "whatsapp",
              subSource: "mentioned",
              data: notificationData,
            },
          }),
        ),
      );
    }
    return wamessage;
  }
}

function getStatusLabel(status: string): string | null {
  const map: Record<string, string> = {
    [WaMessageAssignStatus.CLOSED]: "closed",
    [WaMessageAssignStatus.SPAM]: "spam",
    [WaMessageAssignStatus.RESOLVED]: "resolved",
    [WaMessageAssignStatus.UNRESOLVED]: "unresolved",
  };
  return map[status] ?? null;
}

interface CreateWaMessageOrgTeamMapInput {
  teamId: string;
  messageId: string;
  orgId: string;
  isAutomedMessage?: boolean;
  type: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW";
  externalApi: boolean;
}

export async function createWaMessageOrgTeamMap(data: CreateWaMessageOrgTeamMapInput) {
  return prisma.waMessageOrgTeamMap.create({
    data: {
      teamId: data.teamId,
      messageId: data.messageId,
      orgId: data.orgId,
      isAutomedMessage: data.isAutomedMessage ?? false,
      type: data.type,
      externalApi: data.externalApi,
    },
  });
}

export async function getWaMessageLogs(
  orgId: string,
  dateRange?: string[],
  status?: string,
  sourceMessage?: string,
  team?: string,
  limit: number = 25,
  offset: number = 0,
  searchQuery?: string,
) {
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (dateRange?.length === 2) {
    rangeStart = new Date(dateRange[0]);
    rangeEnd = new Date(dateRange[1]);
  }

  const teamFilter =
    team && team !== "all" && team !== "null"
      ? Prisma.sql`AND motm."teamId" = ${team}::uuid`
      : Prisma.sql``;

  const dateFilter =
    rangeStart && rangeEnd
      ? Prisma.sql`AND wm."createdAt" BETWEEN ${rangeStart} AND ${rangeEnd}`
      : Prisma.sql``;

  let sourceFilter = Prisma.sql``;
  if (sourceMessage && sourceMessage !== "all") {
    if (sourceMessage === "external") {
      sourceFilter = Prisma.sql`AND motm."externalApi" = true`;
    } else if (sourceMessage === "TEMPLATE") {
      sourceFilter = Prisma.sql`AND wm."sourceMessage" = ${sourceMessage} AND motm."externalApi" = false`;
    } else {
      sourceFilter = Prisma.sql`AND wm."sourceMessage" = ${sourceMessage}`;
    }
  }

  const statusFilter =
    status && status !== "all" ? Prisma.sql`AND LOWER(ws.status) = LOWER(${status})` : Prisma.sql``;

  const isNumericSearch = searchQuery && /^\d+$/.test(searchQuery.trim());

  const searchFilter =
    searchQuery && searchQuery.trim() !== ""
      ? isNumericSearch
        ? Prisma.sql`AND c.phone ILIKE ${`%${searchQuery}%`}`
        : Prisma.sql`AND (
            c.phone ILIKE ${`%${searchQuery}%`} OR
            wm."messageBody"::text ILIKE ${`%${searchQuery}%`}
          )`
      : Prisma.sql``;

  const baseWhere = Prisma.sql`
    WHERE c."orgId" = ${orgId}
      AND wm."sourceMessage" IN ('TEMPLATE','CAMPAIGN')
      AND wm."messageBody"->>'exchangeProcess' = 'send'
      ${sourceFilter}
      ${teamFilter}
      ${dateFilter}
      ${statusFilter}
      ${searchFilter}
  `;

  const statusJoin =
    status && status !== "all"
      ? Prisma.sql`
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN failed_ts = greatest_ts THEN 'failed'
          WHEN read_ts = greatest_ts THEN 'read'
          WHEN delivered_ts = greatest_ts THEN 'delivered'
          WHEN sent_ts = greatest_ts THEN 'sent'
        END AS status
      FROM (
        SELECT
          NULLIF(wm.stats->>'sent','')::timestamp      AS sent_ts,
          NULLIF(wm.stats->>'delivered','')::timestamp AS delivered_ts,
          NULLIF(wm.stats->>'read','')::timestamp      AS read_ts,
          NULLIF(wm.stats->>'failed','')::timestamp    AS failed_ts,
          GREATEST(
            NULLIF(wm.stats->>'sent','')::timestamp,
            NULLIF(wm.stats->>'delivered','')::timestamp,
            NULLIF(wm.stats->>'read','')::timestamp,
            NULLIF(wm.stats->>'failed','')::timestamp
          ) AS greatest_ts
      ) t
    ) ws ON true
  `
      : Prisma.sql``;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    JOIN "WaMessageOrgTeamMap" motm ON motm."messageId" = wm.id
    ${statusJoin}
    ${baseWhere}
  `;

  const total = Number(countResult[0]?.count ?? 0);

  /*
  ---------------------------------------------------
  2️⃣ GET IDS FIRST (LIMIT BEFORE HEAVY PROCESSING)
  ---------------------------------------------------
  */

  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT wm.id
    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    JOIN "WaMessageOrgTeamMap" motm ON motm."messageId" = wm.id
    ${statusJoin}
    ${baseWhere}
    ORDER BY wm."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  if (ids.length === 0) {
    return {
      data: [],
      pagination: {
        total,
        limit,
        offset,
        pageIndex: Math.floor(offset / limit),
        pageSize: limit,
      },
    };
  }

  const idList = ids.map((r) => r.id);

  /*
  ---------------------------------------------------
  3️⃣ FETCH FULL DATA FOR THOSE IDS ONLY
  ---------------------------------------------------
  */

  const data = await prisma.$queryRaw<
    Array<{
      id: string;
      createdAt: Date;
      sourceMessage: string;
      contactId: string;
      phone: string;
      messageType: string | null;
      messagePreview: string;
      status: string | null;
      logs: any;
      errorMessage: string | null;
    }>
  >`
    SELECT
      wm.id,
      wm."createdAt",
      wm."sourceMessage",
      wm."contactId",
      wm.logs,
      wm."errorMessage",
      c.phone,

      wm."messageBody"->'send'->>'type' AS "messageType",

      CASE wm."messageBody"->'send'->>'type'
        WHEN 'text' THEN wm."messageBody"->'send'->'text'->>'body'
        WHEN 'template' THEN COALESCE(
          wm."messageBody"->'send'->'template'->>'name',
          wm."messageBody"->'send'->'template'->'components'->0->>'text',
          'template message'
        )
        WHEN 'image' THEN COALESCE(
          wm."messageBody"->'send'->'image'->>'caption',
          'image file'
        )
        WHEN 'video' THEN COALESCE(
          wm."messageBody"->'send'->'video'->>'caption',
          'video file'
        )
        WHEN 'audio' THEN 'audio file'
        WHEN 'document' THEN COALESCE(
          wm."messageBody"->'send'->'document'->>'caption',
          wm."messageBody"->'send'->'document'->>'filename',
          'document file'
        )
        WHEN 'contacts' THEN 'contact card'
        WHEN 'location' THEN 'location'
        ELSE 'unknown'
      END AS "messagePreview",

      ws.status

    FROM "WaMessage" wm
    JOIN "Contact" c ON c.id = wm."contactId"
    LEFT JOIN LATERAL (
      SELECT
        CASE
          WHEN failed_ts = greatest_ts THEN 'failed'
          WHEN read_ts = greatest_ts THEN 'read'
          WHEN delivered_ts = greatest_ts THEN 'delivered'
          WHEN sent_ts = greatest_ts THEN 'sent'
        END AS status
      FROM (
        SELECT
          NULLIF(wm.stats->>'sent','')::timestamp      AS sent_ts,
          NULLIF(wm.stats->>'delivered','')::timestamp AS delivered_ts,
          NULLIF(wm.stats->>'read','')::timestamp      AS read_ts,
          NULLIF(wm.stats->>'failed','')::timestamp    AS failed_ts,
          GREATEST(
            NULLIF(wm.stats->>'sent','')::timestamp,
            NULLIF(wm.stats->>'delivered','')::timestamp,
            NULLIF(wm.stats->>'read','')::timestamp,
            NULLIF(wm.stats->>'failed','')::timestamp
          ) AS greatest_ts
      ) t
    ) ws ON true
    WHERE wm.id IN (${Prisma.join(idList)})
    ORDER BY wm."createdAt" DESC
  `;

  /*
  ---------------------------------------------------
  4️⃣ OPTIONAL STATUS FILTER IN NODE (CHEAPER)
  ---------------------------------------------------
  */

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      pageIndex: Math.floor(offset / limit),
      pageSize: limit,
    },
  };
}
