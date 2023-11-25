import {
  Title,
  Text,
  Stack,
  Image,
  Button,
  Flex,
  BackgroundImage,
} from "@mantine/core";
import React, { useEffect } from "react";
import { useMediaQuery } from "@mantine/hooks";

const buttonStyles = {
  backgroundColor: "var(--tertiary-color)",
  borderRadius: "48px",
  padding: "10px",
  paddingLeft: "20px",
  paddingRight: "20px",
};

function WelcomePage({ surveyThemeData, onStart, largeScreen }) {
  const isMobile = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    const loadFont = async (fontFamily) => {
      const WebFont = await import("webfontloader");

      WebFont.load({
        google: {
          families: [fontFamily],
        },
      });
    };

    if (surveyThemeData?.descStyles?.fontFamily) {
      loadFont(surveyThemeData?.descStyles?.fontFamily);
    }
    if (surveyThemeData?.headerStyles?.fontFamily) {
      loadFont(surveyThemeData?.headerStyles?.fontFamily);
    }
    if (surveyThemeData?.buttonStyles?.fontFamily) {
      loadFont(surveyThemeData?.buttonStyles?.fontFamily);
    }
  }, [surveyThemeData]);

  return (
    <>
      {/* .........Survey Welcome page.......... */}

      <Stack
        align="center"
        justify="center"
        gap="xl"
        style={{
          height: "75vh",
          borderRadius: 18,
          ...surveyThemeData?.bgStyles,
        }}
      >
        <BackgroundImage
          style={{
            height: "100%",
            width: "100%",
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
            // bg={"red"}
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
            >
              {surveyThemeData?.buttonText}
            </Button>
          </Flex>
        </BackgroundImage>
      </Stack>
    </>
  );
}

export default WelcomePage;
