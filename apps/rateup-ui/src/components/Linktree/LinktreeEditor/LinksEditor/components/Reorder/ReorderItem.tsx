import { Draggable } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import cx from "clsx";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";

import classes from "./Reorder.module.css";

function ReorderItem({
  children,
  id,
  index,
  className = "",
}: {
  children: ReactNode;
  id: string;
  index: number;
  className?: string;
}) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        return (
          <div
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            style={provided.draggableProps.style as CSSProperties}
            className={cx(classes.item, { [classes.itemDragging]: snapshot.isDragging }, className)}
            ref={provided.innerRef}
          >
            <div {...provided.dragHandleProps} className={classes.dragHandle}>
              <IconGripVertical size={18} stroke={1.5} />
            </div>
            {children}
          </div>
        );
      }}
    </Draggable>
  );
}

export default ReorderItem;
