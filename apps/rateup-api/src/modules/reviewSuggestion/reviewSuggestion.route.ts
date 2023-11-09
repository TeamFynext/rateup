import { FastifyInstance } from "fastify";
import { $reviewSuggestionRef } from "./reviewSuggestion.schema";
import { $Tref } from "../team/team.schema";
import { createReviewSuggestionHandler, deleteReviewSuggestionHandler, errorHandler, getReviewsByTeamIdHandler, updateReviewSuggestionHandler } from "./reviewSuggestion.controller";
import { checkSession } from "../../utils/checkSession";
import { verifyTeamAccess } from "../team/team.auth";

export async function reviewSuggestionRoutes(server: FastifyInstance) {
    server.setErrorHandler(errorHandler)
    server.get(
        "/:teamId",
        {
            schema: {
                params: $Tref('byTeamIdParamsSchema')
            },
        },
        getReviewsByTeamIdHandler
    )
    server.post(
        '/',
        {
            preHandler: [checkSession, verifyTeamAccess],
            schema: {
                body: $reviewSuggestionRef('createReviewSuggestionSchema')
            }
        },
        createReviewSuggestionHandler
    )
    server.put(
        '/:reviewSuggestionId',
        {
            preHandler: [checkSession],
            schema: {
                params: $reviewSuggestionRef('byReviewSuggestionIdSchema')
            }
        },
        updateReviewSuggestionHandler
    )
    server.delete(
        '/:reviewSuggestionId',
        {
            schema: {
                params: $reviewSuggestionRef('byReviewSuggestionIdSchema')
            }
        },
        deleteReviewSuggestionHandler
    )
}