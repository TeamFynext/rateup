//TODO: refactor drag and drop

import { Button } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { mockQuestion } from "../../utils/mock";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { createQuestion, reorderQuestions } from "../../api/surveys/questions/questions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { reorder } from "../../utils/questions";

interface QuestionsSideBarProps {
  questions: Question[];
  setTypeSelectionOpen: (open: boolean) => void;
  setSelectedQ: (Q: Question) => void;
}
//TODO: update order on change
export function QuestionsSideBar({ questions, setTypeSelectionOpen, setSelectedQ }: QuestionsSideBarProps) {
  const router = useRouter();
  const { surveyId } = router.query as {surveyId: string};
  const [questionsState, handlers] = useListState(questions);

  useEffect(() => {
    handlers.setState(questions)
  }, [questions])

  const handleOpenQuestion = (Q: Question) => {
    setSelectedQ(Q);
    setTypeSelectionOpen(false);
  }

  const items = questionsState.map((question, index) => (
    <DraggableQuestionCard
      key={question.id}
      question={question}
      index={index}
      handleOpenQuestion={handleOpenQuestion}
    />
  ))

  const queryClient = useQueryClient();
  const questionCreateMutation = useMutation({
    mutationFn: (newQ: any) =>  createQuestion(surveyId, newQ),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', surveyId])
      notifications.show({
        message: "Created!"
      });
    }
  })
  const questionsReorderMutation = useMutation({
    mutationFn: (reorderedQuestions: Question[]) => reorderQuestions(surveyId, reorderedQuestions.map(q => q.id)),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', surveyId])
    }
  })

  return (
    <DragDropContext
      onDragEnd={({ destination, source }) => {
        const reorderedQuestions = reorder(questionsState, source.index, destination?.index || 0)
        handlers.setState(reorderedQuestions);
        questionsReorderMutation.mutate(reorderedQuestions)
      }}
    >
      <Button onClick={() => {
        setTypeSelectionOpen(true);
        setSelectedQ(null);
      }}>Add Question</Button>
      <Droppable droppableId="dnd-list" direction="vertical">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {items}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
