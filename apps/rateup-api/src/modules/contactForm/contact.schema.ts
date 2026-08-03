import { z } from "zod";

const createContactMessageInputSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(100, "Name must be at most 100 characters long"),
  email: z.email().max(254),
  message: z
    .string()
    .min(5, "Message must be at least 5 characters long")
    .max(5000, "Message must be at most 5000 characters long"),
  /** Honeypot. Real submitters leave it empty; see createMsg. */
  address: z.string().max(200).optional(),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageInputSchema>;

// Auto-exported after fastify-zod migration
export { createContactMessageInputSchema };
