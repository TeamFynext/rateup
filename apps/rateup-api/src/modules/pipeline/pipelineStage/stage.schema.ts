import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb colour");

export const idParamsSchema = z.object({
  id: z.uuid(),
});

export const createStageRequestSchema = z.object({
  pipelineId: z.uuid(),
  name: z.string().min(1).max(80),
  short: z.string().max(24).optional(),
  color: hexColor.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  rottingDays: z.number().int().min(0).max(365).optional(),
  lifecycleId: z.uuid().nullish(),
  isWon: z.boolean().optional(),
});

export const updateStageRequestSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  short: z.string().max(24).nullish(),
  color: hexColor.nullish(),
  probability: z.number().int().min(0).max(100).optional(),
  rottingDays: z.number().int().min(0).max(365).optional(),
  lifecycleId: z.uuid().nullish(),
  isWon: z.boolean().optional(),
});

export const deleteStageQuerySchema = z.object({
  moveLeadsToStageId: z.uuid().optional(),
});

export const reorderStagesRequestSchema = z.object({
  pipelineId: z.uuid(),
  stages: z.array(z.object({ id: z.uuid(), order: z.number().int().min(0) })).min(1),
});

export type CreateStageRequestSchema = z.infer<typeof createStageRequestSchema>;
export type UpdateStageRequestSchema = z.infer<typeof updateStageRequestSchema>;
export type ReorderStagesRequestSchema = z.infer<typeof reorderStagesRequestSchema>;
