import classNames from "classnames/bind";
import styles from "./PerfectSurveyForYourNeeds.module.css";
import { Box, Group, Stack, Image as MantineImage } from "@mantine/core";
import Image from "next/image";
import { imagesPath } from "../../../../constants";
import LightBlueGradientBg from "../../../../components/LightBlueGradientBg";
import { otherFeaturesList, surveyFeaturesList } from "./constants";
import FeaturesList from "./FeaturesList";

const cx = classNames.bind(styles);

function PerfectSurveyForYourNeeds() {
  return (
    <Stack className={cx("perfect-survey-for-your-needs-root-div")}>
      <Group className={cx("img-survey-features-list-container")}>
        <Box className={cx("img-container")}>
          <Image
            src={`${imagesPath}/homepage/features/perfect-survey-for-your-needs.png`}
            width={1267}
            height={917}
            alt="Illustration"
          />
        </Box>
        <Stack className={cx("survey-features-container")}>
          <h1 className={cx("survey-features-title-h1")}>
            <span>The Perfect Survey</span>
            <LightBlueGradientBg displayInline>
              For Your Needs
            </LightBlueGradientBg>
          </h1>
          <p className={cx("subtitle-p")}>
            Select the ideal survey for your requirements. Craft uniquely
            engaging feedback forms to boost response rates.
          </p>
          <Group className={cx("features-list-container")}>
            <FeaturesList featureStringsArr={surveyFeaturesList.slice(0, 3)} />
            <FeaturesList featureStringsArr={surveyFeaturesList.slice(3)} />
          </Group>
        </Stack>
      </Group>
      <Group className={cx("other-features-list")}>
        {otherFeaturesList.map(({ label, iconUrl }) => {
          return (
            <Stack key={label} className={cx("icon-and-name-container")}>
              <Box>
                <MantineImage src={iconUrl} />
              </Box>
              <p className={cx("label-p")}>{label}</p>
            </Stack>
          );
        })}
      </Group>
    </Stack>
  );
}

export default PerfectSurveyForYourNeeds;
