import { FastifyReply, FastifyRequest } from "fastify";

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyFeedbackRequestStatus } from "../../../../generated/prisma/client.js";
import { GraphApiError } from "../../whatsapp/wa_axios.js";
import { getGraphApiErrorMessage } from "../../whatsapp/wa_error_handler.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { resolveTeamGoogleLink } from "./feedback.googleLink.js";
import { verifyReviewRedirect } from "./feedback.redirect.js";
import {
  detachFeedback,
  FeedbackError,
  getFeedbackOverview,
  getFeedbackResults,
  listFeedbackFlowCandidates,
  listFeedbackRequests,
  setupFeedback,
  submitFeedbackFlow,
  updateFeedbackSetting,
} from "./feedback.service.js";
import type {
  FeedbackRequestsQuery,
  FeedbackResultsQuery,
  ReviewRedirectParams,
  SetupFeedbackBody,
  UpdateFeedbackSettingInput,
} from "./feedback.schema.js";

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof FeedbackError) {
    return reply.code(error.status).send({ error: error.message });
  }
  if (error instanceof GraphApiError) {
    return reply.code(400).send({ error: getGraphApiErrorMessage(error) });
  }
  log.error({ err: error }, "Loyalty feedback request failed");
  return reply.code(500).send({ error: error instanceof Error ? error.message : "Unknown error" });
}

export async function listFeedbackFlowCandidatesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    reply.code(200).send(await listFeedbackFlowCandidates(request.user.orgId));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function getFeedbackOverviewHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await getFeedbackOverview(request.user.orgId));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function setupFeedbackHandler(
  request: FastifyRequest<{ Body: SetupFeedbackBody }>,
  reply: FastifyReply,
) {
  try {
    reply.code(200).send(await setupFeedback(request.user.orgId, request.body));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function updateFeedbackSettingHandler(
  request: FastifyRequest<{ Body: UpdateFeedbackSettingInput }>,
  reply: FastifyReply,
) {
  try {
    reply.code(200).send(await updateFeedbackSetting(request.user.orgId, request.body));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function submitFeedbackFlowHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    reply.code(200).send(await submitFeedbackFlow(request.user.orgId));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function detachFeedbackHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    await detachFeedback(request.user.orgId);
    reply.code(204).send();
  } catch (error) {
    sendError(reply, error);
  }
}

export async function getFeedbackResultsHandler(
  request: FastifyRequest<{ Querystring: FeedbackResultsQuery }>,
  reply: FastifyReply,
) {
  try {
    reply.code(200).send(await getFeedbackResults(request.user.orgId, request.query ?? {}));
  } catch (error) {
    sendError(reply, error);
  }
}

export async function listFeedbackRequestsHandler(
  request: FastifyRequest<{ Querystring: FeedbackRequestsQuery }>,
  reply: FastifyReply,
) {
  try {
    reply.code(200).send(await listFeedbackRequests(request.user.orgId, request.query));
  } catch (error) {
    sendError(reply, error);
  }
}

const THANK_YOU_HTML =
  "<!doctype html><meta charset=utf-8><title>Thank you</title>" +
  '<p style="font-family:system-ui;margin:3rem;font-size:1.25rem">Thank you for your feedback!</p>';

/**
 * Public: the "Review us on Google" button lands here. Records the tap, grants the review
 * reward on the first tap, and forwards the browser to the team's Google link.
 *
 * "Once per customer" rests on `CustomerReward`'s unique (rewardId, accountId), which
 * `assignRewardToCustomer` checks and the database enforces — so a customer who tapped a
 * review link from an earlier request holds the reward already, and a second tap on this
 * one is stopped by the `reviewClickedAt` claim below.
 */
export async function reviewRedirectHandler(
  request: FastifyRequest<{ Params: ReviewRedirectParams }>,
  reply: FastifyReply,
) {
  const { requestId, sig } = request.params;
  if (!verifyReviewRedirect(requestId, sig)) {
    return reply.code(404).type("text/plain").send("Not found");
  }

  const feedbackRequest = await prisma.loyaltyFeedbackRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      accountId: true,
      status: true,
      happy: true,
      program: {
        select: {
          feedbackSetting: {
            select: {
              rewardId: true,
              team: { select: { googleLink: true, reviewPageLinks: true } },
              reward: { select: { id: true, status: true } },
            },
          },
        },
      },
    },
  });
  if (!feedbackRequest) {
    return reply.code(404).type("text/plain").send("Not found");
  }

  const setting = feedbackRequest.program.feedbackSetting;
  const googleLink = setting ? resolveTeamGoogleLink(setting.team) : null;

  if (
    feedbackRequest.status === LoyaltyFeedbackRequestStatus.COMPLETED &&
    feedbackRequest.happy === true
  ) {
    const firstTap = await prisma.loyaltyFeedbackRequest.updateMany({
      where: { id: requestId, reviewClickedAt: null },
      data: { reviewClickedAt: new Date() },
    });
    const reward = setting?.reward;
    if (firstTap.count === 1 && reward && reward.status.toLowerCase() === "active") {
      try {
        const granted = await assignRewardToCustomer(feedbackRequest.accountId, reward.id);
        await prisma.loyaltyFeedbackRequest.update({
          where: { id: requestId },
          data: { rewardGrantedAt: new Date(), customerRewardId: granted.id },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/already assigned/i.test(message)) {
          log.error({ err: error, requestId }, "Could not grant the review reward");
        }
      }
    }
  }

  if (googleLink) {
    return reply.redirect(googleLink, 302);
  }
  return reply.code(200).type("text/html").send(THANK_YOU_HTML);
}
