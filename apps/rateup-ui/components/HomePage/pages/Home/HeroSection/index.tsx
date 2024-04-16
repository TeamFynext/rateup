import { Box, Group, Stack } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import classNames from "classnames/bind";
import Image from "next/image";
import BookDemoContactForm from "../../../components/BookDemoContactForm";
import Button from "../../../components/Button";
import LightBlueGradientBg from "../../../components/LightBlueGradientBg";
import { imagePath } from "../../constants";
import styles from "./HeroSection.module.css";
import TrustedByCompaniesCarousel from "./TrustedByCompaniesCarousel";

const cx = classNames.bind(styles);

function HeroSection() {
  return (
    <Stack className={`${styles["hero-section-wrapper"]}`}>
      <Group className={cx("heading-and-illustration-container")}>
        <Stack className={cx("heading-and-btns-container")}>
          <Stack className={cx("heading-and-text-container")}>
            <h1 className={cx("blue-bg-heading")}>
              The Customer Experience Platform!
            </h1>
            <p className={cx("text-p")}>
              <span>Engage effortlessly.</span>
              <span>Amplify your impact.</span>
              <LightBlueGradientBg className={cx("elevate-brand-gradient-div")}>
                <span>Elevate your brand</span>
              </LightBlueGradientBg>
            </p>
          </Stack>

          <Group className={cx("btns-container")}>
            <Button
              className={cx("play-video-btn")}
              leftSection={<IconPlayerPlay size={"1em"} />}
            >
              Play Video
            </Button>
            <BookDemoContactForm
              buttonProps={{
                whiteBackgroundGradientText: true,
              }}
            />
          </Group>
        </Stack>

        <Box className={cx("illustration-img-container")}>
          <Image
            className={cx("illustration-img")}
            src={`${imagePath}/homepage/home-hero-section-illustration.png`}
            width={1314}
            height={1304}
            alt="Google Reviews Illustration"
            priority={true}
          />
        </Box>
      </Group>

      <Stack className={cx("trusted-companies-container")}>
        <h1 className={cx("blue-bg-heading", "trusted-companies-h1")}>
          Our Trusted Companies
        </h1>
        <TrustedByCompaniesCarousel />
      </Stack>

      {/* <div
        className={styles["blue-background-for-screens-bigger-than-1920px"]}
      ></div> */}
    </Stack>
  );
}

export default HeroSection;
