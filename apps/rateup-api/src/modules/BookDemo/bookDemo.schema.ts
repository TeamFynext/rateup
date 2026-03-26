import { z } from "zod";

const createBookDemoInputSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters long"),
  lastName: z.string().min(2, "Last name must be at least 2 characters long"),
  workEmail: z.email("Invalid email address"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number seems too long"),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters long"),
  teamSize: z.string().min(1, "Team size is required"),
  preferredTime: z.string().min(1, "Preferred time is required"),
  primaryUseCase: z.string().min(1, "Primary use case is required"),
  additionalInfo: z.string().optional(),
});

export type CreateBookDemoInput = z.infer<typeof createBookDemoInputSchema>;

// Auto-exported after fastify-zod migration
export { createBookDemoInputSchema };
