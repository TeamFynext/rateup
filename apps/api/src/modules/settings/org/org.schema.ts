import { Role } from "../../../generated/prisma/client.js";
import { PERMISSIONS } from "../../../authz/permissions.js";
import { ROLE_KEYS } from "../../../authz/roles.js";
import { z } from "zod";
import { WaAssignedChatPermission } from "../../../types/enums.js";
import { ORG_MODULES } from "./modules.js";

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

/** Either spelling of the target role; `roleKey` (src/authz/roles.ts) is the one clients move to. */
const updateRoleSchema = z
  .object({
    role: z.enum(Role).optional(),
    roleKey: z.enum(ROLE_KEYS).optional(),
  })
  .refine((body) => body.role !== undefined || body.roleKey !== undefined, {
    message: "Role is required",
  });

/** Hand-picked additions to and removals from a member's role. */
export const memberPermissionsSchema = z.object({
  grants: z.array(z.enum(PERMISSIONS)).default([]),
  denies: z.array(z.enum(PERMISSIONS)).default([]),
});
export type MemberPermissionsInput = z.infer<typeof memberPermissionsSchema>;

export const orgModulesSchema = z.object({
  hiddenModules: z.array(z.enum(ORG_MODULES)).max(ORG_MODULES.length),
});
export type OrgModulesInput = z.infer<typeof orgModulesSchema>;

export const memberActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type MemberActivityQuery = z.infer<typeof memberActivityQuerySchema>;

export const transferOwnershipSchema = z.object({
  userId: z.string().uuid(),
});
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

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
  // The platform setup checklist (`/login/setup`). Loyalty program setup is deliberately
  // absent: it is tracked on `LoyaltyProgram.onboardingStep` by the guided wizard.
  onboardingChecklist: z
    .object({
      features: z.boolean().optional(),
      api: z.boolean().optional(),
      verify: z.boolean().optional(),
      payment: z.boolean().optional(),
      instagram: z.boolean().optional(),
      messenger: z.boolean().optional(),
      invite: z.boolean().optional(),
      hours: z.boolean().optional(),
      auto: z.boolean().optional(),
      points: z.boolean().optional(),
      tiers: z.boolean().optional(),
      rewards: z.boolean().optional(),
      referral: z.boolean().optional(),
      cmds: z.boolean().optional(),
      loyaltyauto: z.boolean().optional(),
      // Steps the org has waved off in the setup guide. Nested here rather than in
      // its own column: `onboardingChecklist` is already a JSON field.
      skipped: z
        .object({
          features: z.boolean().optional(),
          instagram: z.boolean().optional(),
          messenger: z.boolean().optional(),
          invite: z.boolean().optional(),
          hours: z.boolean().optional(),
          auto: z.boolean().optional(),
          points: z.boolean().optional(),
          cmds: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});
/**
 * `PUT /org/completeorgdetails`: the signup questionnaire, merged into the `Org.onboarding`
 * JSON column. Keys not listed here are dropped, so a new questionnaire field must be added
 * here too. `integration` is the list of channels picked (older clients sent one string).
 */
const completeOrgDetailsSchema = z.object({
  onboarding: z
    .object({
      services: z.array(z.string().trim().max(100)).max(50).optional(),
      industry: z.string().trim().max(200).optional(),
      template: z.string().trim().max(200).optional(),
      integration: z
        .union([z.string().trim().max(200), z.array(z.string().trim().max(100)).max(50)])
        .optional(),
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
export type CompleteOrgDetailsInput = z.infer<typeof completeOrgDetailsSchema>;

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
  completeOrgDetailsSchema,
};

/** The business step that follows signup (rateup-ui `/signup/business`). */
export const businessProfileSchema = z.object({
  orgName: z.string().trim().min(2).max(120),
  phoneNumber: z.string().trim().max(32).optional(),
  website: z.string().trim().max(300).optional(),
  industry: z.string().trim().max(80).optional(),
  teamSize: z.string().trim().max(20).optional(),
  goals: z.array(z.string().max(60)).max(20).default([]),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
