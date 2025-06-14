import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import {
  CampaignParticipantAddStatus,
  CampaignParticipantStatus,
} from "../../../types/enums";
import { paginationQuery } from "../../contact/contact.schema";

const byCampaignParticipantIdParamsSchema = z.object({
  campaignParticipantId: z.string().uuid(),
});

const createCampaignParticipantsFromGroupsSchema = z.object({
  groupIds: z.array(z.string().uuid()),
});

const createCampaignParticipantsFromContactsSchema = z.object({
  contactIds: z.array(z.string().uuid()),
});

const createCampaignParticipantsSchema = z.object({
  contactIds: z.array(z.string().uuid()),
  groupIds: z.array(z.string().uuid()),
  status: z.array(z.nativeEnum(CampaignParticipantAddStatus)),
  campaignIds: z.array(z.string().uuid()),
});
const deleteCampaignParticipantsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const campaignParticipantResponseSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  contactId: z.string().uuid(),
  createdAt: z.date(),
  status: z.nativeEnum(CampaignParticipantStatus),
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

const paginateQuerySchema = paginationQuery.merge(
  campaginParticipantPaginateSchema,
);

export const {
  schemas: campaignParticipantsSchemas,
  $ref: $campaignParticipantsRef,
} = buildJsonSchemas(
  {
    byCampaignParticipantIdParamsSchema,
    createCampaignParticipantsFromGroupsSchema,
    createCampaignParticipantsFromContactsSchema,
    createCampaignParticipantsSchema,
    campaignParticipantResponseSchema,
    deleteCampaignParticipantsSchema,
    paginateQuerySchema,
  },
  {
    $id: "campaignParticipantsSchema",
  },
);

export type ByCampaignParticipantIdParams = z.infer<
  typeof byCampaignParticipantIdParamsSchema
>;
export type CreateCampaignParticipantsFromGroupsInput = z.infer<
  typeof createCampaignParticipantsFromGroupsSchema
>;
export type CreateCampaignParticipantsFromContactsInput = z.infer<
  typeof createCampaignParticipantsFromContactsSchema
>;
export type CreateCampaignParticipantsInput = z.infer<
  typeof createCampaignParticipantsSchema
>;
export type DeleteCampaignParticipantsInput = z.infer<
  typeof deleteCampaignParticipantsSchema
>;
export type PaginateQueryInput = z.infer<typeof paginateQuerySchema>;
