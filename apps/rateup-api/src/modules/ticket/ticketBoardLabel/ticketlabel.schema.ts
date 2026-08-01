import { z } from "zod";

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string(),
});

export type CreateLabelSchema = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
});

export type UpdateLabelSchema = z.infer<typeof updateLabelSchema>;

export const deleteLabelsSchema = z.object({
  labelIds: z.array(z.uuid()),
});

export type DeleteLabelsSchema = z.infer<typeof deleteLabelsSchema>;
