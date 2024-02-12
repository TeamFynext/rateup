import {
  Paper,
  Text,
  Image,
  Group,
  Center,
  Title,
  Stack,
  Space,
  SegmentedControl,
  Button,
  MantineProvider,
  BackgroundImage,
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
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import FormModalLayout from "../../Modal/FormModalLayout";
import { notifications } from "@mantine/notifications";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import RateupRedirectCard from "../../Card/RateupRedirectCard";
import { IconChevronRight } from "@tabler/icons-react";
import { useSurveyTheme } from "../../../backend/surveyTheme/surveyTheme.query";
import { SurveyTheme } from "../../Survey/SurveyTheme/surveyTheme.types";
import { getImageUrl } from "../../Survey/SurveyTheme/SurveyTheme.utils";
import { CreditsCard } from "../../Card/CreditsCard";
export const TakeSurveyLayoutWeb = ({
  survey,
  children,
}: {
  survey: any;
  children: any;
}) => {
  const { data: surveyThemeData, isLoading } = useSurveyTheme(survey?.id) as {
    data: SurveyTheme;
    isLoading: boolean;
  };
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
  if (isLoading) return <div>Loading...</div>;
  const { surveyTheme, welcomeTheme } = surveyThemeData;
  return (
    <MantineProvider theme={{ primaryColor: surveyTheme.input.primaryColor }}>
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
          w={"100%"}
          mih={"100dvh"}
          style={
            !startClicked ? welcomeTheme?.bg?.styles : surveyTheme?.bg?.styles
          }
        >
          <CreditsCard
            enableCredits={
              !startClicked
                ? isMobile
                  ? welcomeTheme?.bg?.unsplashImage?.mobile
                  : welcomeTheme?.bg?.unsplashImage?.desktop
                : isMobile
                ? surveyTheme?.bg?.unsplashImage?.mobile
                : surveyTheme?.bg?.unsplashImage?.desktop
            }
            url={
              isMobile && welcomeTheme?.bg?.mobilebg
                ? welcomeTheme?.bg?.mobilebg
                : welcomeTheme?.bg?.desktopbg
            }
          >
            <BackgroundImage
              mih={"100dvh"}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                objectFit: "contain",
              }}
              src={
                !startClicked
                  ? welcomeTheme?.bg?.desktopbg || welcomeTheme?.bg?.mobilebg
                    ? getImageUrl(
                        isMobile && welcomeTheme?.bg?.mobilebg
                          ? welcomeTheme?.bg?.mobilebg
                          : welcomeTheme?.bg?.desktopbg,
                        isMobile
                          ? welcomeTheme?.bg?.unsplashImage?.mobile
                          : welcomeTheme?.bg?.unsplashImage?.desktop,
                      )
                    : ""
                  : surveyTheme?.bg?.desktopbg || surveyTheme?.bg?.mobilebg
                  ? getImageUrl(
                      isMobile && surveyTheme?.bg?.mobilebg
                        ? surveyTheme?.bg?.mobilebg
                        : surveyTheme?.bg?.desktopbg,
                      isMobile
                        ? surveyTheme?.bg?.unsplashImage?.mobile
                        : surveyTheme?.bg?.unsplashImage?.desktop,
                    )
                  : ""
              }
            >
              {/* .........Survey Header Section.......... */}
              {survey?.isPublished == true && !!startClicked && (
                <Group justify="center" mt={"3vh"}>
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
                radius={0}
                bg="transparent"
                style={{ padding: 0, margin: 0, flex: 1 }}
                display={"flex"}
              >
                {survey?.isPublished === true && survey?.active === true ? (
                  survey?.isProtected && isPasswordVerified === false ? null : (
                    <Paper
                      radius={0}
                      pb={largeScreen && startClicked && "xl"}
                      w={"100%"}
                      bg={"transparent"}
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
                          surveyThemeData={welcomeTheme}
                          onStart={handleStartClick}
                          largeScreen={largeScreen}
                        />
                      )}
                    </Paper>
                  )
                ) : (
                  <Center style={{ flex: 1 }}>
                    {(survey?.isPublished !== true || !survey?.active) && (
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

              {!!startClicked && <RateupRedirectCard />}
            </BackgroundImage>
          </CreditsCard>
        </Stack>
      </QuestionCountContext.Provider>
    </MantineProvider>
  );
};

function SelectLang({ languages, selectedLanguage, setSelectedLanguage }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [lang, setLang] = useState(languages[0]);

  return (
    <Stack
      justify="space-between"
      align="center"
      style={{ height: isMobile ? "60vh" : "65vh" }}
    >
      <Stack align="center">
        <Title order={isMobile ? 2 : 1}> let's begin!</Title>
        <Title order={isMobile ? 2 : 1} fw={100}>
          Select a language
        </Title>
      </Stack>

      <SegmentedControl
        data={languages}
        placeholder="Select language"
        value={lang}
        onChange={setLang}
        orientation={isMobile ? "vertical" : "horizontal"}
        color="var(--tertiary-color)"
        size="md"
        style={{
          root: {
            maxWidth: "60vw",
          },
          label: {
            fontSize: "16px",
          },
        }}
      />

      <Group justify="center" mt="xl">
        <Button
          radius={"xl"}
          onClick={() => setSelectedLanguage(lang)}
          size={isMobile ? "sm" : "lg"}
          color="dark"
          rightSection={<IconChevronRight />}
        >
          Start Survey
        </Button>
      </Group>
    </Stack>
  );
}
