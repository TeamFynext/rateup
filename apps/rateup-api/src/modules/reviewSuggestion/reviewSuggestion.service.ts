import prisma from "../../utils/prisma.js";
import {
  createReviewSuggestionsSchema,
  updateReviewSuggestionSchema,
} from "./reviewSuggestion.schema.js";

export async function getReviewsByTeamId(teamId: string) {
  return await prisma.reviewSuggestion.findMany({
    where: {
      teamId: teamId,
    },
  });
}
export async function getReviewsBySurveyTeamMapId(surveyTeamMapId: string, language?: string) {
  const reviewSuggestions = await prisma.reviewSuggestion.findMany({
    where: {
      team: {
        surveys: {
          some: {
            id: surveyTeamMapId,
          },
        },
      },
      language: language,
    },
    select: {
      review: true,
      id: true,
    },
  });

  return reviewSuggestions;
}

export async function getReviewById(reviewSuggestionId: string) {
  return await prisma.reviewSuggestion.findUnique({
    where: {
      id: reviewSuggestionId,
    },
  });
}

export async function getReviewSuggestionsCountByTeamId(teamId: string) {
  return await prisma.reviewSuggestion.count({
    where: {
      teamId: teamId,
    },
  });
}

export async function createReviewSuggestions(data: createReviewSuggestionsSchema, teamId: string) {
  return await prisma.reviewSuggestion.createMany({
    data: data.reviews.map((review) => ({
      review,
      language: data.language,
      teamId,
    })),
  });
}

export async function updateReviewSuggestion(
  reviewSuggestionId: string,
  data: updateReviewSuggestionSchema,
) {
  return await prisma.reviewSuggestion.update({
    where: {
      id: reviewSuggestionId,
    },
    data: {
      review: data.review,
      language: data.language,
    },
  });
}

export async function deleteReviewSuggestion(reviewSuggestionId: string) {
  return await prisma.reviewSuggestion.delete({
    where: {
      id: reviewSuggestionId,
    },
  });
}
