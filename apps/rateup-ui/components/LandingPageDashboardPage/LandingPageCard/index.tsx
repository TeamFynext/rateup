import { Badge, Box, Group, Text } from "@mantine/core";
import { useRouter } from "next/router";
import { useCallback } from "react";
import MoreOptionsMenu from "./MoreOptionsMenu";
import { IconClock } from "@tabler/icons-react";
import TimeSinceText from "./TimeSinceText";
import styles from "./LandingPageCard.module.css";

function LandingPageCard({ name, shortUrlId, id, createdAt, isPublished }) {
  const router = useRouter();
  const handleCardClick = useCallback(() => {
    router.push({
      pathname: `/dashboard/landingPages/${shortUrlId}`,
    });
  }, [shortUrlId, router]);

  return (
    <Box className={styles["landingPage-card"]} onClick={handleCardClick}>
      <Group className={styles["heading-and-more-options-div"]}>
        <h2>{name}</h2>
        <MoreOptionsMenu shortUrlId={shortUrlId} id={id} />
      </Group>

      <Group className={styles["creation-time-text-and-icon-div"]}>
        <Box className={styles["clock-icon-container"]}>
          <IconClock />
        </Box>
        <p>Created {<TimeSinceText isoDateString={createdAt} />}</p>
      </Group>

      <Group className={styles["active-inactive-badge-container"]}>
        <Badge
          className={`${isPublished ? styles["active-badge"] : styles["inactive-badge"]}`}
        >
          {isPublished ? "Active" : "Inactive"}
        </Badge>
      </Group>
    </Box>
  );
}

export default LandingPageCard;
