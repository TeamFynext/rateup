import { z } from "zod";

// Base schema for column
const columnCore = {
  title: z.string(),
  ticketBoardId: z.uuid(),
  order: z.number().optional(),
};

// Schema for creating a column
const createColumnRequestSchema = z.object({
  ...columnCore,
});

// Response schema for created column
const createColumnResponseSchema = z.object({
  id: z.uuid(),
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
      id: z.uuid(),
      order: z.number(),
    }),
  ),
});

// Schema for id parameter in routes
const idParamsSchema = z.object({
  id: z.uuid(),
});

// Schema for boardId parameter in routes
const boardIdParamsSchema = z.object({
  ticketBoardId: z.uuid(),
});

// Building JSON schemas for Fastify

// Auto-exported after fastify-zod migration
export {
  createColumnRequestSchema,
  createColumnResponseSchema,
  updateColumnRequestSchema,
  reorderColumnRequestSchema,
  idParamsSchema,
  boardIdParamsSchema,
};
