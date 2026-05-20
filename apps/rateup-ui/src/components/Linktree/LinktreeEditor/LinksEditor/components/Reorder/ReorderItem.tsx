import { Box } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { Draggable } from "@hello-pangea/dnd";
import cx from "clsx";

import classes from "./Reorder.module.css";

function ReorderItem({ children, id, index, className = "" }) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        return (
          <Box
            className={cx(
              classes.item,
              { [classes.itemDragging]: snapshot.isDragging },
              className,
            )}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div {...provided.dragHandleProps} className={classes.dragHandle}>
              <IconGripVertical size={18} stroke={1.5} />
            </div>
            {children}
          </Box>
        );
      }}
    </Draggable>
  );
}

export default ReorderItem;
