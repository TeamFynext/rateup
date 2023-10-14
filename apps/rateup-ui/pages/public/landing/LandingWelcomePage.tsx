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
import { usePublicWelcomeThemeByLandingId } from "../../../backend/LandingWelcomeTheme/LandingWelcomeTheme.query";
import classes from "./Landing.module.css";

function LandingWelcomePage({ setStartClicked, largeScreen, landingid }) {
  //-----------get welcome page styles and content-------------
  const {
    isLoading,
    error,
    data: LandingWelcomeData,
  } = usePublicWelcomeThemeByLandingId(landingid);

  useEffect(() => {
    if (LandingWelcomeData?.descStyles?.fontFamily) {
      loadFont(LandingWelcomeData?.descStyles?.fontFamily);
    }
    if (LandingWelcomeData?.headerStyles?.fontFamily) {
      loadFont(LandingWelcomeData?.headerStyles?.fontFamily);
    }
    if (LandingWelcomeData?.buttonStyles?.fontFamily) {
      loadFont(LandingWelcomeData?.buttonStyles?.fontFamily);
    }
  }, [LandingWelcomeData]);

  let WebFont = undefined;
  useEffect(() => {
    (async () => {
      if (window) {
        WebFont = await import("webfontloader");
      }
    })();
  }, []);

  async function loadFont(fontFamily) {
    if (window) {
      WebFont = await import("webfontloader");
      // Code that depends on the window object
      if (fontFamily) {
        await WebFont.load({
          google: {
            families: [fontFamily],
          },
          active: () => {
            // callback();
          },
          inactive: () => {},
        });
      }
    }
  }

  return (
    <>
      {/* .........Survey Welcome page.......... */}
      {isLoading && <Text ta={"center"}> Loading...</Text>}
      {!isLoading && (
        <Stack
          align="center"
          justify="center"
          gap="xl"
          style={{
            height: "75vh",
            width: "100% !important",
            borderRadius: 18,
            ...LandingWelcomeData?.bgStyles,
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
              LandingWelcomeData?.bgUrl &&
              LandingWelcomeData.bgType != "bgcolor"
                ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${LandingWelcomeData.bgUrl}`
                : ""
            }
          >
            <Flex
              justify={"center"}
              align={"center"}
              h={"100%"}
              direction={"column"}
            >
              {LandingWelcomeData?.logoUrl && (
                <Image
                  fit="contain"
                  src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${LandingWelcomeData.logoUrl}`}
                  alt=" Logo "
                  style={LandingWelcomeData?.logoStyles}
                />
              )}
              <Title
                order={1}
                style={{
                  fontSize: largeScreen ? "4rem" : "3rem",
                  ...LandingWelcomeData?.headerStyles,
                }}
                tt={"capitalize"}
                mt={25}
              >
                {LandingWelcomeData?.headerText}
              </Title>
              <Text
                mt={20}
                style={LandingWelcomeData?.descStyles}
                tt={"capitalize"}
              >
                {LandingWelcomeData?.descText}
              </Text>
              <Button
                mt={20}
                style={LandingWelcomeData?.buttonStyles}
                className={classes.buttonStyles}
                onClick={() => setStartClicked(true)}
                // size="xl"
                miw={150}
              >
                {LandingWelcomeData?.buttonText}
              </Button>
            </Flex>
          </BackgroundImage>
        </Stack>
      )}
    </>
  );
}

export default LandingWelcomePage;
