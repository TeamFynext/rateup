import Image from "next/image";

import { Box, Button, Flex, Group, Stack } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import classNames from "classnames/bind";

import MotionButtonGesture from "@/components/HomePage/components/MotionButtonGesture";

import { gAnalyticsAndFbEvent } from "../../../../../utils/gtag";
import BookDemoContactForm from "../../../components/BookDemoContactForm";
import LightBlueGradientBg from "../../../components/LightBlueGradientBg";
import { imagePath } from "../../constants";
import styles from "./HeroSection.module.css";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Stack className={`${styles["hero-section-root-div"]}`}>
      <Flex className={`${styles["hero-section-div"]}`}>
        <h1 className={styles["hero-section-heading"]}>
          <span className={styles["heading-small-text-span"]}>
            The Customer Feedback Management Platform
          </span>
          <span className={styles["heading-large-text-span"]}>
            <span>Get lots of quality customer{` `}</span>
            <span>feedback automatically</span>
          </span>
        </h1>
        <Box className={styles["hero-section-image-container"]}>
          <Image
            className={styles["hero-section-image"]}
            src={`${imagePath}/homepage/hero-section-image.png`}
            priority
            alt={""}
            width={2298}
            height={924}
          />
        </Box>
        <Group className={styles["book-demo-try-free-plan-btns-container"]}>
          <BookDemoContactForm />
          <MotionButtonGesture>
            <Button
              className={cx("try-free-plan-btn")}
              onClick={() => {
                gAnalyticsAndFbEvent(
                  "try_free_plan",
                  "TryFreePlanButtonClick",
                  "Clicked on try free plan button in home page",
                );
              }}
              variant="subtle"
            >
              Try free plan!
            </Button>
          </MotionButtonGesture>
        </Group>
      </Flex>
    </Stack>
  );
}

export default HeroSection;
