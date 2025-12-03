import { WaMessageAssignStatus } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { WaMessageClosedStatus } from "../../whatsapp/constants";
import {
  ConversationAssigneeUpdateSchema,
  ConversationCore,
  UpdateConversationSchema,
} from "./conversation.schema";

export async function createConversation(input: ConversationCore) {
  const { contactId, ...rest } = input;
  return await prisma.conversation.create({
    data: {
      contact: {
        connect: {
          id: contactId,
        },
      },
      ...rest,
    },
  });
}

export async function updateConversation(
  conversationId: string,
  data: UpdateConversationSchema,
) {
  return await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data,
  });
}

export async function getConversationById(conversationId: string) {
  return await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });
}

export async function deleteConversation(conversationId: string) {
  return await prisma.conversation.delete({
    where: {
      id: conversationId,
    },
  });
}

export async function updateConversationAssignees(
  conversationId: string,
  data: ConversationAssigneeUpdateSchema,
  userId?: string,
) {
  await prisma.$transaction(async (tx) => {
    const { assignees, assignedAt, removedAt, assignedBy, removedBy } = data;
    if (assignees && assignees.length > 0) {
      const existingAssignees =
        await tx.conversationAssignedUserTeamMap.findMany({
          where: {
            conversationId: conversationId,
          },
        });

      const assigneesToRemove = existingAssignees.filter(
        (ea) =>
          !assignees.find(
            (a) => a.userId === ea.userId && a.teamId === ea.teamId,
          ),
      );
      const assigneesToAdd = assignees.filter(
        (a) =>
          !existingAssignees.find(
            (ea) => ea.userId === a.userId && ea.teamId === a.teamId,
          ),
      );
      for (const assignee of assigneesToRemove) {
        await tx.conversationAssignedUserTeamMap.update({
          where: {
            userId_teamId: {
              userId: assignee.userId,
              teamId: assignee.teamId,
            },
          },
          data: {
            removedAt: removedAt || new Date(),
            removedBy: removedBy || userId,
          },
        });
      }
      for (const assignee of assigneesToAdd) {
        await tx.conversationAssignedUserTeamMap.create({
          data: {
            conversationId: conversationId,
            userId: assignee.userId,
            teamId: assignee.teamId,
            assignedAt: assignedAt || new Date(),
            assignedBy: assignedBy || userId,
            isAssignedByAutomation: !assignedBy && !userId,
          },
        });
      }
      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          assignedAt: !existingAssignees.length ? assignedAt : undefined,
          status: WaMessageAssignStatus.ASSIGNED,
        },
      });
    }
  });
}

export async function getLastCreatedConversationForContact(contactId: string) {
  return await prisma.conversation.findFirst({
    where: {
      contactId: contactId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateClosedConversationStatus(
  conversationId: string,
  status: string,
  userId: string,
) {
  const conversation = await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      status: status,
      closedAt: new Date(),
      closedBy: userId,
    },
  });
  return conversation;
}

export async function checkIfFirstSendMessageInConversation(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const messages = await prisma.waMessage.findMany({
    where: {
      conversationId: conversationId,
      messageBody: {
        path: ["exchangeProcess"],
        equals: "send",
      },
    },
    orderBy: {
      waCreatedAt: "asc",
    },
  });
  if (messages.length === 0) return true;
  return messages[0].id === messageId;
}

export async function getConversationOverview(
  orgId: string,
  dateRange: string[],
): Promise<{
  totalConversations: number;
  averageResponseTime: number;
  resolutionRate: number;
}> {
  const whereClause: any = {
    contact: {
      orgId: orgId,
    },
  };
  if (dateRange.length) {
    const [startDate, endDate] = dateRange;
    whereClause.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const totalConversations = await prisma.conversation.count({
    where: whereClause,
  });

  const responseTime = await prisma.conversation.findMany({
    where: whereClause,
    select: {
      firstRespondedAt: true,
      createdAt: true,
    },
  });

  const averageResponseTime =
    responseTime.reduce((acc, curr) => {
      if (curr.firstRespondedAt) {
        const diff = curr.firstRespondedAt.getTime() - curr.createdAt.getTime();
        acc += diff;
      }
      return acc;
    }, 0) / responseTime.filter((r) => r.firstRespondedAt).length;

  const resolvedConversation = await prisma.conversation.count({
    where: {
      ...whereClause,
      status: WaMessageAssignStatus.RESOLVED,
    },
  });
  const resolutionRate =
    totalConversations > 0
      ? (resolvedConversation / totalConversations) * 100
      : 0;

  return {
    totalConversations,
    averageResponseTime,
    resolutionRate,
  };
}
