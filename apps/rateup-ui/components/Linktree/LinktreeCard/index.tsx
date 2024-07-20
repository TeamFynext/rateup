import { useCallback } from "react";
import { useRouter } from "next/router";

import { Badge, Box, Group } from "@mantine/core";

import CreatedSinceText from "../../DateAndTime/CreatedSinceText";
import styles from "./LinktreeCard.module.css";
import MoreOptionsMenu from "./MoreOptionsMenu";

function LinktreeCard({ name, shortUrlId, id, createdAt, isPublished }) {
  const router = useRouter();
  const handleCardClick = useCallback(() => {
    router.push({
      pathname: `/dashboard/linktree/${shortUrlId}`,
    });
  }, [shortUrlId, router]);

  return (
    <Box className={styles["linktree-card"]} onClick={handleCardClick}>
      <Group className={styles["heading-and-more-options-div"]}>
        <h2>{name}</h2>
        <MoreOptionsMenu shortUrlId={shortUrlId} id={id} name={name} />
      </Group>

      <CreatedSinceText createdAt={createdAt} />

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

export default LinktreeCard;
