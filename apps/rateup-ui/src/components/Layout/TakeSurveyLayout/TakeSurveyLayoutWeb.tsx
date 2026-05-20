"use client";

import { useEffect, useState } from "react";

import {
  BackgroundImage,
  Box,
  Center,
  Group,
  Image,
  MantineProvider,
  Paper,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageType } from "@/types/enums.ts";
import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "@/backend/surveys/surveys.query";
import { getQuestionsLength } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/util.tsx";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { CreditsCard } from "../../Card/CreditsCard.tsx";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput.tsx";
import FormModalLayout from "../../Modal/FormModalLayout.tsx";
import {
  useIsSurveyThemeEditView,
  useIsSurveyThemePreview,
} from "../../Survey/SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext.tsx";
import LanguageSelectionPage from "../LanguageSelectionPage/index.tsx";
import WelcomePage from "../WelcomePage/WelcomePage.tsx";
import styles from "./TakeSurveyLayoutWeb.module.css";
import { getBgImgAndBgColor } from "./utils.ts";

export const TakeSurveyLayoutWeb = ({ survey, children, previewId = "" }) => {
  const { theme: surveyThemeData } = survey?.webSurveyTheme;
  const pagesThemeData = survey?.webSurveyPagesTheme;

  const isSurveyThemePreview = useIsSurveyThemePreview();
  const isSurveyThemeEditView = useIsSurveyThemeEditView();

  const orgLogoSrc = surveyThemeData.surveyTheme?.logo?.logo;
  const orgLogoStyles = surveyThemeData.surveyTheme?.logo?.styles;

  // This one is being used for preview in surveyTheme editor
  // (TakeSurveyLayoutWeb and TakeSurvey component is also being used in surveyTheme editor).
  const selectedPreview = useSelectedPreview();

  const surveyTeamMapId = survey?.surveyTeamMapId;
  const searchParams = useSearch({ strict: false });
  const start = searchParams?.start === "true";

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const [isWelcomePageEnabled, setIsWelcomePageEnabled] = useState(
    survey?.questions?.some((q) => q.type === PageType.Welcome) || false,
  );
  const [startClicked, setStartClicked] = useState<boolean>(start || false);

  const [selectedLanguage, setSelectedLanguage] = useState("");

  const updateVisited = useUpdateVisitedMutation(survey?.id);
  const updateStarted = useUpdateStartedMutation(survey?.id);

  const [opened, { open, close }] = useDisclosure(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    const isLoginInputModalRequired =
      survey?.isPublished &&
      survey?.active &&
      survey?.isProtected &&
      !isPasswordVerified &&
      !isSurveyThemePreview;
    if (isLoginInputModalRequired) {
      if (!opened) open();
    }
  }, [opened, isSurveyThemePreview]);

  useEffect(() => {
    if (start === true) setStartClicked(true);
  }, [start]);

  useEffect(() => {
    if (isWelcomePageEnabled) {
      setStartClicked(false);
      surveyTeamMapId && updateVisited.mutate(surveyTeamMapId);
    } else {
      setStartClicked(true);
      if (surveyTeamMapId) {
        updateVisited.mutate(surveyTeamMapId, {
          onSuccess: () => {
            updateStarted.mutate(surveyTeamMapId);
          },
        });
      }
    }
  }, [isWelcomePageEnabled]);

  useEffect(() => {
    setIsWelcomePageEnabled(
      survey?.questions?.some((q) => q.type === PageType.Welcome),
    );
  }, [survey?.questions]);

  const handleStartClick = () => {
    surveyTeamMapId && updateStarted.mutate(surveyTeamMapId);
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

  if (!selectedLanguage && isSurveyThemeEditView) {
    setSelectedLanguage("English");
  }

  const surveyThemeDataPrimaryColor =
    surveyThemeData?.surveyTheme?.input?.primaryColor;

  const isLanguagePageActive =
    !selectedLanguage &&
    survey?.languages?.length > 1 &&
    !isSurveyThemeEditView;
  const isWelcomePageActive = !startClicked && isWelcomePageEnabled;
  const useSurveyBackground =
    isWelcomePageActive && pagesThemeData["welcomeTheme"]?.useSurveyTheme;
  let requiredSurveyThemeObjKey = "surveyTheme";
  let requiredThemeData = surveyThemeData;
  if (isWelcomePageActive && !useSurveyBackground) {
    requiredSurveyThemeObjKey = "welcomeTheme";
    requiredThemeData = pagesThemeData;
  }

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    requiredThemeData,
    requiredSurveyThemeObjKey,
    isMobile,
  );

  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  const getRootElementForMantineProvider: () => HTMLElement = () => {
    if (!(typeof window === "undefined")) {
      if (isSurveyThemePreview) {
        return document.getElementById(previewId);
      } else {
        return document.documentElement;
      }
    }
    return undefined;
  };

  const questionsArr = survey?.questions;

  if (!getQuestionsLength(survey)) {
    return (
      <Center style={{ height: "100vh" }}>
        <Text fw={500}>No Questions found!</Text>
      </Center>
    );
  }

  return (
    <MantineProvider
      cssVariablesSelector={isSurveyThemePreview ? `#${previewId}` : ":root"}
      getRootElement={getRootElementForMantineProvider}
      theme={{
        colors: {
          // @ts-ignore
          primaryColor: Array(10).fill(
            surveyThemeDataPrimaryColor === "rateup-blue" ||
              !surveyThemeDataPrimaryColor
              ? "#1C518E"
              : surveyThemeDataPrimaryColor,
          ),
        },
        primaryColor: "primaryColor",
      }}
    >
      <FormModalLayout
        opened={opened}
        onClose={close}
        title={"Survey Login"}
        centered
        onSubmit={() => {
          toast.loading(`Hold on, your access is getting verified.`, {
            id: "load-data",
          });
          verifySurveyPassword.mutate();
        }}
        buttonTitle={"Login"}
        submitBtnColor={"var(--tertiary-color)"}
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
        className={`${styles["take-survey-layout-web-root-div"]} take-survey-layout-web-root-div`}
        w={"100%"}
        // mih={"100dvh"}
        style={{ backgroundColor }}
      >
        <CreditsCard
          enableCredits={isUnsplashImage && !isLanguagePageActive}
          url={backgroundImageSrc}
        >
          <BackgroundImage
            h={"100%"}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              objectFit: "contain",
            }}
            src={backgroundImageSrc}
          >
            {/* .........Survey Header Section.......... */}
            {!isLanguagePageActive && startClicked && (
              <Box className={styles["logo-container"]}>
                {orgLogoSrc && (
                  <Image
                    src={orgLogoSrc}
                    alt="Logo"
                    style={{ ...orgLogoStyles }}
                    mah={200}
                    maw={200}
                    fit="contain"
                  />
                )}
              </Box>
            )}

            <Paper
              pt="-50px"
              radius={0}
              bg="transparent"
              style={{ padding: 0, margin: 0, flex: 1 }}
              display={"flex"}
            >
              {(survey?.isPublished && survey?.active) ||
              isSurveyThemePreview ? (
                survey?.isProtected &&
                !isPasswordVerified &&
                !isSurveyThemePreview ? null : (
                  <Paper
                    radius={0}
                    w={"100%"}
                    bg={"transparent"}
                    style={{ overflow: "hidden" }}
                  >
                    {startClicked &&
                      (isLanguagePageActive ? (
                        <LanguageSelectionPage
                          languages={survey?.languages}
                          setSelectedLanguage={setSelectedLanguage}
                          pagesThemeData={pagesThemeData}
                          surveyThemeData={surveyThemeData}
                          questionsArr={questionsArr}
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

                    {isWelcomePageEnabled && !startClicked && (
                      <WelcomePage
                        surveyThemeData={surveyThemeData}
                        pagesThemeData={pagesThemeData}
                        onStart={handleStartClick}
                        largeScreen={largeScreen}
                        orgLogoSrc={orgLogoSrc}
                        orgLogoStyles={orgLogoStyles}
                        questionsArr={questionsArr}
                        isMobile={isMobile}
                      />
                    )}
                  </Paper>
                )
              ) : (
                <Center style={{ flex: 1 }}>
                  {(survey?.isPublished !== true || !survey?.active) && (
                    <Group align="center" justify="center">
                      <Image
                        src={`${import.meta.env.VITE_FRONTEND_URL}/images/bw-logo.png`}
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
          </BackgroundImage>
        </CreditsCard>
      </Stack>
    </MantineProvider>
  );
};
