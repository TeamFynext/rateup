import { useParams } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { toast } from "sonner";

import { useQuestionDeleteMutation } from "@/backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import {
  QuestionType,
  SurveyType,
  WaFlowFormElementType,
  WaFlowFormInputElementType,
  WaFlowFormNonInputElementType,
  WaFlowStatus,
} from "@/types/enums.ts";
import { FlowQuestionTypes } from "@/utils/constants.ts";
import { getUniqueRandomAlphaId } from "@/utils/misc/random.utils";
import { createBlankQuestion } from "@/utils/questions.ts";
import {
  getAllIdsFromFlowJson,
  getFlowElementJsonFromQuestion,
  getFlowFormElementById,
  getQuestionFromFlowFormElementName,
  getQuestionIdFromFlowFormElementName,
  getScreenObjById,
  questionTypeToFlowFormElementType,
  updateFlowJsonNavigationAndDataPassing,
} from "@/utils/whatsapp/flow.utils";

import { QuestionTypeSelection } from "../../../../Survey/Question/QuestionTypeSelection.tsx";
import FlowScreensList from "../FlowScreensList/index.tsx";
import { EditFlowContext } from "./EditFlowContext.ts";
import { FlowNonQuestionDetailedView } from "./FlowNonQuestionDetailedView.tsx";
import { FlowQuestionDetailedView } from "./FlowQuestionDetailedView.tsx";

enum EditFlowRightPanel {
  ElementEditor = "element-editor",
  TypeSelection = "type-selection",
}

function EditFlow() {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [blankQuestion, setBlankQuestion] = useState<Question>(null);
  const [activeEditor, setActiveEditor] = useState<EditFlowRightPanel>(null);
  const {
    flowJson,
    updateFlowJson,
    map,
    updateMap,
    survey,
    updateSurvey,
    selectedFormElementId,
    setSelectedFormElementId,
    selectedScreenId,
    setSelectedScreenId,
  } = useContext(EditFlowContext);
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  const deleteQuestionMutation = useQuestionDeleteMutation(survey.id);

  function handleNewQuestionCreated(newQ: Question) {
    if (!flowEditable) return;
    updateSurvey((draft) => {
      draft.questions.push(newQ);
    });
    const {
      formElements: { questionElement },
      map: qMap,
    } = getFlowElementJsonFromQuestion(newQ);
    updateMap(() => ({ ...map, ...qMap }));
    updateFlowJson((draft) => {
      const screenToBeEdited = getScreenObjById(draft.screens, selectedScreenId);
      screenToBeEdited.layout.children
        .find((se) => se.type === "Form")
        .children.push(questionElement);
      updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
    });
    setSelectedFormElementId(questionElement.id);
    setBlankQuestion(null);
  }

  const handleTypeSelection = (type: QuestionType | WaFlowFormElementType) => {
    const screenToBeEdited = getScreenObjById(flowJson.screens, selectedScreenId);
    const formElementChildren = screenToBeEdited.layout.children.find(
      (se) => se.type === "Form",
    ).children;
    if (formElementChildren.length > 50)
      return toast.error("Only 50 components in a screen", {
        id: "error-max-screen-elements",
      });
    const qsType = [WaFlowFormElementType.nonInputText, WaFlowFormElementType.image].includes(
      type as WaFlowFormElementType,
    )
      ? type
      : questionTypeToFlowFormElementType(type as QuestionType);
    if (
      [QuestionType.DocumentPicker, QuestionType.PhotoPicker].includes(type as QuestionType) &&
      formElementChildren.find((c) => c.type === qsType)
    ) {
      return toast.error(`Only one ${type} allowed per screen`, {
        id: "error-max-screen-elements",
      });
    } else if (
      [QuestionType.DocumentPicker, QuestionType.PhotoPicker].includes(type as QuestionType) &&
      formElementChildren.some((child) =>
        [WaFlowFormElementType.photoPicker, WaFlowFormElementType.documentPicker].includes(
          child.type,
        ),
      )
    ) {
      return toast.error(
        "Using both PhotoPicker and DocumentPicker components on a single screen is not allowed per screen",
        {
          id: "error-max-screen-elements",
        },
      );
    }
    if (Object.values(QuestionType).includes(type as QuestionType)) {
      const newQ = createBlankQuestion(type as QuestionType, [selectedLanguage], SurveyType.WaFlow);
      setBlankQuestion(newQ);
      setActiveEditor(EditFlowRightPanel.ElementEditor);
    } else {
      const newElement = {
        type: type as WaFlowFormElementType,
        text: "",
        id: getUniqueRandomAlphaId(6, getAllIdsFromFlowJson(flowJson)),
      };
      updateFlowJson((draft) => {
        const screenToBeEdited = getScreenObjById(draft.screens, selectedScreenId);
        screenToBeEdited.layout.children.find((se) => se.type === "Form").children.push(newElement);
        updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
      });
      setSelectedFormElementId(newElement.id);
      setActiveEditor(EditFlowRightPanel.ElementEditor);
    }
  };

  let selectedQuestion = null;
  let selectedNonQuestion = null;
  if (blankQuestion) {
    selectedQuestion = blankQuestion;
  } else if (selectedFormElementId) {
    const selectedFormElement = getFlowFormElementById(selectedFormElementId, flowJson);
    selectedQuestion = getQuestionFromFlowFormElementName(
      selectedFormElement.name,
      survey.questions,
      map,
    );
    if (
      !selectedQuestion &&
      Object.values(WaFlowFormNonInputElementType).includes(selectedFormElement?.type as any)
    ) {
      selectedNonQuestion = selectedFormElement;
    }
  }

  function handleFormElementClick(feId: string, screenId: string) {
    setSelectedFormElementId(feId);
    setSelectedScreenId(screenId);
    setActiveEditor(EditFlowRightPanel.ElementEditor);
  }
  function handleAddElementClick(screenId: string) {
    if (!flowEditable) return;
    setActiveEditor(EditFlowRightPanel.TypeSelection);
    setBlankQuestion(null);
    setSelectedFormElementId(null);
    setSelectedScreenId(screenId);
  }

  function handleDeleteElement(feId: string, screenId: string) {
    if (!flowEditable) return;
    const fe = getFlowFormElementById(feId, flowJson);
    setActiveEditor(null);
    setSelectedFormElementId(null);

    if (Object.values(WaFlowFormInputElementType).includes(fe.type as any)) {
      const questionId = getQuestionIdFromFlowFormElementName(fe.name, map);
      // deleting element from flowJson
      updateFlowJson((draft) => {
        const screenToBeEdited = getScreenObjById(draft.screens, screenId);
        const formElements = screenToBeEdited.layout.children.find((se) => se.type === "Form");
        const elementIndex = formElements.children.findIndex((c) => c.name === fe.name);
        formElements.children.splice(elementIndex, 1);
        updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
      });
      // deleting element from map
      updateMap((draft) => {
        delete draft[fe.name];
      });

      // TODO: delete question from survey
      deleteQuestionMutation.mutate(questionId);
    } else if (Object.values(WaFlowFormNonInputElementType).includes(fe.type as any)) {
      updateFlowJson((draft) => {
        const screenToBeEdited = getScreenObjById(draft.screens, screenId);
        const formElements = screenToBeEdited.layout.children.find((se) => se.type === "Form");
        const elementIndex = formElements.children.findIndex((c) => c.id === fe.id);
        formElements.children.splice(elementIndex, 1);
        updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
      });
    }
  }

  return (
    <div
      className="h-full flex gap-2 p-2.5 overflow-hidden [&>div]:min-w-[200px] [&>div]:h-full [&>div]:rounded-2xl [&>div]:shadow-[rgba(0,0,0,0.05)_0px_1px_0px,rgba(0,0,0,0.11)_0px_0px_8px] [&>div]:p-4 [&>div]:bg-white dark:[&>div]:bg-gray-800"
      style={{
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 3,
          minWidth: "300px",
        }}
        className="p-0"
      >
        <FlowScreensList
          onDeleteElement={handleDeleteElement}
          onAddElementClick={handleAddElementClick}
          onElementClick={handleFormElementClick}
        />
      </div>
      <div
        style={{
          flex: 6,
          minWidth: "300px",
          overflow: "auto",
        }}
      >
        {activeEditor === EditFlowRightPanel.TypeSelection && (
          <QuestionTypeSelection
            questionTypeGroups={FlowQuestionTypes}
            handleTypeSelection={handleTypeSelection}
          />
        )}
        {activeEditor === EditFlowRightPanel.ElementEditor && selectedQuestion && survey.id ? (
          <FlowQuestionDetailedView
            key={selectedQuestion.id}
            question={selectedQuestion}
            surveyId={survey.id}
            setSelectedLanguage={() => {}}
            surveyLanguages={["en"]}
            onCreated={handleNewQuestionCreated}
          />
        ) : (
          selectedNonQuestion && <FlowNonQuestionDetailedView key={selectedFormElementId} />
        )}
      </div>
    </div>
  );
}

export default EditFlow;
