import React, { useContext, useEffect } from "react";
import FormModalLayout from "../../../Modal/FormModalLayout";
import { useListState } from "@mantine/hooks";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import classes from "../../../menu/category/sortDrawer/DndListHandle.module.css";
import { IconGripVertical } from "@tabler/icons-react";
import { Card, Flex, Stack, Text } from "@mantine/core";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext";

interface Idata {
  id: string;
  name: string;
}
interface ISortDrawerProps {
  opened: boolean;
  close: () => void;
  data: Idata[];
}

const SortDrawerFlow = ({ opened, close, data = [] }: ISortDrawerProps) => {
  const [state, handlers] = useListState(data);
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);

  useEffect(() => {
    handlers.setState(data);
  }, [data]);

  const items = state?.map((item, index) => (
    <Draggable key={item?.id} index={index} draggableId={item?.id}>
      {(provided) => (
        <Flex
          className={classes.itemDragging}
          ref={provided.innerRef}
          {...provided.draggableProps}
          gap={"sm"}
          my={"md"}
        >
          <Stack {...provided.dragHandleProps} justify={"center"}>
            <IconGripVertical size={24} stroke={1.5} />
          </Stack>
          <Card shadow="sm" padding="lg" radius="lg" w={"90%"} p={"xs"}>
            <Text fz={24} c={"var(--tertiary-color)"} tt={"capitalize"}>
              {item?.name}
            </Text>
          </Card>
        </Flex>
      )}
    </Draggable>
  ));
  const handleSortOrder = () => {
    const sortedScreens = flowJson?.screens?.toSorted((a, b) => {
      const indexA = state.findIndex((item) => item.id === a.id);
      const indexB = state.findIndex((item) => item.id === b.id);
      return indexA - indexB;
    });
    updateFlowJson((draft) => {
      draft.screens = sortedScreens;
    });
    close();
  };

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={"Swap the order of flow screens"}
      centered
      onSubmit={handleSortOrder}
      buttonTitle={"Save"}
      size={"lg"}
      includeCancelButton={true}
    >
      <DragDropContext
        onDragEnd={({ destination, source }) =>
          handlers.reorder({
            from: source.index,
            to: destination?.index || 0,
          })
        }
      >
        <Droppable droppableId="dnd-list" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {items}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </FormModalLayout>
  );
};

export default SortDrawerFlow;
