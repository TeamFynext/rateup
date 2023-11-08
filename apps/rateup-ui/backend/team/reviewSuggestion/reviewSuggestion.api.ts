import { ReviewSuggestion } from "../../../types/global";
import { axiosClient } from "../../apiClient";

const REVIEW_SUGGESTION_URL = "/reviewSuggestion";

export async function getReviewsByTeamId(teamId: string) {
  return (await axiosClient.get(`${REVIEW_SUGGESTION_URL}/${teamId}`))
    .data as Array<ReviewSuggestion>;
}
export async function createReviewSuggestion(
  reviewSuggestion: Omit<ReviewSuggestion, "id">,
) {
  return await axiosClient.post(`${REVIEW_SUGGESTION_URL}`, reviewSuggestion);
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
