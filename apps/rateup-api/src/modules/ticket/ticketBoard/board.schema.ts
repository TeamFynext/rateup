import { z } from "zod";

// Base schema for board
const boardCore = {
  title: z.string(),
  teamIds: z.array(z.uuid()),
};

// Schema for creating a board
const createBoardRequestSchema = z.object({
  ...boardCore,
});

// Response schema for created board
const createBoardResponseSchema = z.object({
  id: z.uuid(),
  ...boardCore,
});

// Schema for updating a board
const updateBoardRequestSchema = z.object({
  title: z.string().optional(),
  teamIds: z.array(z.uuid()).optional(),
  ticketCreatedEmail: z.boolean().optional(),
  ticketCreatedWhatsapp: z.boolean().optional(),
  ticketAssignedEmail: z.boolean().optional(),
  ticketAssignedWhatsapp: z.boolean().optional(),
  assignedToIds: z.array(z.uuid()).optional(),
});

// Schema for id parameter in routes
const idParamsSchema = z.object({
  id: z.uuid(),
});

// Building JSON schemas for Fastify

export type UpdateBoardRequestSchema = z.infer<typeof updateBoardRequestSchema>;
export type CreateBoardRequestSchema = z.infer<typeof createBoardRequestSchema>;

// Auto-exported after fastify-zod migration
export {
  createBoardRequestSchema,
  createBoardResponseSchema,
  updateBoardRequestSchema,
  idParamsSchema,
};
