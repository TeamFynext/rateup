import prisma from "../../../utils/prisma.js";
import type { CreateStageRequestSchema, UpdateStageRequestSchema } from "./stage.schema.js";

/** A stage still holding leads cannot be deleted without somewhere to put them. */
export class StageNotEmptyError extends Error {
  constructor(public readonly leadCount: number) {
    super("Choose a stage to move this stage's leads into before deleting it");
    this.name = "StageNotEmptyError";
  }
}

export async function createStage(data: CreateStageRequestSchema) {
  const last = await prisma.pipelineStage.findFirst({
    where: { pipelineId: data.pipelineId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.pipelineStage.create({
    data: {
      pipelineId: data.pipelineId,
      name: data.name,
      short: data.short,
      color: data.color,
      probability: data.probability ?? 0,
      rottingDays: data.rottingDays ?? 0,
      status: data.status ?? "OPEN",
      order: last ? last.order + 1 : 0,
    },
  });
}

export async function updateStage(id: string, data: UpdateStageRequestSchema) {
  return prisma.pipelineStage.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.short !== undefined && { short: data.short }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.probability !== undefined && { probability: data.probability }),
      ...(data.rottingDays !== undefined && { rottingDays: data.rottingDays }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

/**
 * Removes a column, relocating whatever it holds.
 *
 * The relocation is a bulk `updateMany` rather than a loop through `moveLead`,
 * so it reaches none of the stage-change listeners: the CRMs keep whatever
 * status they last heard, and no timeline entry is written. That is deliberate.
 * Neither Zoho nor GetLead has a bulk status endpoint, so syncing this would be
 * one API call per lead — a burst against a per-plan rate limit, on a path where
 * nobody is waiting to watch it happen.
 *
 * `DeleteStageDialog` says so before the fact, to any org with a CRM connected;
 * moving a lead again on the board is what re-syncs it.
 */
export async function deleteStage(id: string, moveLeadsToStageId?: string) {
  const leadCount = await prisma.lead.count({ where: { stageId: id } });

  if (leadCount > 0 && !moveLeadsToStageId) {
    throw new StageNotEmptyError(leadCount);
  }

  return prisma.$transaction(async (tx) => {
    if (leadCount > 0 && moveLeadsToStageId) {
      await tx.lead.updateMany({
        where: { stageId: id },
        data: { stageId: moveLeadsToStageId, stageEnteredAt: new Date() },
      });
    }
    return tx.pipelineStage.delete({ where: { id } });
  });
}

export async function reorderStages(
  pipelineId: string,
  stages: Array<{ id: string; order: number }>,
) {
  return prisma.$transaction(
    stages.map((stage) =>
      prisma.pipelineStage.update({
        where: { id: stage.id, pipelineId },
        data: { order: stage.order },
      }),
    ),
  );
}

export async function getPipelineIdByStageId(stageId: string) {
  const stage = await prisma.pipelineStage.findUnique({
    where: { id: stageId },
    select: { pipelineId: true },
  });
  return stage?.pipelineId;
}
