import type { Actor } from "../../authz/actor.js";
import { inScope } from "../../authz/scope.js";
import { getReviewById } from "./reviewSuggestion.service.js";

export type ReviewAccess = "not-found" | "forbidden" | "allowed";

export async function hasAccessToReview(
  actor: Actor | undefined,
  reviewSuggestionId: string,
): Promise<ReviewAccess> {
  const review = await getReviewById(reviewSuggestionId);
  if (!review) return "not-found";

  return actor && inScope(actor, review.teamId) ? "allowed" : "forbidden";
}
