import { Stack, Text, useMantineTheme } from "@mantine/core";
import styles from "../../../pages/dashboard/loyalty/styles.module.css";

export function InsightsCard({ value, text }) {
  const theme = useMantineTheme();

  const primaryColor = theme.colors[theme.primaryColor][6];
  return (
    <Stack className={styles["card-container"]} align={"center"} gap={0}>
      <Text fz={"2rem"} fw={"bold"}>
        {value || 0}
      </Text>
      <Text
        style={{
          color: primaryColor,
        }}
      >
        {text}
      </Text>
    </Stack>
  );
}
