import { Box } from "@mantine/core";

import FlowCard from "../FlowCard";

function FlowCardsList({
  flows,
  teamsData,
}: Readonly<{ flows: DbFlow[]; teamsData }>) {
  return (
    <Box className="cards-grid-global-class">
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
    </Box>
  );
}

export default FlowCardsList;
