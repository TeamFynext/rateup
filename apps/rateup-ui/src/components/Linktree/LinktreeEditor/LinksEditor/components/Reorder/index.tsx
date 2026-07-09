import { DragDropContext, Droppable } from "@hello-pangea/dnd";

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
          <div className={className} {...provided.droppableProps} ref={provided.innerRef}>
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default Reorder;
