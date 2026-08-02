import { hasAccessToTeam } from "../../utils/auth.js";
import { getReviewById } from "./reviewSuggestion.service.js";

/**
 * The three outcomes a by-id review operation can have.
 *
 * This used to be a boolean that THREW "Review not found" for a missing row, so
 * an unknown id reached the module's error handler and answered a fixed 500 —
 * and the helper could not be used defensively, since "does this exist" was an
 * exception while "may I touch it" was a return value. See issues.txt 36.4.
 */
export type ReviewAccess = "not-found" | "forbidden" | "allowed";

export async function hasAccessToReview(
  userId: string,
  reviewSuggestionId: string,
): Promise<ReviewAccess> {
  const review = await getReviewById(reviewSuggestionId);
  if (!review) return "not-found";

  return (await hasAccessToTeam(review.teamId, userId)) ? "allowed" : "forbidden";
}
