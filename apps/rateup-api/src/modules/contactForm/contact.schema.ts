import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const createContactMessageInputSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email(),
  message: z.string().min(5, "Message must be at least 5 characters long"),
  address: z.string().optional(),
});

export const { schemas: contactFormSchemas, $ref: $Cref } = buildJsonSchemas(
  {
    createContactMessageInputSchema,
  },
  { $id: "contactFormSchema" },
);

export type CreateContactMessageInput = z.infer<
  typeof createContactMessageInputSchema
>;
