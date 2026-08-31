import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import React, { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { useListState } from "@/hooks/use-list-state.ts";
import type { WaFlowFormElement } from "@/types/global";

import useFlowStore from "../../flow-v2/utils/store.ts";
import { EditFlowContext } from "../FlowPage/EditFlow/EditFlowContext.ts";

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

const SortDrawerFlow = ({ opened, close, data = [], v = 1 }: ISortDrawerProps) => {
  const [state, handlers] = useListState(data);
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);
  const { screens, addScreens } = useFlowStore();

  useEffect(() => {
    handlers.setState(data);
  }, [data]);

  const items = state?.map((item, index) => (
    <Draggable key={item?.id} index={index} draggableId={item?.id}>
      {(provided) => (
        <div
          className="my-4 flex gap-2 !top-auto !left-auto"
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style as React.CSSProperties}
        >
          <div {...provided.dragHandleProps} className="flex flex-col justify-center">
            <IconGripVertical size={24} stroke={1.5} />
          </div>
          <Card className="w-[90%] rounded-lg p-2 shadow-sm">
            <p className="text-2xl capitalize">{item?.name}</p>
          </Card>
        </div>
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
      const cloneScreens = JSON.parse(JSON.stringify(sortedScreens));
      for (const screenIndex in cloneScreens) {
        const footer = cloneScreens[screenIndex].layout.children.find(
          (child: WaFlowFormElement) => child.type === "Footer",
        );
        const nextScreenId = cloneScreens?.[parseInt(screenIndex) + 1]?.id;
        cloneScreens[screenIndex].terminal = nextScreenId ? undefined : true;
        footer["on-click-action"] = nextScreenId
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
  const { t: translations } = useTranslation();
  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            {translations("Swap the order of flow screens")}
          </DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" type="button" onClick={close}>
            {translations("Cancel")}
          </Button>
          <Button type="button" onClick={handleSortOrder}>
            {translations("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SortDrawerFlow;
