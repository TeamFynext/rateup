"use client";

import { useContext } from "react";

import { QuestionType2 } from "@/types/enums";
import GoogleReviewEditor from "@/components/Survey/Question/GoogleReviewEditor";
import TicketIssueEditor from "@/components/Survey/Question/TicketIssueEditor";
import SurveyContext from "@/context/SurveyContext";

import useFlowStore, { EditorType } from "../utils/store";
import ElementEditor from "./ElementEditor";
import { FlowLogicEditorV2 } from "./FlowLogicEditorV2";
import TicketIssueEditorV2 from "./TicketIssueEditorV2";

export function FlowQuestionDetailedView() {
  const {
    currentElementType,
    detailActiveEditor,
    getCurrentElement,
    setDetailActiveEditor,
    ticketIssued,
  } = useFlowStore();

  switch (detailActiveEditor) {
    case EditorType.ElementEditor:
      return currentElementType && <ElementEditor />;
    case EditorType.LogicEditor:
      return <FlowLogicEditorV2 />;
    case EditorType.GoogleReviewEditor:
      return <GoogleReviewEditor2 />;
    case EditorType.TicketIssueEditor:
      return (
        <TicketIssueEditorV2
          element={getCurrentElement()}
          setDetailActiveEditor={setDetailActiveEditor}
          ticketIssued={ticketIssued}
        />
      );
  }
}

const GoogleReviewEditor2 = () => {
  const {
    getCurrentScreen,
    setDetailActiveEditor,
    getCurrentElement,
    updateComponentInScreen,
    currentElementId,
  } = useFlowStore();
  const { surveyId } = useContext(SurveyContext);

  const screen = getCurrentScreen();
  if (!screen) return null;
  return (
    <GoogleReviewEditor
      selectedQ={getCurrentElement() as any}
      setSelectedQ={(e) => {
        updateComponentInScreen(currentElementId, {
          googleReview: e?.googleReview,
        });
      }}
      setActiveTab={() => {
        setDetailActiveEditor(EditorType.ElementEditor);
      }}
      surveyId={surveyId}
      waFlowSave
    />
  );
};
