import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const createContactLabelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional().default("#3b82f6"),
  description: z.string().optional(),
});

const updateContactLabelSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().optional(),
  description: z.string().optional(),
});

const byLabelIdSchema = z.object({
  labelId: z.string().uuid(),
});

const assignLabelsToContactSchema = z.object({
  labelIds: z.array(z.string().uuid()),
});

const assignLabelsToContactsSchema = assignLabelsToContactSchema.extend({
  contactIds: z.array(z.string().uuid()),
});

const contactLabelResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().optional(),
  createdAt: z.date(),
  orgId: z.string(),
  _count: z
    .object({
      contactLabels: z.any(),
    })
    .optional(),
});

export const { schemas: contactLabelSchemas, $ref: $contactLabelRef } =
  buildJsonSchemas(
    {
      createContactLabelSchema,
      updateContactLabelSchema,
      byLabelIdSchema,
      assignLabelsToContactSchema,
      contactLabelResponseSchema,
      assignLabelsToContactsSchema,
    },
    {
      $id: "contactLabelSchema",
    },
  );

export type CreateContactLabelSchema = z.infer<typeof createContactLabelSchema>;
export type UpdateContactLabelSchema = z.infer<typeof updateContactLabelSchema>;
export type ByLabelIdSchema = z.infer<typeof byLabelIdSchema>;
export type AssignLabelsToContactSchema = z.infer<
  typeof assignLabelsToContactSchema
>;
export type AssignLabelsToContactsSchema = z.infer<
  typeof assignLabelsToContactsSchema
>;
