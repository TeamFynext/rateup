import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createReviewSuggestionSchema = z.object({
    review: z.string().min(1).max(1000),
    teamId: z.string().uuid(),
})

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
    createReviewSuggestionSchema,
    updateReviewSuggestionSchema,
    byReviewSuggestionIdSchema,
}, {
    $id: "reviewSuggestion",
})

export type byReviewSuggestionIdSchema = z.infer<typeof byReviewSuggestionIdSchema>
export type createReviewSuggestionSchema = z.infer<typeof createReviewSuggestionSchema>
export type updateReviewSuggestionSchema = z.infer<typeof updateReviewSuggestionSchema>
