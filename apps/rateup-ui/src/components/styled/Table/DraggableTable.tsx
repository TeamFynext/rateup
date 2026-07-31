import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconEdit, IconGripVertical, IconTrash } from "@tabler/icons-react";
import React from "react";

import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { reorder } from "@/utils/questions.ts";

interface TableHeader {
  headerKey: string;
  headerValue: string;
}

interface IDraggableTableProps {
  headers: TableHeader[];
  items: Array<any>;
  itemUniqueKey: string;
  handleDragEnd: (values: unknown[]) => void;
  editEnabled?: boolean;
  deleteEnabled?: boolean;
  handleEdit?: (item) => void;
  handleDelete?: (item) => void;
  withRowBorder?: boolean;
  maxHeight?: string | number;
}

const DraggableTable = ({
  headers,
  items,
  itemUniqueKey,
  handleDragEnd,
  editEnabled = false,
  deleteEnabled = false,
  handleEdit,
  handleDelete,
  maxHeight = 250,
}: IDraggableTableProps) => {
  if (!items?.length) return null;

  const headerKeys = headers.map((h) => h.headerKey);

  return (
    <ScrollArea style={{ maxHeight }} className="rounded-md border">
      <DragDropContext
        onDragEnd={({ source, destination }) => {
          const reorderedItems = reorder(items, source.index, destination?.index ?? 0);
          handleDragEnd(reorderedItems);
        }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-10" />
              {headers.map((header, i) => (
                <TableHead key={i}>{header.headerValue}</TableHead>
              ))}
              {(editEnabled || deleteEnabled) && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>

          <Droppable droppableId="dnd-list" direction="vertical">
            {(provided) => (
              <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                {items.map((item, index) => (
                  <Draggable
                    key={item[itemUniqueKey]}
                    index={index}
                    draggableId={item[itemUniqueKey]}
                  >
                    {(dragProvided) => (
                      <TableRow
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={dragProvided.draggableProps.style as React.CSSProperties}
                        className="bg-background"
                      >
                        <TableCell className="w-10">
                          <div
                            {...dragProvided.dragHandleProps}
                            className="flex cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                          >
                            <IconGripVertical size={16} stroke={1.5} />
                          </div>
                        </TableCell>

                        {headerKeys.map((key, keyIndex) => (
                          <TableCell key={keyIndex}>{item[key]}</TableCell>
                        ))}

                        {(editEnabled || deleteEnabled) && (
                          <TableCell className="w-20">
                            <div className="flex items-center gap-1">
                              {editEnabled && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => handleEdit?.(item)}
                                >
                                  <IconEdit className="size-4" />
                                </Button>
                              )}
                              {deleteEnabled && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete?.(item)}
                                >
                                  <IconTrash className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </ScrollArea>
  );
};

export default DraggableTable;
