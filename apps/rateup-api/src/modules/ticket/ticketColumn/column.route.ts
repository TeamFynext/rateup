import { FastifyInstance } from "fastify";
import { $ColumnRef } from "./column.schema.js";
import {
  createColumnHandler,
  getAllColumnsHandler,
  getSingleColumnHandler,
  updateColumnHandler,
  deleteColumnHandler,
  reorderColumnsHandler,
} from "./column.controller.js";
import { checkSession } from "../../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { verifyColumnAccess } from "./column.auth.js";
import { verifyBoardAccess } from "../ticketBoard/board.auth.js";

export async function columnRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Ticket]),
  );

  // Create column
  server.post(
    "/create",
    {
      schema: {
        body: $ColumnRef("createColumnRequestSchema"),
        response: {
          201: $ColumnRef("createColumnResponseSchema"),
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
        params: $ColumnRef("boardIdParamsSchema"),
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
        params: $ColumnRef("idParamsSchema"),
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
        params: $ColumnRef("idParamsSchema"),
        body: $ColumnRef("updateColumnRequestSchema"),
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
        params: $ColumnRef("idParamsSchema"),
      },
    },
    deleteColumnHandler,
  );

  // Reorder columns (bulk update of column orders)
  server.put(
    "/reorder",
    {
      schema: {
        body: $ColumnRef("reorderColumnRequestSchema"),
      },
    },
    reorderColumnsHandler,
  );
}
