import { Text, Stack, Image, Button } from "@mantine/core";
import React from "react";
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
}: {
  surveyThemeData: WelcomeTheme;
  onStart: any;
  largeScreen: any;
}) {
  return (
    <Stack
      align="center"
      justify="center"
      style={{
        minHeight: "100dvh",
      }}
      p={"lg"}
      className={lexend.className}
      gap={largeScreen ? "xl" : "sm"}
    >
      {surveyThemeData?.logo?.logo && (
        <Image
          fit="contain"
          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData?.logo?.logo}`}
          alt=" Logoss "
          style={surveyThemeData?.logo?.styles}
        />
      )}
      <Text style={surveyThemeData?.title?.styles}>
        {surveyThemeData?.title?.title || "Welcome"}
      </Text>
      <Text style={surveyThemeData?.subtitle?.styles}>
        {surveyThemeData?.subtitle?.subtitle ||
          "Welcome to the survey, please click the button below to start the survey."}
      </Text>
      <Button
        style={
          surveyThemeData?.button?.styles
            ? {
                ...surveyThemeData?.button?.styles,
                height: "45px",
                fontSize: "1.1rem",
              }
            : { ..._buttonStyles }
        }
        onClick={onStart}
        miw={200}
        ff={"inherit"}
      >
        {surveyThemeData?.button?.label || "Start Survey"}
      </Button>
    </Stack>
  );
}

export default WelcomePage;
