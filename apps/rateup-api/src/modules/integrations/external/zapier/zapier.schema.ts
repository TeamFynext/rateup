import z from "zod";
import { ZapierTriggers } from "./zapier.service.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { TicketPriority } from "../../../../../generated/prisma/enums.js";
import { contactCoreSchema } from "../../../contact/contact.schema.js";

//any changes to schema should affect in integration created in zapier

const successSchema = z.object({
  success: z.boolean(),
});

const triggerSubscriptionBodySchema = z.object({
  hookUrl: z.string(),
  subscribed_field: z.enum(ZapierTriggers),
  zapId: z.string(),
});

const dropdownResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);

const ticketBoardResponseSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
  }),
);

const contactResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  igsId: z.string(),
  email: z.string(),
  source: z.string(),
  waMessageAssignStatus: z.enum(WaMessageAssignStatus),
});

const contactSearchResponseSchema = z.array(contactResponseSchema);

const pageSchema = z.object({
  page: z.coerce.number(),
});

const ticketCardResponseSchema = z.object({
  ticketId: z.string(),
});

const ticketCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  deadline: z.string().optional(),
  priority: z.enum(TicketPriority).optional(),
  ticketColumnId: z.string(),
});

const newMemberToGroupShema = z.object({
  groupId: z.string(),
  // Everything else is optional, but a contact still needs the two fields the
  // create path reads unconditionally.
  contacts: z.array(contactCoreSchema.partial().required({ name: true, source: true })),
});

const boardIdParamSchema = z.object({
  boardId: z.string(),
});
const teamIdParamsSchema = z.object({
  teamId: z.string(),
});
const boardQuerySchema = teamIdParamsSchema.extend(pageSchema.shape);
const ticketColumnSchema = z
  .object({
    boardId: z.string(),
  })
  .extend(pageSchema.shape);

const inviteMemberRequestSchema = z.object({
  teamId: z.string(),
  email: z.string(),
  name: z.string(),
  invitedByEmail: z.string(),
});

const sendMessageSchema = z.object({
  phone: z.string(),
  message: z.string(),
});

const contactSearchSchema = z
  .object({
    contactId: z.string().optional(),
    phone: z.string().optional(),
  })
  .extend({
    orgId: z.string().optional(),
  })
  .refine((data) => Boolean(data?.contactId?.length || data?.phone?.length), {
    message: "Either contactId or phone number should be provided",
  });

const contactLabelSchema = z.object({
  contactId: z.string(),
  lifecycleId: z.string(),
  orgId: z.string(),
});

export type TriggerSubscriptionBodySchema = z.infer<typeof triggerSubscriptionBodySchema>;
export type TicketCardSchema = z.infer<typeof ticketCardSchema>;
export type NewMemberToGroupShema = z.infer<typeof newMemberToGroupShema>;
export type InviteMemberRequestSchema = z.infer<typeof inviteMemberRequestSchema>;
export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
export type ContactLabelSchema = z.infer<typeof contactLabelSchema>;
export type PageSchema = z.infer<typeof pageSchema>;
export type BoardQueryInput = z.infer<typeof boardQuerySchema>;
export type TicketColumnQueryInput = z.infer<typeof ticketColumnSchema>;

// Auto-exported after fastify-zod migration
export {
  successSchema,
  triggerSubscriptionBodySchema,
  dropdownResponseSchema,
  ticketBoardResponseSchema,
  contactResponseSchema,
  ticketCardResponseSchema,
  ticketCardSchema,
  newMemberToGroupShema,
  inviteMemberRequestSchema,
  sendMessageSchema,
  contactLabelSchema,
  pageSchema,
  boardIdParamSchema,
  contactSearchSchema,
  contactSearchResponseSchema,
  boardQuerySchema,
  ticketColumnSchema,
};
