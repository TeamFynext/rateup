import { Paper, Text, Stack, Image, Group } from "@mantine/core";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
} from "../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useMediaQuery } from "@mantine/hooks";
import WelcomePage from "../WelcomePage/WelcomePage";
import Link from "next/link";

export const TakeSurveyLayoutWeb = ({ survey, surveyThemeData, children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { start } = useRouter().query as { start?: boolean };
  const [startClicked, setStartClicked] = useState<boolean>(start || false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);

  const updateVisited = useUpdateVisitedMutation();
  const updateStarted = useUpdateStartedMutation();

  useEffect(() => {
    if (start === true) setStartClicked(true);
  }, [start]);
  useEffect(() => {
    if (survey?.welcomePageEnabled) {
      setStartClicked(false);
      surveyId && updateVisited.mutate(surveyId);
    } else {
      setStartClicked(true);
      surveyId && updateVisited.mutate(surveyId);
      surveyId && updateStarted.mutate(surveyId);
    }
  }, [survey?.welcomePageEnabled]);

  const handleStartClick = () => {
    surveyId && updateStarted.mutate(surveyId);
    setStartClicked(true);
  };

  return (
    <QuestionCountContext.Provider
      value={{
        questionCount,
        currentQuestionNo,
        setQuestionCount,
        setCurrentQuestionNo,
      }}
    >
      <Stack
        px={largeScreen ? "10vw" : "4vw"}
        py="3vh"
        style={{ width: "100%", minHeight: "100vh" }}
        h={"100%"}
        justify="space-between"
      >
        {/* .........Survey Header Section.......... */}

        <Group justify="center">
          <Stack
            style={{ maxHeight: isMobile ? "65" : "100px", maxWidth: "30%" }}
          >
            <Image
              src={
                survey?.orgLogo && survey?.orgLogo !== "REMOVED_PHOTO"
                  ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${survey?.orgLogo}`
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`
              }
              alt="Logo"
              w={isMobile ? 70 : 80}
              h={isMobile ? 70 : 80}
            />
          </Stack>
        </Group>

        <Paper
          pt="-50px"
          radius="lg"
          style={{ padding: 0, margin: 0, minHeight: "75vh" }}
        >
          {survey?.isPublished === true && survey?.active === true ? (
            <Paper radius="lg" bg={"#fff"} pb={startClicked && "xl"}>
              {!startClicked && (
                <WelcomePage
                  surveyThemeData={surveyThemeData}
                  onStart={handleStartClick}
                  surveyId={survey?.id}
                  isProtected={survey?.isProtected}
                  largeScreen={largeScreen}
                />
              )}
              {startClicked && <>{children}</>}
            </Paper>
          ) : (
            <Paper
              radius="lg"
              bg={"#fff"}
              p="30px"
              style={{
                minHeight: "70vh",
              }}
            >
              <Stack align="center" h="50vh" justify="space-around">
                <Text size="xl" c="red" fw="600">
                  {survey?.isPublished !== true
                    ? "Survey is not available..!"
                    : "Survey is not available..!"}
                </Text>
              </Stack>
            </Paper>
          )}
        </Paper>

        <Stack>
          <Group justify="center">
            <Text fz="sm">Powered by </Text>
            <Link href="/">
              <Image
                pl={10}
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`}
                alt="RateUp Logo"
                w={50}
                h={30}
              />
            </Link>
          </Group>
        </Stack>
      </Stack>
    </QuestionCountContext.Provider>
  );
};
