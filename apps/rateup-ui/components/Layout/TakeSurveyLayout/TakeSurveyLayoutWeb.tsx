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
} from "@mantine/core";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import {
  usePublicSurvey,
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../Button/RateupButtons";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import { usePublicWelcomeThemeBySurveyId } from "../../../backend/WelcomeTheme/welcometheme.query";
import { chownSync } from "fs";
import { webcrypto } from "crypto";
import WebFont from "webfontloader";

const useStyles = createStyles((theme) => ({
  ButtonStyles: {
    backgroundColor: "black",
    borderRadius: 48,
    padding: 10,
    paddingLeft: 20,
    paddingRight: 20,
  },
}));

export const TakeSurveyLayoutWeb = ({ children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const largeScreen = useMediaQuery("(min-width: 60em)");

  const { start } = useRouter().query as { start?: boolean };
  const [startClicked, setStartClicked] = useState<boolean>(start || false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);

  const updateStarted = useUpdateStartedMutation();
  useEffect(() => {
    if (start === true) setStartClicked(true);
  }, [start]);

  const handleStartClick = () => {
    updateStarted.mutate(surveyId);
    setStartClicked(true);
  };

  if (isLoading || isError || !survey) return null;

  return (
    <QuestionCountContext.Provider
      value={{
        questionCount,
        currentQuestionNo,
        setQuestionCount,
        setCurrentQuestionNo,
      }}
    >
      <Container
        fluid
        px={largeScreen ? "10vw" : "5vw"}
        py="3vh"
        sx={{ background: "#F7F6FB", minHeight: "100vh", height: "100%" }}
      >
        <>
          {!start ? (
            <Image
              pb={30}
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
              alt="RateUp Logo"
              width={140}
              height={35}
            />
          ) : (
            <Link
              href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/cs`}
            >
              <Image
                pb={30}
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/cs-logo.jpeg`}
                alt="Govt Logo"
                width={largeScreen ? 600 : 310}
              />
            </Link>
          )}
        </>
        <Paper
          p="sm"
          radius="lg"
          // shadow="lg"
          sx={{ minHeight: "80vh", height: "100%" }}
          bg={"#F7F6FB"}
        >
          <Container fluid>
            {/* .........Survey Header Section.......... */}

            {startClicked ? (
              currentQuestionNo > 0 && (
                <Grid
                  justify="center"
                  align="center"
                  pb={largeScreen ? 100 : 10}
                  columns={24}
                >
                  <Grid.Col
                    md={4}
                    lg={4}
                    xs={24}
                    order={2}
                    orderSm={1}
                    orderXs={1}
                  >
                    <Center>
                      <Text>Question: {currentQuestionNo}</Text>
                    </Center>
                  </Grid.Col>
                  <Grid.Col
                    md={16}
                    lg={16}
                    xs={24}
                    order={1}
                    orderSm={2}
                    orderXs={2}
                  >
                    <Center>
                      <Title order={2}>{survey.title}</Title>
                    </Center>
                  </Grid.Col>
                  <Grid.Col
                    md={4}
                    lg={4}
                    xs={24}
                    order={3}
                    orderSm={3}
                    orderXs={3}
                  >
                    <Center>
                      <ProgressBar
                        currentQuestionNo={currentQuestionNo}
                        questionCount={questionCount}
                      />
                    </Center>
                  </Grid.Col>
                </Grid>
              )
            ) : (
              <Welcome
                onStart={handleStartClick}
                surveyId={surveyId}
                isProtected={survey?.isProtected}
                largeScreen={largeScreen}
              />
            )}
            {startClicked && children.children}
          </Container>

          <Center mt={20}>
            <Text fz="sm">Powered by </Text>
            <Image
              pl={10}
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
              alt="RateUp Logo"
              width={80}
              height={20}
            />
          </Center>
        </Paper>
      </Container>
    </QuestionCountContext.Provider>
  );
};

function Welcome({ onStart, isProtected, surveyId, largeScreen }) {
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
        <Image
          fit="contain"
          src={
            surveyThemeData?.logoUrl
              ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${surveyThemeData.logoUrl}`
              : ""
          }
          alt=" Logo "
          style={surveyThemeData?.logoStyles}
        />
        <Title
          order={1}
          sx={{ fontSize: largeScreen ? "4rem" : "3rem" }}
          tt={"capitalize"}
          style={surveyThemeData?.headerStyles}
        >
          {surveyThemeData?.headerText
            ? surveyThemeData?.headerText
            : "Welcome"}
        </Title>
        <Text style={surveyThemeData?.descStyles} tt={"capitalize"}>
          {surveyThemeData?.descText
            ? surveyThemeData?.descText
            : "Please fill the Survey.."}
        </Text>
        <Button
          style={surveyThemeData?.buttonStyles}
          className={classes.ButtonStyles}
          onClick={isProtected ? open : onStart}
          size="lg"
        >
          {surveyThemeData?.buttonText
            ? surveyThemeData?.buttonText
            : "Go to survey"}
        </Button>
        {/* <RateupButtonSecondary
          radius={"xl"}
          title={
            surveyThemeData?.buttonText ? surveyThemeData?.buttonText : "Go to survey"
          }
          onClick={isProtected ? open : onStart}
        /> */}
      </Stack>
    </>
  );
}

const ProgressBar = ({ currentQuestionNo, questionCount }) => {
  const progressPercentage = (currentQuestionNo / questionCount) * 100;

  return (
    <RingProgress
      size={60}
      thickness={5}
      sections={[{ value: progressPercentage, color: "black" }]}
      label={
        <Text color="black" weight={700} align="center" size="xs">
          {currentQuestionNo}/{questionCount}
        </Text>
      }
    />
  );
};
