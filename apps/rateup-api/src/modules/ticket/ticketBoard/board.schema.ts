import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// Base schema for board
const boardCore = {
  title: z.string(),
  teamId: z.string().uuid(),
};

// Schema for creating a board
const createBoardRequestSchema = z.object({
  ...boardCore,
});

// Response schema for created board
const createBoardResponseSchema = z.object({
  id: z.string().uuid(),
  ...boardCore,
});

// Schema for updating a board
const updateBoardRequestSchema = z.object({
  title: z.string().optional(),
});

// Schema for id parameter in routes
const idParamsSchema = z.object({
  id: z.string().uuid(),
});

// Building JSON schemas for Fastify
export const { schemas: boardSchemas, $ref: $BoardRef } = buildJsonSchemas(
  {
    createBoardRequestSchema,
    createBoardResponseSchema,
    updateBoardRequestSchema,
    idParamsSchema,
  },
  { $id: "boardSchemas" },
);
