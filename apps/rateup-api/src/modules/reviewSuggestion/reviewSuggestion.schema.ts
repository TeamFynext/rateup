import { z } from "zod";

const createReviewSuggestionsSchema = z.object({
  // The array had a minimum of one and no maximum, so a single request from a
  // team member could insert an unbounded number of rows — five thousand entries
  // at a kilobyte each is a five megabyte body and five thousand inserts in one
  // statement. See issues.txt 36.6.
  reviews: z.array(z.string().min(1).max(1000)).min(1).max(200),
  language: z.string().min(2).max(35),
});

/**
 * The public read's language filter used to be taken from the query string with
 * no schema at all. Prisma drops an undefined filter, so omitting it returns
 * every language the team has — which is the intended behaviour and is kept.
 * See issues.txt 36.5.
 */
const publicReviewsQuerySchema = z.object({
  language: z.string().min(2).max(35).optional(),
});

const updateReviewSuggestionSchema = z.object({
  review: z.string().min(1).max(1000),
  language: z.string().min(2),
});

const byReviewSuggestionIdSchema = z.object({
  reviewSuggestionId: z.uuid(),
});

export type byReviewSuggestionIdSchema = z.infer<typeof byReviewSuggestionIdSchema>;
export type createReviewSuggestionsSchema = z.infer<typeof createReviewSuggestionsSchema>;
export type updateReviewSuggestionSchema = z.infer<typeof updateReviewSuggestionSchema>;

// Auto-exported after fastify-zod migration
export {
  updateReviewSuggestionSchema,
  byReviewSuggestionIdSchema,
  createReviewSuggestionsSchema,
  publicReviewsQuerySchema,
};
