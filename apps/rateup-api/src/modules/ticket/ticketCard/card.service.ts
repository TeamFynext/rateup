import { TicketPriority, TicketType } from "../../../../generated/prisma/client.js";
import { getShortUrlId } from "../../../utils/commonUtils.js";
import prisma from "../../../utils/prisma.js";
import { UpdateCardRequest } from "./card.schema.js";
import {
  sendTicketAssignedEmail,
  sendTicketAssignedWaMessage,
  sendTicketCreateEmail,
  sendTicketCreateWaMessage,
} from "../ticket.service.js";
import { getNotificationSettings } from "../../notification/notification.service.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../integrations/external/zapier/zapier.service.js";
import { notificationQueue } from "../../../utils/redisConnection.js";

export interface CardInput {
  title?: string;
  description?: string;
  ticketColumnId: string;
  type: TicketType;
  orgId: string;
  userId?: string;
  order?: number;
  reviewId?: string;
  waAutomatedReplyMessageId?: string;
  surveyResponseId?: string;
  contactId?: string;
  priority?: TicketPriority;
  labelId?: string | null;
  deadline?: string | Date | null;
}

//used in zapier also
export async function createCard(data: CardInput) {
  const { title, userId, orgId, ...otherData } = data;
  // Get the highest order in the column to place new card at the end
  const highestOrderCard = await prisma.ticketCard.findFirst({
    where: { ticketColumnId: data.ticketColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = data.order ?? (highestOrderCard ? highestOrderCard.order + 1 : 0);

  const column = await prisma.ticketColumn.findUnique({
    where: { id: data.ticketColumnId },
    select: { ticketBoardId: true, title: true },
  });
  if (!column) return;

  const boardId = column.ticketBoardId;
  let finalLabelId = data.labelId;

  if (finalLabelId) {
    const label = await prisma.ticketBoardLabel.findUnique({
      where: { id: finalLabelId },
    });
    if (!label || label.ticketBoardId !== boardId) {
      throw new Error("Invalid labelId for this board");
    }
  } else {
    const fallbackName = data.priority || "MEDIUM";
    const defaultLabel = await prisma.ticketBoardLabel.findUnique({
      where: { ticketBoardId_name: { ticketBoardId: boardId, name: fallbackName } },
    });
    if (defaultLabel) finalLabelId = defaultLabel.id;
  }

  const card = await prisma.ticketCard.create({
    data: {
      ...otherData,
      title,
      order,
      ticketId: getShortUrlId(),
      priority: data.priority || "MEDIUM",
      labelId: finalLabelId,
    },
    include: {
      ticketColumn: {
        select: {
          title: true,
        },
      },
      label: true,
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
  // column was already fetched above

  const board = await prisma.ticketBoard.findFirst({
    where: {
      id: column.ticketBoardId,
    },
    include: {
      notificationRecipients: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });
  for await (const notificationRecipient of board.notificationRecipients) {
    const { user } = notificationRecipient;
    if (board.ticketCreatedEmail)
      await sendTicketCreateEmail({
        board_name: board.title,
        column_name: column.title,
        id: card.id,
        ticketId: card.ticketId,
        email: user.email,
        orgId,
      });
    if (board.ticketCreatedWhatsapp)
      await sendTicketCreateWaMessage({
        board_name: board.title,
        column_name: column.title,
        id: card.id,
        ticketId: card.ticketId,
        phone: user.phone,
        orgId,
      });
    const notificationSetting = await getNotificationSettings(user.id, orgId);
    if (notificationSetting && notificationSetting.ticketAssignNotification) {
      await notificationQueue.add("notification", {
        systemNotificationData: {
          userId: user.id,
          orgId: orgId,
          source: "ticket",
          subSource: "ticket-assigned",
          data: {
            board_name: board.title,
            column_name: column.title,
            cardId: card.id,
            ticketId: card.ticketId,
          },
        },
      });
    }
  }
  await addZapierTriggerToQueue(
    ZapierTriggers.TICKET_CREATED,
    { [ZapierTriggers.TICKET_CREATED]: card },
    orgId,
  );
  return card;
}

export async function getCards(ticketColumnId: string) {
  return prisma.ticketCard.findMany({
    where: { ticketColumnId },
    orderBy: { order: "asc" },
    include: { label: true },
  });
}

export async function getCardById(id: string) {
  const ticketCard = await prisma.ticketCard.findUnique({
    where: { id },
    include: {
      ticketColumn: true,
      label: true,
      assignees: {
        select: {
          assigneeId: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          lastReceivedMessageTimeStamp: true,
          consent: true,
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
              consent: true,
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
        consent: true,
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
  orgId: string,
) {
  const previousCard = await prisma.ticketCard.findUnique({
    where: { id },
    select: {
      assignees: { select: { assigneeId: true } },
      attachments: true,
      contactId: true,
      title: true,
      description: true,
      priority: true,
      labelId: true,
      deadline: true,
      checklists: true,
      ticketColumn: { select: { ticketBoardId: true } },
    },
  });

  const boardId = previousCard?.ticketColumn.ticketBoardId;
  let finalLabelId = data.labelId;

  if (finalLabelId !== undefined) {
    if (finalLabelId !== null) {
      const label = await prisma.ticketBoardLabel.findUnique({
        where: { id: finalLabelId },
      });
      if (!label || label.ticketBoardId !== boardId) {
        throw new Error("Invalid labelId for this board");
      }
    }
  } else if (data.priority !== undefined && data.priority !== null) {
    const defaultLabel = await prisma.ticketBoardLabel.findUnique({
      where: { ticketBoardId_name: { ticketBoardId: boardId!, name: data.priority } },
    });
    if (defaultLabel) finalLabelId = defaultLabel.id;
  }
  const newAssignees = data.assignedToIds?.filter(
    (assigneeId) =>
      !previousCard?.assignees?.some((assignee) => assignee.assigneeId === assigneeId),
  );

  const removedAssignees =
    data.assignedToIds !== undefined
      ? previousCard?.assignees
          ?.filter((assignee) => !data.assignedToIds!.includes(assignee.assigneeId))
          .map((a) => a.assigneeId)
      : undefined;

  const card = await prisma.ticketCard.update({
    where: { id },
    data: {
      title: data.title !== undefined ? data.title : undefined,
      description: data.description !== undefined ? data.description : undefined,
      priority: data.priority !== undefined ? data.priority : undefined,
      labelId: finalLabelId !== undefined ? finalLabelId : undefined,
      deadline: data.deadline !== undefined ? data.deadline : undefined,
      contactId: data.contactId !== undefined ? data.contactId : undefined,
      checklists: data.checklists !== undefined ? data.checklists : undefined,
      // attachments is now String[] — replace the whole array
      ...(data.attachments !== undefined ? { attachments: { set: data.attachments } } : {}),
      ...(data.assignedToIds !== undefined
        ? {
            assignees: {
              deleteMany: {},
              createMany: {
                skipDuplicates: true,
                data: data.assignedToIds.map((id) => ({ assigneeId: id })),
              },
            },
          }
        : {}),
    },
    include: {
      //for zapier
      ticketColumn: {
        select: {
          title: true,
        },
      },
    },
  });

  // Only log EDITED_CARD when real metadata fields actually changed
  const editableFields = ["title", "description", "deadline"] as const;
  const changedFields = editableFields.filter(
    (f) => data[f] !== undefined && data[f] !== previousCard?.[f],
  );

  if (changedFields.length > 0) {
    await prisma.ticketActivity.create({
      data: {
        type: "EDITED_CARD",
        userId,
        ticketCardId: id,
        details: changedFields.reduce(
          (acc, f) => {
            if (data[f] !== undefined) {
              acc[f] = data[f];
            }
            return acc;
          },
          {} as Record<string, any>,
        ),
      },
    });
  }

  // Log CHANGED_PRIORITY
  if (data.priority !== undefined && data.priority !== previousCard?.priority) {
    await prisma.ticketActivity.create({
      data: {
        type: "CHANGED_PRIORITY",
        userId,
        ticketCardId: id,
        details: {
          fromPriority: previousCard?.priority,
          toPriority: data.priority,
        },
      },
    });
  }

  // Log CHANGED_LABEL
  if (finalLabelId !== undefined && finalLabelId !== previousCard?.labelId) {
    const oldLabel = previousCard?.labelId
      ? await prisma.ticketBoardLabel.findUnique({ where: { id: previousCard.labelId } })
      : null;
    const newLabel = finalLabelId
      ? await prisma.ticketBoardLabel.findUnique({ where: { id: finalLabelId } })
      : null;

    await prisma.ticketActivity.create({
      data: {
        type: "CHANGED_LABEL",
        userId,
        ticketCardId: id,
        details: {
          fromLabelId: previousCard?.labelId || null,
          fromLabelName: oldLabel?.name || null,
          toLabelId: finalLabelId || null,
          toLabelName: newLabel?.name || null,
        },
      },
    });
  }

  // Log ADDED_ATTACHMENT for each newly added file key (with uploader info)
  if (data.attachments !== undefined) {
    const previousKeys: string[] = (previousCard?.attachments as string[]) ?? [];
    const newKeys = data.attachments.filter((k) => !previousKeys.includes(k));
    if (newKeys.length > 0) {
      const uploader = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true },
          })
        : null;
      for (const key of newKeys) {
        await prisma.ticketActivity.create({
          data: {
            type: "ADDED_ATTACHMENT",
            userId,
            ticketCardId: id,
            details: {
              key,
              uploadedById: uploader?.id ?? userId,
              uploadedByName: uploader?.name ?? null,
            },
          },
        });
      }
    }

    const removedKeys = previousKeys.filter((k) => !data.attachments!.includes(k));
    if (removedKeys.length > 0) {
      const remover = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true },
          })
        : null;
      for (const key of removedKeys) {
        await prisma.ticketActivity.create({
          data: {
            type: "REMOVED_ATTACHMENT",
            userId,
            ticketCardId: id,
            details: {
              key,
              removedById: remover?.id ?? userId,
              removedByName: remover?.name ?? null,
            },
          },
        });
      }
    }
  }

  // Check contact changes
  const oldContactId = previousCard?.contactId;
  const newContactId = data.contactId;
  const contactChanged = newContactId !== undefined && oldContactId !== newContactId;

  if (contactChanged) {
    if (newContactId) {
      // Added or Changed contact
      const contact = await prisma.contact.findUnique({
        where: { id: newContactId },
        select: { id: true, name: true },
      });
      await prisma.ticketActivity.create({
        data: {
          type: "ADDED_CONTACT",
          userId,
          ticketCardId: id,
          details: {
            contactId: newContactId,
            contactName: contact?.name || newContactId,
          },
        },
      });
    } else if (newContactId === null && oldContactId) {
      // Removed contact
      const contact = await prisma.contact.findUnique({
        where: { id: oldContactId },
        select: { id: true, name: true },
      });
      await prisma.ticketActivity.create({
        data: {
          type: "REMOVED_CONTACT",
          userId,
          ticketCardId: id,
          details: {
            contactId: oldContactId,
            contactName: contact?.name || oldContactId,
          },
        },
      });
    }
  }

  // Log REMOVED_MEMBER for each removed member
  if (removedAssignees?.length) {
    const removedUsers = await prisma.user.findMany({
      where: {
        id: { in: removedAssignees },
      },
      select: { id: true, name: true },
    });

    for (const assigneeId of removedAssignees) {
      const removedUser = removedUsers.find((u) => u.id === assigneeId);
      await prisma.ticketActivity.create({
        data: {
          type: "REMOVED_MEMBER",
          userId,
          ticketCardId: id,
          details: {
            memberId: assigneeId,
            memberName: removedUser?.name || assigneeId,
          },
        },
      });
    }
  }

  // Check checklist changes
  if (data.checklists !== undefined) {
    const prevChecklists = (previousCard?.checklists as any[]) || [];
    const newChecklists = (data.checklists as any[]) || [];

    // Removed checklists
    for (const prevList of prevChecklists) {
      if (!newChecklists.find((nl) => nl.id === prevList.id)) {
        await prisma.ticketActivity.create({
          data: {
            type: "REMOVED_CHECKLIST",
            userId,
            ticketCardId: id,
            details: { checklistName: prevList.name },
          },
        });
      }
    }

    // Added checklists and item changes
    for (const newList of newChecklists) {
      const prevList = prevChecklists.find((pl) => pl.id === newList.id);

      if (!prevList) {
        await prisma.ticketActivity.create({
          data: {
            type: "ADDED_CHECKLIST",
            userId,
            ticketCardId: id,
            details: { checklistName: newList.name },
          },
        });
      } else {
        const prevItems = prevList.items || [];
        const newItems = newList.items || [];

        // Removed items
        for (const prevItem of prevItems) {
          if (!newItems.find((ni: any) => ni.id === prevItem.id)) {
            await prisma.ticketActivity.create({
              data: {
                type: "REMOVED_CHECKLIST_ITEM",
                userId,
                ticketCardId: id,
                details: {
                  checklistName: newList.name,
                  itemName: prevItem.text,
                },
              },
            });
          }
        }

        // Added and changed items
        for (const newItem of newItems) {
          const prevItem = prevItems.find((pi: any) => pi.id === newItem.id);
          if (!prevItem) {
            await prisma.ticketActivity.create({
              data: {
                type: "ADDED_CHECKLIST_ITEM",
                userId,
                ticketCardId: id,
                details: {
                  checklistName: newList.name,
                  itemName: newItem.text,
                },
              },
            });
          } else {
            if (newItem.isCompleted && !prevItem.isCompleted) {
              await prisma.ticketActivity.create({
                data: {
                  type: "CHECKED_CHECKLIST_ITEM",
                  userId,
                  ticketCardId: id,
                  details: {
                    checklistName: newList.name,
                    itemName: newItem.text,
                  },
                },
              });
            } else if (!newItem.isCompleted && prevItem.isCompleted) {
              await prisma.ticketActivity.create({
                data: {
                  type: "UNCHECKED_CHECKLIST_ITEM",
                  userId,
                  ticketCardId: id,
                  details: {
                    checklistName: newList.name,
                    itemName: newItem.text,
                  },
                },
              });
            }
          }
        }
      }
    }
  }

  // Handle Zapier and notifications for newly assigned members (with user details/name)
  if (newAssignees?.length) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: newAssignees },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
      },
    });

    for (const assigneeId of newAssignees) {
      const assignedUser = users.find((u) => u.id === assigneeId);
      await prisma.ticketActivity.create({
        data: {
          type: "ADDED_MEMBER",
          userId,
          ticketCardId: id,
          details: {
            memberId: assigneeId,
            memberName: assignedUser?.name || assigneeId,
          },
        },
      });
    }

    await addZapierTriggerToQueue(
      ZapierTriggers.TICKET_ASSIGNEE_UPDATED,
      {
        [ZapierTriggers.TICKET_ASSIGNEE_UPDATED]: {
          assignees: users,
          card: card,
        },
      },
      orgId,
    );

    const column = await prisma.ticketColumn.findUnique({
      where: { id: card.ticketColumnId },
      select: { ticketBoardId: true, title: true },
    });

    if (column) {
      const board = await prisma.ticketBoard.findFirst({
        where: {
          id: column.ticketBoardId,
        },
      });

      if (board) {
        for await (const user of users) {
          const notificationSetting = await getNotificationSettings(user.id, orgId);
          if (notificationSetting && notificationSetting.ticketAssignNotification) {
            await notificationQueue.add("notification", {
              systemNotificationData: {
                userId: user.id,
                orgId: orgId,
                source: "ticket",
                subSource: "ticket-assigned",
                data: {
                  board_name: board.title,
                  column_name: column.title,
                  cardId: card.id,
                  ticketId: card.ticketId,
                },
              },
            });
          }
          if (board.ticketAssignedEmail)
            await sendTicketAssignedEmail({
              board_name: board.title,
              column_name: column.title,
              id: card.id,
              ticketId: card.ticketId,
              email: user.email,
              orgId,
            });
          if (board.ticketAssignedWhatsapp)
            await sendTicketAssignedWaMessage({
              board_name: board.title,
              column_name: column.title,
              id: card.id,
              ticketId: card.ticketId,
              phone: user.phone,
              orgId,
            });
        }
      }
    }
  }

  return card;
}

export async function moveCard(
  id: string,
  ticketColumnId: string,
  userId: string,
  orgId: string,
  newOrder?: number,
) {
  // Get the current card to record the source column
  const currentCard = await prisma.ticketCard.findUnique({
    where: { id },
    select: {
      ticketColumnId: true,
      order: true,
      title: true,
      ticketColumn: { select: { title: true } },
    },
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
    include: {
      //for zapier
      ticketColumn: {
        select: {
          title: true,
        },
      },
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

    await addZapierTriggerToQueue(
      ZapierTriggers.TICKET_CARD_MOVED,
      { [ZapierTriggers.TICKET_CARD_MOVED]: card },
      orgId,
    );
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
        fromColumnName: currentCard.ticketColumn?.title,
        toColumnId: ticketColumnId,
        toColumnName: card.ticketColumn?.title,
        fromOrder: currentCard.order,
        toOrder: order,
      },
    },
  });

  return card;
}

export async function deleteCard(id: string, _userId: string) {
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
