import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateSortOrderMenuCategoryMutation } from "@/backend/menu/category/mCategory.query";
import { useUpdateSortOrderMenuItemMutation } from "@/backend/menu/item/mItem.query";
import { fallbackImage } from "@/utils/constants.ts";

import { Button } from "../../../ui/button.tsx";
import { Card } from "../../../ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog.tsx";
import { Spinner } from "../../../ui/spinner.tsx";

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
  const [state, setState] = useState<Idata[]>(data);
  const { t: translations } = useTranslation();

  useEffect(() => {
    setState(data);
  }, [data]);

  const updateSortOrderMenuItemMutation = useUpdateSortOrderMenuItemMutation(
    category.categoryId,
    category.menuId,
    () => {
      close();
    },
  );

  const updateSortOrderMenuCategoryMutation = useUpdateSortOrderMenuCategoryMutation(
    category.menuId,
    () => {
      close();
    },
  );

  const reorderState = (from: number, to: number) => {
    setState((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSortOrder = () => {
    const filteredOrderData = state.map(({ id }) => ({ id }));
    if (categoryOrNot) {
      updateSortOrderMenuCategoryMutation.mutate({
        menuCategory: {
          itemOrder: filteredOrderData,
        },
      });
      return;
    }

    updateSortOrderMenuItemMutation.mutate({
      menuItem: {
        itemOrder: filteredOrderData,
      },
    });
  };

  const isPending =
    updateSortOrderMenuItemMutation.isPending || updateSortOrderMenuCategoryMutation.isPending;

  const items = state.map((item, index) => (
    <Draggable key={item.id} index={index} draggableId={item.id}>
      {(provided) => (
        <div
          className={`${classes.itemDragging} my-3 flex gap-3`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style as CSSProperties}
        >
          <div {...provided.dragHandleProps} className="flex items-center justify-center">
            <IconGripVertical size={24} stroke={1.5} />
          </div>

          <Card className="w-[90%] p-2" style={{ opacity: item.disabled ? 0.5 : 1 }}>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  item.image
                    ? `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${item.image}`
                    : fallbackImage
                }
                alt={item.name}
                className="h-15.25 w-15.25 rounded-md object-cover"
              />
              <p className="text-xl capitalize">{item.name}</p>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  ));

  return (
    <Dialog open={opened} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="sm:max-w-190">
        <DialogHeader>
          <DialogTitle>
            {categoryOrNot
              ? translations("Swap Order of Categories")
              : translations("Swap Order of Items")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative max-h-[60vh] overflow-auto">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
              <Spinner />
            </div>
          )}

          <DragDropContext
            onDragEnd={({ destination, source }) => {
              if (!destination) return;
              reorderState(source.index, destination.index);
            }}
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {translations("Cancel")}
          </Button>
          <Button type="button" onClick={handleSortOrder} disabled={isPending}>
            {translations("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SortDrawer;
