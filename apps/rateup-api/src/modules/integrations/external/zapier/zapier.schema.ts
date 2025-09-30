import { buildJsonSchemas } from "fastify-zod";
import z from "zod";
import { ZapierTriggers } from "./zapier.service";
import { WaMessageAssignStatus } from "../../../../types/enums";
import { TicketPriority } from "../../../../../generated/prisma/enums";
import { contactCoreSchema } from "../../../contact/contact.schema";

//any changes to schema should affect in integration created in zapier

const successSchema = z.object({
  success: z.boolean(),
});

const triggerSubscriptionBodySchema = z.object({
  hookUrl: z.string(),
  subscribed_field: z.nativeEnum(ZapierTriggers),
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
  waMessageAssignStatus: z.nativeEnum(WaMessageAssignStatus),
});

const contactSearchResponseSchema = z.array(contactResponseSchema);

const pageSchema = z.object({
  page: z.number(),
});

const ticketCardResponseSchema = z.object({
  ticketId: z.string(),
});

const ticketCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  deadline: z.string().optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  ticketColumnId: z.string(),
});

const newMemberToGroupShema = z.object({
  groupId: z.string(),
  contacts: z.array(contactCoreSchema.partial()),
});

const boardIdParamSchema = z.object({
  boardId: z.string(),
});
const teamIdParamsSchema = z.object({
  teamId: z.string(),
});
const boardQuerySchema = teamIdParamsSchema.merge(pageSchema);
const ticketColumnSchema = z
  .object({
    boardId: z.string(),
  })
  .merge(pageSchema);

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
  .merge(
    z.object({
      orgId: z.string(),
    }),
  )
  .refine((data) => !data?.contactId.length && !data?.phone.length, {
    message: "Either contactId or phone number should be provided",
  });

const contactLabelSchema = z.object({
  contactId: z.string(),
  lifecycleId: z.string(),
});

export const { schemas: zapierSchemas, $ref: $zapier } = buildJsonSchemas(
  {
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
  },
  { $id: "zapierSchemas" },
);

export type TriggerSubscriptionBodySchema = z.infer<
  typeof triggerSubscriptionBodySchema
>;
export type TicketCardSchema = z.infer<typeof ticketCardSchema>;
export type NewMemberToGroupShema = z.infer<typeof newMemberToGroupShema>;
export type InviteMemberRequestSchema = z.infer<
  typeof inviteMemberRequestSchema
>;
export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
export type ContactLabelSchema = z.infer<typeof contactLabelSchema>;
export type PageSchema = z.infer<typeof pageSchema>;
export type BoardQueryInput = z.infer<typeof boardQuerySchema>;
export type TicketColumnQueryInput = z.infer<typeof ticketColumnSchema>;
