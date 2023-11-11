import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createReviewSuggestionsSchema = z.array(z.string().min(1).max(1000)).min(1)

const updateReviewSuggestionSchema = z.object({
    review: z.string().min(1).max(1000),
})

const byReviewSuggestionIdSchema = z.object({
    reviewSuggestionId: z.string().uuid(),
})

export const {
    schemas: reviewSuggestionSchemas,
    $ref: $reviewSuggestionRef,
} = buildJsonSchemas({
    updateReviewSuggestionSchema,
    byReviewSuggestionIdSchema,
    createReviewSuggestionsSchema
}, {
    $id: "reviewSuggestion",
})

export type byReviewSuggestionIdSchema = z.infer<typeof byReviewSuggestionIdSchema>
export type createReviewSuggestionsSchema = z.infer<typeof createReviewSuggestionsSchema>
export type updateReviewSuggestionSchema = z.infer<typeof updateReviewSuggestionSchema>
