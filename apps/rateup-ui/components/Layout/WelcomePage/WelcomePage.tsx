"use client";

import React from "react";

import { Button, Flex, Image, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { PageType } from "@/types/enums";
import { getInlineStyleFromStyleObj } from "@/components/Survey/SurveyTheme/components/previewcomponents/welcomepage";

import { cordinateStyle } from "../../../utils";
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
    titleText: `<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>`,
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

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitleText
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${titleText}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitleText}</span></p>`
    : titleText;

  return (
    <div className="flex justify-center items-center h-full">
      <Stack
        align="center"
        justify="center"
        h={"100%"}
        p={"lg"}
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
        <div
          dangerouslySetInnerHTML={{
            __html: newTitle,
          }}
          style={{ color: titleStyles?.color }}
        />
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
    </div>
  );
}

export default WelcomePage;
