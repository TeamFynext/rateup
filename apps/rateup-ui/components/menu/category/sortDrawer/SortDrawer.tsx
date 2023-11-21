import React from "react";
import FormModalLayout from "../../../Modal/FormModalLayout";
import { useListState } from "@mantine/hooks";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import classes from "./DndListHandle.module.css";
import { IconGripVertical } from "@tabler/icons-react";
import {
  Card,
  Flex,
  Group,
  Image,
  LoadingOverlay,
  Stack,
  Text,
} from "@mantine/core";
import { GilroySemibold } from "../../../../public/fonts";
import { useUpdateSortOrderMenuItemMutation } from "../../../../backend/menu/item/mItem.query";
import { useUpdateSortOrderMenuCategoryMutation } from "../../../../backend/menu/category/mCategory.query";

interface Idata {
  id: string;
  name: string;
  image: string;
}
interface IfilteredData {
  id: string;
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
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const updateSortOrderMenuItemMutation = useUpdateSortOrderMenuItemMutation(
    category.categoryId,
    category.menuId,
    () => {
      close();
    }
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
          <Card shadow="sm" padding="lg" radius="lg" w={"90%"} p={"xs"}>
            <Group>
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
              <Text
                fz={24}
                className={GilroySemibold.className}
                c={"var(--tertiary-color)"}
                tt={"capitalize"}
              >
                {item?.name}
              </Text>
            </Group>
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

  return (
    <FormModalLayout
      opened={opened}
      onClose={close}
      title={categoryOrNot ? "Swap Order of Categories" : "Swap Order of Items"}
      centered
      onSubmit={handleSortOrder}
      buttonTitle={"Save"}
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
