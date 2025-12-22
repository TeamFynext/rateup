import { hasAccessToTeam } from "../../utils/auth.js";
import { getReviewById } from "./reviewSuggestion.service.js";

export async function hasAccessToReview(
  userId: string,
  reviewSuggestionId: string,
) {
  const review = await getReviewById(reviewSuggestionId);
  if (!review) throw new Error("Review not found");

  return await hasAccessToTeam(review.teamId, userId);
}
