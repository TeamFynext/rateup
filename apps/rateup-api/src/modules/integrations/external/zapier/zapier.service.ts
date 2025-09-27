import { faker } from "@faker-js/faker";
import { zapierTriggerQueue } from "../../../../utils/redisConnection";
import prisma from "../../../../utils/prisma";
import { PlatformType } from "../../../../../generated/prisma/client";
import { QuestionType } from "../../../../types/enums";
import { TicketPriority } from "../../../../../generated/prisma/enums";

export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
  NEW_MESSAGE = "new_message_received",
  CONVERSATION_CLOSED = "conversation_closed",
  CONTACT_UPDATED = "contact_updated",
  CONTACT_LABEL_UPDATED = "contact_label_updated",
  TICKET_CREATED = "new_ticket",
  CONTACT_ADDED_TO_GROUP = "contact_added_to_group",
  RESPONSE_SUBMITTED = "response_submitted",
  CONTACT_DELETED = "contact_deleted",
  TICKET_CARD_MOVED = "ticket_card_moved",
  TICKET_ASSIGNEE_UPDATED = "ticket_assignee_updated",
  NEW_TEAM_MEMBER_CREATED = "new_staff_joined_to_team",
}

export async function getSampleDataForTrigger(triggerKey: ZapierTriggers) {
  let data = [];
  switch (triggerKey) {
    case ZapierTriggers.CONTACT_CREATE:
      data = [
        {
          id: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
          source: "whatsapp",
          igsId: null,
        },
        {
          id: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: null,
          email: null,
          source: "instagram",
          igsId: "1254477777772919",
        },
      ];
      break;
    case ZapierTriggers.CONTACT_ASSIGN:
      return [
        {
          contactId: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
          igsId: null,
          assignees: [
            {
              name: faker.person.fullName(),
              email: faker.person.fullName(),
              teamName: "marketing",
              teamCode: "marketing123",
            },
          ],
        },
        {
          contactId: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: null,
          email: null,
          igsId: "1254477777772919",
          assignees: [
            {
              name: faker.person.fullName(),
              email: faker.person.fullName(),
              teamName: "marketing",
              teamCode: "marketing123",
            },
          ],
        },
      ];
      break;
    case ZapierTriggers.CONTACT_ADDED_TO_GROUP:
      data = [
        {
          contactId: "1234-sample-000-contact-id",
          contactGroupId: "1234-sample-000-group-id",
        },
      ];
      break;
    case ZapierTriggers.CONTACT_DELETED:
      data = [
        {
          id: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
          source: "whatsapp",
          igsId: null,
        },
      ];
      break;
    case ZapierTriggers.CONTACT_LABEL_UPDATED:
      data = [];
      break;
    case ZapierTriggers.CONTACT_UPDATED:
      data = [
        {
          id: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
          source: "whatsapp",
          igsId: null,
        },
      ];
      break;
    case ZapierTriggers.CONVERSATION_CLOSED:
      data = [
        {
          id: "SAMPLE-ID-1234",
          name: faker.person.fullName(),
          phone: faker.phone.number(),
          email: faker.internet.email(),
          source: "whatsapp",
          igsId: null,
        },
      ];
      break;
    case ZapierTriggers.NEW_MESSAGE:
      const from = faker.phone.number();
      const source = faker.phone.number();
      data = [
        {
          from,
          messageBody: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: source,
              phone_number_id: "1234567890000",
            },
            contacts: [
              {
                profile: {
                  name: faker.person.fullName(),
                },
                wa_id: from,
              },
            ],
            messages: [
              {
                from: from,
                id: "wamid.ID",
                timestamp: "1273846753",
                text: {
                  body: "MESSAGE_BODY",
                },
                type: "text",
              },
            ],
          },
          platform: PlatformType.WHATSAPP,
          source: "1234567890000",
          messageId: "wamid.ID",
        },
      ];
      break;
    case ZapierTriggers.NEW_TEAM_MEMBER_CREATED:
      data = [
        {
          isExistingUser: true,
          name: faker.person.fullName(),
          email: faker.internet.email(),
          teamCode: "marketing_1234",
          teamName: "marketing",
        },
      ];
      break;
    case ZapierTriggers.RESPONSE_SUBMITTED:
      data = [
        {
          responses: [
            {
              questionId: "suin-1111-kljdkh1323",
              type: QuestionType.Text,
              response: {
                [QuestionType.Text]: "sample text response",
              },
            },
          ],
          createdAt: "2022-09-19T11:03:06.955Z",
          language: "English",
          tag: "abc",
          platform: "web",
          deviceData: "",
          contactId: "1929-jdkh-jhdjhd",
          location: null,
          shortUrlId: "ahvkXgt1",
        },
      ];
      break;
    case ZapierTriggers.TICKET_ASSIGNEE_UPDATED:
      data = [
        {
          card: {
            ticketId: "ahvkXgt1",
            title: "Booking Confirmation Not Received",
            description:
              "I completed a reservation yesterday, but I haven't received the confirmation email yet.",
            type: "CUSTOM",
            ticketColumnName: "TODO",
            deadline: "2022-09-19T11:03:06.955Z",
            priority: TicketPriority.HIGH,
          },
          assignees: [
            {
              name: faker.person.fullName(),
              email: faker.internet.email(),
            },
          ],
        },
      ];
      break;
    case ZapierTriggers.TICKET_CARD_MOVED:
      data = [
        {
          ticketId: "ahvkXgt1",
          title: "Booking Confirmation Not Received",
          description:
            "I completed a reservation yesterday, but I haven't received the confirmation email yet.",
          type: "CUSTOM",
          ticketColumnName: "RESOLVED",
          deadline: "2022-09-19T11:03:06.955Z",
          priority: TicketPriority.HIGH,
        },
      ];
      break;
    case ZapierTriggers.TICKET_CREATED:
      data = [
        {
          ticketId: "ahvkXgt1",
          title: "Booking Confirmation Not Received",
          description:
            "I completed a reservation yesterday, but I haven't received the confirmation email yet.",
          type: "CUSTOM",
          ticketColumnName: "TODO",
          deadline: "2022-09-19T11:03:06.955Z",
          priority: TicketPriority.HIGH,
        },
      ];
      break;
  }
  return data;
}

export async function addZapierTriggerToQueue(
  name: ZapierTriggers,
  data,
  orgId,
) {
  await zapierTriggerQueue.add(name, { data, orgId });
}

export async function deleteContactByPhoneNumberAndOrgId(orgId, phone) {
  const contact = await prisma.contact.delete({
    where: {
      contact_phone_org_id_unique: {
        orgId,
        phone,
      },
    },
  });
  await addZapierTriggerToQueue(
    ZapierTriggers.CONTACT_DELETED,
    { [ZapierTriggers.CONTACT_DELETED]: contact },
    contact.orgId,
  );
  return contact;
}

export async function getTicketBoardsByTeamId(teamId) {
  return await prisma.ticketBoard.findMany({
    where: {
      teams: {
        some: {
          teamId,
        },
      },
    },
    select: {
      id: true,
      title: true,
    },
  });
}

export async function getTicketColumnsByBoardId(boardId: string, page?) {
  return await prisma.ticketColumn.findMany({
    where: {
      ticketBoardId: boardId,
    },
    select: {
      id: true,
      title: true,
    },
    ...(page !== undefined
      ? {
          skip: page * 20,
          take: 20,
        }
      : {}),
  });
}
