import { Box, Flex, Group, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import Picture from "@/components/HomePage/components/Picture";
import StartForFreeBtn from "@/components/HomePage/components/StartForFreeBtn";

import BookDemoContactForm from "../../../components/BookDemoContactForm";
import { imagePath } from "../../constants";
import styles from "./HeroSection.module.css";
import TransformLeadGeneration from "./TransformLeadGeneration";
import TrustedByCompaniesCarousel from "./TrustedCompaniesCarousel";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Stack className={`${styles["hero-section-root-div"]}`}>
      <Box className={styles["top-left-radial-gradient-div"]}></Box>
      <Flex className={`${styles["hero-section-div"]}`}>
        <Stack className={cx("heading-and-book-demo-btns-container")}>
          <Stack gap={"1.5rem"}>
            <h1 className={styles["hero-section-heading"]}>
              <span>Know Your Customers &</span>
              <span>Grow Your Business</span>
              <span>with RateUp</span>
            </h1>
            <Stack className={cx("book-demo-no-credit-text-container")}>
              <Group className={cx("book-demo-start-for-free-btns-container")}>
                <StartForFreeBtn
                  className={cx("start-for-free-btn")}
                  gACategory={"try_free_plan"}
                  fbEventName={"TryFreePlanButtonClick"}
                  gALabel={"Clicked on try free plan button in home page"}
                />
                <BookDemoContactForm />
              </Group>
              <Text className={cx("no-card-required-p")}>
                *No Credit Card required
              </Text>
            </Stack>
          </Stack>
        </Stack>

        <Box className={styles["hero-section-image-container"]}>
          <Box className={styles["radial-gradient-div"]}></Box>
          <Picture
            src={`${imagePath}/homepage/hero-section-image.png`}
            alt="Know Your Customer and Grow Your Business"
            sourcesArr={[
              {
                srcSet: `${imagePath}/homepage/hero-section-image.webp`,
                type: "image/webp",
              },
            ]}
          />
        </Box>
      </Flex>

      <Stack className={cx("trusted-companies-container")}>
        <h1 className={cx("blue-bg-heading", "trusted-companies-h1")}>
          Our Trusted Partners
        </h1>
        <TrustedByCompaniesCarousel />
      </Stack>

      <TransformLeadGeneration />
    </Stack>
  );
}

export default HeroSection;
