import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const teamCore = {
  name: z.string(),
  orgId: z.string(),
  userId: z.string(),
};

const createTeamRequestSchema = z.object({
  ...teamCore,
});

const createTeamResponseSchema = z.object({
  team: z.object({
    id: z.string(),
    name: z.string(),
  }),
  teamMember: z.object({
    id: z.string(),
    teamId: z.string(),
    userId: z.string(),
  }),
});

const getTeamsByOrgRequestSchema = z.object({
  orgId: z.string(),
});

const deleteTeamByIdRequestSchema = z.object({
  id: z.string(),
});

export const { schemas: teamSchemas, $ref: $Tref } = buildJsonSchemas(
  {
    createTeamRequestSchema,
    createTeamResponseSchema,
    getTeamsByOrgRequestSchema,
    deleteTeamByIdRequestSchema,
  },
  { $id: "teamSchema" }
);
export type CreateTeamInput = z.infer<typeof createTeamRequestSchema>;
export type GetTeamsByOrgInput = z.infer<typeof getTeamsByOrgRequestSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamByIdRequestSchema>;
