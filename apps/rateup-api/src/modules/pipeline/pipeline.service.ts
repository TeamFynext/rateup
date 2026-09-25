import { Prisma } from "../../../generated/prisma/client.js";
import type { Actor } from "../../authz/actor.js";
import { pipelineInScope } from "../../authz/resourceScope.js";
import { inScope } from "../../authz/scope.js";
import prisma from "../../utils/prisma.js";
import type {
  CreateLabelRequestSchema,
  CreateLostReasonRequestSchema,
  CreatePipelineRequestSchema,
  UpdateLabelRequestSchema,
  UpdateLostReasonRequestSchema,
  UpdatePipelineRequestSchema,
  UpdateTeamDefaultRequestSchema,
} from "./pipeline.schema.js";
import { LEADS_PIPELINE_TYPE, OTHER_PIPELINE_LIMIT, PIPELINE_TYPE_SEEDS } from "./pipelineTypes.js";

export class TeamAccessError extends Error {
  constructor(public readonly teamIds: string[]) {
    super("You can only attach teams you belong to");
    this.name = "TeamAccessError";
  }
}

export class PipelineLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`Your organisation already has ${limit} boards besides its Leads pipeline`);
    this.name = "PipelineLimitError";
  }
}

export class LeadsPipelineExistsError extends Error {
  constructor() {
    super("Your organisation already has a Leads pipeline");
    this.name = "LeadsPipelineExistsError";
  }
}

function assertTeamsInScope(teamIds: string[], actor: Actor) {
  if (!teamIds.length) throw new TeamAccessError([]);
  const foreign = teamIds.filter((id) => !inScope(actor, id));
  if (foreign.length) throw new TeamAccessError(foreign);
}

/** A board is reachable when one of its teams is in the actor's scope. */
export async function isPipelineAccessible(pipelineId: string, actor: Actor | undefined) {
  if (!actor) return false;
  return pipelineInScope(pipelineId, actor);
}

export async function createPipeline(
  data: CreatePipelineRequestSchema & { orgId: string; userId: string; actor: Actor },
) {
  assertTeamsInScope(data.teamIds, data.actor);

  const type = data.type ?? LEADS_PIPELINE_TYPE;
  const seed = PIPELINE_TYPE_SEEDS[type];

  try {
    return await prisma.$transaction(async (tx) => {
      // The Leads count is a courtesy check; `pipeline_one_leads_per_org` is the guarantee
      // (caught below). The cap on the others is a product limit, so a race past it is fine.
      if (type === LEADS_PIPELINE_TYPE) {
        const leads = await tx.pipeline.count({ where: { orgId: data.orgId, type } });
        if (leads > 0) throw new LeadsPipelineExistsError();
      } else {
        const others = await tx.pipeline.count({
          where: { orgId: data.orgId, type: { not: LEADS_PIPELINE_TYPE } },
        });
        if (others >= OTHER_PIPELINE_LIMIT) throw new PipelineLimitError(OTHER_PIPELINE_LIMIT);
      }

      const last = await tx.pipeline.findFirst({
        where: { orgId: data.orgId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      return tx.pipeline.create({
        data: {
          name: data.name,
          description: data.description,
          type,
          order: last ? last.order + 1 : 0,
          orgId: data.orgId,
          teams: {
            createMany: {
              skipDuplicates: true,
              data: data.teamIds.map((teamId) => ({ teamId })),
            },
          },
          stages: { create: seed.stages.map((stage, order) => ({ ...stage, order })) },
          lostReasons: { create: seed.lostReasons.map((label, order) => ({ label, order })) },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    });
  } catch (error) {
    if (isLeadsIndexViolation(error)) throw new LeadsPipelineExistsError();
    throw error;
  }
}

/** A P2002 from `pipeline_one_leads_per_org`, as opposed to the `(orgId, name)` unique. */
function isLeadsIndexViolation(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  return JSON.stringify(error.meta ?? {}).includes("pipeline_one_leads_per_org");
}

export async function getPipelines(actor: Actor, orgId: string) {
  if (!actor.scope.all && actor.scope.teamIds.length === 0) return [];

  const pipelines = await prisma.pipeline.findMany({
    where: {
      orgId,
      ...(actor.scope.all ? {} : { teams: { some: { teamId: { in: [...actor.scope.teamIds] } } } }),
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      teams: { select: { teamId: true } },
      _count: { select: { leads: { where: { status: "OPEN" } } } },
    },
  });

  return pipelines.map(({ _count, ...pipeline }) => ({
    ...pipeline,
    teamIds: pipeline.teams.map((t) => t.teamId),
    openLeadCount: _count.leads,
  }));
}

export async function getPipelineById(id: string) {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: {
      teams: { select: { teamId: true } },
      stages: {
        orderBy: { order: "asc" },
        include: { _count: { select: { leads: { where: { status: "OPEN" } } } } },
      },
      lostReasons: {
        orderBy: { order: "asc" },
        include: { _count: { select: { leads: true } } },
      },
      labels: { orderBy: { name: "asc" } },
    },
  });

  if (!pipeline) return null;

  return {
    ...pipeline,
    teamIds: pipeline.teams.map((t) => t.teamId),
    stages: pipeline.stages.map(({ _count, ...stage }) => ({
      ...stage,
      openLeadCount: _count.leads,
    })),
    lostReasons: pipeline.lostReasons.map(({ _count, ...reason }) => ({
      ...reason,
      leadCount: _count.leads,
    })),
  };
}

export async function updatePipeline(id: string, data: UpdatePipelineRequestSchema, actor: Actor) {
  if (data.teamIds !== undefined) {
    const current = await prisma.pipelineTeam.findMany({
      where: { pipelineId: id },
      select: { teamId: true },
    });
    const existing = new Set(current.map((row) => row.teamId));
    const added = data.teamIds.filter((teamId) => !existing.has(teamId));
    if (added.length) assertTeamsInScope(added, actor);
  }

  return prisma.$transaction(async (tx) => {
    const pipeline = await tx.pipeline.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rottingEnabled !== undefined && { rottingEnabled: data.rottingEnabled }),
        ...(data.autoAssignEnabled !== undefined && { autoAssignEnabled: data.autoAssignEnabled }),
        ...(data.nudgeEnabled !== undefined && { nudgeEnabled: data.nudgeEnabled }),
        ...(data.teamIds !== undefined && {
          teams: {
            deleteMany: {},
            createMany: {
              skipDuplicates: true,
              data: data.teamIds.map((teamId) => ({ teamId })),
            },
          },
        }),
      },
    });

    if (data.teamIds !== undefined) {
      await tx.team.updateMany({
        where: { defaultPipelineId: id, id: { notIn: data.teamIds } },
        data: { defaultPipelineId: null, autoCreateLeads: false },
      });
    }

    return pipeline;
  });
}

export async function deletePipeline(id: string) {
  return prisma.pipeline.delete({ where: { id } });
}

/**
 * Everyone on the pipeline's teams — the assignee picker and the assignee filters.
 *
 * Deleting a user only soft-deletes them (`active: false`, `deletedAt` set) and
 * leaves their `TeamMember` rows in place, so both flags are checked here or the
 * header's avatar strip keeps offering people who are gone.
 */
export async function getPipelineMembers(pipelineId: string) {
  return prisma.$queryRaw<Array<{ id: string; name: string | null; profilePhoto: string | null }>>`
    SELECT DISTINCT u.id, u.name, u."profilePhoto"
    FROM "User" u
    INNER JOIN "TeamMember" tm ON u.id = tm."userId"
    INNER JOIN "PipelineTeam" pt ON tm."teamId" = pt."teamId"
    WHERE pt."pipelineId" = ${pipelineId}::uuid
      AND u.active = true
      AND u."deletedAt" IS NULL;
  `;
}

// ------------------------------------------------------------- team defaults

export async function getTeamPipelineDefaults(orgId: string) {
  return prisma.team.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      defaultPipelineId: true,
      autoCreateLeads: true,
    },
  });
}

export async function updateTeamPipelineDefault(
  teamId: string,
  orgId: string,
  data: UpdateTeamDefaultRequestSchema,
) {
  const clearing = data.defaultPipelineId === null;

  return prisma.team.update({
    where: { id: teamId, orgId },
    data: {
      ...(data.defaultPipelineId !== undefined && { defaultPipelineId: data.defaultPipelineId }),
      ...(clearing
        ? { autoCreateLeads: false }
        : data.autoCreateLeads !== undefined && { autoCreateLeads: data.autoCreateLeads }),
    },
    select: {
      id: true,
      name: true,
      color: true,
      defaultPipelineId: true,
      autoCreateLeads: true,
    },
  });
}

// ---------------------------------------------------------------- lost reasons

export async function createLostReason(pipelineId: string, data: CreateLostReasonRequestSchema) {
  const last = await prisma.pipelineLostReason.findFirst({
    where: { pipelineId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.pipelineLostReason.create({
    data: { pipelineId, label: data.label, order: last ? last.order + 1 : 0 },
  });
}

export async function updateLostReason(id: string, data: UpdateLostReasonRequestSchema) {
  return prisma.pipelineLostReason.update({
    where: { id },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
}

export async function deleteLostReason(id: string) {
  return prisma.pipelineLostReason.delete({ where: { id } });
}

export async function getPipelineIdByLostReasonId(id: string) {
  const reason = await prisma.pipelineLostReason.findUnique({
    where: { id },
    select: { pipelineId: true },
  });
  return reason?.pipelineId;
}

// ---------------------------------------------------------------------- labels

export async function createLabel(pipelineId: string, data: CreateLabelRequestSchema) {
  return prisma.pipelineLabel.create({
    data: { pipelineId, name: data.name, color: data.color },
  });
}

export async function updateLabel(id: string, data: UpdateLabelRequestSchema) {
  return prisma.pipelineLabel.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });
}

export async function deleteLabel(id: string) {
  return prisma.pipelineLabel.delete({ where: { id } });
}

export async function getPipelineIdByLabelId(id: string) {
  const label = await prisma.pipelineLabel.findUnique({
    where: { id },
    select: { pipelineId: true },
  });
  return label?.pipelineId;
}
