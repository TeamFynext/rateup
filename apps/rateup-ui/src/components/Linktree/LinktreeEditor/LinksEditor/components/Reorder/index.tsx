import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import type { ReactNode } from "react";

function Reorder<T>({
  onDragEnd,
  className = "",
  children,
  itemsArr,
}: {
  onDragEnd: (reordered: T[]) => void;
  className?: string;
  children: ReactNode;
  itemsArr: T[];
}) {
  const handleDragEnd = (result: DropResult) => {
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
