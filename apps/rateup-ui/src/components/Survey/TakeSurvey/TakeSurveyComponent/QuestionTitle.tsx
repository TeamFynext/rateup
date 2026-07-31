import { useContext, useEffect } from "react";
import type { CSSProperties } from "react";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";

import { getReplacedTitleFromVariable } from "./util.tsx";

import classes from "./TakeSurvey.module.css";

function QuestionTitle({
  largeScreen,
  themeStyles,
  responses,
  surveyId,
  setAlignment,
}: {
  largeScreen: boolean;
  themeStyles?: CSSProperties;
  responses: QuestionResponse[];
  surveyId: string;
  setAlignment: (alignment: string) => void;
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const data = {
    title: selectedQ?.title[selectedLanguage],
    componentName: "variable-component",
    prop: "label",
    responses,
    surveyId,
    isPublicPage: true,
  };

  const replacedTitle = getReplacedTitleFromVariable(data) ?? selectedQ?.title[selectedLanguage];

  useEffect(() => {
    const firstAlignment = getFirstLineAlignmentFromHTML(selectedQ?.title[selectedLanguage]);
    setAlignment(firstAlignment);
  }, [selectedQ]);

  return replacedTitle ? (
    <div
      style={themeStyles}
      className={classes.questionRichText}
      dangerouslySetInnerHTML={{ __html: replacedTitle }}
    />
  ) : (
    <p
      className={classes.questionTitle}
      style={{ fontSize: largeScreen ? "30px" : "20px", ...themeStyles }}
    >
      {selectedQ?.title[selectedLanguage]}
    </p>
  );
}

export default QuestionTitle;

function getFirstLineAlignmentFromHTML(htmlContent: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const firstHeading = doc.querySelector("h1, h2, h3, h4, h5, h6,p");

  if (!firstHeading) {
    return "left";
  }

  const computedStyle = firstHeading.getAttribute("style");
  const styleMatch = computedStyle?.match(/text-align:\s*(\w+)/);

  const classAlign = Array.from(firstHeading.classList).find((cls) =>
    ["text-left", "text-right", "text-center", "text-justify"].includes(cls),
  );

  if (styleMatch) {
    return styleMatch[1];
  }
  return classAlign?.replace("text-", "") ?? "left";
}
