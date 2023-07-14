import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const orgCore = {
  name: z.string({
    required_error: "Name is required",
    invalid_type_error: "Name must be a string",
  }),
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
  id: z.string()
});

const updateRoleSchema = z.object({
  role: z.string()
});

export const { schemas: orgSchemas, $ref: $Sref } = buildJsonSchemas(
  {
    createOrgRequestSchema,
    createOrgResponseSchema,
    idParamRequestSchema,
    updateRoleSchema
  },
  { $id: "orgSchema" }
);
export type CreateOrgInput = z.infer<typeof createOrgRequestSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;