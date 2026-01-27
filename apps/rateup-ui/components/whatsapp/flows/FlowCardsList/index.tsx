import FlowCard from "../FlowCard";

function FlowCardsList({
  flows,
  teamsData,
}: Readonly<{ flows: DbFlow[]; teamsData }>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {flows?.map(({ dbFlowId, name, status, createdAt, version, survey }) => {
        const responseCount =
          survey?.teams?.reduce(
            (acc: number, team: any) =>
              acc + (team.surveyStats?.completed || 0),
            0,
          ) || 0;
        return (
          <FlowCard
            dbFlowId={dbFlowId}
            name={name}
            status={status}
            createdAt={createdAt}
            key={dbFlowId}
            teamsData={teamsData}
            version={version}
            responseCount={responseCount}
          />
        );
      })}
    </div>
  );
}

export default FlowCardsList;
