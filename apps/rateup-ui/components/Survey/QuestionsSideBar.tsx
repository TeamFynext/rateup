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

//TODO: update order on change
export function QuestionsSideBar({ questions, setTypeSelectionOpen, setSelectedQ }) {
  const router = useRouter();
  const { surveyId } = router.query as {surveyId: string};
  const [questionsState, handlers] = useListState(questions);

  useEffect(() => {
    handlers.setState(questions)
  }, [questions])

  const handleOpenQuestion = (qId) => {
    setSelectedQ(qId);
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
    mutationFn: (newQ) =>  createQuestion(surveyId, newQ),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', surveyId])
      notifications.show({
        message: "Created!"
      });
    }
  })
  const questionsReorderMutation = useMutation({
    mutationFn: (reorderedQuestions) => reorderQuestions(surveyId, reorderedQuestions.map(q => q.id)),
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
        // TODO: remove
        questionCreateMutation.mutate({ ...mockQuestion(), surveyId })
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
