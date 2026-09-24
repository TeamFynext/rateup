import { z } from "zod";
import { reasonSchema } from "../orgs/subscription.schema.js";

const emailSchema = z.email().trim().toLowerCase().max(254);
const nameSchema = z.string().trim().min(1).max(120);

export const staffAddSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  isOwner: z.boolean().default(false),
  reason: reasonSchema,
});
export type StaffAddInput = z.infer<typeof staffAddSchema>;

export const staffUpdateSchema = z
  .object({
    name: nameSchema.nullable().optional(),
    isOwner: z.boolean().optional(),
    reason: reasonSchema,
  })
  .refine(
    (input) => input.name !== undefined || input.isOwner !== undefined,
    "Change the name or the role.",
  );
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export const staffReasonSchema = z.object({ reason: reasonSchema });
export type StaffReasonInput = z.infer<typeof staffReasonSchema>;
