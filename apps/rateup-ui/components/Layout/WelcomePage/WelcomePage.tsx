import { Title, Text, Stack, Image, Button, Flex } from "@mantine/core";
import React from "react";
import { lexend300 } from "../../../utils/fonts";
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
      gap="xl"
      style={{
        minHeight: "100dvh",
      }}
      ff={lexend300.style.fontFamily}
    >
      <Flex justify={"center"} align={"center"} h={"100%"} direction={"column"}>
        {logo && (
          <Image
            fit="contain"
            src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${logo}`}
            alt=" Logoss "
            style={logoStyles}
          />
        )}
        <Title
          order={1}
          style={{
            fontSize: largeScreen ? "4rem" : "3rem",
            ...titleStyles,
          }}
          tt={"capitalize"}
          mt={25}
          ff={"inherit"}
        >
          {title}
        </Title>

        <Text mt={20} style={subtitleStyles}>
          {subtitle}
        </Text>

        <Button
          mt={20}
          style={buttonStyles ? { ...buttonStyles } : { ..._buttonStyles }}
          onClick={onStart}
          miw={150}
          ff={"inherit"}
        >
          {label}
        </Button>
      </Flex>
    </Stack>
  );
}

export default WelcomePage;
