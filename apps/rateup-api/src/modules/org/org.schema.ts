import { buildJsonSchemas } from "fastify-zod";
import { type } from "os";
import { z } from "zod";

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
  name: z.string(),
  phone: z.string().min(8).max(15).optional(),
  address: z.string().optional(),
});
const byOrgIdParams = z.object({
  orgId: z.string(),
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
  },
  { $id: "orgSchema" }
);

export type CreateOrgInput = z.infer<typeof createOrgRequestSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateLogoInput = z.infer<typeof updateLogoSchema>;
export type UpdateOrgDetailsInput = z.infer<typeof updateOrgDetailsSchema>;
export type ByOrgIdParams = z.infer<typeof byOrgIdParams>;
