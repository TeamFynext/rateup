import { FastifyInstance } from "fastify";
import { createCampaignParticipantsFromContactsHandler, createCampaignParticipantsFromGroupHandler, createCampaignParticipantsHandler, deleteCampaignParticipantByIdHandler, getCampaignParticipantByIdHandler, getCampaignParticipantsByCampaignIdHandler } from "./campaignParticipants.controller";
import { $campaignParticipantsRef } from "./campaignParticipants.schema";
import { $campaignRef } from "../campaign.schema";

export async function campaignParticipantRoutes(server: FastifyInstance) {
    server.post(
        '/contacts',
        {
            schema: {
                body: $campaignParticipantsRef('createCampaignParticipantsFromContactsSchema')
            }
        },
        createCampaignParticipantsFromContactsHandler
    )
    server.post(
        '/groups',
        {
            schema: {
                body: $campaignParticipantsRef('createCampaignParticipantsFromGroupsSchema')

            }
        },
        createCampaignParticipantsFromGroupHandler
    )
    
    server.post(
        '/',
        {
            schema: {
                body: $campaignParticipantsRef('createCampaignParticipantsSchema')
            }
        },
        createCampaignParticipantsHandler
    )

    server.delete(
        '/:campaignParticipantId',
        {
            schema: {
                params: $campaignParticipantsRef('byCampaignParticipantIdParamsSchema')
            }
        },
        deleteCampaignParticipantByIdHandler
    )
    server.get(
        '/',
        {
            schema: {
                params: $campaignRef('byCampaignIdParamsSchema')
            }
        },
        getCampaignParticipantsByCampaignIdHandler
    )
    server.get(
        '/:campaignParticipantId',
        {
            schema: {
                params: $campaignParticipantsRef('byCampaignParticipantIdParamsSchema')
            }
        },
        getCampaignParticipantByIdHandler
    )
}