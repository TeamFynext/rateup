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
import { CampaignNotFoundError } from "../campaign.errors.js";
import { log } from "../../../utils/logger.js";

/**
 * Turns a service failure into a controlled reply.
 *
 * Six of these seven handlers had no try/catch at all, so a service failure
 * escaped to fastify's default error handler rather than becoming a reply. The
 * seventh, multipleDeleteCampaignParticipantHandler, was worse: it caught and then
 * `reply.send(error)` with no status, so fastify answered 200 with a body whose
 * own properties are non-enumerable — the client received `{}` and read it as a
 * successful delete. See issues.txt 17.6.
 *
 * A campaign that is not the caller's answers 404, indistinguishable from one that
 * never existed. See issues.txt 17.3.
 */
function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof CampaignNotFoundError) {
    return reply.status(404).send({ message: error.message, code: "CAMPAIGN_NOT_FOUND" });
  }
  if (error && typeof error === "object" && (error as { code?: string }).code === "P2025") {
    return reply.status(404).send({ message: "Participant not found", code: "NOT_FOUND" });
  }
  log.error({ err: error }, context);
  return reply.status(500).send({
    message: error instanceof Error ? error.message : "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
  });
}

export async function createCampaignParticipantsFromContactsHandler(
  request: FastifyRequest<{
    Body: CreateCampaignParticipantsFromContactsInput;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipants = await createCampaignParticipantsFromContacts(
      request.params.campaignId,
      request.user.orgId,
      request.body,
    );
    return reply.send(campaignParticipants);
  } catch (error) {
    return replyForError(reply, error, "Error adding campaign participants from contacts");
  }
}

export async function createCampaignParticipantsFromGroupHandler(
  request: FastifyRequest<{
    Body: CreateCampaignParticipantsFromGroupsInput;
    Params: ByCampaignIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipants = await createCampaignParticipantsFromGroup(
      request.params.campaignId,
      request.user.orgId,
      request.body,
    );
    return reply.send(campaignParticipants);
  } catch (error) {
    return replyForError(reply, error, "Error adding campaign participants from groups");
  }
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
  try {
    const campaignParticipants = await createCampaignParticipants(
      request.params.campaignId,
      request.user.orgId,
      request.body,
    );
    return reply.send(campaignParticipants);
  } catch (error) {
    return replyForError(reply, error, "Error adding campaign participants");
  }
}

export async function getCampaignParticipantsByCampaignIdHandler(
  request: FastifyRequest<{
    Params: ByCampaignIdParams;
    Querystring: PaginateQueryInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipants = await getCampaignParticipantsByCampaignIdPaginated(
      request.params.campaignId,
      request.user.orgId,
      request.query,
    );
    return reply.send(campaignParticipants);
  } catch (error) {
    return replyForError(reply, error, "Error listing campaign participants");
  }
}

export async function getCampaignParticipantByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipant = await getCampaignParticipantById(
      request.params.campaignParticipantId,
      request.user.orgId,
    );
    if (!campaignParticipant) {
      return reply.status(404).send({ message: "Participant not found", code: "NOT_FOUND" });
    }
    return reply.send(campaignParticipant);
  } catch (error) {
    return replyForError(reply, error, "Error reading a campaign participant");
  }
}

export async function deleteCampaignParticipantByIdHandler(
  request: FastifyRequest<{ Params: ByCampaignParticipantIdParams }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipant = await deleteCampaignParticipantById(
      request.params.campaignParticipantId,
      request.user.orgId,
    );
    return reply.send(campaignParticipant);
  } catch (error) {
    return replyForError(reply, error, "Error deleting a campaign participant");
  }
}

export async function multipleDeleteCampaignParticipantHandler(
  request: FastifyRequest<{ Body: DeleteCampaignParticipantsInput }>,
  reply: FastifyReply,
) {
  try {
    const campaignParticipants = await multipleDeleteCampaignParticipant(
      request.body.ids,
      request.user.orgId,
    );
    return reply.send(campaignParticipants);
  } catch (error) {
    return replyForError(reply, error, "Error deleting campaign participants");
  }
}
