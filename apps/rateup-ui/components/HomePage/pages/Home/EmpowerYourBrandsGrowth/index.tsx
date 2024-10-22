import Image from "next/image";

import { Box, Stack } from "@mantine/core";
import classNames from "classnames/bind";

import LightBlueGradientBg from "../../../components/LightBlueGradientBg";
import { imagesPath } from "../../../constants";
import styles from "./EmpowerYourBrandsGrowth.module.css";

const cx = classNames.bind(styles);

function EmpowerYourBrandsGrowth() {
  return (
    <Stack
      className={cx("empower-your-brands-growth-section")}
      id="our-solutions"
    >
      <h1 className={cx("heading-h1")}>
        <span className={cx("empower-your-span")}>Empower Your</span>
        <LightBlueGradientBg className={cx("brand-growth-txt-span")}>
          Brand's Growth Journey
        </LightBlueGradientBg>
      </h1>

      <Box className={cx("img-container")}>
        <Image
          src={`${imagesPath}/homepage/empower-your-brands-growth.png`}
          width={2578}
          height={1042}
          alt="Empower your brands growth illustration"
        />
      </Box>

      <p className={cx("desc-text-p")}>
        Experience{" "}
        <span className={cx("bold-span")}>
          The Ultimate Lead Generation And Customer Feedback Survey Solution
        </span>{" "}
        with RateUp's comprehensive SAAS platform. Seamlessly integrating
        Whatsapp Cloud APIs, Surveys, WhatsApp Campaigns, Testimonials, and AI
        Automation, RateUp empowers your business to elevate its brand, engage
        audiences effortlessly, and foster long-lasting customer loyalty.
      </p>
    </Stack>
  );
}

export default EmpowerYourBrandsGrowth;
