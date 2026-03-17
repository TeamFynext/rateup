"use client";

import { BackgroundImage, Flex, Stack, Text } from "@mantine/core";
import { useExtracted } from "next-intl";

import { PageType } from "@/types/enums";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage";

import { CreditsCard } from "../../../../components/Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../components/Layout/TakeSurveyLayout/utils";
import classes from "../../../../components/Survey/SurveyTheme/SurveyTheme.module.css";
import { useSelectedPreview } from "../../../../components/Survey/SurveyTheme/SurveyThemeContext";

export default function TemplateCard({ survey }) {
  const webSurveyPagesTheme = survey?.webSurveyPagesTheme;
  const surveyThemeObj = survey?.webSurveyTheme?.theme;
  const questionsArr = survey?.questions;
  const selectedPreview = useSelectedPreview();
  const translations = useExtracted();
  const shouldUseSurveyTheme =
    webSurveyPagesTheme["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["welcomeTheme"];

  const defaultTitleSubtitleStartButtonTexts = {
    titleText: translations("Welcome") || "Welcome",
    subtitleText:
      translations("Welcome to the survey") || "Welcome to the survey",
    startButtonText: translations("Start Survey") || "Start Survey",
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

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText ?? ""}</span></p>`
    : titleText;

  return (
    <Flex align={"center"} h={200} w={300} style={{ backgroundColor }}>
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
              <Text truncate dangerouslySetInnerHTML={{ __html: newTitle }} />
            </Stack>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
