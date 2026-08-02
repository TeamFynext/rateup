// NOTE: six schemas that described a ticket with a status, a teamId, an
// assignedToId and a deadline used to live here — a feature the module never built;
// what it stores is kanban cards on boards, with assignees as a join table and
// status expressed by which column a card sits in. None of them had an importer
// anywhere in src. One, updateStatusRequestSchema, declared
// `role: z.enum(["ADMIN", "SUPER_ADMIN"])` as a REQUEST BODY field — the caller
// stating their own role — which is recorded here so it is not restored as written.
// See issues.txt 30.4.
import { z } from "zod";

const idParamsSchema = z.object({
  id: z.string(),
});

const createCommentRequestSchema = z.object({
  ticketCardId: z.string(),
  msg: z.string().trim().min(1).max(5000),
});

export type IdParamsSchema = z.infer<typeof idParamsSchema>;
export type CreateCommentInput = z.infer<typeof createCommentRequestSchema>;

// Auto-exported after fastify-zod migration
export { idParamsSchema, createCommentRequestSchema };
