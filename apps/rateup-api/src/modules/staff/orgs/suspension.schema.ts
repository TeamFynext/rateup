import { z } from "zod";
import { reasonSchema } from "./subscription.schema.js";

export const reasonOnlyBodySchema = z.object({ reason: reasonSchema });
export type ReasonOnlyInput = z.infer<typeof reasonOnlyBodySchema>;

/** A note's own text is the record of why it was written, so there is no separate reason. */
export const noteSchema = z.object({
  body: z.string().trim().min(2).max(4000),
  pinned: z.boolean().default(false),
});
export type NoteInput = z.infer<typeof noteSchema>;

export const noteUpdateSchema = z
  .object({
    body: z.string().trim().min(2).max(4000).optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (input) => input.body !== undefined || input.pinned !== undefined,
    "Change the text or the pin.",
  );
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export const noteParamSchema = z.object({ id: z.uuid(), noteId: z.uuid() });
export type NoteParam = z.infer<typeof noteParamSchema>;
