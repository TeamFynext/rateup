import { ScrollArea, Text } from "@mantine/core";
import { useContext } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import classes from "./TakeSurvey.module.css";
import { QuestionType } from "../../../../types/enums";

function QuestionTitle({ largeScreen, themeStyles, smallScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return selectedQ?.title[selectedLanguage] ? (
    <Text
      style={{
        color: themeStyles?.color,
      }}
      dangerouslySetInnerHTML={{ __html: selectedQ.title[selectedLanguage] }}
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
