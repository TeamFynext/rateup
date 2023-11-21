import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const byCampaignParticipantIdParamsSchema = z.object({
    campaignParticipantId: z.string().uuid(),
})

const createCampaignParticipantsFromGroupsSchema = z.object({
    groupIds: z.array(z.string().uuid()),
})

const createCampaignParticipantsFromContactsSchema = z.object({
    contactIds: z.array(z.string().uuid()),
})

const createCampaignParticipantsSchema = z.object({
    contactIds: z.array(z.string().uuid()),
    groupIds: z.array(z.string().uuid())
})

export const { schemas: campaignParticipantsSchemas, $ref: $campaignParticipantsRef } = buildJsonSchemas({
    byCampaignParticipantIdParamsSchema,
    createCampaignParticipantsFromGroupsSchema,
    createCampaignParticipantsFromContactsSchema,
    createCampaignParticipantsSchema
}, {
    $id: 'campaignParticipantsSchema'
})

export type ByCampaignParticipantIdParams = z.infer<typeof byCampaignParticipantIdParamsSchema>;
export type CreateCampaignParticipantsFromGroupsInput = z.infer<typeof createCampaignParticipantsFromGroupsSchema>;
export type CreateCampaignParticipantsFromContactsInput = z.infer<typeof createCampaignParticipantsFromContactsSchema>;
export type CreateCampaignParticipantsInput = z.infer<typeof createCampaignParticipantsSchema>;
