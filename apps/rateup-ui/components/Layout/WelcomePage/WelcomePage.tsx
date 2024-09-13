import React from "react";

import { Button, Flex, Image, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { PageType } from "@/types/enums";

import { cordinateStyle } from "../../../utils";
import { lexend } from "../../../utils/fonts";
import { WelcomeTheme } from "../../Survey/SurveyTheme/surveyTheme.types";

const _buttonStyles = {
  backgroundColor: "var(--tertiary-color)",
  borderRadius: "48px",
  padding: "10px",
  paddingLeft: "20px",
  paddingRight: "20px",
};

function WelcomePage({
  surveyThemeData,
  pagesThemeData,
  onStart,
  largeScreen,
  orgLogoSrc,
  orgLogoStyles,
  questionsArr,
  isMobile,
}: {
  surveyThemeData: any;
  onStart: any;
  largeScreen: any;
  orgLogoSrc: string | null;
  orgLogoStyles: any;
  questionsArr: any;
  pagesThemeData: any;
  isMobile: boolean;
}) {
  const defaultTitleSubtitleStartButtonTexts = {
    titleText: "Welcome",
    subtitleText: "Welcome to the survey",
    startButtonText: "Start Survey",
  };

  const welcomeTypeQuestionObj =
    questionsArr?.find((question) => question.type === PageType.Welcome) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText, startButtonText } = welcomeTypeQuestionObj;

  const shouldUseSurveyTheme = pagesThemeData["welcomeTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeData["surveyTheme"]
    : pagesThemeData["welcomeTheme"];

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
  let buttonStyles = requiredThemeObj?.button?.styles;
  let buttonPosition = requiredThemeObj?.button?.position;
  if (!buttonPosition) {
    buttonPosition = { x: "CENTER", y: "DEFAULT" };
  }

  return (
    <Flex justify={"center"} align={"center"} h={"100%"}>
      <Stack
        align="center"
        justify="center"
        h={"100%"}
        p={"lg"}
        className={lexend.className}
        gap={"xl"}
        maw={1920}
        w={isMobile ? "100%" : "80%"}
      >
        {orgLogoSrc && (
          <Image
            fit="contain"
            src={orgLogoSrc}
            alt="Logo"
            style={{ ...orgLogoStyles }}
          />
        )}
        <Text style={titleStyles}>{titleText}</Text>
        <Text style={subtitleStyles}>{subtitleText}</Text>
        <div
          style={{
            display: "flex",
            ...(buttonPosition?.x ? cordinateStyle(buttonPosition.x) : {}),
            ...(buttonPosition?.y ? cordinateStyle(buttonPosition.y) : {}),
          }}
        >
          <Button
            style={
              buttonStyles
                ? {
                    ...buttonStyles,
                    height: "auto",
                    fontSize: "1.125rem",
                    borderRadius: "0.625rem",
                    padding: "0.75rem 1.5rem",
                  }
                : { ..._buttonStyles }
            }
            onClick={onStart}
            ff={"inherit"}
          >
            {startButtonText}
          </Button>
        </div>
      </Stack>
    </Flex>
  );
}

export default WelcomePage;
