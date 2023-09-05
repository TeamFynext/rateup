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
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  usePublicSurvey,
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";
import { usePublicWelcomeThemeBySurveyId } from "../../../backend/WelcomeTheme/welcometheme.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";

const useStyles = createStyles((theme) => ({
  ButtonStyles: {
    backgroundColor: "black",
    borderRadius: 48,
    padding: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
}));

function WelcomePage({ onStart, isProtected, surveyId, largeScreen }) {
  const [opened, { open, close }] = useDisclosure(false);

  const [passwordInput, setPasswordInput] = useState("");

  const updateSurveyPassword = useVerifySurveyPwdMutation(
    surveyId,
    passwordInput,
    onStart
  );

  const updateVisited = useUpdateVisitedMutation();

  useEffect(() => {
    if (surveyId) updateVisited.mutate(surveyId);
  }, []);

  //-----------get welcome page styles and content-------------
  const {
    isLoading,
    error,
    data: surveyThemeData,
  } = usePublicWelcomeThemeBySurveyId(surveyId);
  // if (isLoading) return <div>Loading...</div>
  // console.log(isLoading,"lood valooo")

  useEffect(() => {
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

  let WebFont = undefined;
  useEffect(() => {
    (async () => {
      if (window) {
        WebFont = await import("webfontloader");
      }
    })();
  }, [window]);

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
      <Modal
        opened={opened}
        onClose={close}
        title="Survey Login"
        centered
        size="sm"
      >
        <Text size="sm" color="gray">
          Hey Welcome , <br /> You need to enter password to continue.
        </Text>
        <Space h="lg" />

        <Box pt={20}>
          <TextInput
            required
            label="Password"
            placeholder="Enter survey password"
            onChange={(event) => setPasswordInput(event.target.value)}
          />
        </Box>
        <Group position="center" pt={40}>
          <RateupButtonPrimary
            onClick={() => updateSurveyPassword.mutate()}
            title={"Login"}
            // disabled={!isNameValid}
          />
        </Group>
      </Modal>

      {/* .........Survey Welcome page.......... */}

      {isLoading && <Text ta={"center"}> Loading...</Text>}
      {!isLoading && (
        <Stack
          align="center"
          justify="center"
          spacing="xl"
          sx={{
            height: "75vh",
            borderRadius: 18,
            boxShadow: " rgba(0, 0, 0, 0.08) 0px 4px 12px",
          }}
          bg={"white"}
          style={surveyThemeData?.bgStyles}
        >
          <BackgroundImage
            style={{
              height: "100%",
              width: "100%",
              objectFit: "contain",
              borderRadius: 18,
            }}
            src={
              surveyThemeData?.bgUrl && surveyThemeData.bgType != "bgcolor"
                ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData.bgUrl}`
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
                  src={`${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData.logoUrl}`}
                  alt=" Logo "
                  style={surveyThemeData?.logoStyles}
                />
              )}
              <Title
                order={1}
                sx={{ fontSize: largeScreen ? "4rem" : "3rem" }}
                tt={"capitalize"}
                mt={25}
                style={surveyThemeData?.headerStyles}
              >
                {surveyThemeData?.headerText}
              </Title>
              <Text
                mt={20}
                style={surveyThemeData?.descStyles}
                tt={"capitalize"}
              >
                {surveyThemeData?.descText}
              </Text>
              <Button
                mt={20}
                style={surveyThemeData?.buttonStyles}
                className={classes.ButtonStyles}
                onClick={isProtected ? open : onStart}
                // size="xl"
                w={150}
              >
                {surveyThemeData?.buttonText}
              </Button>
              {/* <RateupButtonSecondary
          radius={"xl"}
          title={
            surveyThemeData?.buttonText ? surveyThemeData?.buttonText : "Go to survey"
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

export default WelcomePage;
