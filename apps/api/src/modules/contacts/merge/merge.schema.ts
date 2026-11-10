import { z } from "zod";
import { ContactIdentityKind } from "../../../generated/prisma/enums.js";

const uuid = z.uuid();

const fieldChoicesSchema = z
  .record(z.string(), z.enum(["source", "target"]))
  .refine(
    (choices) =>
      Object.keys(choices).every(
        (key) =>
          ["name", "email", "address", "dob", "gender", "notes", "lifecycleId"].includes(key) ||
          /^custom:[0-9a-f-]{36}$/i.test(key),
      ),
    { message: "Unknown field in fieldChoices" },
  );

export const mergePreviewQuerySchema = z.object({ sourceId: uuid, targetId: uuid });
export type MergePreviewQuery = z.infer<typeof mergePreviewQuerySchema>;

export const mergeBodySchema = z.object({
  sourceId: uuid,
  targetId: uuid,
  fieldChoices: fieldChoicesSchema.optional(),
  /** The suggestion being acted on, if the merge came from one. */
  suggestionId: uuid.optional(),
});
export type MergeBody = z.infer<typeof mergeBodySchema>;

export const suggestionListQuerySchema = z.object({
  status: z.enum(["PENDING", "MERGED", "DISMISSED"]).default("PENDING"),
  cursor: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type SuggestionListQuery = z.infer<typeof suggestionListQuerySchema>;

export const idParamSchema = z.object({ id: uuid });
export const contactIdParamSchema = z.object({ contactId: uuid });
export const identityParamSchema = z.object({ contactId: uuid, identityId: uuid });

/** Identities a person may add by hand. Platform ids only ever come from the platform. */
export const addIdentityBodySchema = z.object({
  kind: z.enum([ContactIdentityKind.PHONE, ContactIdentityKind.EMAIL]),
  value: z.string().trim().min(3).max(320),
});
export type AddIdentityBody = z.infer<typeof addIdentityBodySchema>;

/** Editing a phone or email a contact is known by: its value, or making it the main one. */
export const updateIdentityBodySchema = z
  .object({
    value: z.string().trim().min(3).max(320).optional(),
    isPrimary: z.literal(true).optional(),
  })
  .refine((body) => body.value !== undefined || body.isPrimary, {
    message: "Nothing to change",
  });
export type UpdateIdentityBody = z.infer<typeof updateIdentityBodySchema>;
