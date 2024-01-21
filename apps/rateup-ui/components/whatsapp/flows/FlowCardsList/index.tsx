import { Box, Grid } from "@mantine/core";
import styles from "./FlowCardsList.module.css";
import FlowCard from "../FlowCard";

function FlowCardsList({ flowObjsArray }) {
  return (
    <Grid className={styles["flows-cards-div"]}>
      {flowObjsArray.map(({ id, name, status }) => {
        return (
          <Grid.Col span={{ base: 12, sm: 6, md: 6, lg: 3 }} key={id}>
            <FlowCard id={id} name={name} status={status} />
          </Grid.Col>
        );
      })}
    </Grid>
  );
}

export default FlowCardsList;
