import {
  Box,
  Grid,
  Title,
  Paper,
  TextInput,
  Space,
  Text,
  Center,
  Stack,
  Container,
  Image,
  RingProgress,
  Modal,
  Group,
  Button,
  createStyles,
  Flex,
  BackgroundImage,
} from "@mantine/core";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import { usePublicWelcomeThemeByLandingId } from "../../../backend/LandingWelcomeTheme/LandingWelcomeTheme.query";


const useStyles = createStyles((theme) => ({
  ButtonStyles: {
    backgroundColor: "black",
    borderRadius: 48,
    padding: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
}));
function LandingWelcomePage({ setStartClicked, largeScreen,landingid }) {


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

  const { classes } = useStyles();


  return (
    <>
      {/* .........Survey Welcome page.......... */}
      {isLoading && <Text ta={"center"}> Loading...</Text>}
      {!isLoading && (
        <Stack
          align="center"
          justify="center"
          spacing="xl"
          sx={{
            height: "75vh",
            width:"100% !important",
            borderRadius: 18,
            // boxShadow: " rgba(0, 0, 0, 0.08) 0px 4px 12px",
          }}
          // bg={"red"}
          style={LandingWelcomeData?.bgStyles}
        >
          <BackgroundImage
            style={{
              height: "100%",
              width: "100%",
              objectFit: "contain",
              borderRadius: 18,
            }}
            src={
              LandingWelcomeData?.bgUrl && LandingWelcomeData.bgType != "bgcolor"
                ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${LandingWelcomeData.bgUrl}`
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
                sx={{ fontSize: largeScreen ? "4rem" : "3rem" }}
                tt={"capitalize"}
                mt={25}
                style={LandingWelcomeData?.headerStyles}
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
                className={classes.ButtonStyles}
                onClick={()=>setStartClicked(true)}
                // size="xl"
                miw={150}
              >
                {LandingWelcomeData?.buttonText}
              </Button>
              {/* <RateupButtonSecondary
          radius={"xl"}
          title={
            LandingWelcomeData?.buttonText ? LandingWelcomeData?.buttonText : "Go to survey"
          }
          onClick={isProtected ? open : onStart}
        /> */}
            </Flex>
          </BackgroundImage>
        </Stack>
      )}
    </>
  );
}

export default LandingWelcomePage;