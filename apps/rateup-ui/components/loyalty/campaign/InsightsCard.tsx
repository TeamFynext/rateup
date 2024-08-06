import { Paper, Text, useMantineTheme } from "@mantine/core";

import styles from "../../../pages/dashboard/loyalty/styles.module.css";

export function InsightsCard({ value, text }) {
  const theme = useMantineTheme();

  return (
    <Paper className={styles["card-container"]} ta={"center"}>
      <Text fz={"2rem"} fw={"bold"}>
        {value || 0}
      </Text>
      <Text c={theme.primaryColor}>{text}</Text>
    </Paper>
  );
}
