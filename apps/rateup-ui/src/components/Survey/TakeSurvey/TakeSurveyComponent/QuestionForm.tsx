import { Group } from "@mantine/core";
import { useContext } from "react";

import { SelectedQContext } from "@/context/SelectedQ.ts";
import { PageType, QuestionType as Q } from "@/types/enums.ts";

import { getQuestionForm } from "./util.tsx";

import classes from "./TakeSurvey.module.css";

function QuestionForm() {
  const { selectedQ, alignment } = useContext(SelectedQContext);
  const { type } = selectedQ;
  const className = type.toLowerCase().replaceAll(" ", "-") + "-container";
  return (
    <Group className={classes[className]} justify={getFormAlignment(alignment)}>
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

function getFormAlignment(alignment) {
  if (!alignment) return "flex-start";
  switch (alignment) {
    case "left":
      return "flex-start";
    case "right":
      return "flex-end";
    case "center":
      return "center";
    default:
      return "flex-start";
  }
}
export default QuestionForm;
