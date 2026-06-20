import prisma from "../../../utils/prisma.js";
import {
  CreateBoardRequestSchema,
  UpdateBoardRequestSchema,
} from "./board.schema.js";

export async function createBoard(
  data: CreateBoardRequestSchema & { userId: string },
) {
  return prisma.ticketBoard.create({
    data: {
      title: data.title,
      description: data.description,
      teams: {
        createMany: {
          skipDuplicates: true,
          data: data.teamIds.map((teamId) => ({
            teamId,
          })),
        },
      },
    },
  });
}

export async function getBoards(userId: string) {
  // Get boards from teams where the user is a member
  const teams = await prisma.teamMember.findMany({
    where: {
      userId: userId,
    },
    select: {
      teamId: true,
    },
  });

  const teamIds = teams.map((team) => team.teamId);
  return prisma.ticketBoard.findMany({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
    },
    include: {
      ticketColumns: {
        include: {
          _count: {
            select: { ticketCards: true },
          },
        },
      },
      teams: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

export async function getBoardById(id: string) {
  return prisma.ticketBoard.findUnique({
    where: { id },
    include: {
      ticketColumns: {
        include: {
          ticketCards: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              assignees: true,
              ticketComments: true,
            },
          },
        },
      },
      teams: {
        select: {
          teamId: true,
        },
      },
      notificationRecipients: {
        select: {
          userId: true,
        },
      },
    },
  });
}

export async function updateBoard(id: string, data: UpdateBoardRequestSchema) {
  return prisma.ticketBoard.update({
    where: { id },
    data: {
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      ...(data.teamIds !== undefined && {
        teams: {
          deleteMany: {},
          createMany: {
            skipDuplicates: true,
            data: data.teamIds.map((teamId) => ({
              teamId,
            })),
          },
        },
      }),
      ticketCreatedEmail: data.ticketCreatedEmail,
      ticketCreatedWhatsapp: data.ticketCreatedWhatsapp,
      ticketAssignedEmail: data.ticketAssignedEmail,
      ticketAssignedWhatsapp: data.ticketAssignedWhatsapp,
      ...(data.assignedToIds !== undefined && {
        notificationRecipients: {
          deleteMany: {},
          createMany: {
            skipDuplicates: true,
            data: data.assignedToIds.map((userId) => ({
              userId,
            })),
          },
        },
      }),
    },
  });
}

export async function deleteBoard(id: string) {
  return prisma.ticketBoard.delete({
    where: { id },
  });
}

export async function isBoardMember(ticketBoardId: string, userId: string) {
  const board = await prisma.ticketBoard.findUnique({
    where: { id: ticketBoardId },
    select: { teams: { select: { teamId: true } } },
  });

  if (!board) return false;

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: {
        in: board.teams.map((team) => team.teamId),
      },
      userId: userId,
    },
  });

  return !!teamMember;
}

export async function getBoardTeamMembersById(id: string) {
  const result = await prisma.$queryRaw<
    { id: string; name: string; profilePhoto: string }[]
  >`
    SELECT DISTINCT u.id, u.name, u."profilePhoto"
    FROM "User" u
    INNER JOIN "TeamMember" tm ON u.id = tm."userId"
    INNER JOIN "TicketBoardTeam" tbt ON tm."teamId" = tbt."teamId"
    WHERE tbt."boardId" = ${id}::uuid;
  `;
  return result;
}
