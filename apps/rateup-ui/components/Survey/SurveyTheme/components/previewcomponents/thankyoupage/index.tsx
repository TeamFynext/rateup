import { useCallback, useRef } from "react";

import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import Confetti from "react-confetti";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";
import AutosaveInput from "@/components/input/AutosaveInput";

import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";
import { SelectedItemEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSetOpenEditors,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext";

export default function ThankyouPageThemeView({ survey }) {
  const webSurveyPagesTheme = useSurveyThemeContextValue();
  const surveyThemeDispatch = useSurveyThemeStateDispatch();
  const editSurveySelectedQuestion = useEditSurveySelectedQuestion();
  const selectedPreview = useSelectedPreview();
  const setOpenEditors = useSetOpenEditors();

  const questionUpdateMutation = useQuestionUpdateMutation({
    surveyId: survey.id,
  });

  const surveyThemeObj = survey?.webSurveyTheme?.theme;

  const { ref, width, height } = useElementSize();

  const { titleText: title, subtitleText: subtitle } =
    editSurveySelectedQuestion || {};

  const shouldUseSurveyTheme =
    webSurveyPagesTheme["thankyouTheme"]?.useSurveyTheme;
  const requiredThemeObj = shouldUseSurveyTheme
    ? surveyThemeObj["surveyTheme"]
    : webSurveyPagesTheme["thankyouTheme"];

  const titleStyles = requiredThemeObj?.title?.styles;
  let subtitleStyles = requiredThemeObj?.subtitle?.styles;
  if (!subtitleStyles) {
    subtitleStyles = {
      color: titleStyles?.color,
      fontWeight: "400",
      fontSize: 16,
      textAlign: "center",
    };
  }
  const confettiEnabled = requiredThemeObj?.confettiEnabled;

  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    shouldUseSurveyTheme ? surveyThemeObj : webSurveyPagesTheme,
    shouldUseSurveyTheme ? "surveyTheme" : "thankyouTheme",
    selectedPreview === "mobile",
  );

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
          ref={ref}
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={backgroundImageSrc}
        >
          {confettiEnabled && <Confetti width={width} height={height} />}

          <form style={{ width: "100%", height: "100%" }}>
            <Flex
              justify={"center"}
              align={"center"}
              h={"100%"}
              direction={"column"}
            >
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
                <Box className={classes.titleBox} mt={20} w={"50%"}>
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
            </Flex>
          </form>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
