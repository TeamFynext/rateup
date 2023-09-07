import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";

const teamCore = {
  name: z.string(),
  code: z.string(),
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
    code: z.string(),
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

const getTeamMembersRequestSchema = z.object({
  teamId: z.string(),
  whatsappAccessToken: z.any(),
});

const deleteTeamByIdRequestSchema = z.object({
  id: z.string(),
});

enum InviteType {
  ORG = 'ORG',
  TEAM = 'TEAM',
}

const inviteMemberRequestSchema = z.object({
  orgId: z.string(),
  teamId: z.string(),
  invitedBy: z.string(),
  type: z.nativeEnum(InviteType),
  email: z.string(),
  name: z.string(),
})

const inviteMemberRequestResponse = z.object({
   id: z.string(),
});


const inviteCompleteRequestSchema = z.object({
   token: z.string(),
});

const editTeamSchema = z.object({
  name: z.string().min(4),
  code: z.string().min(2),
  googleLink: z.string().min(10),
  whatsappAccessToken: z.any(),
});

const idParamRequestSchema = z.object({
  id: z.string()
});

// Could be used by other modules which are related to team
const byTeamIdParamsSchema = z.object({
  teamId: z.string()
})


export const { schemas: teamSchemas, $ref: $Tref } = buildJsonSchemas(
  {
    createTeamRequestSchema,
    createTeamResponseSchema,
    getTeamsByOrgRequestSchema,
    deleteTeamByIdRequestSchema,
    inviteMemberRequestSchema,
    inviteMemberRequestResponse,
    getTeamMembersRequestSchema,
    inviteCompleteRequestSchema,
    editTeamSchema,
    idParamRequestSchema,
    byTeamIdParamsSchema
  },
  { $id: "teamSchema" }
);

export type CreateTeamInput = z.infer<typeof createTeamRequestSchema>;
export type GetTeamsByOrgInput = z.infer<typeof getTeamsByOrgRequestSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamByIdRequestSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberRequestSchema>;
export type GetTeamMembersInput = z.infer<typeof getTeamMembersRequestSchema>;
export type InviteCompleteInput = z.infer<typeof inviteCompleteRequestSchema>;
export type EditTeamInput = z.infer<typeof editTeamSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type ByTeamIdParams = z.infer<typeof byTeamIdParamsSchema>;





