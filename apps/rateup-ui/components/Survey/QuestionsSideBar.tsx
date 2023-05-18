//TODO: refactor drag and drop

import { Button } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { mockQuestion } from "../../utils/mock";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { createQuestion } from "../../api/surveys/questions/questions.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

//TODO: update order on change
export function QuestionsSideBar({ questions, setTypeSelectionOpen, setSelectedQ }) {
  const router = useRouter();
  const {surveyId} = router.query;
  const [state, handlers] = useListState(questions);

  useEffect(() => {
    handlers.setState(questions)
  }, [questions])

  const handleOpenQuestion = (qId) => {
    setSelectedQ(qId);
    setTypeSelectionOpen(false);
  }

  const items = state.map((question, index) => (
    <DraggableQuestionCard
      question={question}
      index={index}
      handleOpenQuestion={handleOpenQuestion}

    />
  ))

  // add mutate function to createQuestion api call and invalidate ['questions', surveyId]
  const queryClient = useQueryClient();
  const questionCreateMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', surveyId])
      notifications.show({
        message: "Created!"
      });
    }
  })
    

  return (
    <DragDropContext
      onDragEnd={({ destination, source }) =>
        handlers.reorder({ from: source.index, to: destination?.index || 0 })
      }
    >
      <Button onClick={() => {
        setTypeSelectionOpen(true);
        // TODO: remove
        questionCreateMutation.mutate({...mockQuestion(), surveyId, order: questions.length+1 /* assuming 'thank you' isn't a question */})
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
