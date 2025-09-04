import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const createBookDemoInputSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number seems too long"),
  email: z.string().email("Invalid email address"),
  reason: z.string().optional(),
});

export const { schemas: bookDemoSchemas, $ref: $Bref } = buildJsonSchemas(
  {
    createBookDemoInputSchema,
  },
  { $id: "bookDemoSchema" },
);

export type CreateBookDemoInput = z.infer<typeof createBookDemoInputSchema>;
