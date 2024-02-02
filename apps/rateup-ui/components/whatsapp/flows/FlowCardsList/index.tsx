import { Box, Grid } from "@mantine/core";
import styles from "./FlowCardsList.module.css";
import FlowCard from "../FlowCard";
import { WaFlow } from "../../../../types/global";

function FlowCardsList({ flows }: { flows: WaFlow[] }) {
  return (
    <Grid className={styles["flows-cards-div"]}>
      {flows.map(({ dbFlowId, name, status, createdAt }) => {
        return (
          <Grid.Col span={{ base: 12, sm: 6, md: 6, lg: 3 }} key={dbFlowId}>
            <FlowCard
              dbFlowId={dbFlowId}
              name={name}
              status={status}
              createdAt={new Date(createdAt)}
            />
          </Grid.Col>
        );
      })}
    </Grid>
  );
}

export default FlowCardsList;
