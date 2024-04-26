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
import { useCallback, useEffect, useRef, useState } from "react";
import { useSurveyTheme } from "../../../backend/surveyTheme/surveyTheme.query";
import {
  useUpdateStartedMutation,
  useUpdateVisitedMutation,
  useVerifySurveyPwdMutation,
} from "../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../context/QuestionCountContext";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { CreditsCard } from "../../Card/CreditsCard";
import FormModalLayout from "../../Modal/FormModalLayout";
import { getImageUrl } from "../../Survey/SurveyTheme/SurveyTheme.utils";
import { SurveyTheme } from "../../Survey/SurveyTheme/surveyTheme.types";
import { SingleSelectCard } from "../../Survey/TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import WelcomePage from "../WelcomePage/WelcomePage";
import RateupLoader from "../../Loaders/RateupLoader";
import { surveyUploadsPath } from "../../../utils/constants";
import styles from "./TakeSurveyLayoutWeb.module.css";

export const TakeSurveyLayoutWeb = ({
  survey,
  children,
}: {
  survey: any;
  children: any;
}) => {
  const { data: surveyThemeData, isLoading } = useSurveyTheme(
    survey?.webSurveyThemeId,
  ) as {
    data: SurveyTheme;
    isLoading: boolean;
  };

  let orgLogo = null;
  let orgLogoStyles = null;
  let orgLogoSrc = null;
  if (surveyThemeData) {
    orgLogo = surveyThemeData.surveyTheme?.logo?.logo;
    orgLogoStyles = surveyThemeData.surveyTheme?.logo?.styles;
    if (orgLogo && orgLogo.length) {
      orgLogoSrc = `${surveyUploadsPath}${orgLogo}`;
    }
  }

  const welcomeThemeStyles = surveyThemeData?.welcomeTheme?.bg?.styles ?? {};
  const surveyThemesStyles = surveyThemeData?.surveyTheme?.bg?.styles ?? {};

  const surveyTeamMapId = survey?.surveyTeamMapId;
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
      surveyTeamMapId && updateVisited.mutate(surveyTeamMapId);
    } else {
      setStartClicked(true);
      surveyTeamMapId && updateVisited.mutate(surveyTeamMapId);
      surveyTeamMapId && updateStarted.mutate(surveyTeamMapId);
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

  if (isLoading) return <RateupLoader h={"100dvh"} />;

  const surveyThemeDataPrimaryColor =
    surveyThemeData?.surveyTheme?.input?.primaryColor;

  const takeSurveyLayoutWebRootStyles = !startClicked
    ? {
        ...welcomeThemeStyles,
      }
    : {
        ...surveyThemesStyles,
        overflow: "hidden",
      };

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
          className={styles["take-survey-layout-web-root-div"]}
          w={"100%"}
          // mih={"100dvh"}
          style={takeSurveyLayoutWebRootStyles}
        >
          <CreditsCard
            enableCredits={
              !startClicked
                ? isMobile
                  ? surveyThemeData?.welcomeTheme?.bg?.unsplashImage?.mobile
                  : surveyThemeData?.welcomeTheme?.bg?.unsplashImage?.desktop
                : isMobile
                  ? surveyThemeData?.surveyTheme?.bg?.unsplashImage?.mobile
                  : surveyThemeData?.surveyTheme?.bg?.unsplashImage?.desktop
            }
            url={
              isMobile && surveyThemeData?.welcomeTheme?.bg?.mobilebg
                ? surveyThemeData?.welcomeTheme?.bg?.mobilebg
                : surveyThemeData?.welcomeTheme?.bg?.desktopbg
            }
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
              src={
                !startClicked
                  ? surveyThemeData?.welcomeTheme?.bg?.desktopbg ||
                    surveyThemeData?.welcomeTheme?.bg?.mobilebg
                    ? getImageUrl(
                        isMobile && surveyThemeData?.welcomeTheme?.bg?.mobilebg
                          ? surveyThemeData?.welcomeTheme?.bg?.mobilebg
                          : surveyThemeData?.welcomeTheme?.bg?.desktopbg,
                        isMobile
                          ? surveyThemeData?.welcomeTheme?.bg?.unsplashImage
                              ?.mobile
                          : surveyThemeData?.welcomeTheme?.bg?.unsplashImage
                              ?.desktop,
                      )
                    : ""
                  : surveyThemeData?.surveyTheme?.bg?.desktopbg ||
                      surveyThemeData?.surveyTheme?.bg?.mobilebg
                    ? getImageUrl(
                        isMobile && surveyThemeData?.surveyTheme?.bg?.mobilebg
                          ? surveyThemeData?.surveyTheme?.bg?.mobilebg
                          : surveyThemeData?.surveyTheme?.bg?.desktopbg,
                        isMobile
                          ? surveyThemeData?.surveyTheme?.bg?.unsplashImage
                              ?.mobile
                          : surveyThemeData?.surveyTheme?.bg?.unsplashImage
                              ?.desktop,
                      )
                    : ""
              }
            >
              {/* .........Survey Header Section.......... */}
              {survey?.isPublished == true && !!startClicked && (
                <Group justify="center" mt={"3vh"} mb={"0.625rem"}>
                  <Stack
                    style={{
                      maxHeight: isMobile ? "65px" : "100px",
                      maxWidth: "30%",
                    }}
                  >
                    {orgLogoSrc && (
                      <Image
                        src={orgLogoSrc}
                        alt="Logo"
                        h={isMobile ? 60 : 80}
                        style={{ ...orgLogoStyles }}
                      />
                    )}
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
                      w={"100%"}
                      bg={"transparent"}
                      style={{ overflow: "hidden" }}
                    >
                      {startClicked &&
                        (!selectedLanguage && survey?.languages?.length > 1 ? (
                          <SelectLang
                            languages={survey?.languages}
                            selectedLanguage={selectedLanguage}
                            setSelectedLanguage={setSelectedLanguage}
                            surveyTheme={surveyThemeData?.surveyTheme}
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

function SelectLang({
  languages,
  selectedLanguage,
  setSelectedLanguage,
  surveyTheme,
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [lang, setLang] = useState(languages[0]);
  return (
    <Stack
      justify="space-between"
      align="center"
      style={{ height: isMobile ? "60vh" : "65vh" }}
    >
      <Stack align="center">
        <Title order={isMobile ? 2 : 1} style={surveyTheme?.title?.styles}>
          Let's begin!
        </Title>
        <Title
          order={isMobile ? 2 : 1}
          fw={100}
          style={surveyTheme?.subtitle?.styles}
        >
          Select a language
        </Title>
      </Stack>
      <Box miw={200}>
        <Radio.Group value={lang} onChange={setLang} mr={"sm"} w={"100%"}>
          <SingleSelectCard data={languages} selectedValue={lang} sizeTrim />
        </Radio.Group>
      </Box>
      <Group justify="center" mt="xl">
        <Button
          radius={"xl"}
          onClick={() => setSelectedLanguage(lang)}
          size={isMobile ? "sm" : "lg"}
          color="var(--tertiary-color)"
          rightSection={<IconChevronRight />}
          style={surveyTheme?.button?.styles}
        >
          Start Survey
        </Button>
      </Group>
    </Stack>
  );
}
