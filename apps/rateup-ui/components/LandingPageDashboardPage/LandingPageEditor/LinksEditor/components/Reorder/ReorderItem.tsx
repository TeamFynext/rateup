import { Draggable } from "@hello-pangea/dnd";
import { Box } from "@mantine/core";

function ReorderItem({ children, id, index, className = "" }) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        return (
          <Box
            className={className}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            {children}
          </Box>
        );
      }}
    </Draggable>
  );
}

export default ReorderItem;
