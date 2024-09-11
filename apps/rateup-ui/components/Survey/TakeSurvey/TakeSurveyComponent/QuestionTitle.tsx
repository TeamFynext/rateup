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
  const replacedTitle =
    getReplacedTitleFromVariable(data) ?? selectedQ?.title[selectedLanguage];
  return replacedTitle ? (
    <Text
      style={{
        color: themeStyles?.color,
      }}
      dangerouslySetInnerHTML={{ __html: replacedTitle }}
    />
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
