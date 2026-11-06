import type { PipedrivePipeline } from "@/backend/appsIntegration/pipedrive/pipedrive.api";

type PipedriveStage = PipedrivePipeline["stages"][number];

interface BoardColumn {
  id: string;
  name: string;
  status: "OPEN" | "WON" | "LOST";
}

const normalise = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * A first guess at the mapping when a pipeline is picked, for the admin to review before
 * saving: each open column goes to the Pipedrive stage of the same name. Won and Lost
 * columns are never mapped — they set the deal's status — and a column with no stage of
 * its name is left out, i.e. not synced. Values are stage ids as strings, as the Selects
 * hold them.
 */
export function suggestPipedriveStageMappings(
  columns: readonly BoardColumn[],
  stages: readonly PipedriveStage[],
): Record<string, string> {
  const suggestions: Record<string, string> = {};
  for (const column of columns) {
    if (column.status !== "OPEN") continue;
    const stage = stages.find((candidate) => normalise(candidate.name) === normalise(column.name));
    if (stage) suggestions[column.id] = String(stage.id);
  }
  return suggestions;
}
