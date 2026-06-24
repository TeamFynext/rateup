import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Box } from "@mantine/core";

function Reorder({ onDragEnd, className = "", children, itemsArr }) {
  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    const { index: sourceIndex } = result.source;
    const { index: destinationIndex } = result.destination;
    const reorderedItemsArr = Array.from(itemsArr);
    const [removedItem] = reorderedItemsArr.splice(sourceIndex, 1);
    reorderedItemsArr.splice(destinationIndex, 0, removedItem);
    onDragEnd(reorderedItemsArr);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="droppable">
        {(provided, _snapshot) => (
          <Box
            className={className}
            {...provided.droppableProps}
            // {...provided.draggableProps}
            ref={provided.innerRef}
          >
            {children}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default Reorder;
