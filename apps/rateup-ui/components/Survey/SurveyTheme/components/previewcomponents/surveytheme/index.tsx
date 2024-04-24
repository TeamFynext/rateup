import {
  ActionIcon,
  BackgroundImage,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Image,
  MantineProvider,
  RingProgress,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
} from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../../context/SelectedLanguage";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import QuestionTypePreview from "../../../../Question/Previews/QuestionTypePreview";
import { questionTypeEnumArray } from "../../../SurveyTheme.constants";
import { PreviewTypeEnum, SelectedItemEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import {
  getFeaturesBasedOnQuestionType,
  getImageUrl,
} from "../../../SurveyTheme.utils";
import { SurveyThemeContext } from "../../../SurveyThemeContext";
import { surveyUploadsPath } from "../../../../../../utils/constants";
import NextPrevPreview from "./NextPrevPreview";

export default function SurveyThemeView({ selectedType, setSelectedType }) {
  const { surveyTheme, mobileOrDesktop } = useContext(SurveyThemeContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const { surveyTheme: _surveyTheme } = surveyTheme;
  const [currentQuestionTypeCount, setCurrentQuestionTypeCount] = useState(0);
  const [currentResponse, updateResponse] = useState(null || []);
  //here subtitle, title and label are not customisable, its only added to preserve the consistency of the schema and ease of implementation.
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    title: { styles: titleStyles, title, subtitleFontSize },
    button: { styles: buttonStyles, label },
    input: { primaryColor },
    logo: orgLogoStylesObj,
  } = _surveyTheme;

  let orgLogoStylesObject = orgLogoStylesObj;
  if (!orgLogoStylesObject) {
    orgLogoStylesObject = {
      logo: "",
      styles: {
        width: 50,
        height: 50,
      },
    };
  }
  const { logo: orgLogo, styles: orgLogoStyles } = orgLogoStylesObject;
  const [orgLogoSrc, setOrgLogoSrc] = useState("");
  useEffect(() => {
    let src = null;
    if ((orgLogo as any) instanceof File) {
      src = URL.createObjectURL(orgLogo as any);
    } else if (typeof orgLogo === "string" && orgLogo.length) {
      src = `${surveyUploadsPath}${orgLogo}`;
    }
    setOrgLogoSrc(src);
    () => {
      URL.revokeObjectURL(orgLogoSrc);
    };
  }, [orgLogo]);

  return (
    <Flex
      align={"center"}
      h="100%"
      style={styles}
      onClick={(e) => {
        e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
      }}
      ff={lexend300.style.fontFamily}
    >
      <CreditsCard
        enableCredits={unsplashImage?.[mobileOrDesktop]}
        url={
          mobileOrDesktop === PreviewTypeEnum.DESKTOP
            ? encodeURI(desktopbg)
            : encodeURI(mobilebg)
        }
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={getImageUrl(
            mobileOrDesktop === PreviewTypeEnum.DESKTOP ? desktopbg : mobilebg,
            unsplashImage?.[mobileOrDesktop],
          )}
        >
          <ActionIcon
            variant="default"
            size="md"
            radius="lg"
            onClick={(e) => {
              e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
            }}
            className={`${classes.actionIcon} ${classes.bgActionIcon}`}
          >
            <IconEdit style={{ width: "70%", height: "70%" }} />
          </ActionIcon>
          <Flex
            h={"100%"}
            direction={"column"}
            ff={lexend.style.fontFamily}
            justify={"center"}
            gap={"2rem"}
          >
            {orgLogoSrc && (
              <Image
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
              />
            )}

            <Box className={classes.titleBox} w={"fit-content"}>
              <ActionIcon
                variant="default"
                radius="lg"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(), setSelectedType(SelectedItemEnum.TITLE);
                }}
                className={classes.actionIcon}
              >
                <IconEdit style={{ width: "70%", height: "70%" }} />
              </ActionIcon>
              <Text style={titleStyles}>Why is the sky blue?</Text>
              <Text
                c={titleStyles?.color}
                style={{ fontSize: subtitleFontSize ?? 16 }}
              >
                This classic question is often asked by curious minds.
              </Text>
            </Box>
            <Stack align="center" style={{ flex: 1 }} mt={"lg"}>
              <ScrollArea
                offsetScrollbars
                scrollbarSize={5}
                m="auto"
                style={{
                  width: "100%",
                  maxHeight: "220px",
                }}
                p={"xs"}
              >
                <MantineProvider
                  theme={{
                    colors: {
                      // @ts-ignore
                      primaryColor: Array(10).fill(
                        primaryColor === "rateup-blue" || !primaryColor
                          ? "#1C518E"
                          : primaryColor,
                      ),
                    },
                    primaryColor: "primaryColor",
                  }}
                >
                  <CurrentResponsesContext.Provider
                    value={{ response: currentResponse, updateResponse }}
                  >
                    <QuestionTypePreview
                      choices={[1, 2, 3, 4]}
                      features={getFeaturesBasedOnQuestionType(
                        selectedLanguage,
                        questionTypeEnumArray[currentQuestionTypeCount],
                      )}
                      type={questionTypeEnumArray[currentQuestionTypeCount]}
                      tnc={{
                        title: "I agree",
                        content:
                          "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
                        urlTitle: "terms and conditions",
                      }}
                    />
                  </CurrentResponsesContext.Provider>
                </MantineProvider>
              </ScrollArea>
              <Group mt="auto" justify="right" w={"100%"} align="center">
                <Badge color={`${primaryColor}`}>
                  {questionTypeEnumArray[currentQuestionTypeCount]}
                </Badge>
                <Group>
                  <Button
                    variant="white"
                    radius={"xl"}
                    disabled={currentQuestionTypeCount === 0}
                    onClick={() => {
                      if (currentQuestionTypeCount === 0) return;
                      setCurrentQuestionTypeCount(currentQuestionTypeCount - 1);
                      updateResponse(null);
                    }}
                  >
                    <IconChevronLeft />
                  </Button>

                  <Button
                    variant="white"
                    radius={"xl"}
                    disabled={
                      currentQuestionTypeCount ===
                      questionTypeEnumArray.length - 1
                    }
                    onClick={() => {
                      if (
                        currentQuestionTypeCount ===
                        questionTypeEnumArray.length - 1
                      )
                        return;
                      setCurrentQuestionTypeCount(currentQuestionTypeCount + 1);
                      updateResponse(null);
                    }}
                  >
                    <IconChevronRight />
                  </Button>
                </Group>
              </Group>
            </Stack>
            <NextPrevPreview
              isMobile={mobileOrDesktop === PreviewTypeEnum.MOBILE}
              buttonStyles={buttonStyles}
            />
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
