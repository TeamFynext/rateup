import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import MarkdownToReact from "@/components/RichTextEditor/MarkdownToReact.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { QuestionType2 } from "@/types/enums.ts";
import { reorder } from "@/utils/questions.ts";

import useFlowStore, { EditorType } from "../utils/store.ts";
import AddElementModal from "./AddElementModal.tsx"; // Modal for element type selection
import InlineElementEditor from "./InlineElementEditor.tsx"; // Inline element editor
import { ScreenLogicEditor } from "./ScreenLogicEditor.tsx";

function ElementsList() {
  const { t: translations } = useTranslation();
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [, setEditingTitle] = useState(false);

  const {
    getCurrentScreen,
    currentScreenId,
    expandedElementId,
    setExpandedElementId,
    updateScreen,
    updateComponentsInScreen,
    deleteComponentFromScreen,
    detailActiveEditor,
  } = useFlowStore();

  const screen = getCurrentScreen();
  const [screenTitle, setScreenTitle] = useState(screen?.title || "");

  useEffect(() => {
    setScreenTitle(screen?.title || "");
  }, [screen?.title, currentScreenId]);

  if (!screen) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="text-lg text-muted-foreground">
          {translations("Select a screen to view elements")}
        </p>
      </div>
    );
  }

  const handleSaveTitle = () => {
    if (screenTitle.trim()) {
      updateScreen(currentScreenId, { title: screenTitle });
    }
    setEditingTitle(false);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = screen.layout.children;
    const reorderedItems = reorder(items, result.source.index, result.destination.index);

    updateComponentsInScreen(currentScreenId, reorderedItems);
  };

  const elements = screen.layout.children.filter((el) => el.type !== QuestionType2.Footer);

  // Render different editors based on active editor type
  if (detailActiveEditor === EditorType.LogicEditor) {
    return <ScreenLogicEditor />;
  }

  return (
    <div className="h-full flex flex-col bg-muted overflow-y-auto">
      {/* Screen Title Editor - Styled like the attached image */}
      <div className="px-4 py-2 pb-2.5 bg-card border-b border-border sticky top-0 z-10">
        <div>
          <Label htmlFor="screen-title" className="text-sm font-medium">
            {translations("Screen Title")}
          </Label>
          <div className="flex gap-2">
            <Input
              id="screen-title"
              value={screenTitle}
              onChange={(e) => setScreenTitle(e.target.value)}
              placeholder={translations("Enter screen title")}
              className="flex-1"
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
              }}
            />
          </div>
        </div>
      </div>
      {/* Elements Count */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-sm font-medium">{translations("Questions")}</span>
        <span className="text-sm text-muted-foreground">
          {elements.length} {translations("questions")}
        </span>
      </div>
      {/* Elements List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={screen.id}>
          {(provided) => (
            <div
              className="flex-1 pb-4 space-y-2 px-2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {elements.map((element, index) => (
                <ElementCard
                  key={element.id}
                  element={element}
                  index={index}
                  isExpanded={expandedElementId === element.id}
                  onToggle={() =>
                    setExpandedElementId(expandedElementId === element.id ? null : element.id)
                  }
                  onDelete={() => deleteComponentFromScreen(element.id)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {/* Add Element Button */}
      <div className="px-4 mt-2 mb-6">
        <Button onClick={() => setAddModalOpened(true)} className="w-full">
          {translations("Add Element")}
          <IconPlus size={16} />
        </Button>
      </div>
      <AddElementModal opened={addModalOpened} close={() => setAddModalOpened(false)} />
    </div>
  );
}

interface ElementCardProps {
  element: any;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function ElementCard({ element, index, isExpanded, onToggle, onDelete }: ElementCardProps) {
  const { t: translations } = useTranslation();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const getElementLabel = () => {
    return (
      (element.header && <MarkdownToReact content={element.header} />) ||
      element.label ||
      element.text ||
      element.type?.toUpperCase() ||
      translations("Untitled Element")
    );
  };

  const handleDelete = () => {
    onDelete();
    setDeleteModalOpened(false);
  };

  return (
    <>
      <Draggable draggableId={element.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={provided.draggableProps.style as CSSProperties}
            className={cn(
              "bg-card border border-border rounded-lg transition-all duration-200 overflow-hidden",
              "hover:border-primary/60 hover:shadow-md",
              isExpanded && "border-primary shadow-[0_4px_12px_rgba(37,99,235,0.15)]",
              snapshot.isDragging && "opacity-80 shadow-lg",
            )}
          >
            {/* Element Header */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer select-none"
              onClick={onToggle}
            >
              <div {...provided.dragHandleProps}>
                <IconGripVertical
                  size={16}
                  className="cursor-grab active:cursor-grabbing text-muted-foreground"
                />
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                {index + 1}
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <p className="font-medium text-sm truncate flex flex-wrap">
                  {getElementLabel()}
                  {element.required && <span className="text-red-500 ml-1">*</span>}
                </p>
                <p className="text-xs text-muted-foreground">{element.metaType || element.type}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModalOpened(true);
                  }}
                >
                  <IconTrash size={14} className="text-destructive" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </Button>
              </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
              <div className="p-4 border-t border-border bg-muted/30">
                <InlineElementEditor element={element} />
              </div>
            )}
          </div>
        )}
      </Draggable>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        headerLabel={translations("Are you sure you want to delete this element?")}
        headerTitle={translations("Delete Element?")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default ElementsList;
