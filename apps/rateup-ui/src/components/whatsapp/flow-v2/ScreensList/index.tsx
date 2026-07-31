import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils.ts";
import { WaQuestions } from "@/types/enums.ts";

import { FlowMaxScreens } from "../../whatsappConfig.tsx";
import type { Screen } from "../utils/store.ts";
import useFlowStoreV3 from "../utils/store.ts";
import CreateScreenModal from "./CreateScreenModal.tsx";

function ScreensList() {
  const { t: translations } = useTranslation();
  const [createModalOpened, setCreateModalOpened] = useState(false);

  const { screens, currentScreenId, setCurrentScreenId, deleteScreen, reorderScreens } =
    useFlowStoreV3();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    reorderScreens(result.source.index, result.destination.index);
  };

  const handleAddScreen = () => {
    if (screens.length >= FlowMaxScreens) {
      alert(`Maximum ${FlowMaxScreens} screens allowed`);
      return;
    }
    setCreateModalOpened(true);
  };

  return (
    <div className="h-full flex flex-col py-5 px-4 bg-background border-r border-border overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold">{translations("Screens")}</h2>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button onClick={handleAddScreen} variant="ghost" size="icon" className="h-8 w-8" />
            }
          >
            <IconPlus size={16} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{translations("Add Screen")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-xs text-muted-foreground ">
        {translations("Build your flow step by step")}
      </p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="screens-list">
          {(provided) => (
            <div className="space-y-2 mt-4" {...provided.droppableProps} ref={provided.innerRef}>
              {screens.map((screen, index) => (
                <ScreenCard
                  key={screen.id}
                  screen={screen}
                  index={index}
                  isSelected={screen.id === currentScreenId}
                  onSelect={() => setCurrentScreenId(screen.id)}
                  onDelete={() => deleteScreen(screen.id)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <CreateScreenModal opened={createModalOpened} close={() => setCreateModalOpened(false)} />
    </div>
  );
}

interface ScreenCardProps {
  screen: Screen;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ScreenCard({ screen, index, isSelected, onSelect, onDelete }: Readonly<ScreenCardProps>) {
  const { t: translations } = useTranslation();
  const confirm = useConfirm();

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: translations("Delete Screen?"),
      description: translations(
        "Are you sure you want to delete this screen? All elements will be deleted.",
      ),
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    onDelete();
  };

  return (
    <>
      <Draggable draggableId={screen.id} index={index}>
        {(provided, snapshot) => (
          <button
            type="button"
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={provided.draggableProps.style as CSSProperties}
            className={cn(
              "w-full text-left py-3.5 px-3 rounded-lg border border-border bg-card cursor-pointer transition-all duration-200 hover:border-primary/60 hover:shadow-sm",
              isSelected && "bg-primary/5 border-primary ring-2 ring-primary/10",
              snapshot.isDragging && "shadow-lg opacity-90",
            )}
            onClick={onSelect}
          >
            <div className="flex items-center gap-3">
              <div {...provided.dragHandleProps}>
                <IconGripVertical
                  size={16}
                  className="cursor-grab active:cursor-grabbing text-muted-foreground"
                />
              </div>
              <div
                className={cn(
                  "w-6.5 h-6.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[0.8125rem] shrink-0",
                  isSelected && "bg-primary/90",
                )}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate leading-5">
                  {screen.title || `Screen ${index + 1}`}
                </p>
                <p className="text-xs text-muted-foreground leading-4 mt-0.5">
                  {screen.layout?.children?.filter((c) => c.type !== WaQuestions.Footer).length ||
                    0}{" "}
                  {translations("elements")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <IconTrash size={14} />
              </Button>
            </div>
          </button>
        )}
      </Draggable>
    </>
  );
}

export default ScreensList;
