import {
  ActionIcon,
  BackgroundImage,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Group,
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
import { useContext, useState } from "react";
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

export default function SurveyThemeView({ selectedType, setSelectedType }) {
  const { surveyTheme, mobileOrDesktop } = useContext(SurveyThemeContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const { surveyTheme: _surveyTheme } = surveyTheme;
  const [currentQuestionTypeCount, setCurrentQuestionTypeCount] = useState(0);
  const [currentResponse, updateResponse] = useState(null || []);
  //here subtitle, title and label are not customisable, its only added to preserve the consistency of the schema and ease of implementation.
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    title: { styles: titleStyles, title },
    button: { styles: buttonStyles, label },
    input: { primaryColor },
  } = _surveyTheme;

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
            className={classes.actionIcon}
          >
            <IconEdit style={{ width: "70%", height: "70%" }} />
          </ActionIcon>
          <Flex
            h={"100%"}
            direction={"column"}
            ff={lexend.style.fontFamily}
            justify={"center"}
          >
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
              <Text c={titleStyles?.color}>
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
            <NextPrev
              isMobile={mobileOrDesktop === PreviewTypeEnum.MOBILE}
              buttonStyles={buttonStyles}
            />
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}

function NextPrev({ isMobile, buttonStyles }) {
  return (
    <Stack
      pt={40}
      pb="md"
      style={{
        width: "100%",
        minHeight: isMobile ? "143px" : "163px",
      }}
      justify="flex-end"
    >
      <Text c={buttonStyles.backgroundColor} mb="md" size={isMobile && "sm"}>
        *Choose an option or answer to proceed!
      </Text>
      <Group justify="space-between">
        <Button
          radius={"xl"}
          title=""
          leftSection={<IconChevronLeft />}
          size={isMobile ? "sm" : "lg"}
          variant="outlined"
          style={buttonStyles}
        >
          Prev
        </Button>
        <Center>
          <RingProgress
            sections={[
              {
                value: 10,
                color: buttonStyles?.backgroundColor ?? "dark",
              },
              {
                value: 90,
                color: buttonStyles?.color ?? "dark.2",
              },
            ]}
            size={isMobile ? 55 : 80}
            thickness={isMobile ? 4 : 8}
            label={
              <Text
                c={buttonStyles?.backgroundColor ?? "dark.2"}
                fw={700}
                ta="center"
                size={isMobile ? "xs" : "sm"}
              >
                {10}%
              </Text>
            }
          />
        </Center>
        <Button
          radius={"xl"}
          size={isMobile ? "sm" : "lg"}
          rightSection={<IconChevronRight />}
          style={buttonStyles}
        >
          Submit
        </Button>
        <Button
          radius={"xl"}
          size={isMobile ? "sm" : "lg"}
          rightSection={<IconChevronRight />}
          style={buttonStyles}
        >
          Next
        </Button>
      </Group>
    </Stack>
  );
}
