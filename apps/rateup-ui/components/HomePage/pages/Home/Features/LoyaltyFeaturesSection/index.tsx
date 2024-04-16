import { Box, Group, Stack } from "@mantine/core";
import styles from "./LoyaltyFeaturesSection.module.css";
import classNames from "classnames/bind";
import LightBlueGradientBg from "../../../../components/LightBlueGradientBg";
import Image from "next/image";
import IllustrationTextLayout from "../../../../components/IllustrationTextLayout";
import { imagesPath } from "../../../../constants";
import FeaturesList from "../PerfectSurveyForYourNeeds/FeaturesList";
const cx = classNames.bind(styles);

function LoyaltyFeaturesSection() {
  return (
    <Group className={styles["loyalty-features-section-root-div"]}>
      <Stack className={cx("title-and-desc-container")}>
        <h1 className={cx("title-h1")}>
          <LightBlueGradientBg displayInline>
            Loyalty Elevated
          </LightBlueGradientBg>
          with Ratuep
        </h1>
        <p>
          Our Loyalty Campaign feature empowers you to effortlessly engage and
          reward your audience, driving repeat business and fostering long-term
          relationships.
        </p>
        <Group className={cx("features-list-container")}>
          <FeaturesList
            featureStringsArr={[
              "Engage & Reward",
              "Drive Repeat Business",
              "Track & Analyze",
            ]}
          />
        </Group>
      </Stack>
      <Box className={cx("img-container")}>
        <Image
          src={`${imagesPath}/homepage/features/loyalty-features-illustration.png`}
          alt="Loyalty features illustration"
          width={1324}
          height={1013}
          priority
        />
      </Box>
    </Group>
  );
}

export default LoyaltyFeaturesSection;
