import { FastifyInstance } from "fastify";
import {
  createColumnRequestSchema,
  createColumnResponseSchema,
  boardIdParamsSchema,
  idParamsSchema,
  updateColumnRequestSchema,
  reorderColumnRequestSchema,
} from "./column.schema.js";
import {
  createColumnHandler,
  getAllColumnsHandler,
  getSingleColumnHandler,
  updateColumnHandler,
  deleteColumnHandler,
  reorderColumnsHandler,
} from "./column.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import {
  verifyColumnAccess,
  verifyBoardAccessFromBody,
  verifyColumnsReorderAccess,
} from "./column.auth.js";
import { verifyBoardAccess } from "../ticketBoard/board.auth.js";

export async function columnRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  // Tickets are a free feature — no subscription gate.

  server.post(
    "/create",
    {
      preHandler: [verifyBoardAccessFromBody],
      schema: {
        body: createColumnRequestSchema,
        response: {
          201: createColumnResponseSchema,
        },
      },
    },
    createColumnHandler,
  );

  // Get all columns for a board
  server.get<{ Params: { ticketBoardId: string } }>(
    "/board/:ticketBoardId",
    {
      preHandler: [verifyBoardAccess],
      schema: {
        params: boardIdParamsSchema,
      },
    },
    getAllColumnsHandler,
  );

  // Get single column
  server.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    getSingleColumnHandler,
  );

  // Update column
  server.put<{ Params: { id: string }; Body: { title?: string } }>(
    "/:id",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: idParamsSchema,
        body: updateColumnRequestSchema,
      },
    },
    updateColumnHandler,
  );

  // Delete column
  server.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    deleteColumnHandler,
  );

  server.put(
    "/reorder",
    {
      preHandler: [verifyColumnsReorderAccess],
      schema: {
        body: reorderColumnRequestSchema,
      },
    },
    reorderColumnsHandler,
  );
}
