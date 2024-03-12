import { Group } from "@mantine/core";
import { useContext } from "react";
import { QuestionType as Q } from "../../../../types/enums";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { getQuestionForm } from "./util";
import classes from "./TakeSurvey.module.css";

function QuestionForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { type } = selectedQ;
  const className = type.toLowerCase().replaceAll(" ", "-") + "-container";
  return (
    <Group className={classes[className]}>
      {(() => {
        switch (type) {
          case Q.Date:
            return getQuestionForm(type, selectedQ);
          default:
            return getQuestionForm(type, selectedQ);
        }
      })()}
    </Group>
  );
}

export default QuestionForm;
