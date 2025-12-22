import { FastifyReply, FastifyRequest } from "fastify";
import {
  createColumn,
  getColumns,
  getColumnById,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from "./column.service.js";

export async function createColumnHandler(
  request: FastifyRequest<{
    Body: { title: string; ticketBoardId: string; order?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { title, ticketBoardId, order } = request.body;
    const column = await createColumn({ title, ticketBoardId, order });
    return reply.code(201).send(column);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating column" });
  }
}

export async function getAllColumnsHandler(
  request: FastifyRequest<{
    Params: { ticketBoardId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { ticketBoardId } = request.params;
    const columns = await getColumns(ticketBoardId);
    return reply.code(200).send(columns);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving columns" });
  }
}

export async function getSingleColumnHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const column = await getColumnById(id);

    if (!column) {
      return reply.code(404).send({ message: "Column not found" });
    }

    return reply.code(200).send(column);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving column" });
  }
}

export async function updateColumnHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const { title } = request.body;

    const updatedColumn = await updateColumn(id, { title });

    if (!updatedColumn) {
      return reply.code(404).send({ message: "Column not found" });
    }

    return reply.code(200).send(updatedColumn);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating column" });
  }
}

export async function deleteColumnHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    await deleteColumn(id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting column" });
  }
}

export async function reorderColumnsHandler(
  request: FastifyRequest<{
    Body: { columns: { id: string; order: number }[] };
  }>,
  reply: FastifyReply,
) {
  try {
    const { columns } = request.body;
    const updatedColumns = await reorderColumns(columns);
    return reply.code(200).send(updatedColumns);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error reordering columns" });
  }
}
