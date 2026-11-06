import { z } from "zod";
import { CampaignParticipantAddStatus, CampaignParticipantStatus } from "../../../types/enums.js";
import { paginationQuery } from "../../contact/contact.schema.js";

const byCampaignParticipantIdParamsSchema = z.object({
  campaignParticipantId: z.uuid(),
});

const createCampaignParticipantsFromGroupsSchema = z.object({
  groupIds: z.array(z.uuid()),
  groupFilter: z.record(z.string(), z.string()).optional(),
});

/**
 * `filter` is the contacts list query (search plus filter keys, as `GET /contact` takes them);
 * every WhatsApp contact it matches is added, alongside any picked `contactIds`.
 */
const contactListFilterSchema = z.record(z.string(), z.string()).optional();

const createCampaignParticipantsFromContactsSchema = z.object({
  contactIds: z.array(z.uuid()),
  filter: contactListFilterSchema,
});

const createCampaignParticipantsSchema = z.object({
  contactIds: z.array(z.uuid()),
  filter: contactListFilterSchema,
  groupIds: z.array(z.uuid()),
  /** Same shape as `filter`, but narrows the members taken from `groupIds` instead. */
  groupFilter: contactListFilterSchema,
  status: z.array(z.enum(CampaignParticipantAddStatus)),
  campaignIds: z.array(z.uuid()),
});
const deleteCampaignParticipantsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const campaignParticipantResponseSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  contactId: z.uuid(),
  createdAt: z.date(),
  status: z.enum(CampaignParticipantStatus),
  sentAt: z.date().optional(),
});

const campaginParticipantPaginateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
  consent: z.string().optional(),
  sentAt: z.string().optional(),
  createdAt: z.string().optional(),
  selectedDripStage: z.string().optional(),
});

const paginateQuerySchema = paginationQuery.extend(campaginParticipantPaginateSchema.shape);

export type ByCampaignParticipantIdParams = z.infer<typeof byCampaignParticipantIdParamsSchema>;
export type CreateCampaignParticipantsFromGroupsInput = z.infer<
  typeof createCampaignParticipantsFromGroupsSchema
>;
export type CreateCampaignParticipantsFromContactsInput = z.infer<
  typeof createCampaignParticipantsFromContactsSchema
>;
export type CreateCampaignParticipantsInput = z.infer<typeof createCampaignParticipantsSchema>;
export type DeleteCampaignParticipantsInput = z.infer<typeof deleteCampaignParticipantsSchema>;
export type PaginateQueryInput = z.infer<typeof paginateQuerySchema>;

// Auto-exported after fastify-zod migration
export {
  byCampaignParticipantIdParamsSchema,
  createCampaignParticipantsFromGroupsSchema,
  createCampaignParticipantsFromContactsSchema,
  createCampaignParticipantsSchema,
  campaignParticipantResponseSchema,
  deleteCampaignParticipantsSchema,
  paginateQuerySchema,
};
