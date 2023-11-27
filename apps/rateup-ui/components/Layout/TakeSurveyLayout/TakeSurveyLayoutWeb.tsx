import {
  Paper,
  Text,
  Image,
  Group,
  Center,
  Select,
  Title,
  Stack,
  Space,
} from "@mantine/core";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import WelcomePage from "../WelcomePage/WelcomePage";
import Link from "next/link";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import FormModalLayout from "../../Modal/FormModalLayout";
import { notifications } from "@mantine/notifications";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";

export const TakeSurveyLayoutWeb = ({ survey, surveyThemeData, children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { start } = useRouter().query as { start?: boolean };

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile = useMediaQuery("(max-width: 480px)");

  const [startClicked, setStartClicked] = useState<boolean>(start || false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const updateVisited = useUpdateVisitedMutation();
  const updateStarted = useUpdateStartedMutation();

  const [opened, { open, close }] = useDisclosure(survey?.isProtected);
  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    if (!opened) if (survey?.isProtected && !isPasswordVerified) open();
  }, [opened]);

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

  const verifySurveyPassword = useVerifySurveyPwdMutation(
    survey?.id,
    passwordInput,
    close,
    setIsPasswordVerified,
  );

  if (!selectedLanguage && survey?.languages?.length <= 1) {
    setSelectedLanguage(survey?.languages[0]);
  }

  return (
    <QuestionCountContext.Provider
      value={{
        questionCount,
        currentQuestionNo,
        setQuestionCount,
        setCurrentQuestionNo,
      }}
    >
      <FormModalLayout
        opened={opened}
        onClose={close}
        title={"Survey Login"}
        centered
        onSubmit={() => {
          notifications.show({
            id: "load-data",
            loading: true,
            title: "Verifying Password..",
            message: `Hold on, your access is getting verified.`,
            autoClose: false,
            withCloseButton: false,
          });
          verifySurveyPassword.mutate();
        }}
        buttonTitle={"Login"}
      >
        <Text mt="lg" size="sm" c="gray">
          Hey Welcome , <br /> You need to enter password to continue.
        </Text>
        <Space h="lg" />
        <ContainedPasswordInput
          required
          label="Password"
          placeholder="Enter survey password"
          onChange={(event) => setPasswordInput(event?.target?.value)}
          my="lg"
        />
      </FormModalLayout>

      <Stack
        px={largeScreen ? "10vw" : "4vw"}
        py="3vh"
        style={{ width: "100%", minHeight: "100dvh" }}
        justify="space-between"
      >
        {/* .........Survey Header Section.......... */}
        {survey?.isPublished == true && (
          <Group justify="center">
            <Stack
              style={{
                maxHeight: isMobile ? "65px" : "100px",
                maxWidth: "30%",
              }}
            >
              <Image
                src={
                  survey?.orgLogo && survey?.orgLogo !== "REMOVED_PHOTO"
                    ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${survey?.orgLogo}`
                    : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`
                }
                alt="Logo"
                w={isMobile ? 70 : 80}
                h={isMobile ? 70 : 80}
              />
            </Stack>
          </Group>
        )}

        <Paper
          pt="-50px"
          radius="lg"
          style={{ padding: 0, margin: 0, flex: 1 }}
          display={"flex"}
        >
          {survey?.isPublished === true && survey?.active === true ? (
            survey?.isProtected && isPasswordVerified === false ? null : (
              <Paper
                radius="lg"
                bg={"#fff"}
                pb={startClicked && "xl"}
                style={{ flex: 1 }}
                w={"100%"}
              >
                {startClicked &&
                  (!selectedLanguage && survey?.languages?.length > 1 ? (
                    <SelectLang
                      languages={survey?.languages}
                      selectedLanguage={selectedLanguage}
                      setSelectedLanguage={setSelectedLanguage}
                    />
                  ) : (
                    selectedLanguage && (
                      <SelectedLanguageContext.Provider
                        value={{
                          selectedLanguage,
                          defaultLanguage: survey?.languages[0],
                        }}
                      >
                        {children}
                      </SelectedLanguageContext.Provider>
                    )
                  ))}

                {!startClicked && (
                  <WelcomePage
                    surveyThemeData={surveyThemeData}
                    onStart={handleStartClick}
                    largeScreen={largeScreen}
                  />
                )}
              </Paper>
            )
          ) : (
            <Center style={{ flex: 1 }}>
              {survey?.isPublished !== true && (
                <Group align="center" justify="center">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/bw-logo.png`}
                    alt="Logo"
                    w={isMobile ? 70 : 80}
                    h={isMobile ? 70 : 80}
                    fit={"contain"}
                  />
                  <Text c="#CDCDCD" fw={"bold"} fz={28}>
                    Survey is not available..!
                  </Text>
                </Group>
              )}
            </Center>
          )}
        </Paper>
        <Stack>
          <Group justify="center">
            <Text fz="sm">Powered by </Text>
            <Link href="/">
              <Image
                pl={10}
                src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/rateup_logo.svg`}
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

function SelectLang({ languages, selectedLanguage, setSelectedLanguage }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return (
    <>
      <Stack pl="7vw" pt="10vh">
        <Title fw={100}> Choose Your language and</Title>
        <Title> let's get started!</Title>
      </Stack>

      <Center style={{ height: isMobile ? "40vh" : "45vh" }}>
        <Select
          data={languages}
          placeholder="Select language"
          value={selectedLanguage}
          onChange={setSelectedLanguage}
        />
      </Center>
    </>
  );
}
