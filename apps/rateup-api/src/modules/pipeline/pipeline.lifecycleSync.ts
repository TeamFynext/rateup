import type { Prisma } from "../../../generated/prisma/client.js";

/** The lifecycle fields a mirrored stage is derived from. */
interface LifecycleShape {
  id: string;
  name: string;
  ordering: number;
  color: string | null;
  isWon: boolean;
}

export function stageDataFromLifecycle(lifecycle: LifecycleShape) {
  return {
    name: lifecycle.name,
    order: lifecycle.ordering,
    color: lifecycle.color,
    isWon: lifecycle.isWon,
    probability: lifecycle.isWon ? 100 : 0,
    rottingDays: 0,
    lifecycleId: lifecycle.id,
  };
}

/** Columns for a brand-new pipeline: one per lifecycle, in lifecycle order. */
export async function stagesForNewPipeline(tx: Prisma.TransactionClient, orgId: string) {
  const lifecycles = await tx.lifecycle.findMany({
    where: { orgId },
    orderBy: { ordering: "asc" },
    select: { id: true, name: true, ordering: true, color: true, isWon: true },
  });

  return lifecycles.map(stageDataFromLifecycle);
}

/** Gives every pipeline in the org a column for a lifecycle that just appeared. */
export async function addStageToOrgPipelines(
  tx: Prisma.TransactionClient,
  orgId: string,
  lifecycle: LifecycleShape,
) {
  const pipelines = await tx.pipeline.findMany({ where: { orgId }, select: { id: true } });
  if (!pipelines.length) return;

  await tx.pipelineStage.createMany({
    data: pipelines.map((pipeline) => ({
      pipelineId: pipeline.id,
      ...stageDataFromLifecycle(lifecycle),
    })),
  });
}

export async function syncStagesWithLifecycle(
  tx: Prisma.TransactionClient,
  lifecycleId: string,
  data: Partial<Pick<LifecycleShape, "name" | "ordering" | "color" | "isWon">>,
) {
  const patch = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.ordering !== undefined && { order: data.ordering }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isWon !== undefined && { isWon: data.isWon, ...(data.isWon && { probability: 100 }) }),
  };

  if (!Object.keys(patch).length) return;

  await tx.pipelineStage.updateMany({ where: { lifecycleId }, data: patch });
}

export async function removeStagesForLifecycle(tx: Prisma.TransactionClient, lifecycleId: string) {
  const stages = await tx.pipelineStage.findMany({
    where: { lifecycleId },
    select: { id: true, _count: { select: { leads: true } } },
  });

  const empty = stages.filter((stage) => stage._count.leads === 0).map((stage) => stage.id);
  if (!empty.length) return;

  await tx.pipelineStage.deleteMany({ where: { id: { in: empty } } });
}
