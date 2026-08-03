import { FastifyRequest, FastifyReply } from "fastify";
import { BySurveyTeamMapIdParams, ByTeamIdParams } from "../team/team.schema.js";
import {
  createReviewSuggestions,
  deleteReviewSuggestion,
  getReviewSuggestionsCountByTeamId,
  getReviewsBySurveyTeamMapId,
  getReviewsByTeamId,
  updateReviewSuggestion,
} from "./reviewSuggestion.service.js";
import {
  byReviewSuggestionIdSchema,
  createReviewSuggestionsSchema,
  updateReviewSuggestionSchema,
} from "./reviewSuggestion.schema.js";
import { log } from "../../utils/logger.js";
import { hasAccessToReview } from "./reviewSuggestion.auth.js";
import { getGoogleUrlBySurveyTeamMapId } from "../survey/survey.service.js";

export async function getReviewsByTeamIdHandler(
  request: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  const { teamId } = request.params;
  const reviews = await getReviewsByTeamId(teamId);
  reply.send(reviews);
}

export async function getReviewsBySurveyTeamMapIdHandler(
  request: FastifyRequest<{
    Params: BySurveyTeamMapIdParams;
    Querystring: { language?: string };
  }>,
  reply: FastifyReply,
) {
  const { surveyTeamMapId } = request.params;
  const { language } = request.query;

  log.trace(`Getting reviews for surveyTeamMapId: ${surveyTeamMapId} for language: ${language}`);
  const reviews = await getReviewsBySurveyTeamMapId(surveyTeamMapId, language);
  const reviewLink = await getGoogleUrlBySurveyTeamMapId(surveyTeamMapId);
  reply.send({ reviews, reviewLink });
}

export async function getReviewsSuggestionCountByTeamIdHandler(
  request: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  const { teamId } = request.params;
  const count = await getReviewSuggestionsCountByTeamId(teamId);
  reply.send(count);
}

export async function createReviewSuggestionsHandler(
  request: FastifyRequest<{
    Params: ByTeamIdParams;
    Body: createReviewSuggestionsSchema;
  }>,
  reply: FastifyReply,
) {
  const reviews = await createReviewSuggestions(request.body, request.params.teamId);
  reply.send(reviews);
}

function refuse(reply: FastifyReply, access: "not-found" | "forbidden") {
  if (access === "not-found") {
    return reply.code(404).send({ message: "Review suggestion not found" });
  }
  return reply.code(403).send({ message: "You don't have access to this review suggestion" });
}

export async function updateReviewSuggestionHandler(
  request: FastifyRequest<{
    Params: byReviewSuggestionIdSchema;
    Body: updateReviewSuggestionSchema;
  }>,
  reply: FastifyReply,
) {
  const { reviewSuggestionId } = request.params;
  const access = await hasAccessToReview(request.userId, reviewSuggestionId);
  if (access !== "allowed") return refuse(reply, access);

  const updatedReview = await updateReviewSuggestion(reviewSuggestionId, request.body);
  reply.send(updatedReview);
}

export async function deleteReviewSuggestionHandler(
  request: FastifyRequest<{ Params: byReviewSuggestionIdSchema }>,
  reply: FastifyReply,
) {
  const { reviewSuggestionId } = request.params;
  const access = await hasAccessToReview(request.userId, reviewSuggestionId);
  if (access !== "allowed") return refuse(reply, access);

  const reviews = await deleteReviewSuggestion(reviewSuggestionId);
  reply.send(reviews);
}

export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  log.error(error);
  reply.status(500).send({ message: "Something went wrong" });
}
