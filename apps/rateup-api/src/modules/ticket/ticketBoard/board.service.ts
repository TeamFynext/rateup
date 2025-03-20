import prisma from "../../../utils/prisma";

interface BoardInput {
  title: string;
  teamId: string;
  userId: string;
}

interface BoardUpdateInput {
  title?: string;
}

export async function createBoard(data: BoardInput) {
  return prisma.ticketBoard.create({
    data: {
      title: data.title,
      teamId: data.teamId,
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
      teamId: {
        in: teamIds,
      },
    },
    include: {
      ticketColumns: true,
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
          ticketCards: true,
        },
      },
    },
  });
}

export async function updateBoard(id: string, data: BoardUpdateInput) {
  return prisma.ticketBoard.update({
    where: { id },
    data: {
      title: data.title,
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
    select: { teamId: true },
  });

  if (!board) return false;

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: board.teamId,
      userId: userId,
    },
  });

  return !!teamMember;
}
