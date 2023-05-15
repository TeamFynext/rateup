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
    })
});


export const { schemas: teamSchemas, $ref: $Tref } = buildJsonSchemas(
    {
        createTeamRequestSchema,
        createTeamResponseSchema,
    },
    { $id: "teamSchema" }
  );
  export type CreateTeamInput = z.infer<typeof createTeamRequestSchema>;
