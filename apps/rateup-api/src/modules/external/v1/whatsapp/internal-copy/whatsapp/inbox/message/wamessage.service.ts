import { Contact, WaMessage } from "@prisma/client";
import prisma from "../../../../../../../../utils/prisma";

export async function addNewWaMessage(
  messageBody: WaInboxMessageBody,
  contactId: string,
  waCreatedAt: string,
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

  if (failed) {
    initialStats.failed = waCreatedAt;
  }
  const newMessage = prisma.waMessage.create({
    data: {
      messageBody,
      contactId,
      waCreatedAt,
      templateComponentParams: componentParams,
      messageId,
      sendBy,
      ...(failed ? { stats: initialStats } : {}),
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
LIMIT 10000 
OFFSET ${(page - 1) * 10000}`;
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
