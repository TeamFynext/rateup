import { useState } from "react";

import { QuestionType2 } from "@/types/enums";
import GoogleReviewEditor from "@/components/Survey/Question/GoogleReviewEditor";

import useFlowStore from "../utils/store";
import ElementEditor from "./ElementEditor";
import { FlowLogicEditorV2 } from "./FlowLogicEditorV2";

export enum EditorType {
  LogicEditor = "logic-editor",
  GoogleReviewEditor = "google-review-editor",
  ElementEditor = "element-editor",
}
export function FlowQuestionDetailedView() {
  const [activeEditor, setActiveEditor] = useState<EditorType>(
    EditorType.ElementEditor,
  );
  const { currentElementType } = useFlowStore();
  switch (activeEditor) {
    case EditorType.ElementEditor:
      return (
        currentElementType && <ElementEditor setActiveTab={setActiveEditor} />
      );
    case EditorType.LogicEditor:
      return (
        <FlowLogicEditorV2
          afterSave={() => setActiveEditor(EditorType.ElementEditor)}
        />
      );
    case EditorType.GoogleReviewEditor:
      return (
        <GoogleReviewEditor2
          setActiveEditor={setActiveEditor}
          surveyId={null}
        />
      );
  }
}

const GoogleReviewEditor2 = ({ setActiveEditor, surveyId }) => {
  const { getCurrentScreen } = useFlowStore();
  const screen = getCurrentScreen();
  if (!screen) return null;
  const question = screen?.layout.children
    .filter((child) => child.type !== QuestionType2.Footer)
    .map(({ id, label, type }) => ({ id, label, type }));
  return (
    <GoogleReviewEditor
      selectedQ={question as any}
      setSelectedQ={(e) => {
        console.log(e, "e");
      }}
      setActiveTab={() => {
        setActiveEditor(EditorType.ElementEditor);
      }}
      surveyId={surveyId}
    />
  );
};
