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
} from "./wamessage.schema";
import { log } from "../../../../utils/logger";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
  componentParams?: any,
  messageId?: string,
) {
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
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
      orderBy: {
        waCreatedAt: "desc",
      },
    });
  }
  const nextCursor =
    messages.length > 0 ? messages[messages.length - 1].id : null;
  return { messages, nextCursor };
}

export async function getContactsWithLastMessage(
  orgId: string,
  page: number = 1,
) {
  const contacts: Array<
    Contact & {
      latestmessage: WaMessage;
      latestreceivemessage: WaMessage;
      latestmessagetime: string;
      latestreceivetime: string;
    }
  > = await prisma.$queryRaw`
  WITH LatestMessages AS (
      SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."messageBody",
          w."waCreatedAt"
      FROM
          "WaMessage" w
      ORDER BY
          w."contactId", w."waCreatedAt" DESC
  ),
  LatestReceiveMessages AS (
      SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."messageBody" AS receiveMessageBody,
          w."waCreatedAt" AS receiveCreatedAt
      FROM
          "WaMessage" w
      WHERE
          w."messageBody"->'exchangeProcess' = '"receive"'
      ORDER BY
          w."contactId", w."waCreatedAt" DESC
  )
  SELECT
      c.*,
      lm."messageBody" AS LatestMessage,
      lm."waCreatedAt" AS LatestMessageTime,
      lrm.receiveMessageBody AS LatestReceiveMessage,
      lrm.receiveCreatedAt AS LatestReceiveTime
  FROM
      "Contact" c
  LEFT JOIN
      LatestMessages lm ON c.id = lm."contactId"
  LEFT JOIN
      LatestReceiveMessages lrm ON c.id = lrm."contactId"
  WHERE
      c."orgId" = ${orgId}::uuid AND lm."messageBody" IS NOT NULL
  ORDER BY 
      lm."waCreatedAt" DESC NULLS LAST
  LIMIT 5000 OFFSET ${(page - 1) * 5000}`;
  return contacts.map(
    ({
      latestmessage,
      latestmessagetime,
      latestreceivetime,
      tags,
      ...rest
    }) => ({
      ...rest,
      tags: tags ?? {},
      groups: [],
      lastMessage: {
        messageBody: latestmessage ?? null,
        waCreatedAt: latestmessagetime ?? null,
      },
      userInitiatedFinalTimeStamp: latestreceivetime ?? null,
    }),
  );
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
) {
  try {
    function extendQueryForFilters() {
      let extendedWhereClause = "";
      //TODO: Add strict filter
      let isStrict = bodyFilterProps?.strictFilter;
      if (
        bodyFilterProps?.messageType &&
        bodyFilterProps?.messageType !== "all"
      ) {
        if (bodyFilterProps?.messageType === "usermessages") {
          extendedWhereClause += `AND lm."messageBody"->'exchangeProcess' = '"receive"'`;
        }
      }
      if (
        bodyFilterProps?.contactGroups &&
        bodyFilterProps?.contactGroups?.length > 0
      ) {
        extendedWhereClause += `AND cg."id" IN (${bodyFilterProps?.contactGroups
          ?.map((v) => `'${v}'::uuid`)
          .join(",")})`;
      }
      if (
        bodyFilterProps?.campaigns &&
        bodyFilterProps?.campaigns?.length > 0
      ) {
        extendedWhereClause += `AND cpt."campaignId" IN (${bodyFilterProps?.campaigns
          ?.map((v) => `'${v}'::uuid`)
          .join(",")})`;
      }
      if (bodyFilterProps?.tags && bodyFilterProps.tags.length > 0) {
        const tagsFilter = bodyFilterProps.tags
          .map((tag) => `c."tags" @> '${JSON.stringify(tag)}'`)
          .join(" OR ");
        extendedWhereClause += ` AND (${tagsFilter})`;
      }
      if (bodyFilterProps?.searchTerm) {
        const search = bodyFilterProps.searchTerm;
        extendedWhereClause += ` AND (c."name" ILIKE '%${search}%' OR c."phone" LIKE '%${search}%')`;
      }
      return extendedWhereClause;
    }
    const query = `WITH LatestMessages AS (
      SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."messageBody",
          w."waCreatedAt"
      FROM
          "WaMessage" w
      ORDER BY
          w."contactId", w."waCreatedAt" DESC
      ),
      LatestReceiveMessages AS (
          SELECT DISTINCT ON (w."contactId")
              w."contactId",
              w."messageBody" AS receiveMessageBody,
              w."waCreatedAt" AS receiveCreatedAt
          FROM
              "WaMessage" w
          WHERE
              w."messageBody"->'exchangeProcess' = '"receive"'
          ORDER BY
              w."contactId", w."waCreatedAt" DESC
      )
      SELECT
          c.*,
          lm."messageBody" AS LatestMessage,
          lm."waCreatedAt" AS LatestMessageTime,
          lrm.receiveMessageBody AS LatestReceiveMessage,
          lrm.receiveCreatedAt AS LatestReceiveTime
      FROM
          "Contact" c
      LEFT JOIN 
          "ContactGroupMap" cgm ON cgm."contactId" = c."id" 
      LEFT JOIN 
          "ContactGroup" cg ON cg.id = cgm."contactGroupId" 
      LEFT JOIN 
          "CampaignParticipant" cpt ON cpt."contactId" = c."id"
      LEFT JOIN
          LatestMessages lm ON c.id = lm."contactId"
      LEFT JOIN
          LatestReceiveMessages lrm ON c.id = lrm."contactId"
      WHERE
          c."orgId" = $1::uuid ${extendQueryForFilters()}
      ORDER BY 
          lm."waCreatedAt" DESC NULLS LAST
      LIMIT 5000 OFFSET $2`;
    const contacts: Array<
      Contact & {
        latestmessage: WaMessage;
        latestreceivemessage: WaMessage;
        latestmessagetime: string;
        latestreceivetime: string;
      }
    > = await prisma.$queryRawUnsafe(query, orgId, (page - 1) * 5000);
    const uniqueContacts = Array.from(
      contacts.reduce(
        (map, contact) => map.set(contact.id, contact),
        new Map(),
      ),
    ).map(([id, contact]) => contact);

    return uniqueContacts.map(
      ({
        latestmessage,
        latestmessagetime,
        latestreceivetime,
        tags,
        ...rest
      }) => ({
        ...rest,
        tags: tags ?? {},
        groups: [],
        lastMessage: {
          messageBody: latestmessage ?? null,
          waCreatedAt: latestmessagetime ?? null,
        },
        userInitiatedFinalTimeStamp: latestreceivetime ?? null,
      }),
    );
  } catch (error) {
    log.error("Error in inbox chat filter api", error);
    return [];
  }
}

export async function exportWhatsapChats(
  orgId: string,
  constraints: WaChatExportConstraints,
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
  console.log(constraints);
  function extendedWhereClause() {
    let extendedWhereClause = "";
    if (constraints?.date) {
      switch (constraints.date.type) {
        case DateType.BETWEEN: {
          extendedWhereClause += `AND wm."createdAt" BETWEEN '${constraints.date.between.from}' AND '${constraints.date.between.to}'`;
          break;
        }
        case DateType.BEFORE: {
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${
            constraints.date.inclusive ? "<=" : "<"
          }'${constraints.date.before}'`;
          break;
        }
        case DateType.AFTER: {
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') ${
            constraints.date.inclusive ? ">=" : ">"
          } '${constraints.date.after}'`;
          break;
        }
        case DateType.ON: {
          console.log("hello from on clause");
          extendedWhereClause += `AND TO_CHAR(wm."createdAt",'YYYY-MM-DD') = '${constraints.date.on}'`;
          break;
        }
      }
    }
    if (constraints?.repliesOnly) {
      extendedWhereClause += `AND wm."messageBody"->'exchangeProcess' = '"receive"'`;
    }
    console.log(extendedWhereClause);
    return extendedWhereClause;
  }
  const result = await prisma.$queryRawUnsafe(
    `SELECT
      wm."createdAt" AS date,
      c."phone" AS "from",
      c."name" AS "name",
      wm."messageBody"->'receive'->'messages'->0->'text'->>'body' AS receivebody,
      wm."messageBody"->'send'->'text'->>'body' AS sendbody,
      wm."messageBody"->'send'->'template'->>'name' AS templatename
    FROM 
      "WaMessage" wm 
    JOIN 
      "Contact" c ON wm."contactId" = c.id
    WHERE
      c."orgId"=$1::uuid ${extendedWhereClause()}
    ORDER BY 
      wm."createdAt" ASC`,
    orgId,
  );
  return result as any;
}
