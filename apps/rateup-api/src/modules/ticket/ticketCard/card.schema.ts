import { z } from "zod";

import { TicketPriority, TicketType } from "../../../../generated/prisma/client.js";

// Base schema for card
const cardCore = {
  title: z.string(),
  description: z.string().optional(),
  ticketColumnId: z.uuid(),
  order: z.number().optional(),
  type: z.enum(TicketType).optional(),
  contactId: z.uuid().optional(),
  surveyResponseId: z.string().optional(),
  reviewId: z.string().optional(),
  priority: z.enum(TicketPriority).optional(),
  labelIds: z.array(z.uuid()).optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  assignees: z.array(z.object({ assigneeId: z.uuid() })).optional(),
};

// Schema for creating a card
const createCardRequestSchema = z.object({
  ...cardCore,
});

// Response schema for created card
const createCardResponseSchema = z.object({
  id: z.uuid(),
  ...cardCore,
  createdAt: z.iso.datetime(),
});

// Schema for updating a card
const updateCardRequestSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").optional(),
  assignedToIds: z.array(z.uuid()).optional(),
  priority: z.enum(TicketPriority).optional().nullable(),
  labelIds: z.array(z.uuid()).optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  description: z.string().optional(),
  contactId: z.uuid().optional().nullable(),
  checklists: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        items: z
          .array(
            z.object({
              id: z.string(),
              text: z.string().optional(),
              isCompleted: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional()
    .nullable(),
  attachments: z.array(z.string()).optional(),
});

// Schema for moving a card to another column
const moveCardRequestSchema = z.object({
  ticketColumnId: z.uuid(),
  order: z.number().optional(),
});

// Schema for reordering cards
const reorderCardRequestSchema = z.object({
  cards: z.array(
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

// Schema for columnId parameter in routes
const columnIdParamsSchema = z.object({
  ticketColumnId: z.uuid(),
});

// Building JSON schemas for Fastify

export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;

// Auto-exported after fastify-zod migration
export {
  createCardRequestSchema,
  createCardResponseSchema,
  updateCardRequestSchema,
  moveCardRequestSchema,
  reorderCardRequestSchema,
  idParamsSchema,
  columnIdParamsSchema,
};
