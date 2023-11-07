import prisma from "../../utils/prisma";
import { createReviewSuggestionSchema } from "./reviewSuggestion.schema";

export async function getReviewsByTeamId(teamId: string) {
    return await prisma.reviewSuggestion.findMany({
        where: {
            teamId: teamId
        }
    })
}

export async function getReviewById(reviewSuggestionId: string) {
    return await prisma.reviewSuggestion.findUnique({
        where: {
            id: reviewSuggestionId
        }
    })
}

export async function createReviewSuggestion(review: createReviewSuggestionSchema) {
    return await prisma.reviewSuggestion.create({
        data: {
            review: review.review,
            teamId: review.teamId
        }
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