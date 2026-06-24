import { Text } from "@mantine/core";
import { useContext } from "react";

import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";

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
