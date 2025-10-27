import {
  Campaign,
  Contact,
  ContactGroup,
  PlatformType,
  WaAccountSettings,
  WaMessage,
} from "../../../../../generated/prisma/client";
import prisma from "../../../../utils/prisma";
import {
  DateType,
  GenerateInboxResponseBody,
  WaChatExportConstraints,
  WaChatFilterSchema,
  WaMessageAssignBody,
} from "./wamessage.schema";
import { log } from "../../../../utils/logger";
import { callWhatsappApi } from "../../wa_axios";
import { getWaSettings } from "../../settings/wa_settings.service";
import axios from "axios";
import {
  WaAssignedChatPermission,
  WaMessageAssignStatus,
} from "../../../../types/enums";
import { updateContactById } from "../../../contact/contact.service";
import { wait } from "../../whatsappSurvey/wasurvey.controller";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service";
import {
  createReplyImageMessage,
  createDocumentMessage,
  createVideoMessage,
  createAudioMessage,
  createContactMessage,
  createLocationMessage,
} from "../../whatsappSurvey/wasurvey.utils";
import { WaMessageAssignStatusTab } from "../../constants";
import { Role } from "../../../org/org.services";
import { getTeamIdsByUserId } from "../../../team/team.service";
import { UserAvailabilityStatus } from "../../../user/user.schema";
import {
  createNotification,
  getNotificationSettings,
} from "../../../notification/notification.service";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../../integrations/external/zapier/zapier.service";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  sourcePlatform: PlatformType,
  sourceIdentifier: string,
  componentParams?: any,
  messageId?: string,
  sendBy?: string,
  failed: boolean = false,
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

  if (failed) {
    initialStats.failed = waCreatedAt;
  }
  let statsData = {};
  if (failed || sourcePlatform === PlatformType.WEBCHAT) {
    statsData = { stats: initialStats };
  }

  const newMessage = prisma.waMessage.create({
    data: {
      messageBody: messageBody as any,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
      sendBy,
      sourcePlatform,
      sourceIdentifier,
      ...statsData,
    },
  });
  return newMessage;
}

export async function getWaMessagesByContactId(
  contactId: string,
  cursor: string | null,
  phone?: string,
) {
  let messages: WaMessage[];
  const sourceIdentifierCondition =
    phone && phone !== "all"
      ? {
          OR: [{ sourceIdentifier: phone }, { sourceIdentifier: `+${phone}` }],
        }
      : {};
  if (cursor) {
    messages = await prisma.waMessage.findMany({
      skip: 1,
      take: 50,
      cursor: {
        id: cursor,
      },
      where: {
        contactId,
        ...sourceIdentifierCondition,
      },
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
      where: {
        contactId,
        ...sourceIdentifierCondition,
      },
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
  const nextCursor = hasNextPage ? messages[messages.length - 1].id : null;
  return { messages, nextCursor, hasNextPage };
}

export async function generateChatFilterData(orgId: string) {
  try {
    const [contactTags, tagsFromContacts, cGroups, campaigns] =
      await Promise.all([
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
    log.error("Error in inbox chat filter get api", error);
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
    let orderBy = `c."lastReceivedMessageTimeStamp"`;

    const isSearchMode = bodyFilterProps?.searchTerm?.length > 0;

    if (!isSearchMode) {
      // Message type filters
      if (bodyFilterProps?.messageType) {
        if (bodyFilterProps?.messageType === "usermessages") {
          filters.push(`c."lastReceivedMessageTimeStamp" IS NOT NULL`);
        } else if (bodyFilterProps?.messageType === "all") {
          if (bodyFilterProps.waMessageAssignStatus === "Sent") {
            filters.push(`c."lastSentMessageTimeStamp" IS NOT NULL`);
          } else {
            filters.push(`EXISTS (
                SELECT 1 FROM "WaMessage" wm
                WHERE wm."contactId" = c.id
              )`);
          }
          orderBy = `c."lastMessageWaCreatedAt"`;
        }
      }

      // Contact groups filter
      if (bodyFilterProps?.contactGroups?.length > 0) {
        params.push(bodyFilterProps.contactGroups);
        filters.push(`EXISTS (
          SELECT 1 FROM "ContactGroupMap" cgm 
          WHERE cgm."contactId" = c.id 
          AND cgm."contactGroupId" = ANY($${paramIndex}::uuid[])
        )`);
        paramIndex++;
      }

      // Campaigns filter
      if (bodyFilterProps?.campaigns?.length > 0) {
        params.push(bodyFilterProps.campaigns);
        filters.push(`EXISTS (
          SELECT 1 FROM "CampaignParticipant" cpt 
          WHERE cpt."contactId" = c.id 
          AND cpt."campaignId" = ANY($${paramIndex}::uuid[])
        )`);
        paramIndex++;
      }

      // Tags filter
      if (bodyFilterProps?.tags?.length > 0) {
        const tagFilters = bodyFilterProps.tags.map((tag) => {
          params.push(JSON.stringify(tag));
          return `c."tags" @> $${paramIndex++}::jsonb`;
        });
        filters.push(`(${tagFilters.join(" OR ")})`);
      }

      // Labels filter
      if (bodyFilterProps?.labels?.length > 0) {
        params.push(bodyFilterProps.labels[0]);
        filters.push(`c."lifecycleId" = $${paramIndex++}::uuid`);
      }

      // Assignment status filters
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { waAssignedChatPermission: true },
      });
      const waAssignedChatPermission = org?.waAssignedChatPermission;

      const isAssignedToMe = bodyFilterProps?.waMessageAssignStatus === "mine";
      const isNew = bodyFilterProps?.waMessageAssignStatus === "New";
      const isNotSent = bodyFilterProps?.waMessageAssignStatus !== "Sent";
      const newStatuses = bodyFilterProps?.newStatuses?.length
        ? bodyFilterProps.newStatuses
        : [WaMessageAssignStatus.ASSIGNED, WaMessageAssignStatus.UNASSIGNED];

      if (bodyFilterProps?.waMessageAssignStatus && isNotSent) {
        if (isNew) {
          params.push(WaMessageAssignStatus.CLOSED);
          filters.push(
            `c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours' AND c."waMessageAssignStatus" != $${paramIndex++}::TEXT`,
          );

          if (newStatuses.length) {
            params.push(
              newStatuses.map((status) =>
                status === "MINE" ? "ASSIGNED" : status,
              ),
            );
            let newQuery = `(c."waMessageAssignStatus" = ANY($${paramIndex++}::TEXT[])`;

            if (newStatuses.includes("MINE")) {
              params.push(userId);
              filters.push(`EXISTS (
                SELECT 1 FROM "WaInboxAssign" winb 
                WHERE winb."contactId" = c.id 
                AND winb."assignedUserId" = $${paramIndex++}::uuid
              )`);
            }

            if (
              newStatuses.includes("ASSIGNED") ||
              newStatuses.includes("MINE")
            ) {
              if (
                waAssignedChatPermission ===
                WaAssignedChatPermission.TeamMembers
              ) {
                const teamIds = await getTeamIdsLazy();
                params.push(teamIds);
                const teamCondition = `EXISTS (
                  SELECT 1 FROM "WaInboxAssign" winb 
                  WHERE winb."contactId" = c.id 
                  AND winb."teamId" = ANY($${paramIndex++}::uuid[])
                )`;

                if (newStatuses.includes("UNASSIGNED")) {
                  params.push(WaMessageAssignStatus.UNASSIGNED);
                  params.push(WaMessageAssignStatus.ASSIGNED);
                  newQuery += ` AND c."waMessageAssignStatus" = $${paramIndex++} OR (c."waMessageAssignStatus" = $${paramIndex++} AND ${teamCondition})`;
                } else {
                  newQuery += ` AND ${teamCondition}`;
                }
              } else if (
                waAssignedChatPermission === WaAssignedChatPermission.Admins &&
                role === Role.MEMBER
              ) {
                if (!newStatuses.includes("UNASSIGNED")) {
                  params.push(userId);
                  newQuery += ` AND EXISTS (
                    SELECT 1 FROM "WaInboxAssign" winb 
                    WHERE winb."contactId" = c.id 
                    AND winb."assignedUserId" = $${paramIndex++}::uuid
                  )`;
                } else {
                  params.push("UNASSIGNED");
                  params.push(userId);
                  newQuery += ` AND (c."waMessageAssignStatus" = $${paramIndex++}::TEXT OR EXISTS (
                    SELECT 1 FROM "WaInboxAssign" winb 
                    WHERE winb."contactId" = c.id 
                    AND winb."assignedUserId" = $${paramIndex++}::uuid
                  ))`;
                }
              }
            }

            filters.push(newQuery);
          }
        } else {
          const assignedStatus =
            WaMessageAssignStatusTab[bodyFilterProps?.waMessageAssignStatus];
          params.push(assignedStatus);
          filters.push(`c."waMessageAssignStatus" = $${paramIndex++}`);

          if (isAssignedToMe) {
            params.push(userId);
            const assignedQuery = [
              `winb."assignedUserId" = $${paramIndex++}::uuid`,
            ];

            if (bodyFilterProps?.assignedTeams?.length) {
              params.push(bodyFilterProps.assignedTeams);
              assignedQuery.push(
                `winb."teamId" = ANY($${paramIndex++}::uuid[])`,
              );
            }

            filters.push(`EXISTS (
              SELECT 1 FROM "WaInboxAssign" winb 
              WHERE winb."contactId" = c.id AND ${assignedQuery.join(" AND ")}
            )`);
          } else if (assignedStatus === "ASSIGNED") {
            if (bodyFilterProps?.assignedTeams?.length) {
              params.push(bodyFilterProps.assignedTeams);
              filters.push(`EXISTS (
                SELECT 1 FROM "WaInboxAssign" winb 
                WHERE winb."contactId" = c.id 
                AND winb."teamId" = ANY($${paramIndex++}::uuid[])
              )`);
            } else if (
              waAssignedChatPermission === WaAssignedChatPermission.TeamMembers
            ) {
              const teamIds = await getTeamIdsLazy();
              params.push(teamIds);
              filters.push(`EXISTS (
                SELECT 1 FROM "WaInboxAssign" winb 
                WHERE winb."contactId" = c.id 
                AND winb."teamId" = ANY($${paramIndex++}::uuid[])
              )`);
            } else if (
              waAssignedChatPermission === WaAssignedChatPermission.Admins &&
              role === Role.MEMBER
            ) {
              return [];
            }
          }
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

      // Blocked filter
      filters.push(
        `c."blockedOnWhatsApp" = ${bodyFilterProps?.blockedUsers ? "TRUE" : "FALSE"}`,
      );
    }

    // Search term
    if (isSearchMode) {
      params.push(`%${bodyFilterProps.searchTerm}%`);
      params.push(`%${bodyFilterProps.searchTerm.replace(/\s+/g, "")}%`);
      filters.push(
        `(c."name" ILIKE $${paramIndex}::TEXT OR REPLACE(c."phone", ' ', '') LIKE $${paramIndex + 1}::TEXT)`,
      );
      paramIndex += 2;
    }

    const whereClause = filters.join(" AND ");

    // Optimized query with materialized CTEs and reduced subqueries
    const query = `
      WITH filtered_contacts AS (
        SELECT 
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
          c."source",
          c."igsId",
          c."profilePic",
          c."followerCount",
          c."isIgVerifiedUser",
          c."lifecycleId",
          COALESCE(c.tags, '{}'::jsonb) as tags,
         (
      SELECT COUNT(*)::INTEGER 
      FROM "WaMessage" w 
      WHERE w."contactId" = c.id
      AND w."messageBody"->>'exchangeProcess' = 'receive'
      AND NOT($3::TEXT = ANY(w."readUsers"))
    ) as "unReadMessageCount",
          c."lastMessageBody",
          c."lastMessageWaCreatedAt",
          c."lastMessagePlatform",
          c."lastMessageSourceIdentifier",
          c."lastReceivedMetadata"
        FROM "Contact" c
        WHERE ${whereClause}
        ORDER BY ${orderBy} DESC NULLS LAST
        LIMIT 20 OFFSET $2
      ),
      assigned_users AS (
        SELECT 
          winb."contactId",
          json_agg(
            json_build_object('id', u.id, 'name', u.name)
          ) as users
        FROM "WaInboxAssign" winb
        INNER JOIN "User" u ON winb."assignedUserId" = u.id
        WHERE winb."contactId" IN (SELECT id FROM filtered_contacts)
        GROUP BY winb."contactId"
      )
      SELECT 
        fc.*,
        COALESCE(au.users, '[]'::json) as "assignedUsers",
        l."name" as "lifecycleName"
      FROM filtered_contacts fc
      LEFT JOIN assigned_users au ON au."contactId" = fc.id
      LEFT JOIN "Lifecycle" l ON l.id = fc."lifecycleId"
    `;

    const contacts: any[] = await prisma.$queryRawUnsafe(query, ...params);

    if (contacts.length === 0) return [];

    // Fetch messages in bulk
    const contactIds = contacts.map((c) => c.id);

    const messagesRows: any[] = await prisma.$queryRaw`
      WITH ranked AS (
        SELECT 
          w.id,
          w."contactId",
          w."waCreatedAt",
          w."messageBody",
          w."sourcePlatform",
          w."sourceIdentifier",
          w."sendBy",
          w."stats",
          w."messageId",
          ROW_NUMBER() OVER (PARTITION BY w."contactId" ORDER BY w."waCreatedAt" DESC) AS rn
        FROM "WaMessage" w
        WHERE w."contactId" = ANY(${contactIds}::uuid[])
      )
      SELECT 
        r.*,
        u."name" AS "senderName",
        u."profilePhoto" AS "senderProfilePhoto"
      FROM ranked r
      LEFT JOIN "User" u ON r."sendBy" = u.id
      WHERE r.rn <= 10
      ORDER BY r."contactId", r."waCreatedAt" DESC
    `;

    // Group messages
    const messagesByContact = new Map<string, any[]>();
    for (const row of messagesRows) {
      const list = messagesByContact.get(row.contactId) || [];
      list.push({
        id: row.id,
        contactId: row.contactId,
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
      messagesByContact.set(row.contactId, list);
    }

    // Build final response
    return contacts.map((contact: any) => ({
      ...contact,
      lastMessage: contact.lastMessageBody
        ? {
            messageBody: contact.lastMessageBody,
            waCreatedAt: contact.lastMessageWaCreatedAt,
            sourcePlatform: contact.lastMessagePlatform,
            sourceIdentifier: contact.lastMessageSourceIdentifier,
          }
        : null,
      metadata: contact.lastReceivedMetadata,
      messages: messagesByContact.get(contact.id) || [],
    }));
  } catch (error) {
    log.error("Error in inbox chat filter API: %o", error);
    return [];
  }
}

export async function getMediaFile(mediaId: string, orgId: string) {
  const waSettings = await getWaSettings(orgId);
  const fileUrl = await callWhatsappApi(
    `/${mediaId}`,
    "GET",
    waSettings.accessToken,
  );
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
          extendedWhereClause += `AND wm."createdAt" BETWEEN '${constraints.date.between.from}' AND '${constraints.date.between.to}' `;
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

    // Filter for contactGroups when ContactGroup (cg) is accessible
    if (
      bodyFilterProps?.contactGroups &&
      bodyFilterProps?.contactGroups?.length > 0
    ) {
      extendedWhereClause += `AND cg."id" IN (${bodyFilterProps?.contactGroups
        ?.map((v: any) => `'${v?.value}'::uuid`)
        .join(",")})`;
    }

    // Filter for campaigns when CampaignParticipant (cpt) is accessible
    if (bodyFilterProps?.campaigns && bodyFilterProps?.campaigns?.length > 0) {
      extendedWhereClause += `AND cpt."campaignId" IN (${bodyFilterProps?.campaigns
        ?.map((v: any) => `'${v?.value}'::uuid`)
        .join(",")})`;
    }

    // Filter for tags
    if (bodyFilterProps?.tags && bodyFilterProps.tags.length > 0) {
      const tagsFilter = bodyFilterProps.tags
        .map((tag) => `c."tags" @> '${JSON.stringify(tag)}'`)
        .join(" OR ");
      extendedWhereClause += ` AND (${tagsFilter}) `;
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
      wm."createdAt" ASC`;

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
) {
  const existingUsers = await prisma.waInboxAssign.findMany({
    where: {
      contactId: data.contactId,
      assignedUserId: {
        in: data.assignedUserIds,
      },
    },
  });
  const assignIfOnline = data.assignIfOnline ?? true;
  const newUsers = [];
  for (const userId of data.assignedUserIds) {
    if (!existingUsers.some((user) => user.assignedUserId === userId)) {
      if (assignIfOnline) {
        const user = await prisma.orgMember.findUnique({
          where: {
            userId_orgId: {
              userId,
              orgId,
            },
          },
        });
        if (user?.status === UserAvailabilityStatus.online) {
          newUsers.push(userId);
        }
      } else {
        newUsers.push(userId);
      }
    }
    await prisma.userAssignedCount.upsert({
      where: {
        user_org_unique: {
          userId,
          orgId,
        },
      },
      update: {
        assignCount: {
          increment: 1,
        },
      },
      create: {
        userId,
        orgId,
        assignCount: 1,
      },
    });
  }

  const res = await prisma.waInboxAssign.createMany({
    data: newUsers.map((userId) => ({
      contactId: data.contactId,
      assignedUserId: userId,
      teamId: data.teamId,
    })),
    skipDuplicates: true,
  });

  const contact = await prisma.waInboxAssign.deleteMany({
    where: {
      contactId: data.contactId,
      assignedUserId: {
        notIn: data.assignedUserIds,
      },
    },
  });
  const updatedContact = await updateContactById(data.contactId, {
    waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
  });

  for (const userId of newUsers) {
    const notificationSetting = await getNotificationSettings(
      userId,
      updatedContact.orgId,
    );
    if (
      notificationSetting &&
      notificationSetting.waMessageAssignNotification
    ) {
      await createNotification(
        userId,
        updatedContact.orgId,
        "whatsapp",
        "chat-assigned",
        {
          contactId: updatedContact.id,
          contactName: updatedContact.name,
        },
      );
    }
  }

  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_ASSIGN,
    {
      [ZapierTriggers.CONTACT_ASSIGN]: {
        contact: updatedContact,
        teamId: data.teamId,
        assignedUserIds: newUsers,
      },
    },
    orgId,
  );
  const currentAssignedUsers = await prisma.waInboxAssign.findMany({
    where: {
      contactId: data.contactId,
    },
    select: {
      assignedUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return currentAssignedUsers.map((c) => c.assignedUser);
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

export async function getAssignedUsersCountForContactByTeam(
  contactId: string,
  teamId: string,
) {
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

export async function getContactsCountByInbox(
  orgId: string,
  userId: string,
  role,
) {
  const teamIds = await getTeamIdsByUserId(userId);
  const count: {
    new_assigned_count: number;
    new_unassigned_count: number;
    new_assigned_to_me_count: number;
    assigned_count: number;
    closed_count: number;
    assigned_to_me_count: number;
    blocked_count: number;
  }[] = await prisma.$queryRaw`WITH message_flags AS (
    SELECT
      c.id AS contact_id,
      c."waMessageAssignStatus",
      c."blockedOnWhatsApp",
      EXISTS (
        SELECT 1 FROM "WaMessage" wm_recv 
        WHERE wm_recv."contactId" = c.id 
        AND wm_recv."messageBody"->>'exchangeProcess' = 'receive'
        LIMIT 1
      ) AS has_receive,
      EXISTS (
        SELECT 1 FROM "WaMessage" wm_recent 
        WHERE wm_recent."contactId" = c.id 
        AND wm_recent."messageBody"->>'exchangeProcess' = 'receive'
        AND c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours'
        LIMIT 1
      ) AS has_recent,
      EXISTS (
        SELECT 1 FROM "WaInboxAssign" wa 
        WHERE wa."contactId" = c.id 
        AND wa."assignedUserId" = ${userId}::uuid
        LIMIT 1
      ) AS is_assigned_to_me,
      EXISTS (
        SELECT 1 FROM "WaInboxAssign" wa 
        WHERE wa."contactId" = c.id 
        AND wa."teamId" = ANY(${teamIds}::uuid[])
        LIMIT 1
      ) AS is_assigned_to_my_team
    FROM "Contact" c
    WHERE c."orgId" = ${orgId}::uuid
  ), orgDetails AS (
    SELECT o."waAssignedChatPermission" AS permission FROM "Org" o WHERE o."id" = ${orgId}::uuid
  )
  SELECT
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = ${WaMessageAssignStatus.ASSIGNED} AND mf.has_receive
      AND NOT mf."blockedOnWhatsApp" AND (
      CASE 
        WHEN orgDetails.permission = ${WaAssignedChatPermission.All} THEN 1
        WHEN orgDetails.permission = ${WaAssignedChatPermission.Admins} THEN ${role === Role.MEMBER ? 0 : 1}
        WHEN orgDetails.permission = ${WaAssignedChatPermission.TeamMembers} THEN is_assigned_to_my_team::int
      END 
      )=1)::INTEGER AS assigned_count,
      COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = ${WaMessageAssignStatus.CLOSED} AND mf.has_receive
      AND NOT mf."blockedOnWhatsApp")::INTEGER AS closed_count,
      COUNT(*) FILTER (WHERE mf.has_receive AND mf.is_assigned_to_me AND NOT mf."blockedOnWhatsApp")::INTEGER AS assigned_to_me_count,
      COUNT(*) FILTER (WHERE mf."blockedOnWhatsApp")::INTEGER AS blocked_count,
      COUNT(*) FILTER (WHERE mf.has_recent AND mf."waMessageAssignStatus" = ${WaMessageAssignStatus.ASSIGNED}
    AND NOT mf."blockedOnWhatsApp" AND (
      CASE 
        WHEN orgDetails.permission = ${WaAssignedChatPermission.All} THEN 1
        WHEN orgDetails.permission = ${WaAssignedChatPermission.Admins} THEN ${role === Role.MEMBER ? 0 : 1}
        WHEN orgDetails.permission = ${WaAssignedChatPermission.TeamMembers} THEN is_assigned_to_my_team::int
      END 
    ) = 1)::INTEGER AS new_assigned_count,
    COUNT(*) FILTER (WHERE mf.has_recent AND mf."waMessageAssignStatus" = ${WaMessageAssignStatus.UNASSIGNED}
    AND NOT mf."blockedOnWhatsApp")::INTEGER AS new_unassigned_count,
    COUNT(*) FILTER (WHERE mf.has_recent AND mf.is_assigned_to_me AND NOT mf."blockedOnWhatsApp")::INTEGER AS new_assigned_to_me_count
  FROM message_flags mf CROSS JOIN orgDetails;`;

  const assignedTeamWiseCount = await prisma.$queryRaw`
  SELECT 
    "teamId", 
    COUNT(DISTINCT "contactId")::INTEGER AS "assignedCount",
    COUNT(DISTINCT CASE WHEN "assignedUserId" = ${userId}::uuid THEN "contactId" END)::INTEGER AS "assignedToMeCount"
  FROM "WaInboxAssign"
  GROUP BY "teamId";
`;

  if (
    count[0].new_assigned_count === 0 &&
    count[0].new_assigned_to_me_count > 0
  ) {
    count[0].new_assigned_count = count[0].new_assigned_to_me_count;
  }

  return {
    new: count[0].new_assigned_count + count[0].new_unassigned_count,
    newAssigned: count[0].new_assigned_count,
    newUnassigned: count[0].new_unassigned_count,
    newAssignedTome: count[0].new_assigned_to_me_count,
    closed: count[0].closed_count,
    assignedToMe: count[0].assigned_to_me_count,
    assigned: count[0].assigned_count,
    blocked: count[0].blocked_count,
    assignedTeamWiseCount,
  };
}

export type WaMedia = {
  type?: "audio" | "image" | "document" | "video";
  url?: string;
  name?: string;
};

export async function sendMediaMessages(
  media: WaMedia[],
  to,
  orgId,
  userId,
  platform: PlatformType,
  caption = "",
  whatsappSettingsPhoneId = "",
) {
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const isLastItem = i === media.length - 1;
    let captionMsg = isLastItem ? caption : "";
    let messageBody;
    switch (item.type) {
      case "image": {
        messageBody = createReplyImageMessage(
          to,
          item.url,
          platform,
          captionMsg,
        );
        break;
      }
      case "document": {
        messageBody = createDocumentMessage(
          to,
          item.url,
          item.name,
          captionMsg,
        );
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
    );
    if (!isLastItem) wait(50);
  }
}

export async function markMessagesAsRead(contactId: string, userId: string) {
  const res = await prisma.$executeRawUnsafe(
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
}

export async function sendContactMessage(
  contacts: { contactIds?: string[]; groupIds?: string[] },
  phone,
  orgId,
  userId,
  whatsappSettingsPhoneId,
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
  await sendMessage(orgId, messageBody, null, userId, whatsappSettingsPhoneId);
}

export async function sendLocationMessage(
  location,
  phone,
  orgId,
  userId,
  whatsappSettingsPhoneId,
) {
  const messageBody = createLocationMessage(phone, location);
  await sendMessage(orgId, messageBody, null, userId, whatsappSettingsPhoneId);
}

export async function getWaMessageByMessageId(
  messageId: string,
): Promise<WaMessage> {
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
  if (id)
    return await prisma.waMessage.update({
      where: {
        id,
      },
      data,
    });
  if (messageId) {
    const message = await prisma.waMessage.findFirst({
      where: {
        messageId,
      },
    });
    if (!message) {
      log.trace("Message not found on id: %s", messageId);
      return null;
    }
    return await prisma.waMessage.update({
      where: {
        id: message.id,
      },
      data,
    });
  }
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
      (SELECT COUNT(*)::INTEGER FROM "Contact" c 
        WHERE c."orgId" = ${orgId}::uuid AND c."waMessageAssignStatus" = 'NEW') 
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
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { WaMessageBody } from "../../../../types/whatsapp.types";

/**
 * Generate a "send" text message
 */
function generateSendMessage(contact) {
  return {
    send: {
      to: contact.phone,
      text: { body: faker.lorem.sentence(), preview_url: false },
      type: "text",
      recipient_type: "individual",
      messaging_product: "whatsapp",
    },
    receive: null,
    exchangeProcess: "send",
  };
}

/**
 * Generate a "receive" text message
 */
function generateReceiveMessage(contact, settings) {
  return {
    send: null,
    receive: {
      contacts: [{ wa_id: contact.phone, profile: { name: contact.name } }],
      messages: [
        {
          id: `wamid.${uuidv4()}`,
          from: contact.phone,
          text: { body: faker.lorem.sentence() },
          type: "text",
          timestamp: Math.floor(Date.now() / 1000).toString(),
        },
      ],
      metadata: {
        phone_number_id: settings.phoneId,
        display_phone_number: settings.phone,
      },
      messaging_product: "whatsapp",
    },
    exchangeProcess: "receive",
  };
}

/**
 * Seed chats for all contacts
 */
export async function generateInboxResponse(
  body: GenerateInboxResponseBody,
  orgId: string,
  userId: string,
) {
  const contacts = await prisma.contact.findMany({
    where: { orgId: orgId },
    take: body.numberOfContacts || 5,
  });
  const settings = await getWaSettings(orgId);

  for await (const contact of contacts) {
    console.log(
      `Seeding chats for contact: ${contact.name} (${contact.phone})`,
    );
    const messagesToCreate = [];
    let lastReceivedTime: Date | null = null;

    for (let i = 0; i < (body.messagesPerContact || 1); i++) {
      const isSend = faker.datatype.boolean();
      const messageBody = isSend
        ? generateSendMessage(contact)
        : generateReceiveMessage(contact, settings);

      // Prepare message creation data
      const now = new Date();
      const base = faker.date.recent({ days: 10, refDate: now });
      let sent = base;
      let delivered: Date | null = faker.date.between({ from: sent, to: now });
      let read: Date | null = null;
      let failed: Date | null = null;

      const isFailed = faker.datatype.boolean();
      if (isFailed) {
        failed = faker.date.between({ from: sent, to: now });
        delivered = null;
        read = null;
      } else {
        if (faker.datatype.boolean()) {
          read = faker.date.between({ from: delivered!, to: now });
        }
      }

      messagesToCreate.push({
        id: uuidv4(),
        createdAt: new Date(),
        waCreatedAt: base,
        contactId: contact.id,
        messageBody,
        sendBy: isSend ? userId : null,
        sourcePlatform: "WHATSAPP",
        sourceIdentifier:
          messageBody.send?.to ||
          messageBody.receive?.contacts?.[0]?.wa_id ||
          null,
        stats: {
          failed: failed ? failed.toISOString() : "",
          sent: sent.toISOString(),
          delivered: delivered ? delivered.toISOString() : "",
          read: read ? read.toISOString() : "",
        },
      });

      if (!isSend) {
        lastReceivedTime = base;
      }
    }

    if (messagesToCreate.length > 0) {
      await prisma.waMessage.createMany({
        data: messagesToCreate,
        skipDuplicates: true,
      });
    }

    // Update lastReceivedMessageTimeStamp only once per contact
    if (lastReceivedTime) {
      await prisma.contact.update({
        where: {
          id: contact?.id,
        },
        data: {
          lastReceivedMessageTimeStamp: lastReceivedTime.toISOString(),
        },
      });
    }
  }
}
