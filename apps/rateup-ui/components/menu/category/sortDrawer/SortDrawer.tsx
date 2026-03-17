"use client";

import React, { useEffect } from "react";

import { Card, Flex, Image, LoadingOverlay, Stack, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { IconGripVertical } from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useExtracted } from "next-intl";

import { useUpdateSortOrderMenuCategoryMutation } from "../../../../backend/menu/category/mCategory.query";
import { useUpdateSortOrderMenuItemMutation } from "../../../../backend/menu/item/mItem.query";
import { fallbackImage } from "../../../../utils/constants";
import FormModalLayout from "../../../Modal/FormModalLayout";
import classes from "./DndListHandle.module.css";

interface Idata {
  id: string;
  name: string;
  image: string;
  disabled?: boolean;
}
interface ISortDrawerProps {
  opened: boolean;
  close: () => void;
  data: Idata[];
  categoryOrNot: boolean;
  category: {
    categoryId: string;
    menuId: string;
  };
}

const SortDrawer = ({
  opened,
  close,
  category,
  data = [],
  categoryOrNot = false,
}: ISortDrawerProps) => {
  const [state, handlers] = useListState(data);

  useEffect(() => {
    handlers.setState(data);
  }, [data]);

  const updateSortOrderMenuItemMutation = useUpdateSortOrderMenuItemMutation(
    category.categoryId,
    category.menuId,
    () => {
      close();
    },
  );
  const updateSortOrderMenuCategoryMutation =
    useUpdateSortOrderMenuCategoryMutation(category.menuId, () => {
      close();
    });
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
          <Card
            shadow="sm"
            padding="lg"
            radius="lg"
            w={"90%"}
            p={"xs"}
            opacity={item?.disabled ? 0.5 : 1}
          >
            <Flex gap={"md"} align={"center"}>
              <Image
                src={
                  item?.image
                    ? `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${item?.image}`
                    : fallbackImage
                }
                w={61}
                h={61}
                alt="image of item"
                fallbackSrc={fallbackImage}
                radius={"md"}
              />
              <Text fz={24} c={"var(--tertiary-color)"} tt={"capitalize"}>
                {item?.name}
              </Text>
            </Flex>
          </Card>
        </Flex>
      )}
    </Draggable>
  ));
  const handleSortOrder = () => {
    let filteredOrderData = state?.map(({ id }) => ({ id }));
    if (categoryOrNot) {
      updateSortOrderMenuCategoryMutation.mutate({
        menuCategory: {
          itemOrder: filteredOrderData,
        },
      });
    } else {
      updateSortOrderMenuItemMutation.mutate({
        menuItem: {
          itemOrder: filteredOrderData,
        },
      });
    }
  };
  const translations = useExtracted();
  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={
        categoryOrNot
          ? translations("Swap Order of Categories")
          : translations("Swap Order of Items")
      }
      centered
      onSubmit={handleSortOrder}
      buttonTitle={translations("Save")}
      size={"lg"}
      includeCancelButton={true}
    >
      <LoadingOverlay
        visible={updateSortOrderMenuItemMutation.isPending}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
        loaderProps={{ type: "bars" }}
      />
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

export default SortDrawer;
