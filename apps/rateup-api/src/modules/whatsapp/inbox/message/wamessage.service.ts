import {
  Campaign,
  Contact,
  ContactGroup,
  WaAccountSettings,
  WaMessage,
} from "@prisma/client";
import prisma from "../../../../utils/prisma";
import {
  DateType,
  WaChatExportConstraints,
  WaChatFilterSchema,
  WaMessageAssignBody,
} from "./wamessage.schema";
import { log } from "../../../../utils/logger";
import { callWhatsappApi } from "../../wa_axios";
import { getWaSettings } from "../../settings/wa_settings.service";
import axios from "axios";
import {
  WaMessageAssignStatus,
  WaMessageAssignStatusTab,
} from "../../../../types/enums";
import { updateContactById } from "../../../contact/contact.service";
import { wait } from "../../whatsappSurvey/wasurvey.controller";
import { sendMessage } from "../../whatsappSurvey/wasurvey.service";
import {
  createReplyImageMessage,
  createDocumentMessage,
  createVideoMessage,
  createAudioMessage,
} from "../../whatsappSurvey/wasurvey.utils";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  componentParams?: any,
  messageId?: string,
  sendBy?: string,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody: messageBody as any,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
      sendBy,
    },
  });
  return newMessage;
}

export async function getWaMessagesByContactId(
  contactId: string,
  cursor: string | null,
) {
  let messages: WaMessage[];
  if (cursor) {
    messages = await prisma.waMessage.findMany({
      skip: 1,
      take: 300,
      cursor: {
        id: cursor,
      },
      where: {
        contactId,
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
      take: 300,
      where: {
        contactId,
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
  const nextCursor =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  return { messages, nextCursor };
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
) {
  try {
    // Create params array to use parameterized queries instead of string concatenation
    const params: any[] = [orgId, (page - 1) * 100, userId];
    let paramIndex = 4;

    // Build where conditions using parameters to prevent SQL injection
    let filters = [];

    // Base condition
    filters.push(`c."orgId" = $1::uuid`);
    let orderBy = `wc."lastReceivedMessageTimeStamp"`;

    // Filter by message type
    if (
      bodyFilterProps?.messageType &&
      (!bodyFilterProps?.searchTerm ||
        bodyFilterProps?.searchTerm?.length === 0)
    ) {
      if (bodyFilterProps?.messageType === "usermessages") {
        filters.push(`EXISTS (
          SELECT 1 FROM "WaMessage" wm
          WHERE wm."contactId" = c.id
          AND wm."messageBody"->>'exchangeProcess' = 'receive'
        )`);
      } else if (bodyFilterProps?.messageType === "all") {
        if (bodyFilterProps.waMessageAssignStatus === "Sent") {
          filters.push(`EXISTS (
            SELECT 1 FROM "WaMessage" wm
            WHERE wm."contactId" = c.id
             AND wm."messageBody"->>'exchangeProcess' = 'send'
          )`);
        } else {
          filters.push(`EXISTS (
            SELECT 1 FROM "WaMessage" wm
            WHERE wm."contactId" = c.id
          )`);
        }
        orderBy = `wc."lastMessage"->>'waCreatedAt'`;
      }
    }

    // Filter by contact groups
    if (bodyFilterProps?.contactGroups?.length > 0) {
      params.push(bodyFilterProps.contactGroups);
      filters.push(`EXISTS (
        SELECT 1 FROM "ContactGroupMap" cgm 
        WHERE cgm."contactId" = c.id 
        AND cgm."contactGroupId" = ANY($${paramIndex}::uuid[])
      )`);
      paramIndex++;
    }

    // Filter by campaigns
    if (bodyFilterProps?.campaigns?.length > 0) {
      params.push(bodyFilterProps.campaigns);
      filters.push(`EXISTS (
        SELECT 1 FROM "CampaignParticipant" cpt 
        WHERE cpt."contactId" = c.id 
        AND cpt."campaignId" = ANY($${paramIndex}::uuid[])
      )`);
      paramIndex++;
    }

    // Filter by tags
    if (bodyFilterProps?.tags?.length > 0) {
      const tagFilters = bodyFilterProps.tags.map((tag) => {
        params.push(JSON.stringify(tag));
        return `c."tags" @> $${paramIndex++}`;
      });
      filters.push(`(${tagFilters.join(" OR ")})`);
    }

    // Search by name or phone
    if (bodyFilterProps?.searchTerm) {
      params.push(`%${bodyFilterProps.searchTerm}%`);
      params.push(`%${bodyFilterProps.searchTerm.replace(/\s+/g, "")}%`);
      filters.push(
        `(c."name" ILIKE $${paramIndex}::TEXT OR REPLACE(c."phone", ' ', '') LIKE $${paramIndex + 1}::TEXT)`,
      );
      paramIndex += 2;
    }

    // Filter by assignment status
    if (
      bodyFilterProps?.waMessageAssignStatus &&
      bodyFilterProps.waMessageAssignStatus !== "Sent"
    ) {
      if (bodyFilterProps?.waMessageAssignStatus === "New") {
        filters.push(
          `(c."lastReceivedMessageTimeStamp" > NOW() - INTERVAL '24 hours')`,
        );
        const newStatuses = bodyFilterProps.newStatuses;
        if (newStatuses?.length) {
          params.push(
            newStatuses.map((status) =>
              status === "ASSIGNEDTOME" ? "ASSIGNED" : status,
            ),
          );
          let newQuery = `c."waMessageAssignStatus" = ANY($${paramIndex++}::TEXT[])`;
          if (bodyFilterProps.newStatuses.includes("ASSIGNEDTOME")) {
            params.push(userId);
            const assignmentCondition = `EXISTS (
              SELECT 1 FROM "WaInboxAssign" winb 
              WHERE winb."contactId" = c.id 
              AND winb."assignedUserId" = $${paramIndex++}::uuid
            )`;
            newQuery +=
              newStatuses.length === 1
                ? ` AND ${assignmentCondition}`
                : ` OR ${assignmentCondition}`;
          }
          filters.push(newQuery);
        }
      } else {
        const isAssignedToMe =
          bodyFilterProps?.waMessageAssignStatus === "AssignedToMe";
        const assignedStatus =
          WaMessageAssignStatusTab[bodyFilterProps?.waMessageAssignStatus];

        params.push(assignedStatus);
        filters.push(`c."waMessageAssignStatus" = $${paramIndex++}`);

        if (isAssignedToMe) {
          params.push(userId);
          filters.push(`EXISTS (
          SELECT 1 FROM "WaInboxAssign" winb 
          WHERE winb."contactId" = c.id 
          AND winb."assignedUserId" = $${paramIndex++}::uuid
        )`);
        }
      }
    }

    if (bodyFilterProps?.blockedUsers) {
      filters?.push(`c."blockedOnWhatsApp" = TRUE`);
    } else {
      filters?.push(`c."blockedOnWhatsApp" = FALSE`);
    }

    const whereClause = filters.join(" AND ");

    // Simplified and optimized query
    const query = `SELECT 
        c.id,
        c."name",
        c."phone",
        c."aiWaChat",
        c."waMessageAssignStatus",
        c."lastReceivedMessageTimeStamp",
        c."consent",
        c."whatsappUserName",
        c."blockedOnWhatsApp",
        COALESCE(c.tags, '{}'::jsonb) as tags,
        (
          SELECT COUNT(*)::INTEGER FROM "WaMessage" w WHERE w."contactId" = c.id
          AND w."messageBody"->>'exchangeProcess' = 'receive'
          AND NOT($3::TEXT = ANY(w."readUsers"))
        ) as "unReadMessageCount",
        COALESCE(
        json_agg(
            json_build_object(
                'id', u.id,
                'name', u.name
            )
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]') AS "assignedUsers",
        (
          SELECT jsonb_build_object(
            'messageBody', w."messageBody",
            'waCreatedAt', w."waCreatedAt"
          )
          FROM "WaMessage" w
          WHERE w."contactId" = c.id
          ORDER BY w."waCreatedAt" DESC
          LIMIT 1
        ) as "lastMessage" FROM "Contact" c
         LEFT JOIN "WaInboxAssign" wb ON wb."contactId" = c.id
         LEFT JOIN "User" u ON wb."assignedUserId" = u.id
      WHERE ${whereClause}
      GROUP BY c.id
    `;
    const wrappedQuery = `SELECT * FROM (${query}) wc ORDER BY ${orderBy} DESC NULLS LAST LIMIT 100 OFFSET $2`;

    const contacts = await prisma.$queryRawUnsafe(wrappedQuery, ...params);
    return contacts;
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

export async function assignWaMessageToUser(data: WaMessageAssignBody) {
  const res = await prisma.waInboxAssign.createMany({
    data: data.assignedUserIds.map((userId) => ({
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
  await updateContactById(data.contactId, {
    waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
  });
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

export async function deleteAssignedUsersforContact(contactId) {
  return await prisma.waInboxAssign.deleteMany({
    where: {
      contactId,
    },
  });
}

export async function getContactsCountByInbox(orgId, userId) {
  const count: {
    new_count: number;
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
      ) AS is_assigned_to_me
    FROM "Contact" c
    WHERE c."orgId" = ${orgId}::uuid
  )
  SELECT
    COUNT(CASE WHEN mf.has_recent AND mf."waMessageAssignStatus" = ${WaMessageAssignStatus.UNASSIGNED} AND NOT mf."blockedOnWhatsApp" THEN 1 END)::INTEGER AS new_count,
    COUNT(CASE WHEN mf."waMessageAssignStatus" = ${WaMessageAssignStatus.ASSIGNED} AND mf.has_receive
      AND NOT mf."blockedOnWhatsApp" THEN 1 END)::INTEGER AS assigned_count,
    COUNT(CASE WHEN mf."waMessageAssignStatus" = ${WaMessageAssignStatus.CLOSED} AND mf.has_receive
      AND NOT mf."blockedOnWhatsApp" THEN 1 END)::INTEGER AS closed_count,
    COUNT(CASE WHEN mf.has_receive AND mf.is_assigned_to_me AND NOT mf."blockedOnWhatsApp" THEN 1 END)::INTEGER AS assigned_to_me_count,
    COUNT(CASE WHEN mf."blockedOnWhatsApp" THEN 1 END)::INTEGER AS blocked_count
  FROM message_flags mf;`;

  return {
    new: count[0].new_count,
    closed: count[0].closed_count,
    assignedToMe: count[0].assigned_to_me_count,
    assigned: count[0].assigned_count,
    blocked: count[0].blocked_count,
  };
}

type WaMedia = {
  type?: "audio" | "image" | "document" | "video";
  url?: string;
  name?: string;
};

export async function sendMediaMessages(
  media: WaMedia[],
  phone,
  orgId,
  userId,
  caption = "",
) {
  for (var i = 0; i < media.length; i++) {
    const item = media[i];
    const isLastItem = i === media.length - 1;
    let captionMsg = isLastItem ? caption : "";
    let messageBody;
    switch (item.type) {
      case "image": {
        console.log("item.url", item.url);
        messageBody = createReplyImageMessage(phone, item.url, captionMsg);
        break;
      }
      case "document": {
        messageBody = createDocumentMessage(
          phone,
          item.url,
          item.name,
          captionMsg,
        );
        break;
      }
      case "video": {
        messageBody = createVideoMessage(phone, item.url, captionMsg);
        break;
      }
      case "audio": {
        messageBody = createAudioMessage(phone, item.url);
        break;
      }
    }
    await sendMessage(orgId, messageBody, null, userId);
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
