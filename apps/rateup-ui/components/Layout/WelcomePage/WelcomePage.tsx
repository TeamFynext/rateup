import { Text, Stack, Image, Button } from "@mantine/core";
import React from "react";
import { lexend } from "../../../utils/fonts";
import { WelcomeTheme } from "../../Survey/SurveyTheme/surveyTheme.types";
import { cordinateStyle } from "../../../utils";
import { surveyUploadsPath } from "../../../utils/constants";

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
}: {
  surveyThemeData: WelcomeTheme;
  onStart: any;
  largeScreen: any;
  orgLogoSrc: string | null;
  orgLogoStyles: any;
}) {
  const position = surveyThemeData.button?.position;
  return (
    <Stack
      align="center"
      justify="center"
      h={"100%"}
      p={"lg"}
      className={lexend.className}
      gap={largeScreen ? "xl" : "sm"}
    >
      {orgLogoSrc && (
        <Image
          fit="contain"
          src={orgLogoSrc}
          alt="Logo"
          style={{ ...orgLogoStyles }}
        />
      )}
      <Text style={surveyThemeData?.title?.styles}>
        {surveyThemeData?.title?.title || " "}
      </Text>
      <Text style={surveyThemeData?.subtitle?.styles}>
        {surveyThemeData?.subtitle?.subtitle || " "}
      </Text>
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
          {surveyThemeData?.button?.label || "Start Survey"}
        </Button>
      </div>
    </Stack>
  );
}

export default WelcomePage;
