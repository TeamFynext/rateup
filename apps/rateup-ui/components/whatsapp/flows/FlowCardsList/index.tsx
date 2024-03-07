import { SimpleGrid } from "@mantine/core";
import FlowCard from "../FlowCard";

function FlowCardsList({
  flows,
  teamsData,
}: Readonly<{ flows: DbFlow[]; teamsData }>) {
  return (
    <SimpleGrid
      p={"0.875rem"}
      spacing={"lg"}
      cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 3 }}
      style={{ overflow: "auto" }}
    >
      {flows.map(({ dbFlowId, name, status, createdAt }) => {
        return (
          <FlowCard
            dbFlowId={dbFlowId}
            name={name}
            status={status}
            createdAt={new Date(createdAt)}
            key={dbFlowId}
            teamsData={teamsData}
          />
        );
      })}
    </SimpleGrid>
  );
}

export default FlowCardsList;
