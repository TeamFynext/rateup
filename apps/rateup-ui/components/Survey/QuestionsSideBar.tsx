//TODO: refactor drag and drop

import { Button } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { createQuestion } from "../../api";
import { mockQuestion } from "../../utils/mock";
import { DraggableQuestionCard } from "./Question/DraggableQuestionCard";
import { DragDropContext, Droppable } from 'react-beautiful-dnd';

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
    

  return (
    <DragDropContext
      onDragEnd={({ destination, source }) =>
        handlers.reorder({ from: source.index, to: destination?.index || 0 })
      }
    >
      <Button onClick={() => {
        setTypeSelectionOpen(true);
        // TODO: remove
        createQuestion({...mockQuestion(), surveyId, order: questions.length+1 /* assuming 'thank you' isn't a question */})
        .then(() => router.replace(router.asPath)) // refreshing page
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
