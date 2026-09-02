import z from "zod";
import { ZapierTriggers } from "./zapier.service.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
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

const newMemberToGroupShema = z.object({
  groupId: z.string(),
  // Everything else is optional, but a contact still needs the two fields the
  // create path reads unconditionally.
  contacts: z.array(contactCoreSchema.partial().required({ name: true, source: true })),
});

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
export type NewMemberToGroupShema = z.infer<typeof newMemberToGroupShema>;
export type InviteMemberRequestSchema = z.infer<typeof inviteMemberRequestSchema>;
export type SendMessageSchema = z.infer<typeof sendMessageSchema>;
export type ContactLabelSchema = z.infer<typeof contactLabelSchema>;
export type PageSchema = z.infer<typeof pageSchema>;

// Auto-exported after fastify-zod migration
export {
  successSchema,
  triggerSubscriptionBodySchema,
  dropdownResponseSchema,
  contactResponseSchema,
  newMemberToGroupShema,
  inviteMemberRequestSchema,
  sendMessageSchema,
  contactLabelSchema,
  pageSchema,
  contactSearchSchema,
  contactSearchResponseSchema,
};
