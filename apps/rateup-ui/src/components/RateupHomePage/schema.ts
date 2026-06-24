import z from "zod/v4";

export const partnerApplicationSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),

  workEmail: z.email("Invalid email address"),

  phone: z.string().min(8, "Invalid phone number"),

  companyName: z.string().min(2, "Company name is required"),

  website: z.url("Invalid website URL").optional().or(z.literal("")),

  country: z.string().min(1, "Please select a country"),

  businessType: z.string().min(1, "Please select business type"),

  companySize: z.string().min(1, "Please select company size"),

  yearsInBusiness: z.string().min(1, "Please select years in business"),

  whyPartner: z.string().min(20, "Please enter at least 20 characters"),

  services: z.array(z.string()).min(1, "Select at least one service"),

  referralVolume: z.string().min(1, "Select referral volume"),

  managesClients: z.string().min(1, "Please choose an option"),

  apiExperience: z.string().min(1, "Please choose an option"),

  canOnboard: z.string().min(1, "Please choose an option"),
});
