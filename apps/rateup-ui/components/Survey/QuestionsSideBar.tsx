//TODO: refactor drag and drop

import { Button } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { reorderQuestions } from "../../api/surveys/questions/questions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorder } from "../../utils/questions";

interface QuestionsSideBarProps {
  questions: Question[];
  setTypeSelectionOpen: (open: boolean) => void;
  selectedQ: Question;
  setSelectedQ: (Q: Question) => void;
}
//TODO: update order on change
export function QuestionsSideBar({ questions, setTypeSelectionOpen, selectedQ, setSelectedQ }: QuestionsSideBarProps) {
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
      selected={question.id === selectedQ?.id}
      index={index}
      handleOpenQuestion={handleOpenQuestion}
    />
  ))

  const queryClient = useQueryClient();
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
