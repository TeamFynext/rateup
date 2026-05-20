"use client";

import { useCallback } from "react";

import { BackgroundImage, Flex } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import Confetti from "react-confetti";

import { useQuestionUpdateMutation } from "@/backend/surveys/questions/questions.query";

import { CreditsCard } from "../../../../../Card/CreditsCard.tsx";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import classes from "../../../SurveyTheme.module.css";
import {
  useEditSurveySelectedQuestion,
  useSelectedPreview,
  useSetOpenEditors,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../../../SurveyThemeContext.tsx";
import ThemeTitle from "../../ThemeTitle.tsx";
import { getInlineStyleFromStyleObj } from "../welcomepage/index.tsx";

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
      const data = {};
      switch (name) {
        case "title": {
          data["titleText"] = value;
          if (editSurveySelectedQuestion["subtitleText"])
            data["subtitleText"] = null;
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

  const titleStyleNew = getInlineStyleFromStyleObj(titleStyles);
  const subtitleStylesNew = getInlineStyleFromStyleObj(subtitleStyles);

  const newTitle = subtitle
    ? `<p style="text-align:center;"><span style="${titleStyleNew}">${title}</span></p><p style="text-align:center;"><span style="${subtitleStylesNew}">${subtitle ?? ""}</span></p>`
    : title;

  return (
    <Flex align={"center"} h="100%" style={{ backgroundColor }}>
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
              <ThemeTitle
                value={newTitle}
                onChange={(value) =>
                  handleSaveTitleSubtitleStartTextSave(value, "title")
                }
                styles={{ color: titleStyles?.color }}
              />
            </Flex>
          </form>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
