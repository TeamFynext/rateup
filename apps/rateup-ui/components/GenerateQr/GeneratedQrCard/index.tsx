"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { Badge, Box, Group } from "@mantine/core";

import CreatedSinceText from "../../DateAndTime/CreatedSinceText";
import styles from "./GeneratedQrCard.module.css";
import MoreOptionsMenu from "./MoreOptionsMenu";

function GeneratedQrCard({ name, shortUrlId, id, createdAt, isPublished }) {
  const router = useRouter();
  const handleCardClick = useCallback(() => {
    router.push(`/dashboard/qrCreator/${shortUrlId}`);
  }, [shortUrlId, router]);

  return (
    <Box className={styles["generated-qr-card"]} onClick={handleCardClick}>
      <Group className={styles["heading-and-more-options-div"]}>
        <h2>{name}</h2>
        <MoreOptionsMenu shortUrlId={shortUrlId} name={name} />
      </Group>

      <CreatedSinceText createdAt={createdAt} />
    </Box>
  );
}

export default GeneratedQrCard;
