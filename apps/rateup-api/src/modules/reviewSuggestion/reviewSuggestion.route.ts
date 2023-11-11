import { FastifyInstance } from "fastify";
import { $reviewSuggestionRef } from "./reviewSuggestion.schema";
import { $Tref } from "../team/team.schema";
import { createReviewSuggestionsHandler, deleteReviewSuggestionHandler, errorHandler, getReviewsBySurveyTeamMapIdHandler, getReviewsByTeamIdHandler, getReviewsSuggestionCountByTeamIdHandler, updateReviewSuggestionHandler } from "./reviewSuggestion.controller";
import { checkSession } from "../../utils/checkSession";
import { verifyTeamAccess } from "../team/team.auth";

export async function reviewSuggestionRoutes(server: FastifyInstance) {
    server.setErrorHandler(errorHandler)
    server.get(
        "/:teamId",
        {
            preHandler: [checkSession, verifyTeamAccess],
            schema: {
                params: $Tref('byTeamIdParamsSchema')
            },
        },
        getReviewsByTeamIdHandler
    )
    server.get(
        "/public/:surveyTeamMapId",
        {
            schema: {
                params: $Tref("bySurveyTeamMapIdParamsSchema")
            }
        },
        getReviewsBySurveyTeamMapIdHandler
    )
    server.get(
        '/:teamId/count',
        {
            preHandler: [checkSession, verifyTeamAccess],
            schema: {
                params: $Tref('byTeamIdParamsSchema')
            }
        },
        getReviewsSuggestionCountByTeamIdHandler
    )
    server.post(
        '/:teamId',
        {
            preHandler: [checkSession, verifyTeamAccess],
            schema: {
                params: $Tref("byTeamIdParamsSchema"),
                body: $reviewSuggestionRef('createReviewSuggestionsSchema')
            }
        },
        createReviewSuggestionsHandler
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