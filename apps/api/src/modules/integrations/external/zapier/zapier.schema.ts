import z from "zod";
import { ZapierTriggers } from "./zapier.types.js";
import { WaMessageAssignStatus } from "../../../../types/enums.js";
import { contactCoreSchema, updateContactSchema } from "../../../contacts/contact.schema.js";

//any changes to schema should affect in integration created in zapier

const successSchema = z.object({
  success: z.boolean(),
});

/** A REST-hook target: absolute https only (the address itself is checked on save and send). */
const hookUrlSchema = z.url({ protocol: /^https$/ }).max(2048);

const triggerSubscriptionBodySchema = z.object({
  hookUrl: hookUrlSchema,
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
  // Sent by the published Zapier app; ignored — the org comes from the API key.
  orgId: z.string().optional(),
});

/** The Zapier app also sends the org id; the org comes from the API key, so it is ignored. */
const zapierCreateContactSchema = contactCoreSchema.extend({ orgId: z.string().optional() });

/** Also how the Zapier app closes or reopens a contact's conversation. */
const zapierUpdateContactSchema = updateContactSchema
  .pick({
    name: true,
    phone: true,
    email: true,
    address: true,
    dob: true,
    external_id: true,
    source: true,
    notes: true,
    customFields: true,
    labels: true,
    contactGroupIds: true,
    assignedUserIds: true,
    lifecycleId: true,
    waMessageAssignStatus: true,
  })
  .extend({ contactId: z.uuid(), orgId: z.string().optional() });

export type ZapierCreateContactSchema = z.infer<typeof zapierCreateContactSchema>;
export type ZapierUpdateContactSchema = z.infer<typeof zapierUpdateContactSchema>;
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
  zapierCreateContactSchema,
  zapierUpdateContactSchema,
};
