"use client";

import { useRouter } from "next/navigation";

import { Anchor, Box, Button, Group, Image, Stack, Text } from "@mantine/core";
import { IconCircleCheckFilled } from "@tabler/icons-react";

import styles from "../ResponseSubmitted.module.css";

function ResponseSubmitted({ isSurveyPreview = false }) {
  const router = useRouter();

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
                src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup-logo-blue-text.svg`}
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
            router.replace("https://www.rateup.app");
          }}
        >
          Try Now
        </Button>
      </Stack>
    </Stack>
  );
}

export default ResponseSubmitted;
