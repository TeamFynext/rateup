import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// Base schema for column
const columnCore = {
  title: z.string(),
  ticketBoardId: z.string().uuid(),
  order: z.number().optional(),
};

// Schema for creating a column
const createColumnRequestSchema = z.object({
  ...columnCore,
});

// Response schema for created column
const createColumnResponseSchema = z.object({
  id: z.string().uuid(),
  ...columnCore,
});

// Schema for updating a column
const updateColumnRequestSchema = z.object({
  title: z.string().optional(),
});

// Schema for reordering columns
const reorderColumnRequestSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string().uuid(),
      order: z.number(),
    }),
  ),
});

// Schema for id parameter in routes
const idParamsSchema = z.object({
  id: z.string().uuid(),
});

// Schema for boardId parameter in routes
const boardIdParamsSchema = z.object({
  ticketBoardId: z.string().uuid(),
});

// Building JSON schemas for Fastify
export const { schemas: columnSchemas, $ref: $ColumnRef } = buildJsonSchemas(
  {
    createColumnRequestSchema,
    createColumnResponseSchema,
    updateColumnRequestSchema,
    reorderColumnRequestSchema,
    idParamsSchema,
    boardIdParamsSchema,
  },
  { $id: "columnSchemas" },
);
