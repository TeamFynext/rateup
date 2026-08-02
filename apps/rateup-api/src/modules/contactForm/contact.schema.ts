import { z } from "zod";

// Upper bounds as well as lower ones: an unauthenticated form used to accept a
// message of any size, store it in an unbounded text column and put it into an
// email. See issues.txt 22.7.
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
