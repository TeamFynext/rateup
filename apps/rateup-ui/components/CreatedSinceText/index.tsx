import { Box, Group } from "@mantine/core";
import styles from "./CreatedSinceText.module.css";
import { IconClock } from "@tabler/icons-react";
import TimeSinceText from "../LandingPageDashboardPage/LandingPageCard/TimeSinceText";

function CreatedSinceText({ createdAt }) {
  return (
    <Group className={styles["creation-time-text-and-icon-div"]}>
      <Box className={styles["clock-icon-container"]}>
        <IconClock />
      </Box>
      <p>Created {<TimeSinceText isoDateString={createdAt} />}</p>
    </Group>
  );
}

export default CreatedSinceText;
