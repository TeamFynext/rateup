/**
 * Pairing an org's lifecycles with its board columns.
 *
 * Shared by the two tasks that have to read a stored lifecycle reference and work out
 * which column it means: {@link ../mapLifecycleRefsToStages} and
 * {@link ../convertAssignLifecycleActions}.
 *
 * Matching is by **name**, because `seedPipelines` copies lifecycle names onto columns
 * verbatim. There is no foreign key from a stored mapping to a lifecycle — these live in
 * JSON — so a name is often the only thing left that still resolves.
 */

/** A resolved column for one lifecycle, keyed by lifecycle id. */
export type StageLookup = Map<string, { stageId: string; stageName: string }>;

/** One row of a stored lifecycle→stage mapping, as it sits in JSON. */
export interface StoredMapping {
  lifecycleId?: string;
  lifecycleName?: string;
  stageId?: string;
  stageName?: string;
  [key: string]: unknown;
}

/**
 * Pairs an org's lifecycles with its board columns by name.
 *
 * Keyed by lower-cased name as well as by id, so a mapping whose `lifecycleId` points at
 * a lifecycle that has since been deleted can still be resolved from the name stored
 * alongside it — dangling ids are common here, because nothing enforces them.
 */
export function buildStageLookup(
  lifecycles: { id: string; name: string }[],
  stages: { id: string; name: string }[],
) {
  const stageByName = new Map(stages.map((stage) => [stage.name.trim().toLowerCase(), stage]));

  const byId: StageLookup = new Map();
  const byName: StageLookup = new Map();

  for (const lifecycle of lifecycles) {
    const key = lifecycle.name.trim().toLowerCase();
    const stage = stageByName.get(key);
    if (!stage) continue;
    const hit = { stageId: stage.id, stageName: stage.name };
    byId.set(lifecycle.id, hit);
    byName.set(key, hit);
  }

  return { byId, byName };
}

/** One stored reference resolved, or null when it cannot be. */
export function resolveStage(
  lookup: { byId: StageLookup; byName: StageLookup },
  lifecycleId?: string | null,
  lifecycleName?: string | null,
) {
  if (lifecycleId) {
    const hit = lookup.byId.get(lifecycleId);
    if (hit) return hit;
  }
  // The id is dangling — the lifecycle was deleted after the mapping was saved. The name
  // stored next to it is the only thing left to go on.
  if (lifecycleName) {
    const hit = lookup.byName.get(lifecycleName.trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}
