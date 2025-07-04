import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { WaAssignedChatPermission } from "../../types/enums";

const orgCore = {
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
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
  role: z.string(),
});

const updateLogoSchema = z.object({
  logo: z
    .string()
    .min(6)
    .refine((value) => value.includes("."), {
      message: "Invalid photo.",
    }),
});

const updateOrgDetailsSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  encryptionKeys: z
    .object({
      publicKey: z.string(),
      privateKey: z.string(),
    })
    .optional(),
  waAssignedChatPermission: z.nativeEnum(WaAssignedChatPermission).optional(),
});
export const byOrgIdParams = z.object({
  orgId: z.string(),
});

export const pauseOrgSchema = z.object({
  isPaused: z.boolean(),
});

export const { schemas: orgSchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createOrgRequestSchema,
    createOrgResponseSchema,
    idParamRequestSchema,
    updateRoleSchema,
    updateLogoSchema,
    byOrgIdParams,
    updateOrgDetailsSchema,
    pauseOrgSchema,
  },
  { $id: "orgSchema" },
);

export type CreateOrgInput = z.infer<typeof createOrgRequestSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateLogoInput = z.infer<typeof updateLogoSchema>;
export type UpdateOrgDetailsInput = z.infer<typeof updateOrgDetailsSchema>;
export type ByOrgIdParams = z.infer<typeof byOrgIdParams>;
export type PauseOrgInput = z.infer<typeof pauseOrgSchema>;
