import { hasAccessToTeam } from "../../utils/auth.js";
import { getReviewById } from "./reviewSuggestion.service.js";

export type ReviewAccess = "not-found" | "forbidden" | "allowed";

export async function hasAccessToReview(
  userId: string,
  reviewSuggestionId: string,
): Promise<ReviewAccess> {
  const review = await getReviewById(reviewSuggestionId);
  if (!review) return "not-found";

  return (await hasAccessToTeam(review.teamId, userId)) ? "allowed" : "forbidden";
}
