import { useContext } from "react";

import { SelectedQContext } from "@/context/SelectedQ.ts";
import { PageType, QuestionType as Q } from "@/types/enums.ts";

import { getQuestionForm } from "./util.tsx";

function QuestionForm() {
  const { selectedQ, alignment } = useContext(SelectedQContext);
  const type = selectedQ?.type;
  return (
    <div className="flex gap-4" style={{ justifyContent: getFormAlignment(alignment) }}>
      {(() => {
        if (!type || type in PageType) {
          return <></>;
        }
        switch (type) {
          case Q.Date:
            return getQuestionForm(type, selectedQ!);
          default:
            return getQuestionForm(type, selectedQ!);
        }
      })()}
    </div>
  );
}

function getFormAlignment(alignment: string) {
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
