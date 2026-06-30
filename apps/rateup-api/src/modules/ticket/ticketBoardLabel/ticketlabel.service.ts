import prisma from "../../../utils/prisma.js";
import { CreateLabelSchema, UpdateLabelSchema } from "./ticketlabel.schema.js";
import createHttpError from "http-errors";

export async function createLabel(ticketBoardId: string, data: CreateLabelSchema) {
  // Check if name is unique
  const existing = await prisma.ticketBoardLabel.findUnique({
    where: { ticketBoardId_name: { ticketBoardId, name: data.name } },
  });

  if (existing) {
    throw createHttpError(409, "A label with this name already exists on this board");
  }

  return prisma.ticketBoardLabel.create({
    data: {
      name: data.name,
      color: data.color,
      ticketBoardId,
    },
  });
}

export async function getLabels(ticketBoardId: string) {
  return prisma.ticketBoardLabel.findMany({
    where: { ticketBoardId },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateLabel(id: string, data: UpdateLabelSchema) {
  // If changing name, ensure uniqueness
  if (data.name) {
    const label = await prisma.ticketBoardLabel.findUnique({ where: { id } });
    if (label) {
      const existing = await prisma.ticketBoardLabel.findUnique({
        where: { ticketBoardId_name: { ticketBoardId: label.ticketBoardId, name: data.name } },
      });
      if (existing && existing.id !== id) {
        throw createHttpError(409, "A label with this name already exists on this board");
      }
    }
  }

  return prisma.ticketBoardLabel.update({
    where: { id },
    data,
  });
}

export async function deleteLabel(id: string) {
  return prisma.ticketBoardLabel.delete({
    where: { id },
  });
}

export async function deleteLabels(ticketBoardId: string, labelIds: string[]) {
  return prisma.ticketBoardLabel.deleteMany({
    where: {
      id: { in: labelIds },
      ticketBoardId,
    },
  });
}

// Ensure label belongs to a board the user can access
export async function verifyLabelAccess(labelId: string, userId: string) {
  const label = await prisma.ticketBoardLabel.findUnique({
    where: { id: labelId },
    include: { ticketBoard: { select: { teams: { select: { teamId: true } } } } },
  });

  if (!label) return false;

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: {
        in: label.ticketBoard.teams.map((team) => team.teamId),
      },
      userId: userId,
    },
  });

  return !!teamMember;
}
