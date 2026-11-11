import { z } from "zod";

const supportEmailSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters long"),
  email: z.email().max(254),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message must be at most 5000 characters long"),
  /** Honeypot. Real submitters leave it empty; see sendSupportEmail. */
  address: z.string().max(200).optional(),
});

export type SupportEmailInput = z.infer<typeof supportEmailSchema>;

export { supportEmailSchema };
