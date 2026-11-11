import type { Actor } from "../../../authz/actor.js";
import { teamInScope } from "../../../authz/scope.js";
import { getReviewById } from "./reviewSuggestion.service.js";

export type ReviewAccess = "not-found" | "forbidden" | "allowed";

export async function hasAccessToReview(
  actor: Actor | undefined,
  reviewSuggestionId: string,
): Promise<ReviewAccess> {
  const review = await getReviewById(reviewSuggestionId);
  if (!review) return "not-found";

  // The suggestion's team must be in the actor's org as well as its team scope.
  return actor && (await teamInScope(actor, review.teamId)) ? "allowed" : "forbidden";
}
