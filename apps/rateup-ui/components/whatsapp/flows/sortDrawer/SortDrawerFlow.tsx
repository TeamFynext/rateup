"use client";

import React, { useContext, useEffect } from "react";

import { Card, Flex, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { IconGripVertical } from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useExtracted } from "next-intl";

import classes from "../../../menu/category/sortDrawer/DndListHandle.module.css";
import FormModalLayout from "../../../Modal/FormModalLayout";
import useFlowStore from "../../flow-v2/utils/store";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext";

interface Idata {
  id: string;
  name: string;
}
interface ISortDrawerProps {
  opened: boolean;
  close: () => void;
  data: Idata[];
  v?: number;
}

const SortDrawerFlow = ({
  opened,
  close,
  data = [],
  v = 1,
}: ISortDrawerProps) => {
  const [state, handlers] = useListState(data);
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);
  const { screens, addScreens } = useFlowStore();

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
            <Text fz={24} tt={"capitalize"}>
              {item?.name}
            </Text>
          </Card>
        </Flex>
      )}
    </Draggable>
  ));
  const handleSortOrder = () => {
    if (v === 2) {
      const sortedScreens = screens?.toSorted((a, b) => {
        const indexA = state.findIndex((item) => item.id === a.id);
        const indexB = state.findIndex((item) => item.id === b.id);
        return indexA - indexB;
      });
      let cloneScreens = JSON.parse(JSON.stringify(sortedScreens));
      for (const screenIndex in cloneScreens) {
        let footer = cloneScreens[screenIndex].layout.children.find(
          (child) => child.type === "Footer",
        );
        let nextScreenId = cloneScreens?.[parseInt(screenIndex) + 1]?.id;
        cloneScreens[screenIndex].terminal = nextScreenId ? undefined : true;
        footer["on-click-action"] = !!nextScreenId
          ? {
              name: "navigate",
              next: {
                type: "screen",
                name: nextScreenId,
              },
              payload: {},
            }
          : {
              name: "complete",
              payload: {},
            };
      }
      addScreens(cloneScreens);
    } else {
      const sortedScreens = flowJson?.screens?.toSorted((a, b) => {
        const indexA = state.findIndex((item) => item.id === a.id);
        const indexB = state.findIndex((item) => item.id === b.id);
        return indexA - indexB;
      });
      updateFlowJson((draft) => {
        draft.screens = sortedScreens;
      });
    }

    close();
  };
  const translations = useExtracted();
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={translations("Swap the order of flow screens")}
      centered
      onSubmit={handleSortOrder}
      buttonTitle={translations("Save")}
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
