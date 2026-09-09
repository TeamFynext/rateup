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

/**
 * The funnel a new board starts with.
 *
 * A board is the org's own, so these are a starting point rather than a rule —
 * every field is editable in pipeline settings. Won and Lost are ordinary
 * columns carrying a closing status, which is what lets a lead be dragged into
 * either one instead of needing a separate drop zone.
 */
export const DEFAULT_STAGES = [
  {
    name: "New Lead",
    short: "New",
    probability: 10,
    rottingDays: 3,
    status: "OPEN",
    color: "#16A34A",
  },
  {
    name: "Contacted",
    short: "Contacted",
    probability: 25,
    rottingDays: 4,
    status: "OPEN",
    color: "#3FA46A",
  },
  {
    name: "Qualified",
    short: "Qualified",
    probability: 45,
    rottingDays: 5,
    status: "OPEN",
    color: "#FFB638",
  },
  {
    name: "Demo / Proposal",
    short: "Proposal",
    probability: 65,
    rottingDays: 7,
    status: "OPEN",
    color: "#F8951D",
  },
  {
    name: "Negotiation",
    short: "Negotiation",
    probability: 80,
    rottingDays: 5,
    status: "OPEN",
    color: "#D97A0F",
  },
  { name: "Won", short: "Won", probability: 100, rottingDays: 0, status: "WON", color: "#1C518E" },
  { name: "Lost", short: "Lost", probability: 0, rottingDays: 0, status: "LOST", color: "#666864" },
] as const;

export const DEFAULT_LOST_REASONS = [
  "Price too high",
  "No response",
  "Chose a competitor",
  "Not the right fit",
  "Timing — revisit later",
];

export class TeamAccessError extends Error {
  constructor(public readonly teamIds: string[]) {
    super("You can only attach teams you belong to");
    this.name = "TeamAccessError";
  }
}

/** One board per org while the feature beds in. Lift by raising this. */
export const PIPELINE_LIMIT_PER_ORG = 1;

export class PipelineLimitError extends Error {
  constructor(public readonly limit: number) {
    super(
      limit === 1
        ? "Your organisation already has a pipeline"
        : `Your organisation already has ${limit} pipelines`,
    );
    this.name = "PipelineLimitError";
  }
}

async function assertTeamsAreTheCallers(teamIds: string[], userId: string) {
  if (!teamIds.length) throw new TeamAccessError([]);
  const memberships = await prisma.teamMember.findMany({
    where: { userId, teamId: { in: teamIds } },
    select: { teamId: true },
  });
  const allowed = new Set(memberships.map((m) => m.teamId));
  const foreign = teamIds.filter((id) => !allowed.has(id));
  if (foreign.length) throw new TeamAccessError(foreign);
}

/** Teams the user belongs to — the scope every pipeline read is filtered by. */
async function teamIdsForUser(userId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
}

export async function isPipelineMember(pipelineId: string, userId: string) {
  const match = await prisma.pipelineTeam.findFirst({
    where: { pipelineId, team: { members: { some: { userId } } } },
    select: { pipelineId: true },
  });
  return Boolean(match);
}

export async function createPipeline(
  data: CreatePipelineRequestSchema & { orgId: string; userId: string },
) {
  await assertTeamsAreTheCallers(data.teamIds, data.userId);

  return prisma.$transaction(async (tx) => {
    // Checked inside the transaction so a slow create cannot be raced past a
    // check made before it, though two simultaneous requests can still both
    // pass under read-committed. A unique index is the real guarantee, and is
    // deliberately not added: this is a temporary product limit, not a rule
    // about the data.
    const existing = await tx.pipeline.count({ where: { orgId: data.orgId } });
    if (existing >= PIPELINE_LIMIT_PER_ORG) {
      throw new PipelineLimitError(PIPELINE_LIMIT_PER_ORG);
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
        order: last ? last.order + 1 : 0,
        orgId: data.orgId,
        teams: {
          createMany: {
            skipDuplicates: true,
            data: data.teamIds.map((teamId) => ({ teamId })),
          },
        },
        stages: { create: DEFAULT_STAGES.map((stage, order) => ({ ...stage, order })) },
        lostReasons: {
          create: DEFAULT_LOST_REASONS.map((label, order) => ({ label, order })),
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  });
}

export async function getPipelines(userId: string, orgId: string) {
  const teamIds = await teamIdsForUser(userId);
  if (!teamIds.length) return [];

  const pipelines = await prisma.pipeline.findMany({
    where: { orgId, teams: { some: { teamId: { in: teamIds } } } },
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

export async function updatePipeline(
  id: string,
  data: UpdatePipelineRequestSchema,
  userId: string,
) {
  if (data.teamIds !== undefined) {
    const current = await prisma.pipelineTeam.findMany({
      where: { pipelineId: id },
      select: { teamId: true },
    });
    const existing = new Set(current.map((row) => row.teamId));
    const added = data.teamIds.filter((teamId) => !existing.has(teamId));
    if (added.length) await assertTeamsAreTheCallers(added, userId);
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
