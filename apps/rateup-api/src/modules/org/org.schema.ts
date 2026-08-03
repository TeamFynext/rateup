import { z } from "zod";
import { WaAssignedChatPermission } from "../../types/enums.js";

const orgCore = {
  name: z
    .string({
      error: (issue) => (issue.input === undefined ? "Name is required" : "Name must be a string"),
    })
    .nonempty("Name cannot be empty"),
  owner: z.string(),
};
const createOrgRequestSchema = z.object({
  ...orgCore,
});
const createOrgResponseSchema = z.object({
  ...orgCore,
  id: z.string(),
});

const idParamRequestSchema = z.object({
  id: z.string(),
});

const updateRoleSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MEMBER"]),
});

const updateLogoSchema = z.object({
  logo: z
    .string()
    .min(6)
    .refine((value) => value.includes("."), {
      error: "Invalid photo.",
    }),
});

const updateOrgDetailsSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  businessmail: z.string().optional(),
  website: z.string().optional(),
  location: z.string().optional(),
  encryptionKeys: z
    .object({
      publicKey: z.string(),
      privateKey: z.string(),
    })
    .optional(),
  waAssignedChatPermission: z.enum(WaAssignedChatPermission).optional(),
  showLifecycle: z.boolean().optional(),
  isConversionApiActive: z.boolean().optional(),
  onboardingChecklistCompleted: z.boolean().optional(),
  onboardingChecklist: z
    .object({
      api: z.boolean().optional(),
      verify: z.boolean().optional(),
      payment: z.boolean().optional(),
      invite: z.boolean().optional(),
      auto: z.boolean().optional(),
      points: z.boolean().optional(),
      tiers: z.boolean().optional(),
      rewards: z.boolean().optional(),
      referral: z.boolean().optional(),
      cmds: z.boolean().optional(),
      loyaltyauto: z.boolean().optional(),
    })
    .optional(),
});
const byOrgIdParams = z.object({
  orgId: z.string(),
});

const pauseOrgSchema = z.object({
  isPaused: z.boolean(),
});

export type CreateOrgInput = z.infer<typeof createOrgRequestSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateLogoInput = z.infer<typeof updateLogoSchema>;
export type UpdateOrgDetailsInput = z.infer<typeof updateOrgDetailsSchema>;
export type ByOrgIdParams = z.infer<typeof byOrgIdParams>;
export type PauseOrgInput = z.infer<typeof pauseOrgSchema>;

// Auto-exported after fastify-zod migration
export {
  createOrgRequestSchema,
  createOrgResponseSchema,
  idParamRequestSchema,
  updateRoleSchema,
  updateLogoSchema,
  byOrgIdParams,
  updateOrgDetailsSchema,
  pauseOrgSchema,
};
