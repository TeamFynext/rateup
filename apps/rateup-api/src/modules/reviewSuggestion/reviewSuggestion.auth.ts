import { hasAccessToTeam } from "../../utils/auth";
import { getReviewById } from "./reviewSuggestion.service";

export async function hasAccessToReview(userId: string, reviewSuggestionId: string) {
    const review = await getReviewById(reviewSuggestionId);
    if (!review) throw new Error("Review not found");

    return await hasAccessToTeam(review.teamId, userId)
}