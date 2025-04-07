import { TicketType } from "@prisma/client";
import { getShortUrlId } from "../../../utils/commnUtils";
import prisma from "../../../utils/prisma";
import { UpdateCardRequest } from "./card.schema";
import {
  sendTicketAssignEmail,
  sendTicketAssignWaMessage,
} from "../ticket.service";

export interface CardInput {
  title?: string;
  description?: string;
  ticketColumnId: string;
  type: TicketType;
  userId?: string;
  order?: number;
  reviewId?: string;
  waAutomatedReplyMessageId?: string;
  surveyResponseId?: string;
}

export async function createCard(data: CardInput) {
  const { title, userId, ...otherData } = data;
  // Get the highest order in the column to place new card at the end
  const highestOrderCard = await prisma.ticketCard.findFirst({
    where: { ticketColumnId: data.ticketColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order =
    data.order ?? (highestOrderCard ? highestOrderCard.order + 1 : 0);

  const card = await prisma.ticketCard.create({
    data: {
      ...otherData,
      title,
      order,
      ticketId: getShortUrlId(),
    },
  });

  // Log activity for card creation
  await prisma.ticketActivity.create({
    data: {
      type: "ADDED_CARD",
      userId,
      ticketCardId: card.id,
      details: {
        title: card.title,
        ticketColumnId: card.ticketColumnId,
        order: card.order,
      },
    },
  });

  // if (data?.surveyResponseId) {
  //   const sRes = await prisma.surveyResponse.findUnique({
  //     where: {
  //       id: data.surveyResponseId,
  //     },
  //     select: {
  //       surveyTeamMapId: true,
  //     },
  //   });

  //   const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
  //     where: {
  //       id: sRes.surveyTeamMapId,
  //     },
  //     include: {
  //       survey: {
  //         select: {
  //           id: true,
  //           enableTicketEmailAlerts: true,
  //           enableTicketWaMessageAlerts: true,
  //           type: true,
  //           orgId: true,
  //           org: {
  //             select: {
  //               name: true,
  //             },
  //           },
  //         },
  //       },
  //       team: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });

  //   if (surveyTeamMap?.survey?.enableTicketEmailAlerts) {
  //     sendTicketAssignEmail(card);
  //   }
  //   if (surveyTeamMap?.survey?.enableTicketWaMessageAlerts) {
  //     const {
  //       survey: {
  //         org: { name: org_name },
  //         orgId,
  //       },
  //       team: { name: team_name },
  //     } = surveyTeamMap;
  //     await sendTicketAssignWaMessage(card, {
  //       orgId,
  //       team_name,
  //       org_name,
  //     });
  //   }
  // } else {
  //   sendTicketAssignEmail(card);
  // }

  return card;
}

export async function getCards(ticketColumnId: string) {
  return prisma.ticketCard.findMany({
    where: { ticketColumnId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCardById(id: string) {
  const ticketCard = await prisma.ticketCard.findUnique({
    where: { id },
    include: {
      assignees: {
        select: {
          assigneeId: true,
        },
      },
      ticketActivities: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePhoto: true,
            },
          },
        },
      },
      ticketComments: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
      },
      surveyResponse: {
        include: {
          Contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              lastReceivedMessageTimeStamp: true,
            },
          },
          surveyTeamMap: {
            select: {
              survey: {
                select: {
                  questions: true,
                  WaFlow: {
                    select: {
                      json: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      waAutomatedReplyMessage: {
        include: {
          waAutomatedReply: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  if (ticketCard.waAutomatedReplyMessageId) {
    const contact = await prisma.contact.findFirst({
      where: {
        phone: ticketCard.waAutomatedReplyMessage?.phone,
        orgId: ticketCard.waAutomatedReplyMessage?.orgId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastReceivedMessageTimeStamp: true,
      },
    });
    (ticketCard.waAutomatedReplyMessage as any).contact = contact;
  }
  return ticketCard;
}
export async function getCardTeamMembersById(id: string) {
  const result = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT u.id, u.name, u."profilePhoto"
    FROM "User" u
    INNER JOIN "TeamMember" tm ON u.id = tm."userId"
    INNER JOIN "TicketBoardTeam" tbt ON tm."teamId" = tbt."teamId"
    INNER JOIN "TicketColumn" tc ON tbt."boardId" = tc."ticketBoardId"
    INNER JOIN "TicketCard" tc2 ON tc.id = tc2."ticketColumnId"
    WHERE tc2.id = ${id}::uuid;
  `;
  return result;
}

export async function updateCard(
  id: string,
  data: UpdateCardRequest,
  userId: string,
) {
  const card = await prisma.ticketCard.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority || null,
      deadline: data.deadline || null,
      assignees: {
        deleteMany: {},
        createMany: {
          skipDuplicates: true,
          data: data.assignedToIds?.map((id) => ({ assigneeId: id })) || [],
        },
      },
    },
  });

  // Log activity for card update
  await prisma.ticketActivity.create({
    data: {
      type: "EDITED_CARD",
      userId: userId,
      ticketCardId: id,
      details: {
        title: data.title,
        description: data.description,
      },
    },
  });

  return card;
}

export async function moveCard(
  id: string,
  ticketColumnId: string,
  userId: string,
  newOrder?: number,
) {
  // Get the current card to record the source column
  const currentCard = await prisma.ticketCard.findUnique({
    where: { id },
    select: { ticketColumnId: true, order: true, title: true },
  });

  if (!currentCard) return null;

  // Determine the new order for the card
  let order = newOrder;
  if (order === undefined) {
    // If no order specified, place at the end of the target column
    const highestOrderCard = await prisma.ticketCard.findFirst({
      where: { ticketColumnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = highestOrderCard ? highestOrderCard.order + 1 : 0;
  }

  // Move the card to the new column with the determined order
  const card = await prisma.ticketCard.update({
    where: { id },
    data: {
      ticketColumnId,
      order,
    },
  });

  // If the card moved to a new column, adjust orders in both source and target columns
  if (currentCard.ticketColumnId !== ticketColumnId) {
    // Close the gap in the source column
    await prisma.$executeRaw`
      UPDATE "TicketCard"
      SET "order" = "order" - 1
      WHERE "ticketColumnId" = ${currentCard.ticketColumnId}::uuid
        AND "order" > ${currentCard.order}
    `;

    // Make space in the target column if inserting in the middle
    if (newOrder !== undefined) {
      await prisma.$executeRaw`
        UPDATE "TicketCard"
        SET "order" = "order" + 1
        WHERE "ticketColumnId" = ${ticketColumnId}
          AND "order" >= ${newOrder}
          AND "id" <> ${id}
      `;
    }
  }
  // If staying in the same column but changing order
  else if (currentCard.order !== order) {
    if (currentCard.order < order) {
      // Moving down: decrease order of cards between old and new position
      await prisma.$executeRaw`
        UPDATE "TicketCard"
        SET "order" = "order" - 1
        WHERE "ticketColumnId" = ${ticketColumnId}
          AND "order" > ${currentCard.order}
          AND "order" <= ${order}
          AND "id" <> ${id}
      `;
    } else {
      // Moving up: increase order of cards between new and old position
      await prisma.$executeRaw`
        UPDATE "TicketCard"
        SET "order" = "order" + 1
        WHERE "ticketColumnId" = ${ticketColumnId}
          AND "order" >= ${order}
          AND "order" < ${currentCard.order}
          AND "id" <> ${id}
      `;
    }
  }

  // Log activity for moving card
  await prisma.ticketActivity.create({
    data: {
      type: "MOVED_CARD",
      userId: userId,
      ticketCardId: id,
      details: {
        fromColumnId: currentCard.ticketColumnId,
        fromColumnName: currentCard.title,
        toColumnId: ticketColumnId,
        toColumnName: card.title,
        fromOrder: currentCard.order,
        toOrder: order,
      },
    },
  });

  return card;
}

export async function deleteCard(id: string, userId: string) {
  // Get card details before deletion for activity log
  const card = await prisma.ticketCard.findUnique({
    where: { id },
    select: { title: true, ticketColumnId: true },
  });

  if (!card) return null;

  // Delete the card
  await prisma.ticketCard.delete({
    where: { id },
  });

  return true;
}

export async function getCardActivities(ticketCardId: string) {
  return prisma.ticketActivity.findMany({
    where: { ticketCardId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          profilePhoto: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
  });
}

export async function getColumnIdByCardId(cardId: string) {
  const card = await prisma.ticketCard.findUnique({
    where: { id: cardId },
    select: { ticketColumnId: true },
  });

  return card?.ticketColumnId;
}

export async function reorderCards(cards: { id: string; order: number }[]) {
  // Use a transaction to ensure all updates are atomic
  return prisma.$transaction(async (tx) => {
    const updatedCards = [];

    for (const card of cards) {
      const currentCard = await tx.ticketCard.findUnique({
        where: { id: card.id },
        select: { order: true },
      });

      if (currentCard && currentCard.order !== card.order) {
        const updatedCard = await tx.ticketCard.update({
          where: { id: card.id },
          data: { order: card.order },
        });
        updatedCards.push(updatedCard);
      }
    }

    return updatedCards;
  });
}

export async function autoGenerateTicket(data: CardInput) {
  let createdNewTicket = await createCard({
    ...data,
    title: data?.surveyResponseId
      ? "Response Ticket (Auto Generated)"
      : "WhatsApp Automation Ticket",
  });
  return createdNewTicket;
}
