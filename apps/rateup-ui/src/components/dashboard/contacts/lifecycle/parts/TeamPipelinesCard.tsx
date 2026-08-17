import { IconGitBranch, IconUsersGroup } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import {
  usePipelinesQuery,
  useTeamPipelineDefaultsQuery,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { TeamPipelineDefault } from "@/backend/pipeline/pipeline.types.ts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { usePipelineStore } from "@/store/pipeline.store.ts";

/** One board, and every team filing contacts onto it. */
interface Destination {
  pipelineId: string;
  name: string;
  teams: TeamPipelineDefault[];
}

/**
 * Teams grouped by the board their contacts land on — several teams sharing a
 * pipeline read as one row, because they share one lead per contact rather than
 * opening one each.
 *
 * Boards the viewer cannot open are skipped rather than shown as an id: they
 * belong to teams the viewer is not on, and naming them here would leak a board
 * the pipeline routes themselves would refuse.
 */
function groupByPipeline(
  teams: TeamPipelineDefault[],
  pipelines: Array<{ id: string; name: string }>,
): Destination[] {
  const byPipeline = new Map<string, Destination>();

  for (const team of teams) {
    if (!team.defaultPipelineId) continue;
    const pipeline = pipelines.find((entry) => entry.id === team.defaultPipelineId);
    if (!pipeline) continue;

    const existing = byPipeline.get(pipeline.id);
    if (existing) {
      existing.teams.push(team);
    } else {
      byPipeline.set(pipeline.id, { pipelineId: pipeline.id, name: pipeline.name, teams: [team] });
    }
  }

  return [...byPipeline.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Where each team's contacts go, as a read-only map.
 *
 * It sits with the lifecycle stages because that is what drives it: a contact
 * reaching a stage lands in the column that stage maps to, on the board its team
 * files into. Changing the routing happens in the pipeline's own settings, where
 * the board's team list is — a team can only file into a board it is on, and this
 * screen has no idea which boards those are.
 */
export function TeamPipelinesCard() {
  const { data: teams = [] } = useTeamPipelineDefaultsQuery();
  const { data: pipelines = [] } = usePipelinesQuery();

  if (teams.length === 0) return null;

  const destinations = groupByPipeline(teams, pipelines);
  const routedTeamIds = new Set(destinations.flatMap((d) => d.teams.map((team) => team.id)));
  const unrouted = teams.filter((team) => !routedTeamIds.has(team.id));

  return (
    <Card>
      <CardHeader className="border-border bg-muted/30 border-b px-6 py-4">
        <CardTitle className="text-foreground text-[15px] font-bold tracking-tight">
          Team pipelines
        </CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">
          The board a team&apos;s contacts land on. With auto-add on, reaching a lifecycle stage
          opens a lead in the column that stage maps to — as long as the contact is not on that
          board already. Set this in each pipeline&apos;s settings, under Teams.
        </p>
      </CardHeader>

      <div className="flex flex-col">
        {destinations.map((destination) => (
          <div
            key={destination.pipelineId}
            className="border-border/60 flex flex-wrap items-center gap-4 border-b px-6 py-4 last:border-b-0"
          >
            <span className="flex min-w-40 flex-1 items-center gap-2.5">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <IconGitBranch className="size-4" />
              </span>
              <Link
                to="/dashboard/pipeline"
                search={{ p: destination.pipelineId }}
                // The board's tab is store state rather than URL state, so the
                // link opens the pipeline already on the screen it is about.
                onClick={() => usePipelineStore.getState().patch({ view: "settings" })}
                className="text-foreground truncate text-[13px] font-bold hover:underline"
              >
                {destination.name}
              </Link>
            </span>

            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {destination.teams.map((team) => (
                <Badge
                  key={team.id}
                  variant={team.autoCreateLeads ? "secondary" : "outline"}
                  className={team.autoCreateLeads ? "" : "text-muted-foreground"}
                  title={
                    team.autoCreateLeads
                      ? `${team.name} auto-adds contacts to ${destination.name}`
                      : `${team.name} files here, but auto-add is off`
                  }
                >
                  <IconUsersGroup className="size-3" />
                  {team.name}
                  {team.autoCreateLeads ? "" : " · auto-add off"}
                </Badge>
              ))}
            </div>
          </div>
        ))}

        {unrouted.length > 0 && (
          <div className="border-border/60 flex flex-wrap items-center gap-3 border-t px-6 py-4">
            <span className="text-muted-foreground min-w-40 flex-1 text-[13px] font-semibold">
              No board yet
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {unrouted.map((team) => (
                <Badge key={team.id} variant="outline" className="text-muted-foreground">
                  <IconUsersGroup className="size-3" />
                  {team.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
