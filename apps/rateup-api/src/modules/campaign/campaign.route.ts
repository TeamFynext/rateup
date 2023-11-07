import { FastifyInstance } from "fastify";
import { createCampaignHandler, deleteCampaignByIdHandler, getCampaignsHandler, startCampaignHandler, updateCampaignByIdHandler } from "./campaign.controller";
import { $campaignRef } from "./campaign.schema";
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route";
import { campaignParticipantsSchemas } from "./campaignParticipants/campaignParticipants.schema";
import { checkSession } from "../../utils/checkSession";
import { startCampaign } from "./campaign.service";

export async function campaignRoutes(server: FastifyInstance) {

    server.addHook('preHandler', checkSession)
    campaignParticipantsSchemas.forEach(schema => server.addSchema(schema))
    server.register(campaignParticipantRoutes, { prefix: ':campaignId/participants' })

    server.post(
        '/',
        {
            schema: {
                body: $campaignRef('createCampaignInputSchema')
            }
        },
        createCampaignHandler
    )
    server.get(
        '/',
        {
            schema: {
                querystring: $campaignRef('getCampaignsQuerySchema')
            }
        },
        getCampaignsHandler
    )
    server.put(
        '/:campaignId',
        {
            schema: {
                params: $campaignRef('byCampaignIdParamsSchema'),
                body: $campaignRef('updateCampaignInputSchema')
            }
        },
        updateCampaignByIdHandler
    )
    server.delete(
        '/:campaignId',
        {
            schema: {
                params: $campaignRef('byCampaignIdParamsSchema')
            }
        },
        deleteCampaignByIdHandler
    )
    server.get(
        "/:campaignId/start",
        {
            schema: {
                params: $campaignRef('byCampaignIdParamsSchema')
            }
        },
        startCampaignHandler
    )
}