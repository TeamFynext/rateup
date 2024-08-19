import React from "react";

import { Button, Flex, Image, Stack, Text } from "@mantine/core";

import { PageType } from "@/types/enums";

import { cordinateStyle } from "../../../utils";
import { surveyUploadsPath } from "../../../utils/constants";
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
  onStart,
  largeScreen,
  orgLogoSrc,
  orgLogoStyles,
  questionsArr,
}: {
  surveyThemeData: WelcomeTheme;
  onStart: any;
  largeScreen: any;
  orgLogoSrc: string | null;
  orgLogoStyles: any;
  questionsArr: any;
}) {
  const position = surveyThemeData.button?.position;

  const defaultTitleSubtitleStartButtonTexts = {
    titleText: "Welcome",
    subtitleText: "Welcome to the survey",
    startButtonText: "Start Survey",
  };

  const welcomeTypeQuestionObj =
    questionsArr?.find((question) => question.type === PageType.Welcome) ||
    defaultTitleSubtitleStartButtonTexts;
  const { titleText, subtitleText, startButtonText } = welcomeTypeQuestionObj;

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
      >
        {orgLogoSrc && (
          <Image
            fit="contain"
            src={orgLogoSrc}
            alt="Logo"
            style={{ ...orgLogoStyles }}
          />
        )}
        <Text style={surveyThemeData?.title?.styles}>{titleText}</Text>
        <Text style={surveyThemeData?.subtitle?.styles}>{subtitleText}</Text>
        <div
          style={{
            display: "flex",
            ...(position?.x ? cordinateStyle(position.x) : {}),
            ...(position?.y ? cordinateStyle(position.y) : {}),
            padding: 20,
          }}
        >
          <Button
            style={
              surveyThemeData?.button?.styles
                ? {
                    ...surveyThemeData?.button?.styles,
                    height: "45px",
                    fontSize: "1.1rem",
                    borderRadius: "2rem",
                  }
                : { ..._buttonStyles }
            }
            onClick={onStart}
            miw={200}
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
