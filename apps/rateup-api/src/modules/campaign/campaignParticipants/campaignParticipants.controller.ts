import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateCampaignParticipantsFromContactsInput,
  CreateCampaignParticipantsFromGroupsInput,
  ByCampaignParticipantIdParams,
  CreateCampaignParticipantsInput,
  DeleteCampaignParticipantsInput,
  PaginateQueryInput,
} from "./campaignParticipants.schema.js";
import {
  createCampaignParticipants,
  createCampaignParticipantsFromContacts,
  createCampaignParticipantsFromGroup,
  deleteCampaignParticipantById,
  getCampaignParticipantById,
  getCampaignParticipantsByCampaignIdPaginated,
  multipleDeleteCampaignParticipant,
} from "./campaignParticipants.service.js";
import { ByCampaignIdParams } from "../campaign.schema.js";

export async function createCampaignParticipantsFromContactsHandler(
  request: FastifyRequest<{
    Body: CreateCampaignParticipantsFromContactsInput;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  const campaignParticipants = await createCampaignParticipantsFromContacts(
    request.params.campaignId,
    request.body,
  );
  reply.send(campaignParticipants);
}

export async function createCampaignParticipantsFromGroupHandler(
  request: FastifyRequest<{
    Body: CreateCampaignParticipantsFromGroupsInput;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  const campaignParticipants = await createCampaignParticipantsFromGroup(
    request.params.campaignId,
    request.body,
  );
  reply.send(campaignParticipants);
}

export async function createCampaignParticipantsHandler(
  request: FastifyRequest<{
    Body: CreateCampaignParticipantsInput;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  if (request.body.campaignIds?.length > 0) {
    if (request.body.status?.length < 1)
      return reply.code(400).send({ error: "atleast one status required" });
  }
  const campaignParticipants = await createCampaignParticipants(
    request.params.campaignId,
    request.body,
  );
  reply.send(campaignParticipants);
}

export async function getCampaignParticipantsByCampaignIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: PaginateQueryInput;
  }>,
  reply: FastifyReply,
) {
  const campaignParticipants = await getCampaignParticipantsByCampaignIdPaginated(
    request.params.campaignId,
    request.query,
  );
  reply.send(campaignParticipants);
}

export async function getCampaignParticipantByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
  reply: FastifyReply,
) {
  const campaignParticipant = await getCampaignParticipantById(
    request.params.campaignParticipantId,
  );
  reply.send(campaignParticipant);
}

export async function deleteCampaignParticipantByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
  reply: FastifyReply,
) {
  const campaignParticipant = await deleteCampaignParticipantById(
    request.params.campaignParticipantId,
  );
  reply.send(campaignParticipant);
}

export async function multipleDeleteCampaignParticipantHandler(
  request: FastifyRequest<{ Body: DeleteCampaignParticipantsInput }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipants = await multipleDeleteCampaignParticipant(request.body.ids);
    reply.send(campaignParticipants);
  } catch (error) {
    reply.send(error);
  }
}
