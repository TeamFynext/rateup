import { z } from "zod";

const createReviewSuggestionsSchema = z.object({
  reviews: z.array(z.string().min(1).max(1000)).min(1),
  language: z.string().min(2),
});

const updateReviewSuggestionSchema = z.object({
  review: z.string().min(1).max(1000),
  language: z.string().min(2),
});

const byReviewSuggestionIdSchema = z.object({
  reviewSuggestionId: z.uuid(),
});

export type byReviewSuggestionIdSchema = z.infer<
  typeof byReviewSuggestionIdSchema
>;
export type createReviewSuggestionsSchema = z.infer<
  typeof createReviewSuggestionsSchema
>;
export type updateReviewSuggestionSchema = z.infer<
  typeof updateReviewSuggestionSchema
>;

// Auto-exported after fastify-zod migration
export {
  updateReviewSuggestionSchema,
  byReviewSuggestionIdSchema,
  createReviewSuggestionsSchema,
};
