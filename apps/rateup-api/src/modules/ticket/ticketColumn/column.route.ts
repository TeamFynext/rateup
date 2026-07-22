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
import { verifyColumnAccess } from "./column.auth.js";
import { verifyBoardAccess } from "../ticketBoard/board.auth.js";

export async function columnRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  // Tickets are a free feature — no subscription gate.

  // Create column
  server.post(
    "/create",
    {
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
  server.get(
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
  server.get(
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
  server.put(
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
  server.delete(
    "/:id",
    {
      preHandler: [verifyColumnAccess],
      schema: {
        params: idParamsSchema,
      },
    },
    deleteColumnHandler,
  );

  // Reorder columns (bulk update of column orders)
  server.put(
    "/reorder",
    {
      schema: {
        body: reorderColumnRequestSchema,
      },
    },
    reorderColumnsHandler,
  );
}
