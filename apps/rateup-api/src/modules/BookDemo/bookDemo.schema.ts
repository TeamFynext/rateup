import { z } from "zod";

const MAX_MESSAGE = 2000;
/** Names, companies, countries and the rest of the short answers. */
const MAX_SHORT = 200;

const createBookDemoInputSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(MAX_SHORT),
  workEmail: z.email("Invalid email address").max(MAX_SHORT),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters long")
    .max(MAX_SHORT),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number seems too long"),
  message: z.string().max(MAX_MESSAGE).optional(),
});

const createPartnerDataInputSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters long").max(MAX_SHORT),
  workEmail: z.email("Invalid email address").max(MAX_SHORT),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number seems too long"),
  companyName: z.string().min(2, "Company name must be at least 2 characters long").max(MAX_SHORT),
  website: z.string().min(1, "Website is required").max(MAX_SHORT),
  country: z.string().min(1, "Country is required").max(MAX_SHORT),
  businessType: z.string().min(1, "Business type is required").max(MAX_SHORT),
  companySize: z.string().min(1, "Company size is required").max(MAX_SHORT),
  yearsInBusiness: z.string().min(1, "Years in business is required").max(MAX_SHORT),
  whyPartner: z.string().min(1, "Why partner is required").max(MAX_MESSAGE),
  services: z
    .array(z.string().max(MAX_SHORT))
    .min(1, "At least one service must be selected")
    .max(50),
  referralVolume: z.string().min(1, "Referral volume is required").max(MAX_SHORT),
  managesClients: z.string().min(1, "Manages clients info is required").max(MAX_SHORT),
  apiExperience: z.string().min(1, "API experience is required").max(MAX_SHORT),
  canOnboard: z.string().min(1, "Can onboard info is required").max(MAX_SHORT),
});

export type CreatePartnerDataInput = z.infer<typeof createPartnerDataInputSchema>;

// Auto-exported after fastify-zod migration
export { createPartnerDataInputSchema };

export type CreateBookDemoInput = z.infer<typeof createBookDemoInputSchema>;

// Auto-exported after fastify-zod migration
export { createBookDemoInputSchema };
