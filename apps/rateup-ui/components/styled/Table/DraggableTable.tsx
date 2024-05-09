import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { ActionIcon, Group, Table } from "@mantine/core";
import { IconEdit, IconGripVertical, IconTrash } from "@tabler/icons-react";
import React from "react";
import { reorder } from "../../../utils/questions";
import classes from "./DraggableTableStyle.module.css";
import NothingFound from "../../NothingFound/NothingFound";

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
}: IDraggableTableProps) => {
  if (!items || !items?.length) return;

  const headerKeys = headers.map((header) => header.headerKey);

  const rows = items?.map((item, index) => (
    <Draggable key={index} index={index} draggableId={item?.[itemUniqueKey]}>
      {(provided) => (
        <Table.Tr
          className={classes.item}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <Table.Td>
            <div {...provided.dragHandleProps} className={classes.dragHandle}>
              <IconGripVertical stroke={1.5} />
            </div>
          </Table.Td>
          {headerKeys?.map((key) => <Table.Td>{item[key]}</Table.Td>)}
          <Table.Td>
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
      <Table stickyHeader withRowBorders={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            {headers?.map((header) => (
              <Table.Th>{header.headerValue}</Table.Th>
            ))}
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
  );
};

export default DraggableTable;
