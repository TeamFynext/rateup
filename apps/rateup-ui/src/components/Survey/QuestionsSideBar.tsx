"use client";

// TODO: refactor drag and drop
import { useEffect } from "react";

import {
  ActionIcon,
  Button,
  Center,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconEdit, IconPlayerPlay, IconPlus } from "@tabler/icons-react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { PageType } from "@/types/enums.ts";
import { QuestionType } from "@/types/enums.ts";
import { reorderQuestions } from "@/backend/surveys/questions/questions.api";
import { useNavControlContext } from "@/context/NavControlContext.ts";
import modalStyles from "@/styles/commonCssModules/modal.module.css";
import { uniquePages } from "@/utils/constants.ts";
import { reorder, reOrderPages } from "@/utils/questions.ts";

import { QuestionTabsEnum } from "./EditSurvey.tsx";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard/index.ts";
import styles from "./QuestionsSideBar.module.css";
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
  const params = useParams({
    strict: false,
  });
  const surveyId = params?.surveyId as string;

  const [questionsState, handlers] = useListState(questions);
  const { navOpened, setNavOpened } = useNavControlContext();
  const { t: translations } = useTranslation();
  useEffect(() => {
    handlers.setState(questions);

    const newOrder = reOrderPages(questions);
    surveyId && questionsReorderMutation.mutate(newOrder); // TODO-SE optimize: do api call only when new qn count changes
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
        <Text className={modalStyles["are-you-sure-text"]}>
          {translations("Are you sure, you want to discard unsaved changes?")}
        </Text>
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
      toast.error(
        translations("Please Enter heading and choices for all languages."),
        {
          id: "missing-title-toast",
        },
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
    <Stack className={styles["add-question-btn-questions-list-container"]}>
      {questionsState?.length > 0 && (
        <Group className={styles["add-question-btn-more-than-1-que"]}>
          <Button
            className={styles["add-content-btn"]}
            rightSection={<IconPlus size="1.125rem" />}
            onClick={handleAddQn}
            fz={14}
            fw={400}
          >
            {translations("Add Content")}
          </Button>

          <Tooltip label={translations("Survey Preview")}>
            <ActionIcon
              className={styles["survey-preview-btn"]}
              variant="light"
              onClick={openSurveyPreviewModal}
            >
              <Group className={styles["icon-text-group"]}>
                <Text className={styles["icon-text"]}>
                  {translations("Preview")}
                </Text>
                <IconPlayerPlay />
              </Group>
            </ActionIcon>
          </Tooltip>

          <Tooltip label={translations("Edit Theme")}>
            <ActionIcon
              className={styles["edit-theme-btn"]}
              variant="light"
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
                  toast.error(
                    translations(
                      "Please Enter heading and choices for all languages.",
                    ),
                    {
                      id: "missing-title-toast",
                    },
                  );
                  return;
                }
                openSurveyEditPreview();
              }}
            >
              <Group
                className={styles["icon-text-group"]}
                style={{ display: "flex", alignItems: "center", gap: "2px" }}
              >
                <Text className={styles["icon-text"]}>
                  {translations("Theme")}
                </Text>
                <IconEdit />
              </Group>
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      {!questionsState?.length && (
        <Paper
          style={{ cursor: "pointer", height: "100%", maxHeight: "850px" }}
          onClick={handleAddQn}
        >
          <Center h="100%">
            <Stack align="center">
              <IconPlus size={36} />
              <Text size="xl" fw={500}>
                {translations("Add Content")}
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
      <ScrollArea
        className={styles["questions-list-container"]}
        scrollbarSize={10}
        scrollbars={"y"}
      >
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
    </Stack>
  );
}
