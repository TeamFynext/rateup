"use client";

import { useEffect, useState } from "react";

import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import classNames from "classnames/bind";
import { useTranslations } from "next-intl";

import { QuestionType2 } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { reorder } from "@/utils/questions";

import useFlowStore, { EditorType } from "../utils/store";
import AddElementModal from "./AddElementModal"; // Modal for element type selection
import InlineElementEditor from "./InlineElementEditor"; // Inline element editor
import { ScreenLogicEditor } from "./ScreenLogicEditor";
import styles from "./ElementsList.module.css";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";


const cx = classNames.bind(styles);

function ElementsList() {
  const translations = useTranslations();
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
    setDetailActiveEditor,
  } = useFlowStore();

  const screen = getCurrentScreen();
  const [screenTitle, setScreenTitle] = useState(screen?.title || "");

  useEffect(() => {
    setScreenTitle(screen?.title || "");
  }, [screen?.title, currentScreenId]);

  if (!screen) {
    return (
      <div className={styles["empty-state"]}>
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
    const reorderedItems = reorder(
      items,
      result.source.index,
      result.destination.index,
    );

    updateComponentsInScreen(currentScreenId, reorderedItems);
  };

  const elements = screen.layout.children.filter(
    (el) => el.type !== QuestionType2.Footer
  );

  // Render different editors based on active editor type
  if (detailActiveEditor === EditorType.LogicEditor) {
    return <ScreenLogicEditor />;
  }

  return (
    <div className={styles["elements-list-container"]}>
      {/* Screen Title Editor - Styled like the attached image */}
      <div className={styles["screen-title-section"]}>
        <div className="space-y-2">
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
        <span className="text-sm font-medium">
          {translations("Questions")}
        </span>
        <span className="text-sm text-muted-foreground">
          {elements.length} {translations("questions")}
        </span>
      </div>

      {/* Elements List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={screen.id}>
          {(provided) => (
            <div
              className={styles["elements-stack"] + " space-y-2 px-2"}
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
                    setExpandedElementId(
                      expandedElementId === element.id ? null : element.id
                    )
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
      <div className="px-4 mt-2">
        <RateupButtonBlue
          onClick={() => setAddModalOpened(true)}
          title={translations("Add Element")}
          radius="md"
          fullWidth
          rightIcon={<IconPlus size={16} />}
        />
      </div>

      <AddElementModal
        opened={addModalOpened}
        close={() => setAddModalOpened(false)}
      />
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

function ElementCard({
  element,
  index,
  isExpanded,
  onToggle,
  onDelete,
}: ElementCardProps) {
  const translations = useTranslations();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const getElementLabel = () => {
    return (
      element.header ||
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
            className={cx("element-card", {
              expanded: isExpanded,
              dragging: snapshot.isDragging,
            })}
          >
            {/* Element Header */}
            <div
              className={styles["element-header"] + " flex items-center gap-3 p-3 cursor-pointer"}
              onClick={onToggle}
            >
              <div {...provided.dragHandleProps}>
                <IconGripVertical size={16} className={styles["drag-handle"] + " text-muted-foreground"} />
              </div>
              <div className={styles["element-number"] + " flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium"}>
                {index + 1}
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {getElementLabel()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {element.metaType || element.type}
                  {element.required && (
                    <span className="text-red-500 ml-1">
                      *
                    </span>
                  )}
                </p>
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
                  {isExpanded ? (
                    <IconChevronUp size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
              <div className={styles["element-editor"] + " p-4 border-t"}>
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
        headerLabel={translations(
          "Are you sure you want to delete this element?",
        )}
        headerTitle={translations("Delete Element?")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default ElementsList;
