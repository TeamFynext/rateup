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

const createPartnerDataInputSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long"),
  workEmail: z.email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number seems too long"),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters long"),
  website: z.string().min(1, "Website is required"),
  country: z.string().min(1, "Country is required"),
  businessType: z.string().min(1, "Business type is required"),
  companySize: z.string().min(1, "Company size is required"),
  yearsInBusiness: z.string().min(1, "Years in business is required"),
  whyPartner: z.string().min(1, "Why partner is required"),
  services: z.array(z.string()).min(1, "At least one service must be selected"),
  referralVolume: z.string().min(1, "Referral volume is required"),
  managesClients: z.string().min(1, "Manages clients info is required"),
  apiExperience: z.string().min(1, "API experience is required"),
  canOnboard: z.string().min(1, "Can onboard info is required"),
});

export type CreatePartnerDataInput = z.infer<
  typeof createPartnerDataInputSchema
>;

// Auto-exported after fastify-zod migration
export { createPartnerDataInputSchema };

export type CreateBookDemoInput = z.infer<typeof createBookDemoInputSchema>;

// Auto-exported after fastify-zod migration
export { createBookDemoInputSchema };
