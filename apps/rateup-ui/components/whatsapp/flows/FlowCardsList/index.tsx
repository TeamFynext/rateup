import { GenericCardGrid } from "@/components/common/generic-card";

import FlowCard from "../FlowCard";

function FlowCardsList({
  flows,
  teamsData,
}: Readonly<{ flows: DbFlow[]; teamsData }>) {
  return (
    <GenericCardGrid
      items={flows ?? []}
      getKey={(flow) => flow.dbFlowId}
      renderItem={(flow) => {
        const responseCount =
          flow.survey?.teams?.reduce(
            (acc: number, team: any) =>
              acc + (team.surveyStats?.completed || 0),
            0,
          ) || 0;
        return (
          <FlowCard
            dbFlowId={flow.dbFlowId}
            name={flow.name}
            status={flow.status}
            createdAt={flow.createdAt}
            teamsData={teamsData}
            version={flow.version}
            responseCount={responseCount}
          />
        );
      }}
    />
  );
}

export default FlowCardsList;
