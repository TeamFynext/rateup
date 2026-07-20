import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { IconPalette, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { cloneDeep } from "lodash";
// TODO: refactor drag and drop
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { reorderQuestions } from "@/backend/surveys/questions/questions.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useNavControlContext } from "@/context/NavControlContext.ts";
import type { PageType } from "@/types/enums.ts";
import { QuestionType } from "@/types/enums.ts";
import { uniquePages } from "@/utils/constants.ts";
import { reorder, reOrderPages } from "@/utils/questions.ts";

import { QuestionTabsEnum } from "./EditSurvey.tsx";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard/index.ts";
import { getSurveyThemeTabValueFromPageType } from "./SurveyTheme/SurveyTheme.constants";
import { ThemeTabEnum } from "./SurveyTheme/SurveyTheme.enums";

interface QuestionsSideBarProps {
  questions: Question[];
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  isWaSurvey?: boolean;
  survey?: Survey;
  openStylesEditorDrawer?: () => void;
  setSurveyThemeContextValue?: any;
  setSelectedSurveyThemeTab?: any;
  setThemeSelectorState?: any;
  checkForUnsavedChanges?: () => boolean;
  hasContactFeatureIssue?: () => boolean;
  activeTab?: QuestionTabsEnum;
}

export function QuestionsSideBar({
  questions,
  setActiveTab,
  selectedQ,
  setSelectedQ,
  addQnTrigger,
  isWaSurvey,
  surveyLanguages,
  setSelectedLanguage,
  openStylesEditorDrawer,
  survey,
  setSurveyThemeContextValue,
  setSelectedSurveyThemeTab,
  setThemeSelectorState,
  checkForUnsavedChanges,
  hasContactFeatureIssue,
  activeTab,
}: QuestionsSideBarProps) {
  const params = useParams({
    strict: false,
  });
  const surveyId = params?.surveyId as string;

  const [questionsState, setQuestionsState] = useState(questions);
  const [discardDialog, setDiscardDialog] = useState<{
    open: boolean;
    onConfirm: (() => void) | null;
  }>({ open: false, onConfirm: null });

  const { setNavOpened } = useNavControlContext();
  const { t: translations } = useTranslation();

  useEffect(() => {
    setQuestionsState(questions);

    const newOrder = reOrderPages(questions);
    if (surveyId) questionsReorderMutation.mutate(newOrder); // TODO-SE optimize: do api call only when new qn count changes
  }, [questions]);

  useEffect(() => {
    if (addQnTrigger > 0) handleAddQn();
  }, [addQnTrigger]);

  const openQuestion = (question) => {
    setSelectedQ(question);
    if (uniquePages.includes(question.type as PageType)) {
      const webSurveyPagesThemeCopy = cloneDeep(survey?.webSurveyPagesTheme);
      const surveyThemeTabValue = getSurveyThemeTabValueFromPageType(question.type);
      setSelectedSurveyThemeTab(surveyThemeTabValue);
      setSurveyThemeContextValue(webSurveyPagesThemeCopy);
    }
    setActiveTab(QuestionTabsEnum.Edit);
  };

  const openSurveyEditPreview = () => {
    setSelectedQ(null);
    openStylesEditorDrawer();
    setActiveTab(QuestionTabsEnum.SurveyPreview);
    setNavOpened(false);
    setSurveyThemeContextValue(survey?.webSurveyTheme?.theme);
    setThemeSelectorState(survey?.webSurveyThemeId);
    setSelectedSurveyThemeTab(ThemeTabEnum.SURVEY);
  };

  const openDiscardChangesModal = (onConfirm: () => void) => {
    setDiscardDialog({ open: true, onConfirm });
  };

  const getUnsavedChangesMessage = () =>
    hasContactFeatureIssue?.()
      ? "Please select at least one field (Name, Phone or Email)."
      : "Please Enter heading and choices for all languages.";

  const handleOpenQuestion = (question: Question) => {
    if (selectedQ === question) {
      return;
    }
    const haveUnsavedChanges = checkForUnsavedChanges();
    if (
      haveUnsavedChanges &&
      (uniquePages.includes(selectedQ?.type as PageType) ||
        activeTab === QuestionTabsEnum.SurveyPreview)
    ) {
      openDiscardChangesModal(() => {
        openQuestion(question);
      });
      return;
    } else if (
      haveUnsavedChanges &&
      Object.values(QuestionType).includes(selectedQ?.type as QuestionType)
    ) {
      toast.error(translations(getUnsavedChangesMessage()), {
        id: "missing-title-toast",
      });
      return;
    }
    openQuestion(question);
  };

  const handleAddQn = () => {
    const openTypeSelection = () => {
      setActiveTab(QuestionTabsEnum.TypeSelection);
      setSelectedLanguage(surveyLanguages[0]);
      setSelectedQ(null);
    };

    if (checkForUnsavedChanges()) {
      openDiscardChangesModal(openTypeSelection);
      return;
    }
    openTypeSelection();
  };

  // Clearing selected-question-state if it is the one being deleted
  const onDelete = (questionId: string) => {
    if (questionId === selectedQ?.id) {
      setSelectedQ(null);
    }
    setActiveTab(QuestionTabsEnum.None);
  };

  const items = questionsState?.map((question, index) => (
    <DraggableQuestionCard
      key={question.id}
      question={question}
      selected={question.id === selectedQ?.id}
      index={index}
      handleOpenQuestion={handleOpenQuestion}
      onDelete={onDelete}
      isWaSurvey={isWaSurvey}
    />
  ));

  const handleDragEnd = ({ destination, source }) => {
    const reorderedQuestions = reorder(questionsState, source.index, destination?.index || 0);
    setQuestionsState(reorderedQuestions);
    questionsReorderMutation.mutate(reorderedQuestions);
  };

  const queryClient = useQueryClient();
  const questionsReorderMutation = useMutation({
    mutationFn: (reorderedQuestions: Question[]) =>
      reorderQuestions(
        surveyId,
        reorderedQuestions?.map((q) => q.id),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });

  return (
    <>
      <AlertDialog
        open={discardDialog.open}
        onOpenChange={(open) => setDiscardDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations("Discard unsaved changes?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {translations("Are you sure, you want to discard unsaved changes?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                discardDialog.onConfirm?.();
                setDiscardDialog({ open: false, onConfirm: null });
              }}
            >
              {translations("Discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-full flex-col gap-0">
        {questionsState?.length > 0 && (
          <div className="flex shrink-0 flex-col gap-2 border-b border-[#ececea] p-3.5">
            <Button
              className="h-10 w-full gap-[7px] rounded-[10px] text-[13px] font-semibold"
              onClick={handleAddQn}
            >
              <IconPlus size={16} />
              {translations("Add Question")}
            </Button>

            <Button
              variant="outline"
              className="h-[38px] w-full gap-[7px] rounded-[10px] border-[1.5px] border-[#ececea] bg-white text-[13px] font-semibold text-[#4a4c49] hover:bg-[#f4f5f2]"
              onClick={() => {
                if (activeTab === QuestionTabsEnum.SurveyPreview) return;
                const haveUnsavedChanges = checkForUnsavedChanges();
                if (haveUnsavedChanges && uniquePages.includes(selectedQ?.type as PageType)) {
                  openDiscardChangesModal(openSurveyEditPreview);
                  return;
                } else if (
                  haveUnsavedChanges &&
                  Object.values(QuestionType).includes(selectedQ?.type as QuestionType)
                ) {
                  toast.error(translations(getUnsavedChangesMessage()), {
                    id: "missing-title-toast",
                  });
                  return;
                }
                openSurveyEditPreview();
              }}
            >
              <IconPalette size={16} />
              {translations("Edit Theme")}
            </Button>
          </div>
        )}
        {!questionsState?.length && (
          <div
            className="flex h-full cursor-pointer items-center justify-center"
            style={{ maxHeight: "850px" }}
            onClick={handleAddQn}
          >
            <div className="flex flex-col items-center gap-2">
              <IconPlus size={36} />
              <p className="text-xl font-medium">{translations("Add Content")}</p>
            </div>
          </div>
        )}
        <ScrollArea className="flex-1 overflow-auto pb-2.5 [&_[data-slot=scroll-area-viewport]>div]:block!">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dnd-list" direction="vertical">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {items}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </ScrollArea>
      </div>
    </>
  );
}
