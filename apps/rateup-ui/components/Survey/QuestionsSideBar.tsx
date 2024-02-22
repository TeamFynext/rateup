//TODO: refactor drag and drop

import {
  Center,
  Paper,
  Stack,
  Text,
  Divider,
  ScrollArea,
  Box,
} from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { reorderQuestions } from "../../backend/surveys/questions/questions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorder } from "../../utils/questions";
import { QuestionTabsEnum } from "./EditSurvey";
import { IconPlus } from "@tabler/icons-react";
import { RateupButtonBlue } from "../Button/RateupButtons";
import styles from "./QuestionsSideBar.module.css";

interface QuestionsSideBarProps {
  questions: Question[];
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  addQnTrigger?: number;
  surveyLanguages: string[];
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  isWaSurvey?: boolean;
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
}: QuestionsSideBarProps) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [questionsState, handlers] = useListState(questions);

  useEffect(() => {
    handlers.setState(questions);
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

  const queryClient = useQueryClient();
  const questionsReorderMutation = useMutation({
    mutationFn: (reorderedQuestions: Question[]) =>
      reorderQuestions(surveyId, reorderedQuestions?.map((q) => q.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
    },
  });

  return (
    <Stack className={styles["add-question-btn-questions-list-container"]}>
      {questionsState?.length > 0 && (
        <Box className={styles["add-question-btn-more-than-1-que"]}>
          <RateupButtonBlue
            onClick={handleAddQn}
            title={"Add Question"}
            rightIcon={<IconPlus size="1rem" />}
            size="md"
            fullWidth
          />
        </Box>
      )}

      <ScrollArea
        className={styles["questions-list-container"]}
        scrollbarSize={10}
        scrollbars={"y"}
      >
        <DragDropContext
          onDragEnd={({ destination, source }) => {
            const reorderedQuestions = reorder(
              questionsState,
              source.index,
              destination?.index || 0,
            );
            handlers.setState(reorderedQuestions);
            questionsReorderMutation.mutate(reorderedQuestions);
          }}
        >
          {!questionsState?.length && (
            <Paper
              style={{ cursor: "pointer", marginTop: "200px" }}
              onClick={handleAddQn}
            >
              <Center h="100%">
                <Stack align="center">
                  <IconPlus size={36} />
                  <Text size="xl" fw={700}>
                    Add Question
                  </Text>
                </Stack>
              </Center>
            </Paper>
          )}

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
