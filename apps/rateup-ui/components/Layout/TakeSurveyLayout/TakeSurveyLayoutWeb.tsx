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
import {
  usePublicSurvey,
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";

import QuestionCountContext from "../../../context/QuestionCountContext";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import { usePublicWelcomeThemeBySurveyId } from "../../../backend/WelcomeTheme/welcometheme.query";
import { chownSync } from "fs";
import { webcrypto } from "crypto";
import WebFont from "webfontloader";
import ProgressBar from "../ProgressBar/ProgressBar";
import WelcomePage from "../WelcomePage/WelcomePage";



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
  useEffect(() => {
    if (survey?.welcomePageEnabled){
      setStartClicked(false);
    }else{
      setStartClicked(true);
    }
  }, [survey?.welcomePageEnabled]);

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
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`}
                alt="RateUp Logo"
              width={140}
              height={35}
              />
            </Link>
          )}
        </>
        <Paper
          p="sm"
          radius="lg"
          // shadow="lg"
          sx={{ minHeight: "75vh", height: "100%" }}
          bg={"#F7F6FB"}
        >
        <Paper radius="lg"   bg={"#fff"}>
            {/* .........Survey Header Section.......... */}

            {startClicked  ? (
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
              <WelcomePage
                onStart={handleStartClick}
                surveyId={surveyId}
                isProtected={survey?.isProtected}
                largeScreen={largeScreen}
              />
            )}
            {startClicked && children.children}
          </Paper>

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

