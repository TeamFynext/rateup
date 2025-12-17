"use client";

//TODO: refactor drag and drop
import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useListState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconEdit, IconPlayerPlay, IconPlus } from "@tabler/icons-react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { useTranslations } from "next-intl";
import modalStyles from "styles/commonCssModules/modal.module.css";

import { PageType, QuestionType } from "@/types/enums";
import { reorderQuestions } from "@/backend/surveys/questions/questions.api";
import { useNavControlContext } from "@/context/NavControlContext";
import { uniquePages } from "@/utils/constants";
import { showErrorToast } from "@/utils/notifications";
import { reorder, reOrderPages } from "@/utils/questions";

import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { QuestionTabsEnum } from "./EditSurvey";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
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
  openSurveyPreviewModal?: () => void;
  setSurveyThemeContextValue?: any;
  setSelectedSurveyThemeTab?: any;
  setThemeSelectorState?: any;
  checkForUnsavedChanges?: () => boolean;
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
  openSurveyPreviewModal,
  survey,
  setSurveyThemeContextValue,
  setSelectedSurveyThemeTab,
  setThemeSelectorState,
  checkForUnsavedChanges,
  activeTab,
}: QuestionsSideBarProps) {
  const params = useParams();
  const surveyId = params?.surveyId as string;

  const [questionsState, handlers] = useListState(questions);
  const { navOpened, setNavOpened } = useNavControlContext();
  const translations = useTranslations();
  useEffect(() => {
    handlers.setState(questions);

    let newOrder = reOrderPages(questions);
    surveyId && questionsReorderMutation.mutate(newOrder); //TODO-SE optimize: do api call only when new qn count changes
  }, [questions]);

  useEffect(() => {
    addQnTrigger > 0 && handleAddQn();
  }, [addQnTrigger]);

  const openQuestion = (question) => {
    setSelectedQ(question);
    if (uniquePages.includes(question.type as PageType)) {
      const webSurveyPagesThemeCopy = _.cloneDeep(survey?.webSurveyPagesTheme);
      const surveyThemeTabValue = getSurveyThemeTabValueFromPageType(
        question.type,
      );
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

  const openDiscardChangesModal = (onConfirm) => {
    modals.openConfirmModal({
      title: "Discard unsaved changes?",
      children: (
        <span className={modalStyles["are-you-sure-text"]}>
          {translations("Are you sure, you want to discard unsaved changes?")}
        </span>
      ),
      labels: {
        confirm: translations("Discard"),
        cancel: translations("Cancel"),
      },
      className: modalStyles["delete-confirmation-modal"],
      centered: true,
      classNames: {
        header: modalStyles["modal-header"],
        body: modalStyles["modal-body"],
        content: modalStyles["modal-content"],
      },
      onConfirm,
    });
  };

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
      showErrorToast(
        translations("Please Enter heading and choices for all languages"),
        "missing-title-toast",
      );
      return;
    }
    openQuestion(question);
  };

  const handleAddQn = () => {
    setActiveTab(QuestionTabsEnum.TypeSelection);
    setSelectedLanguage(surveyLanguages[0]);
    setSelectedQ(null);
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
    const reorderedQuestions = reorder(
      questionsState,
      source.index,
      destination?.index || 0,
    );
    handlers.setState(reorderedQuestions);
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
    <div className="flex flex-col items-center justify-center gap-4">
      {questionsState?.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button
            onClick={handleAddQn}
            className="flex items-center justify-center gap-1 bg-primary"
          >
            <IconPlus />
            <span className="sm:block hidden">{translations("Add")}</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={openSurveyPreviewModal}>
                  <div>
                    <IconPlayerPlay />
                  </div>
                </Button>
              </TooltipTrigger>

              <TooltipContent side="top">
                {translations("Survey Preview")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (activeTab === QuestionTabsEnum.SurveyPreview) {
                      return;
                    }
                    const haveUnsavedChanges = checkForUnsavedChanges();
                    if (
                      haveUnsavedChanges &&
                      uniquePages.includes(selectedQ?.type as PageType)
                    ) {
                      openDiscardChangesModal(() => {
                        openSurveyEditPreview();
                      });
                      return;
                    } else if (
                      haveUnsavedChanges &&
                      Object.values(QuestionType).includes(
                        selectedQ?.type as QuestionType,
                      )
                    ) {
                      showErrorToast(
                        translations(
                          "Please Enter heading and choices for all languages",
                        ),
                        "missing-title-toast",
                      );
                      return;
                    }
                    openSurveyEditPreview();
                  }}
                >
                  <div>
                    <IconEdit />
                  </div>
                </Button>
              </TooltipTrigger>

              <TooltipContent side="top">
                {translations("Edit Theme")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {!questionsState?.length && (
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-1">
            <IconPlus size={36} />
            <span className="text-sm">{translations("Add Content")}</span>
          </div>
        </div>
      )}

      <ScrollArea className="h-[70vh]">
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
  );
}
