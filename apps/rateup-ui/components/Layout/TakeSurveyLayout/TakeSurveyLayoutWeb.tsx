import {
  BackgroundImage,
  Box,
  Button,
  Center,
  Group,
  Image,
  MantineProvider,
  Paper,
  Radio,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronRight } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../context/QuestionCountContext";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { CreditsCard } from "../../Card/CreditsCard";
import FormModalLayout from "../../Modal/FormModalLayout";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext";
import { useIsSurveyThemePreviewContext } from "../../Survey/SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreveiwContext";
import { SingleSelectCard } from "../../Survey/TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import WelcomePage from "../WelcomePage/WelcomePage";
import styles from "./TakeSurveyLayoutWeb.module.css";
import LanguageSelectionPage from "../LanguageSelectionPage";
import { getBgImgAndBgColor } from "./utils";

export const TakeSurveyLayoutWeb = ({ survey, children }) => {
  const { theme: surveyThemeData } = survey?.webSurveyTheme;

  const isSurveyThemePreview = useIsSurveyThemePreviewContext();

  const orgLogoSrc = surveyThemeData.surveyTheme?.logo?.logo;
  const orgLogoStyles = surveyThemeData.surveyTheme?.logo?.styles;

  // This one is being used for preview in surveyTheme editor(TakeSurveyLayoutWeb and TakeSurvey component is also being used in surveyTheme editor).
  const selectedPreview = useSelectedPreview();

  const surveyTeamMapId = survey?.surveyTeamMapId;
  const { start } = useRouter().query as { start?: boolean };

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const [startClicked, setStartClicked] = useState<boolean>(start || false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);
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
    if (survey?.welcomePageEnabled) {
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
  }, [survey?.welcomePageEnabled]);

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

  const surveyThemeDataPrimaryColor =
    surveyThemeData?.surveyTheme?.input?.primaryColor;

  const isLanguagePageActive =
    !selectedLanguage && survey?.languages?.length > 1;
  const isWelcomeThemeActive = !startClicked;
  const useSurveyBackground =
    isWelcomeThemeActive &&
    surveyThemeData["welcomeTheme"].bg.useSurveyBackground;
  let requiredSurveyThemeObjKey = "surveyTheme";
  if (!isSurveyThemePreview && isWelcomeThemeActive && !useSurveyBackground)
    requiredSurveyThemeObjKey = "welcomeTheme";

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    requiredSurveyThemeObjKey,
    isMobile,
  );
  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  return (
    <MantineProvider
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
              // mih={"100dvh"}
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
              {(survey?.isPublished == true || isSurveyThemePreview) &&
                !isLanguagePageActive &&
                (startClicked || isSurveyThemePreview) && (
                  <Box
                    // align="center"
                    className={styles["logo-container"]}
                  >
                    {orgLogoSrc && (
                      <Image
                        src={orgLogoSrc}
                        alt="Logo"
                        style={{ ...orgLogoStyles }}
                        mah={100}
                        maw={100}
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
                      {(startClicked || isSurveyThemePreview) &&
                        (isLanguagePageActive ? (
                          <LanguageSelectionPage
                            languages={survey?.languages}
                            setSelectedLanguage={setSelectedLanguage}
                            surveyThemeData={surveyThemeData}
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

                      {!startClicked && !isSurveyThemePreview && (
                        <WelcomePage
                          surveyThemeData={surveyThemeData?.welcomeTheme}
                          onStart={handleStartClick}
                          largeScreen={largeScreen}
                          orgLogoSrc={orgLogoSrc}
                          orgLogoStyles={orgLogoStyles}
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
            </BackgroundImage>
          </CreditsCard>
        </Stack>
      </QuestionCountContext.Provider>
    </MantineProvider>
  );
};
