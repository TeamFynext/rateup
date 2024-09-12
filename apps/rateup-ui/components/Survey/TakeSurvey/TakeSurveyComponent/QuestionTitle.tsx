import { useContext } from "react";

import { Text } from "@mantine/core";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import classes from "./TakeSurvey.module.css";
import { getReplacedTitleFromVariable } from "./util";

function QuestionTitle({
  largeScreen,
  themeStyles,
  smallScreen,
  responses,
  surveyId,
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

  let styles = {};
  const replacedTitle =
    getReplacedTitleFromVariable(data) ?? selectedQ?.title[selectedLanguage];
  if (typeof replacedTitle === "string") {
    if (
      replacedTitle.includes("<h1>") ||
      replacedTitle.includes("<h2>") ||
      replacedTitle.includes("<h3>") ||
      replacedTitle.includes("<h4>") ||
      replacedTitle.includes("<b>")
    ) {
      styles = { color: themeStyles?.color };
    } else {
      styles = themeStyles;
    }
  }

  return replacedTitle ? (
    <Text style={styles} dangerouslySetInnerHTML={{ __html: replacedTitle }} />
  ) : (
    <Text
      size={largeScreen ? "30px" : "20px"}
      className={classes.questionTitle}
      style={themeStyles}
    >
      {selectedQ.title[selectedLanguage]}
    </Text>
  );
}

export default QuestionTitle;
