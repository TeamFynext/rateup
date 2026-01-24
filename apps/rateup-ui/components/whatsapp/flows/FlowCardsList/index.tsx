import FlowCard from "../FlowCard";

function FlowCardsList({
  flows,
  teamsData,
}: Readonly<{ flows: DbFlow[]; teamsData }>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {flows?.map(({ dbFlowId, name, status, createdAt, version }) => {
        return (
          <FlowCard
            dbFlowId={dbFlowId}
            name={name}
            status={status}
            createdAt={createdAt}
            key={dbFlowId}
            teamsData={teamsData}
            version={version}
          />
        );
      })}
    </div>
  );
}

export default FlowCardsList;
