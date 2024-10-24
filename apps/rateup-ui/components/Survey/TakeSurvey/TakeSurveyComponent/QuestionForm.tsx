import { useContext } from "react";

import { Group } from "@mantine/core";

import { SelectedQContext } from "../../../../context/SelectedQ";
import { PageType, QuestionType as Q } from "../../../../types/enums";
import classes from "./TakeSurvey.module.css";
import { getQuestionForm } from "./util";

function QuestionForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { type } = selectedQ;
  const className = type.toLowerCase().replaceAll(" ", "-") + "-container";
  return (
    <Group className={classes[className]} justify="center">
      {(() => {
        if (type in PageType) {
          return <></>;
        }
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
