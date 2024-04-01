import { ScrollArea, Text } from "@mantine/core";
import { useContext } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import classes from "./TakeSurvey.module.css";
import { QuestionType } from "../../../../types/enums";

function QuestionTitle({ largeScreen, themeStyles, smallScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return selectedQ.type === QuestionType.InfoMessage ? (
    <ScrollArea.Autosize
      mah={smallScreen ? "65dvh" : "55dvh"}
      scrollbarSize={0}
    >
      <Text
        style={{
          color: themeStyles?.color,
        }}
        dangerouslySetInnerHTML={{ __html: selectedQ.title[selectedLanguage] }}
      />
    </ScrollArea.Autosize>
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
