import { Text } from "@mantine/core";
import { useContext } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import classes from "./TakeSurvey.module.css";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";

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
