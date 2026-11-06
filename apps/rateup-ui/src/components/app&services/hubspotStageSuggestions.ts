import type { HubSpotPipeline } from "@/backend/appsIntegration/hubspot/hubspot.api";

type HubSpotStage = HubSpotPipeline["stages"][number];

interface BoardColumn {
  id: string;
  name: string;
  status: "OPEN" | "WON" | "LOST";
}

const isClosed = (stage: HubSpotStage) => stage.metadata?.isClosed === "true";
const probability = (stage: HubSpotStage) => Number(stage.metadata?.probability ?? NaN);
const normalise = (label: string) => label.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * A first guess at the mapping when a pipeline is picked, for the admin to review
 * before saving: Won and Lost columns go to HubSpot's closed-won and closed-lost
 * stages (closed, at probability 1 and 0), open columns to an open stage of the
 * same name. A column with no likely stage is left out, i.e. unmapped.
 */
export function suggestStageMappings(
  columns: readonly BoardColumn[],
  stages: readonly HubSpotStage[],
): Record<string, string> {
  const won = stages.find((stage) => isClosed(stage) && probability(stage) === 1);
  const lost = stages.find((stage) => isClosed(stage) && probability(stage) === 0);

  const suggestions: Record<string, string> = {};
  for (const column of columns) {
    const stage =
      column.status === "WON"
        ? won
        : column.status === "LOST"
          ? lost
          : stages.find(
              (candidate) =>
                !isClosed(candidate) && normalise(candidate.label) === normalise(column.name),
            );
    if (stage) suggestions[column.id] = stage.id;
  }
  return suggestions;
}
