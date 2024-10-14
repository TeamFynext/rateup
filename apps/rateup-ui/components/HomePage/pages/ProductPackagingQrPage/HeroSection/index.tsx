import { Box, Flex, Group, List, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import BookDemoContactForm from "@/components/HomePage/components/BookDemoContactForm";
import Header from "@/components/HomePage/components/Header";
import LightBlueGradientBg from "@/components/HomePage/components/LightBlueGradientBg";
import StartForFreeBtn from "@/components/HomePage/components/StartForFreeBtn";
import { imagesPath } from "@/utils/constants";

import styles from "./HeroSection.module.css";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Flex className={cx("hero-section-root-div", cx("hero-section-root-div"))}>
      <Header
        className={cx("product-packaging-page-navbar")}
        withWhiteTextLogo
      />
      <Stack className={cx("content-cntainer")}>
        <Stack className={cx("heading-and-btn-container")}>
          <h1 className={cx("heading")}>
            <LightBlueGradientBg withoutGradientForMobile={false}>
              Turn packaging into a{" "}
            </LightBlueGradientBg>
            <span className={cx("customer-engagement-text-span")}>
              Customer Engagement Hub
            </span>
          </h1>

          <Group className={cx("book-demo-start-for-free-btns-container")}>
            <StartForFreeBtn
              className={cx("try-freeplan-btn")}
              gACategory={"try_free_plan"}
              fbEventName={"TryFreePlanButtonClick"}
              gALabel={"Clicked on try free plan button in home page"}
            />
            <BookDemoContactForm className={cx("book-a-demo-btn-container")} />
          </Group>
        </Stack>
        <Stack className={cx("image-container")}>
          <picture className={cx("image-container-picture-ele")}>
            <source
              type="image/webp"
              srcSet={`${imagesPath}/product-packaging-qr-page/hero-section-img/hero-section-img.webp`}
            />
            <img
              className={cx("hero-section-img")}
              src={`${imagesPath}/product-packaging-qr-page/hero-section-img/hero-section-img.png`}
              alt="Turn packaging into a customer Engagement Hub"
            />
          </picture>
        </Stack>
      </Stack>
    </Flex>
  );
}

export default HeroSection;
