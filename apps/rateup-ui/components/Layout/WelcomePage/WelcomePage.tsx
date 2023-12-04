import {
  Title,
  Text,
  Stack,
  Image,
  Button,
  Flex,
  BackgroundImage,
} from "@mantine/core";
import React from "react";
import { useMediaQuery } from "@mantine/hooks";
import { lexend300 } from "../../../utils/fonts";

const buttonStyles = {
  backgroundColor: "var(--tertiary-color)",
  borderRadius: "48px",
  padding: "10px",
  paddingLeft: "20px",
  paddingRight: "20px",
};

function WelcomePage({ surveyThemeData, onStart, largeScreen }) {
  const isMobile = useMediaQuery("(max-width: 480px)");

  return (
    <Stack
      align="center"
      justify="center"
      gap="xl"
      style={{
        height: "100%",
        borderRadius: 18,
        ...surveyThemeData?.bgStyles,
      }}
      ff={lexend300.style.fontFamily}
    >
      <BackgroundImage
        h={"100%"}
        style={{
          flex: 1,
          height: "100%",
          objectFit: "contain",
          borderRadius: 18,
        }}
        src={
          (surveyThemeData?.bgUrl || surveyThemeData?.mobileBgUrl) &&
          surveyThemeData?.bgType != "bgcolor"
            ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${
                isMobile && surveyThemeData?.mobileBgUrl
                  ? surveyThemeData?.mobileBgUrl
                  : surveyThemeData?.bgUrl
              }`
            : ""
        }
      >
        <Flex
          justify={"center"}
          align={"center"}
          h={"100%"}
          direction={"column"}
        >
          {surveyThemeData?.logoUrl && (
            <Image
              fit="contain"
              src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData?.logoUrl}`}
              alt=" Logoss "
              style={surveyThemeData?.logoStyles}
            />
          )}
          <Title
            order={1}
            style={{
              fontSize: largeScreen ? "4rem" : "3rem",
              ...surveyThemeData?.headerStyles,
            }}
            tt={"capitalize"}
            mt={25}
            ff={"inherit"}
          >
            {surveyThemeData?.headerText}
          </Title>

          <Text mt={20} style={surveyThemeData?.descStyles} tt={"capitalize"}>
            {surveyThemeData?.descText}
          </Text>

          <Button
            mt={20}
            style={
              surveyThemeData?.buttonStyles
                ? { ...surveyThemeData.buttonStyles }
                : { ...buttonStyles }
            }
            onClick={onStart}
            miw={150}
            ff={"inherit"}
          >
            {surveyThemeData?.buttonText}
          </Button>
        </Flex>
      </BackgroundImage>
    </Stack>
  );
}

export default WelcomePage;
