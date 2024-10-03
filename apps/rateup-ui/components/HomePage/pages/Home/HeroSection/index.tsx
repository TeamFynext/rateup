import Image from "next/image";

import { Box, Flex, Group, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";
import TryFreePlanBtn from "@/components/HomePage/components/TryFreePlanBtn";
import { imagesPath } from "@/utils/constants";

import BookDemoContactForm from "../../../components/BookDemoContactForm";
import { imagePath } from "../../constants";
import styles from "./HeroSection.module.css";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Stack className={`${styles["hero-section-root-div"]}`}>
      <Flex className={`${styles["hero-section-div"]}`}>
        <h1 className={styles["hero-section-heading"]}>
          <LightBlueGradientBg
            className={styles["heading-small-text-span"]}
            withoutGradientForMobile={false}
          >
            The Customer Engagement Platform
          </LightBlueGradientBg>
          <span className={styles["heading-large-text-span"]}>
            <span>Know Your Customer {` `}</span>
            <span>Grow Your Business</span>
          </span>
        </h1>
        <Group className={styles["book-demo-try-free-plan-btns-container"]}>
          <BookDemoContactForm />
          <TryFreePlanBtn
            className={cx("try-free-plan-btn")}
            gACategory={"try_free_plan"}
            fbEventName={"TryFreePlanButtonClick"}
            gALabel={"Clicked on try free plan button in home page"}
          />
        </Group>
      </Flex>

      <Box className={styles["hero-section-image-container"]}>
        <picture>
          <source
            type="image/webp"
            srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
          />
          <img
            className={cx("hero-section-img")}
            src={`${imagesPath}/homepage/hero-section-img.png`}
            alt="qr"
            loading="lazy"
          />
        </picture>
      </Box>
    </Stack>
  );
}

export default HeroSection;
