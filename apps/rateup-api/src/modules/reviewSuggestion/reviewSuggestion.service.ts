import prisma from "../../utils/prisma";
import { createReviewSuggestionsSchema } from "./reviewSuggestion.schema";

export async function getReviewsByTeamId(teamId: string) {
    return await prisma.reviewSuggestion.findMany({
        where: {
            teamId: teamId
        }
    })
}
export async function getReviewsBySurveyTeamMapId(surveyTeamMapId: string) {
    const { team: { reviewSuggestions } } = await prisma.surveyTeamMap.findUnique({
        where: {
            id: surveyTeamMapId
        },
        include: {
            team: {
                include: {
                    reviewSuggestions: true
                }
            }
        }
    })
    return reviewSuggestions
}

export async function getReviewById(reviewSuggestionId: string) {
    return await prisma.reviewSuggestion.findUnique({
        where: {
            id: reviewSuggestionId
        }
    })
}

export async function getReviewSuggestionsCountByTeamId(teamId: string) {
    return await prisma.reviewSuggestion.count({
        where: {
            teamId: teamId
        }
    })
}

export async function createReviewSuggestions(reviews: createReviewSuggestionsSchema, teamId: string) {
    return await prisma.reviewSuggestion.createMany({
        data: reviews.map((review) => ({
            review,
            teamId
        }))
    })
}

export async function updateReviewSuggestion(reviewSuggestionId: string, review: string) {
    return await prisma.reviewSuggestion.update({
        where: {
            id: reviewSuggestionId
        },
        data: {
            review: review
        }
    })
}

export async function deleteReviewSuggestion(reviewSuggestionId: string) {
    return await prisma.reviewSuggestion.delete({
        where: {
            id: reviewSuggestionId
        }
    })
}