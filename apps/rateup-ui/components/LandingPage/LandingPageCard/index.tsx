"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { Badge, Box, Group } from "@mantine/core";
import { useExtracted } from "next-intl";

import CreatedSinceText from "../../DateAndTime/CreatedSinceText";
import styles from "./LandingPageCard.module.css";
import MoreOptionsMenu from "./MoreOptionsMenu";

function LandingPageCard({ name, shortUrlId, id, createdAt, isPublished }) {
  const router = useRouter();
  const translations = useExtracted();
  const handleCardClick = useCallback(() => {
    router.push(`/dashboard/landingPages/${shortUrlId}`);
  }, [shortUrlId, router]);

  return (
    <Box className={styles["landingPage-card"]} onClick={handleCardClick}>
      <Group className={styles["heading-and-more-options-div"]}>
        <h2>{name}</h2>
        <MoreOptionsMenu shortUrlId={shortUrlId} id={id} name={name} />
      </Group>
      <CreatedSinceText createdAt={createdAt} />
      <Group className={styles["active-inactive-badge-container"]}>
        <Badge
          className={`${isPublished ? styles["active-badge"] : styles["inactive-badge"]}`}
        >
          {isPublished ? translations("Active") : translations("Inactive")}
        </Badge>
      </Group>
    </Box>
  );
}

export default LandingPageCard;
