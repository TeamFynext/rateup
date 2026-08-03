import { z } from "zod";

const createContactMessageInputSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.email(),
  message: z.string().min(5, "Message must be at least 5 characters long"),
  address: z.string().optional(),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageInputSchema>;

// Auto-exported after fastify-zod migration
export { createContactMessageInputSchema };
