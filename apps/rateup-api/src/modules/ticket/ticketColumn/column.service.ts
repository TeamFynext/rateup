import prisma from "../../../utils/prisma.js";

interface ColumnInput {
  title: string;
  ticketBoardId: string;
  order?: number;
}

interface ColumnUpdateInput {
  title?: string;
}

export async function createColumn(data: ColumnInput) {
  // Get the highest order in the board to place new column at the end
  const highestOrderColumn = await prisma.ticketColumn.findFirst({
    where: { ticketBoardId: data.ticketBoardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = data.order ?? (highestOrderColumn ? highestOrderColumn.order + 1 : 0);

  return prisma.ticketColumn.create({
    data: {
      title: data.title,
      ticketBoardId: data.ticketBoardId,
      order,
    },
  });
}

export async function getColumns(ticketBoardId: string) {
  return prisma.ticketColumn.findMany({
    where: { ticketBoardId },
    include: {
      ticketCards: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function getColumnById(id: string) {
  return prisma.ticketColumn.findUnique({
    where: { id },
    include: {
      ticketCards: true,
    },
  });
}

export async function updateColumn(id: string, data: ColumnUpdateInput) {
  return prisma.ticketColumn.update({
    where: { id },
    data: {
      title: data.title,
    },
  });
}

export async function deleteColumn(id: string) {
  return prisma.ticketColumn.delete({
    where: { id },
  });
}

export async function getBoardIdByColumnId(columnId: string) {
  const column = await prisma.ticketColumn.findUnique({
    where: { id: columnId },
    select: { ticketBoardId: true },
  });

  return column?.ticketBoardId;
}

export async function reorderColumns(columns: { id: string; order: number }[]) {
  // Use a transaction to ensure all updates are atomic
  return prisma.$transaction(async (tx) => {
    const updatedColumns = [];

    for (const column of columns) {
      const updatedColumn = await tx.ticketColumn.update({
        where: { id: column.id },
        data: { order: column.order },
      });

      updatedColumns.push(updatedColumn);
    }

    return updatedColumns;
  });
}
