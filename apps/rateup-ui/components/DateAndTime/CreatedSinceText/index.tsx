import { Box, Group } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import TimeSinceText from "../TimeSinceText";
import styles from "./CreatedSinceText.module.css";

function CreatedSinceText({ createdAt }) {
  const translations = useTranslations();
  return (
    <Group className={styles["creation-time-text-and-icon-div"]}>
      <Box className={styles["clock-icon-container"]}>
        <IconClock />
      </Box>
      <p>
        {translations("Created")} {<TimeSinceText isoDateString={createdAt} />}
      </p>
    </Group>
  );
}

export default CreatedSinceText;
