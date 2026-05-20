"use client";

import { Anchor, Box, Button, Group, Image, Stack, Text } from "@mantine/core";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import styles from "./ResponseSubmitted.module.css";

export function ResponseSubmitted({ isSurveyPreview = false }) {
  const navigate = useNavigate();

  return (
    <Stack
      className={`${styles["response-submitted-root-div"]} ${isSurveyPreview ? styles["survey-preview"] : ""}`}
    >
      <Stack
        className={
          styles["check-icon-container-and-thankyou-message-container"]
        }
      >
        <Box className={styles["check-icon-container"]}>
          {<IconCircleCheckFilled size={"6rem"} />}
        </Box>
        <Text className={styles["thankyou-message-p"]}>
          Thank You, your response has been Submitted!
        </Text>
      </Stack>
      <Stack
        className={styles["create-surveys-text-and-try-now-btn-container"]}
      >
        <Group className={styles["create-surveys-text-container"]}>
          <Text className={styles["create-surveys-text"]}>
            Create Surveys for free using
            <Anchor
              href="https://www.rateup.app"
              styles={{ root: { width: "fit-content" } }}
            >
              <Image
                src={`${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
                height={60}
                width={60}
                fit="contain"
              />
            </Anchor>
          </Text>
        </Group>
        <Button
          className={styles["try-now-btn"]}
          onClick={() => {
            navigate({
              to: "https://www.rateup.app",
              replace: true,
            });
          }}
        >
          Try Now
        </Button>
      </Stack>
    </Stack>
  );
}
