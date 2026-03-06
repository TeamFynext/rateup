import React from "react";

import { ActionIcon, Group, ScrollAreaAutosize, Table } from "@mantine/core";
import { IconEdit, IconGripVertical, IconTrash } from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

import { reorder } from "../../../utils/questions";
import classes from "./DraggableTableStyle.module.css";

type TableHeader = {
  headerKey: string;
  headerValue: string;
};
interface IDraggableTableProps {
  headers: TableHeader[];
  items: Array<any>;
  itemUniqueKey: string;
  handleDragEnd: (values) => void;
  editEnabled?: boolean;
  deleteEnabled?: boolean;
  handleEdit?: (item) => void;
  handleDelete?: (item) => void;
  withRowBorder: boolean;
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
  withRowBorder = true,
  maxHeight = 250,
}: IDraggableTableProps) => {
  if (!items || !items?.length) return;

  const headerKeys = headers.map((header) => header.headerKey);

  const rows = items?.map((item, index) => (
    <Draggable
      key={item?.[itemUniqueKey]}
      index={index}
      draggableId={item?.[itemUniqueKey]}
    >
      {(provided) => (
        <Table.Tr
          key={item?.[itemUniqueKey]}
          className={classes.item}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <Table.Td w={50}>
            <div className={classes.dragHandle} {...provided.dragHandleProps}>
              <IconGripVertical stroke={1.5} />
            </div>
          </Table.Td>
          {headerKeys?.map((key, keyIndex) => (
            <Table.Td w={200} key={keyIndex}>
              {item[key]}
            </Table.Td>
          ))}
          <Table.Td w={270}>
            <Group>
              {editEnabled && (
                <ActionIcon
                  variant="subtle"
                  onClick={() => {
                    handleEdit(item);
                  }}
                  size={"sm"}
                >
                  <IconEdit />
                </ActionIcon>
              )}
              {deleteEnabled && (
                <ActionIcon
                  variant="subtle"
                  onClick={() => handleDelete(item)}
                  size={"sm"}
                >
                  <IconTrash color="red" />
                </ActionIcon>
              )}
            </Group>
          </Table.Td>
        </Table.Tr>
      )}
    </Draggable>
  ));

  return (
    <ScrollAreaAutosize mah={maxHeight} scrollbarSize={6}>
      <DragDropContext
        onDragEnd={({ source, destination }) => {
          const reorderedItems = reorder(
            items,
            source.index,
            destination?.index || 0,
          );
          handleDragEnd(reorderedItems);
        }}
      >
        <Table stickyHeader withRowBorders={withRowBorder}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={50} />
              {headers?.map((header, index) => (
                <Table.Th w={200} key={index}>
                  {header.headerValue}
                </Table.Th>
              ))}
              <Table.Th w={270} />
            </Table.Tr>
          </Table.Thead>
          <Droppable droppableId="dnd-list" direction="vertical">
            {(provided) => (
              <Table.Tbody {...provided.droppableProps} ref={provided.innerRef}>
                {rows}
                {provided.placeholder}
              </Table.Tbody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </ScrollAreaAutosize>
  );
};

export default DraggableTable;
