import { Text } from "@mantine/core";
import { useContext } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import classes from "./TakeSurvey.module.css";

function QuestionTitle({ largeScreen, themeStyles }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
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
