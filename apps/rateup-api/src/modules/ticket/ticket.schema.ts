import { z } from "zod";

const ticketCore = {
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  teamId: z.string(),
  deadline: z.string().optional(),
  assignedToId: z.string(),
  reviewId: z.string().optional(),
  surveyResponseId: z.string().optional(),
  type: z.string().optional(),
  waAutomatedReplyMessageId: z.string().optional(),
};

const createTicketRequestSchema = z.object({
  ...ticketCore,
  firstComment: z.string(),
});

const createTicketResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  type: z.enum(["REVIEW", "SURVEY_RESPONSE", "CUSTOM"]),
  ...ticketCore,
});

//gettickets by team schema
const getTicketsByTeamRequestSchema = z.object({
  teamId: z.string(),
});

//gettickets by user schema
const getTicketsByUserRequestSchema = z.object({
  userId: z.string(),
});

const idParamsSchema = z.object({
  id: z.string(),
});

const updateStatusRequestSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
});

const updateTicketRequestSchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  deadline: z.string().optional(),
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
});

const createCommentRequestSchema = z.object({
  ticketCardId: z.string(),
  msg: z.string(),
});

export type IdParamsSchema = z.infer<typeof idParamsSchema>;
export type GetTicketsByTeamInput = z.infer<typeof getTicketsByTeamRequestSchema>;
export type GetTicketsByUserInput = z.infer<typeof getTicketsByUserRequestSchema>;
export type CreateTicketInput = z.infer<typeof createTicketRequestSchema>;
export type CreateTicketResponse = z.infer<typeof createTicketResponseSchema>;
export type CreateCommentInput = z.infer<typeof createCommentRequestSchema>;

export type UpdateStatusInput = z.infer<typeof updateStatusRequestSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketRequestSchema>;

// Auto-exported after fastify-zod migration
export {
  createTicketRequestSchema,
  createTicketResponseSchema,
  getTicketsByTeamRequestSchema,
  getTicketsByUserRequestSchema,
  idParamsSchema,
  createCommentRequestSchema,
  updateStatusRequestSchema,
  updateTicketRequestSchema,
};
