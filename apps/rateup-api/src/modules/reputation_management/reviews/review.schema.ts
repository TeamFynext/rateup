// TODO: find a way to infer types from prisma instead of manually writing them

import { Review } from "@prisma/client";
import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

export type ReviewInput = Omit<Partial<Review>, "id">;

const getReviewQuery = z.object({
    includeAnalysis: z.boolean().optional()
})

export const { schemas: reviewSchemas, $ref: $ReviweRef } = buildJsonSchemas({
    getReviewQuery
}, { $id: "reviewSchema" });


export type GetReviewQuery = z.infer<typeof getReviewQuery>;
