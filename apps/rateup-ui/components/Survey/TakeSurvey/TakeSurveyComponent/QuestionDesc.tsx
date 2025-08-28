"use client";

import { useContext } from "react";

import { Text } from "@mantine/core";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import classes from "./TakeSurvey.module.css";

function QuestionDesc({ largeScreen, themeStyles }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text
      size={largeScreen ? "15px" : "16px"}
      className={classes.questionTitle}
      style={themeStyles}
    >
      {selectedQ.description[selectedLanguage]}
    </Text>
  );
}

export default QuestionDesc;
