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
  const {
    button: { label, styles: buttonStyles },
    logo: { logo, styles: logoStyles },
    subtitle: { subtitle, styles: subtitleStyles },
    title: { title, styles: titleStyles },
  } = surveyThemeData;
  return (
    <Stack
      align="center"
      justify="center"
      style={{
        minHeight: "100dvh",
      }}
      className={lexend.className}
    >
      {logo && (
        <Image
          fit="contain"
          src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${logo}`}
          alt=" Logoss "
          style={logoStyles}
        />
      )}
      <Text style={titleStyles}>{title}</Text>
      <Text style={subtitleStyles}>{subtitle}</Text>
      <Button
        style={buttonStyles ? { ...buttonStyles } : { ..._buttonStyles }}
        onClick={onStart}
        miw={150}
        ff={"inherit"}
      >
        {label}
      </Button>
    </Stack>
  );
}

export default WelcomePage;
