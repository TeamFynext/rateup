import { FastifyRequest, FastifyReply } from "fastify";
import { ByTeamIdParams } from "../team/team.schema";
import { createReviewSuggestion, deleteReviewSuggestion, getReviewById, getReviewsByTeamId, updateReviewSuggestion } from "./reviewSuggestion.service";
import { byReviewSuggestionIdSchema, createReviewSuggestionSchema, updateReviewSuggestionSchema } from "./reviewSuggestion.schema";
import { log } from "../../utils/logger";
import { hasAccessToReview } from "./reviewSuggestion.auth";

export async function getReviewsByTeamIdHandler(
    request: FastifyRequest<{ Params: ByTeamIdParams }>,
    reply: FastifyReply
) {
    const { teamId } = request.params
    const reviews = await getReviewsByTeamId(teamId)
    reply.send(reviews)
}

export async function createReviewSuggestionHandler(
    request: FastifyRequest<{ Body: createReviewSuggestionSchema }>,
    reply: FastifyReply
) {
    const review = await createReviewSuggestion(request.body)
    reply.send(review)
}

export async function updateReviewSuggestionHandler(
    request: FastifyRequest<{
        Params: byReviewSuggestionIdSchema,
        Body: updateReviewSuggestionSchema
    }>,
    reply: FastifyReply
) {
    const { reviewSuggestionId } = request.params;
    if (!(await hasAccessToReview(request.userId, reviewSuggestionId))) {
        reply.code(403)
        return;
    }
    const updatedReview = await updateReviewSuggestion(reviewSuggestionId, request.body.review)
    reply.send(updatedReview)
}

export async function deleteReviewSuggestionHandler(
    request: FastifyRequest<{ Params: byReviewSuggestionIdSchema }>,
    reply: FastifyReply
) {
    const { reviewSuggestionId } = request.params
    const reviews = await deleteReviewSuggestion(reviewSuggestionId)
    reply.send(reviews)
}

export function errorHandler(
    error,
    request: FastifyRequest,
    reply: FastifyReply
) {
    log.error(error)
    reply.status(500).send({ message: "Something went wrong" })
}