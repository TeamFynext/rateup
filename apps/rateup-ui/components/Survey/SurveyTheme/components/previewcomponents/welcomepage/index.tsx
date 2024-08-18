import { useCallback } from "react";

import { BackgroundImage, Box, Flex, Image, Tooltip } from "@mantine/core";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import AutosaveInput from "@/components/input/AutosaveInput";

import { cordinateStyle } from "../../../../../../utils";
import { lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";
import classes from "../../../SurveyTheme.module.css";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSetOpenEditors,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext";

export default function WelcomePageThemeView({ survey }) {
  const surveyTheme = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const editSurveySelectedQuestion = useEditSurveySelectedQuestion();
  const selectedPreview = useSelectedPreview();
  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey.id,
  });
  const isWelcomePageEnabled = survey?.welcomePageEnabled;
  const setOpenEditors = useSetOpenEditors();

  const {
    welcomeTheme,
    surveyTheme: { logo },
  } = surveyTheme;

  const {
    bg: { styles, desktopbg, mobilebg },
    button: { styles: buttonStyles, position },
    subtitle: { styles: subtitleStyles },
    title: { styles: titleStyles },
  } = welcomeTheme;

  const {
    titleText: title,
    subtitleText: subtitle,
    startButtonText: startBtnLabel,
  } = editSurveySelectedQuestion || {};

  const orgLogoSrc = logo?.logo;
  const orgLogoStyles = logo?.styles;

  const handleSaveTitleSubtitleStartTextSave = useCallback(
    async (value, name) => {
      let data = {};
      switch (name) {
        case "title": {
          data["titleText"] = value;
          break;
        }
        case "subtitle": {
          data["subtitleText"] = value;
          break;
        }
        case "startBtn": {
          data["startButtonText"] = value;
          break;
        }
      }
      if (editSurveySelectedQuestion) {
        await questionUpdateMutation.mutateAsync({
          qId: editSurveySelectedQuestion["id"],
          data,
        });
      }
    },
    [editSurveySelectedQuestion],
  );

  const useSurveyBackground =
    surveyTheme["welcomeTheme"].bg.useSurveyBackground;
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyTheme,
    useSurveyBackground ? "surveyTheme" : "welcomeTheme",
    selectedPreview === "mobile",
  );

  return (
    <Flex
      align={"center"}
      h="100%"
      style={{ backgroundColor }}
      ff={lexend300.style.fontFamily}
    >
      <CreditsCard
        enableCredits={backgroundImageSrc?.startsWith(
          "https://images.unsplash.com",
        )}
        url={backgroundImageSrc}
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={backgroundImageSrc}
        >
          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            pos={"relative"}
            gap={"2rem"}
          >
            {orgLogoSrc && (
              <Image
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
              />
            )}

            <Tooltip label="Edit title">
              <Box className={classes.titleBox}>
                <AutosaveInput
                  name="title"
                  value={title}
                  onSave={handleSaveTitleSubtitleStartTextSave}
                  style={{
                    ...titleStyles,
                  }}
                />
              </Box>
            </Tooltip>
            {/* //--------------------------- */}
            <Tooltip label="Edit subtitle">
              <Box className={classes.titleBox}>
                <AutosaveInput
                  isTextArea
                  name="subtitle"
                  value={subtitle}
                  onSave={handleSaveTitleSubtitleStartTextSave}
                  style={{
                    ...subtitleStyles,
                  }}
                />
              </Box>
            </Tooltip>

            <Box
              className={classes.titleBox}
              style={{
                display: "flex",
                ...(position?.x ? cordinateStyle(position.x) : {}),
                ...(position?.y ? cordinateStyle(position.y) : {}),
              }}
            >
              <AutosaveInput
                className={classes["start-btn-input-div"]}
                name="startBtn"
                value={startBtnLabel}
                onSave={handleSaveTitleSubtitleStartTextSave}
                style={{
                  color: "inherit",
                  fontSize: "18px",
                  textAlign: "center",
                  minWidth: "150px",
                  alignSelf: "center",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  ...buttonStyles,
                  borderRadius: "2rem",
                }}
              />
            </Box>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
