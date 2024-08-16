//TODO: refactor drag and drop

import { useEffect } from "react";
import { useRouter } from "next/router";

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
import { IconEdit, IconPlayerPlay, IconPlus } from "@tabler/icons-react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderQuestions } from "@/backend/surveys/questions/questions.api";
import { docsPath } from "@/utils/constants";
import { reorder, reOrderPages } from "@/utils/questions";

import InfoButton from "../Button/InfoButton";
import { QuestionTabsEnum } from "./EditSurvey";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import styles from "./QuestionsSideBar.module.css";

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
}: QuestionsSideBarProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [questionsState, handlers] = useListState(questions);

  useEffect(() => {
    handlers.setState(questions);

    let newOrder = reOrderPages(questions);
    surveyId && questionsReorderMutation.mutate(newOrder); //TODO-SE optimize: do api call only when new qn count changes
  }, [questions]);

  useEffect(() => {
    addQnTrigger > 0 && handleAddQn();
  }, [addQnTrigger]);

  const handleOpenQuestion = (Q: Question) => {
    setSelectedQ(Q);
    setActiveTab(QuestionTabsEnum.Edit);
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
          >
            Add Content
          </Button>

          <Tooltip label="Survey Preview">
            <ActionIcon
              className={styles["survey-preview-btn"]}
              variant="light"
              onClick={openSurveyPreviewModal}
            >
              <IconPlayerPlay />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Edit Theme">
            <ActionIcon
              className={styles["edit-theme-btn"]}
              variant="light"
              onClick={() => {
                setSelectedQ(null);
                openStylesEditorDrawer();
                setActiveTab(QuestionTabsEnum.SurveyPreview);
              }}
            >
              <IconEdit />
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
              <Text size="xl" fw={700}>
                Add Content
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
