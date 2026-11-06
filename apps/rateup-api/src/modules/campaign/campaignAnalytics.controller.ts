import { FastifyReply, FastifyRequest } from "fastify";

import { CampaignNotFoundError } from "./campaign.errors.js";
import { log } from "../../utils/logger.js";
import type {
  ByCampaignIdParams,
  BySendIdParams,
  RetryPolicyInput,
  SendParticipantsQuery,
  SendTestInput,
} from "./campaign.schema.js";
import { CampaignTestSendError, sendCampaignTestMessage } from "./campaignTest.service.js";
import {
  getCampaignAnalytics,
  getCampaignSendParticipants,
  getCampaignSends,
} from "./campaignAnalytics.service.js";
import {
  cancelPendingRetries,
  getCampaignRetryPolicy,
  upsertCampaignRetryPolicy,
} from "./campaignRetry.service.js";

/**
 * Same shape as `campaign.controller.ts`'s own `replyForError`, which is not
 * exported. Kept narrow on purpose: these are all reads plus one upsert, so a
 * missing campaign is the only domain error any of them raise.
 */
function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof CampaignNotFoundError) {
    return reply.status(404).send({ message: error.message, code: "CAMPAIGN_NOT_FOUND" });
  }
  // The reason a test send was refused is the whole content of the response —
  // "Something went wrong" would send someone hunting for a problem the API
  // already knows the shape of.
  if (error instanceof CampaignTestSendError) {
    return reply.status(400).send({
      message: error.message,
      code: "CAMPAIGN_TEST_SEND_FAILED",
      displayMessageInClient: true,
    });
  }
  log.error({ err: error }, context);
  return reply.status(500).send({ message: "Something went wrong", code: "INTERNAL_ERROR" });
}

export async function getCampaignSendsHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCampaignSends(request.params.campaignId, request.user.orgId));
  } catch (error) {
    return replyForError(reply, error, "Error while handling getCampaignSendsHandler");
  }
}

export async function getCampaignSendParticipantsHandler(
  request: FastifyRequest<{ Params: BySendIdParams; Querystring: SendParticipantsQuery }>,
  reply: FastifyReply,
) {
  const { campaignId, sendId } = request.params;
  try {
    return reply.send(
      await getCampaignSendParticipants(campaignId, sendId, request.user.orgId, request.query),
    );
  } catch (error) {
    return replyForError(reply, error, "Error while handling getCampaignSendParticipantsHandler");
  }
}

export async function getCampaignAnalyticsHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getCampaignAnalytics(request.params.campaignId, request.user.orgId));
  } catch (error) {
    return replyForError(reply, error, "Error while handling getCampaignAnalyticsHandler");
  }
}

export async function getCampaignRetryPolicyHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  try {
    // Null, not 404: no policy is a legitimate state — it means retries are off —
    // and the wizard's Retries step needs to render defaults for it.
    return reply.send(await getCampaignRetryPolicy(request.params.campaignId, request.user.orgId));
  } catch (error) {
    return replyForError(reply, error, "Error while handling getCampaignRetryPolicyHandler");
  }
}

export async function updateCampaignRetryPolicyHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams; Body: RetryPolicyInput }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(
      await upsertCampaignRetryPolicy(request.params.campaignId, request.user.orgId, request.body),
    );
  } catch (error) {
    return replyForError(reply, error, "Error while handling updateCampaignRetryPolicyHandler");
  }
}

export async function cancelPendingRetriesHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams }>,
  reply: FastifyReply,
) {
  try {
    const cancelled = await cancelPendingRetries(request.params.campaignId, request.user.orgId);
    return reply.send({
      cancelled,
      message: cancelled
        ? `Cancelled ${cancelled} pending retry attempt(s).`
        : "There were no pending retries to cancel.",
      code: "RETRIES_CANCELLED",
    });
  } catch (error) {
    return replyForError(reply, error, "Error while handling cancelPendingRetriesHandler");
  }
}

export async function sendCampaignTestHandler(
  request: FastifyRequest<{ Params: ByCampaignIdParams; Body: SendTestInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await sendCampaignTestMessage(
      request.params.campaignId,
      request.user.orgId,
      request.body.phone,
    );
    return reply.send({
      ...result,
      message: "Test message sent.",
      code: "CAMPAIGN_TEST_SENT",
    });
  } catch (error) {
    return replyForError(reply, error, "Error while handling sendCampaignTestHandler");
  }
}
