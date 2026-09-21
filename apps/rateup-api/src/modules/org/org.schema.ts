import { Role } from "../../../generated/prisma/client.js";
import { PERMISSIONS } from "../../authz/permissions.js";
import { ROLE_KEYS } from "../../authz/roles.js";
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
