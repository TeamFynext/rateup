import { Box, Stack } from "@mantine/core";
import styles from "./EmpowerYourBrandsGrowth.module.css";
import classNames from "classnames/bind";
import LightBlueGradientBg from "../../../components/LightBlueGradientBg";
import Image from "next/image";
import { imagesPath } from "../../../constants";

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
        <span className={cx("bold-span")}>Our all-in-one SAAS platform</span>{" "}
        empowers business with unparalleled tools for Reputation Management,
        Surveys, WhatsApp Campaigns, Loyalty Programs, Testimonials, and AI
        Automation. Elevate your brand's standing, engage with your audience
        seamlessly, and cultivate enduring customer loyalty.
      </p>
    </Stack>
  );
}

export default EmpowerYourBrandsGrowth;
