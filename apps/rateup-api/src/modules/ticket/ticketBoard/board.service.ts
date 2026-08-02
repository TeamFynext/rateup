import prisma from "../../../utils/prisma.js";
import { CreateBoardRequestSchema, UpdateBoardRequestSchema } from "./board.schema.js";

/**
 * The subset of `teamIds` the user actually belongs to.
 *
 * Neither create nor update used to look the ids up at all — the create route's
 * `verifyTeamAccess` preHandler was commented out — so a caller could attach any
 * team on the platform to a board: outward, planting a board in a victim team's
 * listing; inward, attaching their own team to a board and reading its cards,
 * comments and the linked contacts' names and phone numbers. TicketBoard has no
 * orgId, so nothing downstream could notice. See issues.txt 28.2.
 */
export async function filterTeamsUserBelongsTo(teamIds: string[], userId: string) {
  if (!teamIds.length) return [];
  const memberships = await prisma.teamMember.findMany({
    where: { userId, teamId: { in: teamIds } },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
}

/** Raised when a write names teams the caller does not belong to. issues.txt 28.2. */
export class TeamAccessError extends Error {
  constructor(public readonly teamIds: string[]) {
    super("You can only attach teams you belong to");
    this.name = "TeamAccessError";
  }
}

async function assertTeamsAreTheCallers(teamIds: string[], userId: string) {
  const allowed = new Set(await filterTeamsUserBelongsTo(teamIds, userId));
  const foreign = teamIds.filter((id) => !allowed.has(id));
  if (foreign.length) throw new TeamAccessError(foreign);
}

export async function createBoard(data: CreateBoardRequestSchema & { userId: string }) {
  await assertTeamsAreTheCallers(data.teamIds, data.userId);
  // The board and its first column are one write: the column used to be a second,
  // separate await in the handler, so a failure there left a committed board with
  // no columns while the caller was told the creation had failed — a state no other
  // path produces, and one that each retry adds to. See issues.txt 28.4.
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
      ticketColumns: {
        create: {
          title: "To Do",
          order: 0,
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
      labels: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

export async function getBoardById(id: string) {
  const board = await prisma.ticketBoard.findUnique({
    where: { id },
    include: {
      ticketColumns: {
        orderBy: {
          order: "asc",
        },
        include: {
          ticketCards: {
            orderBy: {
              order: "asc",
            },
            include: {
              assignees: true,
              ticketComments: true,
              contact: {
                select: { id: true, name: true, phone: true },
              },
              surveyResponse: {
                include: {
                  Contact: {
                    select: { id: true, name: true, phone: true },
                  },
                },
              },
              waAutomatedReplyMessage: {
                include: {
                  waAutomatedReply: {
                    select: { name: true },
                  },
                },
              },
              labels: { include: { label: true } },
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
      labels: true,
    },
  });

  if (!board) return board;
  return {
    ...board,
    ticketColumns: board.ticketColumns.map((col) => ({
      ...col,
      ticketCards: col.ticketCards.map((card) => ({
        ...card,
        labels: card.labels.map((l) => l.label),
      })),
    })),
  };
}

export async function updateBoard(id: string, data: UpdateBoardRequestSchema, userId: string) {
  if (data.teamIds !== undefined) {
    // An empty list detached every team, leaving a board nothing can list — team
    // membership is the only way to reach a board, so that is unrecoverable from
    // the application. See issues.txt 28.3.
    if (!data.teamIds.length) {
      throw new TeamAccessError([]);
    }
    // Same check as create: verifyBoardAccess only asks whether the caller is on the
    // board, not whether they belong to the teams they are attaching to it.
    // See issues.txt 28.2.
    await assertTeamsAreTheCallers(data.teamIds, userId);
  }
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
  const result = await prisma.$queryRaw<{ id: string; name: string; profilePhoto: string }[]>`
    SELECT DISTINCT u.id, u.name, u."profilePhoto"
    FROM "User" u
    INNER JOIN "TeamMember" tm ON u.id = tm."userId"
    INNER JOIN "TicketBoardTeam" tbt ON tm."teamId" = tbt."teamId"
    WHERE tbt."boardId" = ${id}::uuid;
  `;
  return result;
}
