import type { ReviewSuggestion } from "@/types/global";

import { axiosClient, axiosClientIP } from "../../apiClient";

const REVIEW_SUGGESTION_URL = "/reviewSuggestion";

export async function getReviewsByTeamId(teamId: string) {
  return (await axiosClient.get(`${REVIEW_SUGGESTION_URL}/${teamId}`))
    .data as Array<ReviewSuggestion>;
}
export async function getPublicReviewsBySurveyTeamMapId(
  surveyTeamMapId: string,
  language?: string,
) {
  return (
    await axiosClientIP.get(
      `${REVIEW_SUGGESTION_URL}/public/${surveyTeamMapId}?language=${language}`,
    )
  ).data as { reviews: Array<ReviewSuggestion>; reviewLink: string };
}
export async function getReviewsCountByTeamId(teamId: string) {
  return (await axiosClient.get(`${REVIEW_SUGGESTION_URL}/${teamId}/count`))
    .data as number;
}
interface CreateReviewSuggestionsProps {
  reviewSuggestions: Array<string>;
  teamId: string;
  language: string;
}
export async function createReviewSuggestions({
  reviewSuggestions,
  teamId,
  language,
}: CreateReviewSuggestionsProps) {
  return await axiosClient.post(`${REVIEW_SUGGESTION_URL}/${teamId}`, {
    reviews: reviewSuggestions,
    language: language,
  });
}
export async function updateReviewSuggestion(
  reviewSuggestion: Omit<ReviewSuggestion, "teamId">,
) {
  return await axiosClient.put(
    `${REVIEW_SUGGESTION_URL}/${reviewSuggestion.id}`,
    reviewSuggestion,
  );
}
export async function deleteReviewSuggestion(reviewSuggestionId: string) {
  return await axiosClient.delete(
    `${REVIEW_SUGGESTION_URL}/${reviewSuggestionId}`,
  );
}
