import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import {
  TicketPriority,
  TicketType,
} from "../../../../generated/prisma/client.js";

// Base schema for card
const cardCore = {
  title: z.string(),
  description: z.string().optional(),
  ticketColumnId: z.string().uuid(),
  order: z.number().optional(),
  type: z.nativeEnum(TicketType).optional(),
};

// Schema for creating a card
const createCardRequestSchema = z.object({
  ...cardCore,
});

// Response schema for created card
const createCardResponseSchema = z.object({
  id: z.string().uuid(),
  ...cardCore,
  createdAt: z.string().datetime(),
});

// Schema for updating a card
const updateCardRequestSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  assignedToIds: z.array(z.string().uuid()).optional(),
  priority: z.nativeEnum(TicketPriority).optional().nullable(),
  deadline: z
    .date({
      required_error: "Deadline is required",
      invalid_type_error: "Invalid date format",
    })
    .nullable(),
  description: z.string().optional(),
});

// Schema for moving a card to another column
const moveCardRequestSchema = z.object({
  ticketColumnId: z.string().uuid(),
  order: z.number().optional(),
});

// Schema for reordering cards
const reorderCardRequestSchema = z.object({
  cards: z.array(
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

// Schema for columnId parameter in routes
const columnIdParamsSchema = z.object({
  ticketColumnId: z.string().uuid(),
});

// Building JSON schemas for Fastify
export const { schemas: cardSchemas, $ref: $CardRef } = buildJsonSchemas(
  {
    createCardRequestSchema,
    createCardResponseSchema,
    updateCardRequestSchema,
    moveCardRequestSchema,
    reorderCardRequestSchema,
    idParamsSchema,
    columnIdParamsSchema,
  },
  { $id: "cardSchemas" },
);

export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;
