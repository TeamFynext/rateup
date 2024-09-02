import { BackgroundImage, Flex, Stack } from "@mantine/core";

import { PageType } from "@/types/enums";

import { CreditsCard } from "../../../../components/Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";
import classes from "../../../../components/Survey/SurveyTheme/SurveyTheme.module.css";
import { useSelectedPreview } from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";
import { lexend300 } from "../../../../utils/fonts";

export default function TemplateCard({ survey }) {
  const webSurveyPagesTheme = survey?.webSurveyPagesTheme;
  const surveyThemeObj = survey?.webSurveyTheme?.theme;
  const questionsArr = survey?.questions;
  const selectedPreview = useSelectedPreview();

  const shouldUseSurveyTheme =
    webSurveyPagesTheme["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["welcomeTheme"];

  const defaultTitleSubtitleStartButtonTexts = {
    titleText: "Welcome",
    subtitleText: "Welcome to the survey",
    startButtonText: "Start Survey",
  };
  const welcomeTypeQuestionObj =
    questionsArr?.find((question) => question.type === PageType.Welcome) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText } = welcomeTypeQuestionObj;

  const titleStyles = requiredThemeObj?.title?.styles;
  let subtitleStyles = requiredThemeObj?.subtitle?.styles;
  if (!subtitleStyles) {
    subtitleStyles = {
      color: titleStyles?.color,
      fontWeight: "400",
      fontSize: 16,
      textAlign: "center",
    };
  }
  console.log({ requiredThemeObj, titleStyles, subtitleStyles });

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  return (
    <Flex
      align={"center"}
      h={200}
      w={300}
      style={{ backgroundColor }}
      ff={lexend300.style.fontFamily}
    >
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith(
          "https://images.unsplash.com",
        )}
        url={backgroundImageSrc}
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={backgroundImageSrc}
        >
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            pos={"relative"}
          >
            <Stack
              mt="lg"
              w={"80%"}
              ta={"center"}
              style={{
                fontFamily: "inherit",
                fontSize: "20px",
                ...titleStyles,
                maxWidth: "200px",
              }}
            >
              {titleText}
            </Stack>
            <Stack
              mt="lg"
              w={"80%"}
              ta={"center"}
              style={{
                fontFamily: "inherit",
                ...subtitleStyles,
                marginBottom: "2rem",
              }}
            >
              {subtitleText.split(" ").slice(0, 10).join(" ")}{" "}
              {subtitleText.split(" ").length > 10 && "..."}
            </Stack>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
