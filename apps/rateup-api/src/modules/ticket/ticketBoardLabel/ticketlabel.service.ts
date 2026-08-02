import prisma from "../../../utils/prisma.js";
import { CreateLabelSchema, UpdateLabelSchema } from "./ticketlabel.schema.js";
import createHttpError from "http-errors";

/** P2002 on the (ticketBoardId, name) compound unique. */
function isDuplicateName(error: unknown): boolean {
  return (
    Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "P2002"
  );
}

/**
 * Creates a label, letting the database decide uniqueness.
 *
 * This used to read the row first and throw its own 409, with the create in a
 * separate statement and no transaction — so two concurrent creates of the same
 * name both passed the pre-check and the loser tripped the real constraint, whose
 * uncaught P2002 reached the global handler as a 500: the opposite of the 409
 * written a few lines above it. See issues.txt 28.6.
 */
export async function createLabel(ticketBoardId: string, data: CreateLabelSchema) {
  try {
    return await prisma.ticketBoardLabel.create({
      data: {
        name: data.name,
        color: data.color,
        ticketBoardId,
      },
    });
  } catch (error) {
    if (isDuplicateName(error)) {
      throw createHttpError(409, "A label with this name already exists on this board");
    }
    throw error;
  }
}

export async function getLabels(ticketBoardId: string) {
  return prisma.ticketBoardLabel.findMany({
    where: { ticketBoardId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Renames or recolours a label.
 *
 * Same shape as createLabel: the uniqueness pre-check raced, and a label that did
 * not exist skipped the check entirely and then failed at the update with a raw
 * P2025 rather than a 404. See issues.txt 28.6.
 */
export async function updateLabel(id: string, data: UpdateLabelSchema) {
  try {
    return await prisma.ticketBoardLabel.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (isDuplicateName(error)) {
      throw createHttpError(409, "A label with this name already exists on this board");
    }
    if (
      Boolean(error) &&
      typeof error === "object" &&
      (error as { code?: string }).code === "P2025"
    ) {
      throw createHttpError(404, "Label not found");
    }
    throw error;
  }
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
