import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// Base schema for board
const boardCore = {
  title: z.string(),
  teamIds: z.array(z.string().uuid()),
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
  teamIds: z.array(z.string().uuid()).optional(),
  ticketCreatedEmail: z.boolean().optional(),
  ticketCreatedWhatsapp: z.boolean().optional(),
  ticketAssignedEmail: z.boolean().optional(),
  ticketAssignedWhatsapp: z.boolean().optional(),
  assignedToIds: z.array(z.string().uuid()).optional(),
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

export type UpdateBoardRequestSchema = z.infer<typeof updateBoardRequestSchema>;
export type CreateBoardRequestSchema = z.infer<typeof createBoardRequestSchema>;
