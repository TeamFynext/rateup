import { z } from "zod";
import { TeamFeature } from "../../../generated/prisma/client.js";

const teamFeatureEnum = z.enum(TeamFeature);

const teamCore = {
  name: z.string(),
  code: z
    .string()
    .min(2, "Team Code should be at least 2 characters long")
    .regex(/^[A-Za-z0-9-]+$/, {
      error: "Team Code can contain only alphabets, numbers, and hyphens",
    })
    .optional(),
  orgId: z.string(),
  userId: z.string(),
  color: z.string().optional(),
  features: z.array(teamFeatureEnum).optional(),
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
});

const deleteTeamByIdRequestSchema = z.object({
  id: z.string(),
});

export enum InviteType {
  ORG = "ORG",
  TEAM = "TEAM",
}

const inviteMemberRequestSchema = z.object({
  orgId: z.string(),
  teamId: z.string(),
  invitedBy: z.string(),
  type: z.enum(InviteType),
  email: z.string(),
  name: z.string(),
});

const inviteMemberRequestResponse = z.object({
  id: z.string().optional(),
  existing: z.boolean().optional(),
});

const deleteTeamMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

const addTeamMemberSchema = z.object({
  teamIds: z.array(z.string()),
  userEmail: z.string(),
});

const inviteCompleteRequestSchema = z.object({
  token: z.string(),
});

const editTeamSchema = z.object({
  name: z.string().min(4).optional(),
  code: z
    .string()
    .min(2, "Team Code should be at least 2 characters long")
    .regex(/^[A-Za-z0-9-]+$/, {
      error: "Team Code can contain only alphabets, numbers, and hyphens",
    })
    .optional(),
  googleLink: z.string().optional(),
  reviewPageLinks: z.any().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().optional(),
});

const idParamRequestSchema = z.object({
  id: z.string(),
});

// Could be used by other modules which are related to team
const byTeamIdParamsSchema = z.object({
  teamId: z.string(),
});
const bySurveyTeamMapIdParamsSchema = z.object({
  surveyTeamMapId: z.string(),
});

const tagQuerySchema = z.object({
  onlytag: z.boolean(),
});

const setTeamFeaturesSchema = z.object({
  features: z.array(teamFeatureEnum),
});

const teamFeatureAccessItemSchema = z.object({
  id: z.string(),
  feature: teamFeatureEnum,
  createdAt: z.string().or(z.date()),
});

const getTeamFeaturesResponseSchema = z.object({
  features: z.array(teamFeatureAccessItemSchema),
});

// `allChannels: true` means every channel in the org, including ones connected later, so
// `channelIds` is ignored in that case rather than being frozen to today's channel list.
const setTeamChannelsSchema = z.object({
  allChannels: z.boolean(),
  channelIds: z.array(z.string()).default([]),
});

const teamChannelItemSchema = z.object({
  id: z.string(),
  phone: z.string().nullable().optional(),
  phoneId: z.string().nullable().optional(),
  ibaId: z.string().nullable().optional(),
  fbPageId: z.string().nullable().optional(),
  phoneDisplayName: z.string().nullable().optional(),
  status: z.string().optional(),
});

const getTeamChannelsResponseSchema = z.object({
  allChannels: z.boolean(),
  channels: z.array(teamChannelItemSchema),
});

export type CreateTeamInput = z.infer<typeof createTeamRequestSchema>;
export type GetTeamsByOrgInput = z.infer<typeof getTeamsByOrgRequestSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamByIdRequestSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberRequestSchema>;
export type GetTeamMembersInput = z.infer<typeof getTeamMembersRequestSchema>;
export type InviteCompleteInput = z.infer<typeof inviteCompleteRequestSchema>;
export type EditTeamInput = z.infer<typeof editTeamSchema>;
export type IdParamInput = z.infer<typeof idParamRequestSchema>;
export type ByTeamIdParams = z.infer<typeof byTeamIdParamsSchema>;
export type tagQuerySchema = z.infer<typeof tagQuerySchema>;
export type BySurveyTeamMapIdParams = z.infer<typeof bySurveyTeamMapIdParamsSchema>;
export type SetTeamFeaturesInput = z.infer<typeof setTeamFeaturesSchema>;
export type SetTeamChannelsInput = z.infer<typeof setTeamChannelsSchema>;

// Auto-exported after fastify-zod migration
export {
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
  byTeamIdParamsSchema,
  bySurveyTeamMapIdParamsSchema,
  deleteTeamMemberSchema,
  addTeamMemberSchema,
  setTeamFeaturesSchema,
  getTeamFeaturesResponseSchema,
  setTeamChannelsSchema,
  getTeamChannelsResponseSchema,
};
