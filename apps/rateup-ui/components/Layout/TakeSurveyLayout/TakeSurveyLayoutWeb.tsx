import {
  Title,
  Paper,
  Text,
  Stack,
  Container,
  Image,
  Group,
} from "@mantine/core";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import {
  usePublicSurvey,
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
} from "../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useMediaQuery } from "@mantine/hooks";
import WelcomePage from "../WelcomePage/WelcomePage";
import Link from "next/link";

export const TakeSurveyLayoutWeb = ({ children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
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
      <Stack
        px={largeScreen ? "10vw" : "4vw"}
        py="3vh"
        style={{ width: "100%", minHeight: "100vh" }}
        h={"100%"}
        justify="space-between"
      >
        {/* .........Survey Header Section.......... */}

        <Group justify="flex-start">
          <Stack
            style={{ maxHeight: isMobile ? "65" : "200px", maxWidth: "30%" }}
          >
            <Image
              src={
                survey?.orgLogo && survey?.orgLogo !== "REMOVED_PHOTO"
                  ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${survey.orgLogo}`
                  : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`
              }
              alt="Logo"
              w={isMobile ? 70 : 140}
              h={isMobile ? 70 : 135}
            />
          </Stack>
          <Container fluid style={{ maxWidth: "70%" }}>
            <Stack justify="flex-start">
              <Title order={isMobile ? 4 : 2}>{survey?.title}</Title>
            </Stack>
          </Container>
        </Group>

        <Paper p="sm" radius="lg" style={{ minHeight: "75vh" }}>
          {survey?.isPublished === true && survey?.active === true ? (
            <Paper
              radius="lg"
              shadow="md"
              bg={"#fff"}
              style={{ boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 6px 0px" }}
              pb={startClicked && "xl"}
            >
              {!startClicked && (
                <WelcomePage
                  onStart={handleStartClick}
                  surveyId={surveyId}
                  isProtected={survey?.isProtected}
                  largeScreen={largeScreen}
                />
              )}
              {startClicked && <>{children.children}</>}
            </Paper>
          ) : (
            <Paper
              radius="lg"
              bg={"#fff"}
              p="30px"
              style={{
                minHeight: "70vh",
                boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
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
