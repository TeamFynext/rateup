import { Box, Stack } from "@mantine/core";
import styles from "./ReputationFeaturesSection.module.css";
import classNames from "classnames/bind";
import LightBlueGradientBg from "../../../../components/LightBlueGradientBg";
import Image from "next/image";
import { imagesPath } from "../../../../constants";

const cx = classNames.bind(styles);

function ReputationFeaturesSection() {
  return (
    <Stack className={cx("reputation-section-root-div")}>
      <h1 className={cx("heading")}>
        <LightBlueGradientBg className={cx("gradient-span")}>
          Your reputation is unique
        </LightBlueGradientBg>
        Our solutions are tailored to match.
      </h1>
      <Box className={cx("img-container")}>
        <Image
          src={`${imagesPath}/homepage/features/reputation-features-illustration.png`}
          alt="Reputation Features Illustration"
          width={2168}
          height={1176}
          priority
        />
      </Box>
    </Stack>
  );
}

export default ReputationFeaturesSection;
